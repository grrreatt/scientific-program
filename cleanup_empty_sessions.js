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

async function cleanupEmptySessions() {
  console.log('🧹 CLEANING UP EMPTY SESSIONS...')
  console.log('================================')
  
  try {
    // Find sessions with empty titles
    const { data: emptySessions, error: findError } = await supabase
      .from('sessions')
      .select('*')
      .or('title.is.null,title.eq.')
    
    if (findError) {
      console.error('❌ Error finding empty sessions:', findError)
      return
    }
    
    console.log(`Found ${emptySessions?.length || 0} sessions with empty titles:`)
    emptySessions?.forEach(session => {
      console.log(`   - ID: ${session.id}, Type: ${session.session_type}, Topic: "${session.topic}"`)
    })
    
    if (emptySessions && emptySessions.length > 0) {
      // Delete empty sessions
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .or('title.is.null,title.eq.')
      
      if (deleteError) {
        console.error('❌ Error deleting empty sessions:', deleteError)
      } else {
        console.log(`✅ Deleted ${emptySessions.length} empty sessions`)
      }
    } else {
      console.log('✅ No empty sessions found')
    }
    
    // Show remaining sessions
    const { data: remainingSessions, error: remainingError } = await supabase
      .from('sessions')
      .select('*')
    
    if (remainingError) {
      console.error('❌ Error checking remaining sessions:', remainingError)
    } else {
      console.log(`\n📝 REMAINING SESSIONS: ${remainingSessions?.length || 0}`)
      remainingSessions?.forEach(session => {
        console.log(`   - "${session.title}" (${session.session_type})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Cleanup Error:', error)
  }
}

cleanupEmptySessions()
