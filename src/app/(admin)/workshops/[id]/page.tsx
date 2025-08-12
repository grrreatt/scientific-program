'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Combobox } from '@/components/ui/combobox'

interface WorkshopForm {
  title: string
  topic: string
  day_id: string
  stage_id: string
  start_time: string
  end_time: string
  capacity?: number | null
  leads: string[]
  assistants: string[]
}

export default function EditWorkshopPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params
  const isNew = id === 'new'
  const [form, setForm] = useState<WorkshopForm>({
    title: '', topic: '', day_id: '', stage_id: '', start_time: '09:00', end_time: '10:00', capacity: null, leads: [], assistants: []
  })
  const [speakers, setSpeakers] = useState<Array<{ id: string; name: string }>>([])
  const [days, setDays] = useState<Array<{ id: string; name: string }>>([])
  const [halls, setHalls] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)
  const AnyCombobox: any = Combobox

  useEffect(() => {
    const load = async () => {
      const [{ data: sp }, { data: ds }, { data: hs }] = await Promise.all([
        supabase.from('speakers').select('id,name').order('name'),
        supabase.from('conference_days').select('id,name').order('name'),
        supabase.from('stages').select('id,name').order('name')
      ])
      setSpeakers(sp || [])
      setDays(ds || [])
      setHalls(hs || [])
      if (!isNew) {
        const { data } = await supabase.from('sessions').select('*').eq('id', id).single()
        if (data) setForm(prev => ({ ...prev, ...data, leads: [], assistants: [] }))
      }
    }
    load()
  }, [id, isNew])

  const save = async () => {
    setSaving(true)
    const base = {
      title: form.title,
      topic: form.topic,
      day_id: form.day_id,
      stage_id: form.stage_id,
      session_type: 'workshop',
      custom_start_time: form.start_time,
      custom_end_time: form.end_time,
    }
    const { data, error } = isNew
      ? await supabase.from('sessions').insert(base).select('id').single()
      : await supabase.from('sessions').update(base).eq('id', id)
    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }
    const workshopId = isNew ? (data as any)?.id : id
    // Replace participants
    await supabase.from('session_participants').delete().eq('session_id', workshopId)
    const rows: Array<{ session_id: string; speaker_id: string; role: string }> = []
    form.leads.filter(Boolean).forEach(s => rows.push({ session_id: workshopId, speaker_id: s, role: 'workshop_lead' }))
    form.assistants.filter(Boolean).forEach(s => rows.push({ session_id: workshopId, speaker_id: s, role: 'assistant' }))
    if (rows.length) await supabase.from('session_participants').insert(rows)
    setSaving(false)
    router.push('/admin/workshops')
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">{isNew ? 'Add Workshop' : 'Edit Workshop'}</h1>
      <div className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder="Topic" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} />
        <select className="w-full border rounded px-3 py-2" value={form.day_id} onChange={e => setForm({ ...form, day_id: e.target.value })}>
          <option value="">Select Day</option>
          {days.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="w-full border rounded px-3 py-2" value={form.stage_id} onChange={e => setForm({ ...form, stage_id: e.target.value })}>
          <option value="">Select Hall</option>
          {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input className="w-full border rounded px-3 py-2" placeholder="Start (HH:MM)" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
          <input className="w-full border rounded px-3 py-2" placeholder="End (HH:MM)" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Leads</label>
          <div className="space-y-2 mt-1">
            {form.leads.map((id, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1">
                  <AnyCombobox
                    label="Lead"
                    idBase={`workshop-lead-${i}`}
                    value={id}
                    onChange={(val) => setForm({ ...form, leads: form.leads.map((v, idx) => idx === i ? val : v) })}
                    options={speakers.map(s => ({ value: s.id, label: s.name }))}
                    allowFreeText
                  />
                </div>
                <button className="text-red-600 h-11 px-2" onClick={() => setForm({ ...form, leads: form.leads.filter((_, idx) => idx !== i) })}>×</button>
              </div>
            ))}
            <button className="text-indigo-600" onClick={() => setForm({ ...form, leads: [...form.leads, ''] })}>+ Add Lead</button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Assistants</label>
          <div className="space-y-2 mt-1">
            {form.assistants.map((id, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1">
                  <AnyCombobox
                    label="Assistant"
                    idBase={`workshop-assistant-${i}`}
                    value={id}
                    onChange={(val) => setForm({ ...form, assistants: form.assistants.map((v, idx) => idx === i ? val : v) })}
                    options={speakers.map(s => ({ value: s.id, label: s.name }))}
                    allowFreeText
                  />
                </div>
                <button className="text-red-600 h-11 px-2" onClick={() => setForm({ ...form, assistants: form.assistants.filter((_, idx) => idx !== i) })}>×</button>
              </div>
            ))}
            <button className="text-indigo-600" onClick={() => setForm({ ...form, assistants: [...form.assistants, ''] })}>+ Add Assistant</button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1.5 border rounded" onClick={() => router.push('/admin/workshops')}>Cancel</button>
          <button className="px-3 py-1.5 bg-indigo-600 text-white rounded" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Workshop'}</button>
        </div>
      </div>
    </div>
  )
}


