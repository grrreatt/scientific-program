import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDuration, formatTimeCompact } from '@/lib/utils'
import * as XLSX from 'xlsx'

// Ensure Node.js runtime (needed for xlsx and Buffer)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Server-side Supabase client (no session persistence)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase env vars missing')
    }
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

    // Fetch sessions and related ids, then fetch speakers in one go to build an id->speaker map
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions_with_times')
      .select(`
        *,
        session_participants(role, speaker_id),
        sub_sessions(id, title, topic, start_time, end_time, speaker_id, chairperson_id, expert_ids)
      `)

    if (sessionsError) {
      throw sessionsError
    }

    // Build speakers map for fast lookup
    const uniqueIds = new Set<string>()
    sessions?.forEach((s: any) => {
      (s.session_participants || []).forEach((p: any) => p.speaker_id && uniqueIds.add(p.speaker_id))
      ;(s.sub_sessions || []).forEach((sub: any) => {
        if (sub.speaker_id) uniqueIds.add(sub.speaker_id)
        if (sub.chairperson_id) uniqueIds.add(sub.chairperson_id)
        ;(sub.expert_ids || []).forEach((id: string) => id && uniqueIds.add(id))
      })
    })
    const idList = Array.from(uniqueIds)
    const speakerMap: Record<string, { name: string; email?: string; organization?: string }> = {}
    if (idList.length) {
      const { data: spData } = await supabase.from('speakers').select('id,name,email,organization').in('id', idList)
      spData?.forEach((sp: any) => { speakerMap[sp.id] = { name: sp.name, email: sp.email, organization: sp.organization } })
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
          const sp = participant.speaker_id ? speakerMap[participant.speaker_id] : undefined
          const row = {
            name: sp?.name || 'Unknown',
            email: sp?.email || '',
            session: session.title,
            session_topic: session.topic || '',
            role: participant.role,
            time: timeRange12h,
            talk_topic: '',
            hall: stageName,
            day: dayName,
            type: session.session_type,
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
          type: session.session_type,
        }
        rowsByDay[dayName] = rowsByDay[dayName] || []
        rowsByDay[dayName].push(row)
      }

      // Include sub-sessions (speaker, chairperson, expert each as separate row if present)
      if (session.sub_sessions && session.sub_sessions.length > 0) {
        session.sub_sessions.forEach((sub: any) => {
          const subTime = `${formatTimeCompact(sub.start_time)}-${formatTimeCompact(sub.end_time)}`
          const pushRow = (spId: string | null, role: string) => {
            if (!spId) return
            const sp = speakerMap[spId] || {}
            const row = {
              name: sp.name || '',
              email: sp.email || '',
              session: session.title,
              session_topic: session.topic || '',
              role,
              time: subTime,
              talk_topic: sub.title || '',
              hall: stageName,
              day: dayName,
              type: session.session_type,
            }
            rowsByDay[dayName] = rowsByDay[dayName] || []
            rowsByDay[dayName].push(row)
          }
          pushRow(sub.speaker_id || null, 'speaker')
          pushRow(sub.chairperson_id || null, 'chairperson')
          ;(sub.expert_ids || []).forEach((id: string) => pushRow(id, 'expert'))
        })
      }
    })

    // Build an Excel workbook with one sheet per day
    const workbook = XLSX.utils.book_new()
    const orderedDays = Object.keys(rowsByDay).sort()
    const columnsOrder = ['name','email','session','session_topic','role','time','talk_topic','hall','day','type']
    orderedDays.forEach(day => {
      const rows = rowsByDay[day]
      const sheet = XLSX.utils.json_to_sheet(rows, { header: columnsOrder })
      // Set header names nicer
      XLSX.utils.sheet_add_aoa(sheet, [[
        'Name','Email','Session','Session Topic','Role','Time','Topic of Talk','Hall','Day','Type'
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

  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data', detail: error?.message || String(error) },
      { status: 500 }
    )
  }
} 