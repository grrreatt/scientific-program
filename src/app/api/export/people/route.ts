import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { formatTimeRange } from '@/lib/utils'

let XLSX: any

export async function GET(_req: NextRequest) {
  try {
    // Load all sessions with participants and sub-sessions
    const { data: sessions, error } = await supabase
      .from('sessions_with_times')
      .select(`
        *,
        session_participants(
          role,
          speakers(name, email, organization)
        ),
        sub_sessions(
          title, topic, start_time, end_time, sub_session_type,
          speakers(name, email, organization)
        )
      `)
      .order('created_at', { ascending: true })

    if (error) throw error

    type Row = {
      Name: string
      Session: string
      'Session topic': string
      Time: string
      Role: string
      Topic: string
    }

    const rows: Row[] = []

    ;(sessions || []).forEach((session: any) => {
      const sessionTitle = session.title || ''
      const sessionTopic = session.topic || ''
      const sessionTime = formatTimeRange(session.start_time, session.end_time)

      // Session-level participants (speaker, chairperson, moderator, etc.)
      const parts = session.session_participants || []
      parts.forEach((p: any) => {
        const personName = p.speakers?.name || ''
        if (!personName) return
        rows.push({
          Name: personName,
          Session: sessionTitle,
          'Session topic': sessionTopic,
          Time: sessionTime,
          Role: p.role || '',
          Topic: sessionTopic,
        })
      })

      // Sub-sessions (each speaker becomes a row)
      const subs = session.sub_sessions || []
      subs.forEach((sub: any) => {
        const subSpeaker = sub.speakers?.name || ''
        if (!subSpeaker) return
        const subTime = formatTimeRange(sub.start_time, sub.end_time)
        rows.push({
          Name: subSpeaker,
          Session: sessionTitle,
          'Session topic': sessionTopic,
          Time: subTime,
          Role: 'speaker',
          Topic: sub.topic || '',
        })
      })
    })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 404 })
    }

    if (!XLSX) {
      XLSX = await import('xlsx')
    }
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'People')
    const wbout = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    return new NextResponse(wbout, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="all-people-schedules.xlsx"',
      },
    })
  } catch (error) {
    console.error('People export error:', error)
    return NextResponse.json({ error: 'Failed to export all people schedules' }, { status: 500 })
  }
}


