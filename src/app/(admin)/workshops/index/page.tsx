'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Workshop {
  id: string
  title: string
  custom_start_time?: string
  custom_end_time?: string
}

export default function AdminWorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sessions')
      .select('id,title,custom_start_time,custom_end_time')
      .eq('session_type', 'workshop')
      .order('created_at', { ascending: true })
    if (error) {
      setError(error.message)
      setWorkshops([])
    } else {
      setError(null)
      setWorkshops((data as any[]) as Workshop[])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Workshops</h1>
        <a href="/workshops/new" className="px-3 py-1.5 bg-indigo-600 text-white rounded">Add Workshop</a>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="space-y-2">
          {workshops.map(w => (
            <div key={w.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{w.title}</div>
                <div className="text-sm text-gray-600">{w.custom_start_time || '—'} – {w.custom_end_time || '—'}</div>
              </div>
              <a href={`/workshops/${w.id}`} className="text-indigo-600">Edit</a>
            </div>
          ))}
          {workshops.length === 0 && <div className="text-gray-600">No workshops yet.</div>}
        </div>
      )}
    </div>
  )
}


