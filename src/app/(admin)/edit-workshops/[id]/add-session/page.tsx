'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TimePicker } from '@/components/ui/time-picker'
import { PersonAutocomplete } from '@/components/ui/person-autocomplete'

export default function AddWorkshopSessionPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const workshopId = params?.id

  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('09:30')
  const [participants, setParticipants] = useState<Array<{ role: 'speaker' | 'moderator'; speaker_id: string }>>([])
  const [subtalks, setSubtalks] = useState<Array<{ title: string; speaker_id: string; chairperson_id?: string; expert_ids: string[]; start_time: string; end_time: string; topic: string }>>([])
  const [saving, setSaving] = useState(false)

  const addParticipant = (role: 'speaker' | 'moderator') => {
    setParticipants(prev => [...prev, { role, speaker_id: '' }])
  }

  const updateParticipant = (index: number, speakerId: string) => {
    setParticipants(prev => prev.map((p, i) => i === index ? { ...p, speaker_id: speakerId } : p))
  }

  const removeParticipant = (index: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== index))
  }

  const save = async () => {
    if (!workshopId) return
    if (!title.trim()) {
      alert('Please enter a session title')
      return
    }
    setSaving(true)
    try {
      // Determine next order
      const { data: existing } = await supabase
        .from('workshop_sessions')
        .select('session_order')
        .eq('workshop_id', workshopId)
      const nextOrder = (existing || []).reduce((m: number, r: any) => Math.max(m, r.session_order || 0), 0) + 1

      const { data: created, error } = await supabase
        .from('workshop_sessions')
        .insert({
          workshop_id: workshopId,
          title,
          start_time: startTime,
          end_time: endTime,
          session_order: nextOrder
        })
        .select('id')
        .single()
      if (error) throw error

      const sessionId = created?.id
      if (sessionId && participants.length > 0) {
        const rows = participants.filter(p => p.speaker_id).map(p => ({
          workshop_session_id: sessionId,
          speaker_id: p.speaker_id,
          role: p.role
        }))
        if (rows.length) {
          const { error: pErr } = await supabase
            .from('workshop_session_participants')
            .insert(rows)
          if (pErr) throw pErr
        }
      }
      // Save sub-talks
      if (sessionId && subtalks.length > 0) {
        const rows = subtalks
          .filter(st => st.title && st.start_time && st.end_time)
          .map(st => ({
            workshop_session_id: sessionId,
            title: st.title,
            speaker_id: st.speaker_id || null,
            chairperson_id: st.chairperson_id || null,
            expert_ids: (st.expert_ids || []).filter(Boolean),
            start_time: st.start_time,
            end_time: st.end_time,
            topic: st.topic || null
          }))
        if (rows.length) {
          const { error: stErr } = await supabase.from('workshop_sub_sessions').insert(rows)
          if (stErr) throw stErr
        }
      }
      router.push(`/edit-workshops/${workshopId}`)
    } catch (e: any) {
      console.error('Error saving workshop session:', e)
      alert(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Add Session</h1>
      <Card className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Session title"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TimePicker label="Start Time" value={startTime} onChange={setStartTime} required />
          <TimePicker label="End Time" value={endTime} onChange={setEndTime} required />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Participants</span>
            <Button variant="outline" size="sm" onClick={() => addParticipant('speaker')}>+ Speaker</Button>
            <Button variant="outline" size="sm" onClick={() => addParticipant('moderator')}>+ Moderator</Button>
          </div>
          {participants.map((p, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">{p.role}</label>
                <PersonAutocomplete value={p.speaker_id} onChange={(v) => updateParticipant(i, v)} placeholder="Select person" />
              </div>
              <Button variant="outline" size="sm" onClick={() => removeParticipant(i)}>Remove</Button>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* Sub-talks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Sub-talks</span>
              <Button variant="outline" size="sm" onClick={() => setSubtalks(prev => [...prev, { title: '', speaker_id: '', chairperson_id: '', expert_ids: [], start_time: startTime, end_time: endTime, topic: '' }])}>+ Add Sub-talk</Button>
            </div>
            <div className="space-y-3">
              {subtalks.map((st, i) => (
                <Card key={i} className="p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                      <input className="w-full border rounded px-2 py-1" value={st.title} onChange={(e) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                      <input className="w-full border rounded px-2 py-1" value={st.topic} onChange={(e) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, topic: e.target.value } : x))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Speaker</label>
                      <PersonAutocomplete value={st.speaker_id} onChange={(v) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, speaker_id: v } : x))} placeholder="Select person" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Chairperson</label>
                      <PersonAutocomplete value={st.chairperson_id || ''} onChange={(v) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, chairperson_id: v } : x))} placeholder="Select person" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Experts</label>
                      <div className="space-y-1">
                        {(st.expert_ids || []).map((eid, j) => (
                          <div key={j} className="flex items-end gap-2">
                            <div className="flex-1">
                              <PersonAutocomplete value={eid} onChange={(v) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, expert_ids: x.expert_ids.map((y, k) => k === j ? v : y) } : x))} placeholder="Select expert" />
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, expert_ids: x.expert_ids.filter((_, k) => k !== j) } : x))}>Remove</Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, expert_ids: [...(x.expert_ids || []), ''] } : x))}>+ Add Expert</Button>
                      </div>
                    </div>
                    <div>
                      <TimePicker label="Start" value={st.start_time} onChange={(t) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, start_time: t } : x))} required />
                    </div>
                    <div>
                      <TimePicker label="End" value={st.end_time} onChange={(t) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, end_time: t } : x))} required />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" size="sm" onClick={() => setSubtalks(prev => prev.filter((_, idx) => idx !== i))}>Delete Sub-talk</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => router.push(`/edit-workshops/${workshopId}`)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </Card>
    </div>
  )
}


