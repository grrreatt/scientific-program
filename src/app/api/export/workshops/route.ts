import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase env vars missing for workshop export')
}
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const day = searchParams.get('day')
    const topicId = searchParams.get('topic_id')

    // Build query based on filter
    let query = supabase
      .from('workshops')
      .select(`
        *,
        convenor:speakers!convenor_id(name, email),
        co_convenor:speakers!co_convenor_id(name, email),
        sessions:workshop_sessions(
          *,
          participants:workshop_session_participants(
            role,
            speaker:speakers(name, email)
          )
        )
      `)

    if (filter === 'day' && day) {
      query = query.eq('day_date', day)
    } else if (filter === 'topic' && topicId) {
      query = query.eq('id', topicId)
    }

    const { data: workshops, error } = await query.order('day_date', { ascending: true })

    if (error) {
      console.error('Error fetching workshops:', error)
      return NextResponse.json({ error: 'Failed to fetch workshops' }, { status: 500 })
    }

    if (!workshops || workshops.length === 0) {
      return NextResponse.json({ message: 'No workshops found' }, { status: 404 })
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new()

    // Process each workshop
    workshops.forEach(workshop => {
      const worksheetData: any[] = []

      // Add workshop header
      worksheetData.push(['Workshop Details'])
      worksheetData.push(['Topic', workshop.topic])
      worksheetData.push(['Description', workshop.description || ''])
      worksheetData.push(['Day', workshop.day_date ? new Date(workshop.day_date).toLocaleDateString() : ''])
      worksheetData.push(['Venue', workshop.venue || ''])
      worksheetData.push(['Convenor', workshop.convenor?.name || ''])
      worksheetData.push(['Convenor Email', workshop.convenor?.email || ''])
      worksheetData.push(['Co-convenor', workshop.co_convenor?.name || ''])
      worksheetData.push(['Co-convenor Email', workshop.co_convenor?.email || ''])
      worksheetData.push([]) // Empty row

      // Add sessions header
      worksheetData.push(['Sessions'])
      worksheetData.push(['Session Title', 'Start Time', 'End Time', 'Participants'])

      // Add sessions
      if (workshop.sessions) {
        workshop.sessions.forEach((session: any) => {
          const participants = session.participants
            ?.map((p: any) => `${p.speaker?.name} (${p.role})`)
            .join(', ') || ''
          
          worksheetData.push([
            session.title,
            session.start_time,
            session.end_time,
            participants
          ])
        })
      }

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
      
      // Set column widths
      const colWidths = [
        { wch: 30 }, // Topic/Title
        { wch: 15 }, // Time/Email
        { wch: 15 }, // Time/Email
        { wch: 50 }  // Participants
      ]
      worksheet['!cols'] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, workshop.topic.substring(0, 31))
    })

    // Generate filename
    let filename = 'workshops_export.xlsx'
    if (filter === 'day' && day) {
      const dateStr = day.replace(/-/g, '-')
      filename = `workshops_${dateStr}.xlsx`
    } else if (filter === 'topic' && topicId) {
      const workshop = workshops[0]
      const topicStr = workshop.topic.replace(/[^a-zA-Z0-9]/g, '_')
      filename = `workshop_${topicStr}.xlsx`
    }

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
