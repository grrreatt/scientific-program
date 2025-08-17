import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase service credentials missing')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const supabase = getServiceClient()

    const insertData = {
      topic: (payload.topic || '').trim(),
      description: payload.description || null,
      venue: payload.venue || null,
      day_date: payload.day_date || null,
      convenor_id: payload.convenor_id || null,
      co_convenor_id: payload.co_convenor_id || null
    }

    const { data, error } = await supabase
      .from('workshops')
      .insert(insertData)
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data?.id }, { status: 200 })
  } catch (err: any) {
    console.error('API POST /api/workshops error:', err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await request.json()
    const supabase = getServiceClient()
    const id = payload.id
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const updateData = {
      topic: (payload.topic || '').trim(),
      description: payload.description || null,
      venue: payload.venue || null,
      day_date: payload.day_date || null,
      convenor_id: payload.convenor_id || null,
      co_convenor_id: payload.co_convenor_id || null
    }

    const { error } = await supabase
      .from('workshops')
      .update(updateData)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    console.error('API PUT /api/workshops error:', err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}


