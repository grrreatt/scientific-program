import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { calculateDuration } from '@/lib/utils'

export async function GET() {
  try {
    // Fetch all sessions with related data using the sessions_with_times view
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions_with_times')
      .select(`
        *,
        session_participants(
          role,
          speakers(name, email, organization)
        )
      `)

    if (sessionsError) {
      throw sessionsError
    }

    // Transform data for CSV export
    const csvRows: any[] = []
    
    sessions?.forEach(session => {
      const dayName = session.day_name || 'Unknown Day'
      const stageName = session.stage_name || 'Unknown Stage'
      const duration = calculateDuration(session.start_time, session.end_time)
      
      // Handle participants
      if (session.session_participants && session.session_participants.length > 0) {
        session.session_participants.forEach((participant: any) => {
          csvRows.push({
            session_name: session.title,
            session_type: session.session_type,
            day: dayName,
            stage: stageName,
            start_time: session.start_time,
            end_time: session.end_time,
            duration: duration,
            topic: session.topic || '',
            person_name: participant.speakers?.name || 'Unknown',
            role: participant.role,
            organization: participant.speakers?.organization || '',
            email: participant.speakers?.email || ''
          })
        })
      } else {
        // Session without participants
        csvRows.push({
          session_name: session.title,
          session_type: session.session_type,
          day: dayName,
          stage: stageName,
          start_time: session.start_time,
          end_time: session.end_time,
          duration: duration,
          topic: session.topic || '',
          person_name: '',
          role: '',
          organization: '',
          email: ''
        })
      }
    })

    // Convert to CSV format
    const headers = [
      'Session Name',
      'Session Type', 
      'Day',
      'Stage',
      'Start Time',
      'End Time',
      'Duration',
      'Topic',
      'Person Name',
      'Role',
      'Organization',
      'Email'
    ]

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => [
        `"${row.session_name}"`,
        `"${row.session_type}"`,
        `"${row.day}"`,
        `"${row.stage}"`,
        `"${row.start_time}"`,
        `"${row.end_time}"`,
        `"${row.duration}"`,
        `"${row.topic}"`,
        `"${row.person_name}"`,
        `"${row.role}"`,
        `"${row.organization}"`,
        `"${row.email}"`
      ].join(','))
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="conference-program.csv"'
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
} 