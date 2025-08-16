#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugDatabase() {
  console.log('🔍 DEBUGGING DATABASE STATE...')
  console.log('================================')
  
  try {
    // 1. Check Days
    console.log('\n📅 CHECKING DAYS:')
    const { data: days, error: daysError } = await supabase
      .from('conference_days')
      .select('*')
    
    if (daysError) {
      console.error('❌ Days Error:', daysError)
    } else {
      console.log(`✅ Found ${days?.length || 0} days:`)
      days?.forEach(day => console.log(`   - ${day.name} (${day.date})`))
    }
    
    // 2. Check Halls
    console.log('\n🏛️ CHECKING HALLS:')
    const { data: halls, error: hallsError } = await supabase
      .from('stages')
      .select('*')
    
    if (hallsError) {
      console.error('❌ Halls Error:', hallsError)
    } else {
      console.log(`✅ Found ${halls?.length || 0} halls:`)
      halls?.forEach(hall => console.log(`   - ${hall.name}`))
    }
    
    // 3. Check Time Slots
    console.log('\n⏰ CHECKING TIME SLOTS:')
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('day_time_slots')
      .select('*')
    
    if (timeSlotsError) {
      console.error('❌ Time Slots Error:', timeSlotsError)
    } else {
      console.log(`✅ Found ${timeSlots?.length || 0} time slots:`)
      timeSlots?.slice(0, 5).forEach(slot => {
        console.log(`   - ${slot.start_time} to ${slot.end_time} (Day: ${slot.day_id})`)
      })
      if (timeSlots?.length > 5) {
        console.log(`   ... and ${timeSlots.length - 5} more`)
      }
    }
    
    // 4. Check Sessions (RAW)
    console.log('\n📝 CHECKING SESSIONS (RAW):')
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
    
    if (sessionsError) {
      console.error('❌ Sessions Error:', sessionsError)
    } else {
      console.log(`✅ Found ${sessions?.length || 0} sessions:`)
      sessions?.forEach(session => {
        console.log(`   - "${session.title}" (${session.session_type})`)
        console.log(`     Day ID: ${session.day_id}`)
        console.log(`     Hall ID: ${session.stage_id}`)
        console.log(`     Time Slot ID: ${session.time_slot_id}`)
        console.log(`     Start: ${session.start_time}, End: ${session.end_time}`)
        console.log('')
      })
    }
    
    // 5. Check Day-Halls Relationship
    console.log('\n🔗 CHECKING DAY-HALLS RELATIONSHIPS:')
    const { data: dayHalls, error: dayHallsError } = await supabase
      .from('day_halls')
      .select('*')
    
    if (dayHallsError) {
      console.error('❌ Day-Halls Error:', dayHallsError)
    } else {
      console.log(`✅ Found ${dayHalls?.length || 0} day-hall relationships:`)
      dayHalls?.forEach(dh => {
        console.log(`   - Day ${dh.day_id} has Hall ${dh.hall_id} (order: ${dh.hall_order})`)
      })
    }
    
    // 6. Test Session Creation
    console.log('\n🧪 TESTING SESSION CREATION:')
    if (days?.length > 0 && halls?.length > 0 && timeSlots?.length > 0) {
      const testDay = days[0]
      const testHall = halls[0]
      const testTimeSlot = timeSlots[0]
      
      console.log(`Creating test session with:`)
      console.log(`   Day: ${testDay.name} (${testDay.id})`)
      console.log(`   Hall: ${testHall.name} (${testHall.id})`)
      console.log(`   Time: ${testTimeSlot.start_time} - ${testTimeSlot.end_time} (${testTimeSlot.id})`)
      
      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert({
          title: 'TEST SESSION - DELETE ME',
          session_type: 'lecture',
          day_id: testDay.id,
          stage_id: testHall.id,
          time_slot_id: testTimeSlot.id,
          topic: 'Test Topic',
          start_time: testTimeSlot.start_time,
          end_time: testTimeSlot.end_time
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Session Creation Error:', createError)
      } else {
        console.log('✅ Test session created successfully!')
        console.log(`   Session ID: ${newSession.id}`)
        
        // Clean up
        await supabase.from('sessions').delete().eq('id', newSession.id)
        console.log('🧹 Test session cleaned up')
      }
    } else {
      console.log('⚠️ Cannot test session creation - missing required data')
    }
    
  } catch (error) {
    console.error('❌ Debug Error:', error)
  }
}

debugDatabase()
