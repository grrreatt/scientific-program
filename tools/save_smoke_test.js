#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Ensure a day and hall exist
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

  // Ensure a time slot exists for the day
  const { data: slots } = await supabase.from('day_time_slots').select('id,start_time,end_time').eq('day_id', dayId).order('slot_order',{ascending:true})
  let slotId = slots?.[0]?.id
  if (!slotId) {
    const { data: s, error } = await supabase.from('day_time_slots').insert({ day_id: dayId, start_time: '08:00', end_time: '08:30', slot_order: 1 }).select('id').single()
    if (error) throw error
    slotId = s.id
  }

  // Insert a speaker for linking
  const persona = `Test User ${Math.random().toString(36).slice(2,7)}`
  const { data: sp, error: spErr } = await supabase.from('speakers').insert({ name: persona }).select('id').single()
  if (spErr) throw spErr

  // Create a session
  const sessTitle = `Smoke Test Session ${Math.random().toString(36).slice(2,6)}`
  const { data: sess, error: sessErr } = await supabase
    .from('sessions')
    .insert({
      title: sessTitle,
      session_type: 'lecture',
      day_id: dayId,
      stage_id: hallId,
      time_slot_id: slotId,
      topic: 'Smoke Topic',
      custom_start_time: '08:00',
      custom_end_time: '08:30',
      start_time: '08:00',
      end_time: '08:30'
    })
    .select('id')
    .single()
  if (sessErr) throw sessErr

  // Add participant
  const { error: partErr } = await supabase.from('session_participants').insert({ session_id: sess.id, speaker_id: sp.id, role: 'speaker' })
  if (partErr) throw partErr

  // Add a sub-session (talk)
  const { error: subErr } = await supabase.from('sub_sessions').insert({
    parent_session_id: sess.id,
    title: 'Smoke Subtalk',
    speaker_id: sp.id,
    start_time: '08:00',
    end_time: '08:30',
    topic: 'Smoke Topic',
    sub_session_type: 'lecture'
  })
  if (subErr) throw subErr

  // Verify via view
  const { data: check, error: checkErr } = await supabase
    .from('sessions_with_times')
    .select('*')
    .eq('id', sess.id)
    .single()
  if (checkErr) throw checkErr

  // Verify sub-sessions exist
  const { data: subs, error: subsErr } = await supabase
    .from('sub_sessions')
    .select('id')
    .eq('parent_session_id', sess.id)
  if (subsErr) throw subsErr

  console.log(JSON.stringify({ ok: true, session_id: sess.id, title: check.title, start_time: check.start_time, end_time: check.end_time, sub_sessions: subs?.length || 0 }, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })


