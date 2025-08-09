'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function PublicWorkshopsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*, session_participants(role, speakers(name))')
        .eq('session_type', 'workshop')
        .order('created_at', { ascending: true })
      setItems(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Workshops</h1>
      <div className="space-y-3">
        {items.map(w => (
          <div key={w.id} className="border rounded p-4">
            <div className="text-lg font-medium">{w.title}</div>
            <div className="text-sm text-gray-600">{w.custom_start_time} – {w.custom_end_time}</div>
            {Array.isArray(w.session_participants) && w.session_participants.length > 0 && (
              <div className="text-sm mt-2">
                <div><span className="font-medium">Leads:</span> {w.session_participants.filter((p:any)=>p.role==='workshop_lead').map((p:any)=>p.speakers?.name).filter(Boolean).join(', ') || '—'}</div>
                <div><span className="font-medium">Assistants:</span> {w.session_participants.filter((p:any)=>p.role==='assistant').map((p:any)=>p.speakers?.name).filter(Boolean).join(', ') || '—'}</div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="text-gray-600">No workshops published yet.</div>}
      </div>
    </div>
  )
}


