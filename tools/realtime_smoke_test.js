#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
try { global.WebSocket = global.WebSocket || require('ws') } catch {}

async function ensureBasics(supabase) {
  const { data: days } = await supabase.from('conference_days').select('id,name').order('created_at',{ascending:true})
  let dayId = days?.[0]?.id
  if (!dayId) {
    const dn = `Day ${Math.floor(Math.random()*1000)}`
    const today = new Date().toISOString().slice(0,10)
    const { data: d, error } = await supabase.from('conference_days').insert({ name: dn, date: today }).select('id').single()
    if (error) throw error
    dayId = d.id
  }
  const { data: halls } = await supabase.from('stages').select('id').order('created_at',{ascending:true})
  let hallId = halls?.[0]?.id
  if (!hallId) {
    const { data: h, error } = await supabase.from('stages').insert({ name: 'Main Hall' }).select('id').single()
    if (error) throw error
    hallId = h.id
  }
  const { data: slots } = await supabase.from('day_time_slots').select('id').eq('day_id', dayId)
  let slotId = slots?.[0]?.id
  if (!slotId) {
    const { data: s, error } = await supabase.from('day_time_slots').insert({ day_id: dayId, start_time: '08:00', end_time: '08:30', slot_order: 1 }).select('id').single()
    if (error) throw error
    slotId = s.id
  }
  return { dayId, hallId, slotId }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, anonKey, { realtime: { params: { eventsPerSecond: 10 } } })

  const { dayId, hallId, slotId } = await ensureBasics(supabase)
  const channel = supabase
    .channel('sessions-realtime-test')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, (payload) => {
      if (!global.__rt_resolved) {
        global.__rt_resolved = true
        console.log(JSON.stringify({ ok: true, eventType: payload.eventType, new: payload.new }))
      }
      try { channel.unsubscribe() } catch {}
    })

  const subPromise = new Promise((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve(true)
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error('subscribe failed: ' + status))
    })
  })
  await subPromise

  const title = `RT Smoke ${Math.random().toString(36).slice(2,6)}`
  const { data: sess, error } = await supabase
    .from('sessions')
    .insert({
      title,
      session_type: 'lecture',
      day_id: dayId,
      stage_id: hallId,
      time_slot_id: slotId,
      topic: 'RT Test',
      custom_start_time: '09:00',
      custom_end_time: '09:30',
      start_time: '09:00',
      end_time: '09:30'
    })
    .select('id')
    .single()
  if (error) throw error

  // wait for event
  await new Promise((resolve, reject) => setTimeout(() => {
    if (global.__rt_resolved) resolve()
    else reject(new Error('timeout waiting for realtime event'))
  }, 8000))
  if (!global.__rt_resolved) {
    console.error('Realtime event not received: timeout')
    console.log(JSON.stringify({ ok: false, session_id: sess.id, error: 'timeout' }))
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })


