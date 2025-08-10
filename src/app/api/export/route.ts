import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { calculateDuration, formatTimeCompact } from '@/lib/utils'
import * as XLSX from 'xlsx'

// Ensure Node.js runtime (needed for xlsx and Buffer)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
        ),
        sub_sessions(
          title, topic, start_time, end_time,
          speakers(name, email, organization)
        )
      `)

    if (sessionsError) {
      throw sessionsError
    }

    // Transform data into flat rows and group by day for Excel sheets
    const rowsByDay: Record<string, any[]> = {}
    
    sessions?.forEach(session => {
      const dayName = session.day_name || 'Unknown Day'
      const stageName = session.stage_name || 'Unknown Hall'
      const duration = calculateDuration(session.start_time, session.end_time)
      const timeRange12h = `${formatTimeCompact(session.start_time)}-${formatTimeCompact(session.end_time)}`
      
      // Handle participants
      if (session.session_participants && session.session_participants.length > 0) {
        session.session_participants.forEach((participant: any) => {
          const row = {
            name: participant.speakers?.name || 'Unknown',
            email: participant.speakers?.email || '',
            session: session.title,
            session_topic: session.topic || '',
            role: participant.role,
            time: timeRange12h,
            talk_topic: '',
            hall: stageName,
            day: dayName,
          }
          rowsByDay[dayName] = rowsByDay[dayName] || []
          rowsByDay[dayName].push(row)
        })
      } else {
        // Session without participants
        const row = {
          name: '',
          email: '',
          session: session.title,
          session_topic: session.topic || '',
          role: '',
          time: timeRange12h,
          talk_topic: '',
          hall: stageName,
          day: dayName,
        }
        rowsByDay[dayName] = rowsByDay[dayName] || []
        rowsByDay[dayName].push(row)
      }

      // Include sub-sessions (each row for the sub-talk speaker if present)
      if (session.sub_sessions && session.sub_sessions.length > 0) {
        session.sub_sessions.forEach((sub: any) => {
          const subTime = `${formatTimeCompact(sub.start_time)}-${formatTimeCompact(sub.end_time)}`
          const row = {
            name: sub.speakers?.name || '',
            email: sub.speakers?.email || '',
            session: session.title,
            session_topic: session.topic || '',
            role: sub.speakers?.name ? 'speaker' : '',
            time: subTime,
            talk_topic: sub.title || '',
            hall: stageName,
            day: dayName,
          }
          rowsByDay[dayName] = rowsByDay[dayName] || []
          rowsByDay[dayName].push(row)
        })
      }
    })

    // Build an Excel workbook with one sheet per day
    const workbook = XLSX.utils.book_new()
    const orderedDays = Object.keys(rowsByDay).sort()
    const columnsOrder = ['name','email','session','session_topic','role','time','talk_topic','hall','day']
    orderedDays.forEach(day => {
      const rows = rowsByDay[day]
      const sheet = XLSX.utils.json_to_sheet(rows, { header: columnsOrder })
      // Set header names nicer
      XLSX.utils.sheet_add_aoa(sheet, [[
        'Name','Email','Session','Session Topic','Role','Time','Topic of Talk','Hall','Day'
      ]], { origin: 'A1' })
      XLSX.utils.book_append_sheet(workbook, sheet, day.substring(0, 31))
    })

    const wbout = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    return new NextResponse(Buffer.from(wbout), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="schedules_by_day.xlsx"'
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