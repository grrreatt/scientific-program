import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { formatTimeRange } from '@/lib/utils'

// Lazy import to avoid bundling on edge if not used
let XLSX: any

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const name = (searchParams.get('name') || '').trim()
    const format = (searchParams.get('format') || 'xlsx').toLowerCase()

    if (!name) {
      return NextResponse.json({ error: 'Missing required parameter: name' }, { status: 400 })
    }

    // Fetch sessions with participants and sub-sessions
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

    const lowerName = name.toLowerCase()

    type Row = {
      Name: string
      Session: string
      'Session topic': string
      Time: string
      Role: string
      Topic: string
    }

    const rows: Row[] = []

    const sessionList = (sessions ?? []) as any[]
    sessionList.forEach((session: any) => {
      const sessionTitle = session.title || ''
      const sessionTopic = session.topic || ''
      const sessionTime = formatTimeRange(session.start_time, session.end_time)

      // Session-level participants
      const parts = session.session_participants || []
      parts.forEach((p: any) => {
        const personName = p.speakers?.name || ''
        if (!personName) return
        if (personName.toLowerCase().includes(lowerName)) {
          rows.push({
            Name: personName,
            Session: sessionTitle,
            'Session topic': sessionTopic,
            Time: sessionTime,
            Role: p.role || '',
            Topic: sessionTopic,
          })
        }
      })

      // Sub-sessions (sub-talks / discussion)
      const subs = (session.sub_sessions ?? []) as any[]
      subs.forEach((sub: any) => {
        const subSpeaker = sub.speakers?.name || ''
        if (!subSpeaker) return
        if (subSpeaker.toLowerCase().includes(lowerName)) {
          const subTime = formatTimeRange(sub.start_time, sub.end_time)
          rows.push({
            Name: subSpeaker,
            Session: sessionTitle,
            'Session topic': sessionTopic,
            Time: subTime,
            Role: 'speaker',
            Topic: sub.topic || '',
          })
        }
      })
    })

    if (rows.length === 0) {
      return NextResponse.json({ error: `No records found for name: ${name}` }, { status: 404 })
    }

    if (format === 'csv') {
      const headers = ['Name', 'Session', 'Session topic', 'Time', 'Role', 'Topic']
      const csv = [
        headers.join(','),
        ...rows.map(r => [r.Name, r.Session, r['Session topic'], r.Time, r.Role, r.Topic].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="person-schedule-${encodeURIComponent(name)}.csv"`
        }
      })
    }

    // Default: Excel (xlsx)
    if (!XLSX) {
      XLSX = await import('xlsx')
    }
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedule')
    const wbout = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    return new NextResponse(wbout, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="person-schedule-${encodeURIComponent(name)}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Person export error:', error)
    return NextResponse.json({ error: 'Failed to export person schedule' }, { status: 500 })
  }
}


