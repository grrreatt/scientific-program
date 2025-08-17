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
  const [description, setDescription] = useState('')
  const [capacity, setCapacity] = useState('')
  const [participants, setParticipants] = useState<Array<{ role: 'speaker' | 'moderator' | 'chairperson' | 'panelist' | 'expert'; speaker_id: string }>>([])
  const [subtalks, setSubtalks] = useState<Array<{ 
    title: string; 
    speaker_id: string; 
    chairperson_id?: string; 
    expert_ids: string[]; 
    start_time: string; 
    end_time: string; 
    topic: string;
    sub_session_type: 'lecture' | 'discussion';
    description?: string;
  }>>([])
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([])
  const [saving, setSaving] = useState(false)

  const addParticipant = (role: 'speaker' | 'moderator' | 'chairperson' | 'panelist' | 'expert') => {
    setParticipants(prev => [...prev, { role, speaker_id: '' }])
  }

  const updateParticipant = (index: number, speakerId: string) => {
    setParticipants(prev => prev.map((p, i) => i === index ? { ...p, speaker_id: speakerId } : p))
  }

  const removeParticipant = (index: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== index))
  }

  const addSubTalk = () => {
    setSubtalks(prev => [...prev, { 
      title: '', 
      speaker_id: '', 
      chairperson_id: '', 
      expert_ids: [], 
      start_time: startTime, 
      end_time: endTime, 
      topic: '',
      sub_session_type: 'lecture',
      description: ''
    }])
  }

  const addDiscussionBlock = () => {
    const existingIndex = subtalks.findIndex(st => st.sub_session_type === 'discussion')
    if (existingIndex !== -1) return
    
    const lectureOnly = subtalks.filter(st => st.sub_session_type !== 'discussion')
    const start = lectureOnly.length > 0 ? (lectureOnly[lectureOnly.length - 1].end_time || startTime) : startTime
    const end = endTime
    
    setSubtalks(prev => [...prev, { 
      title: 'Discussion', 
      speaker_id: '', 
      chairperson_id: '', 
      expert_ids: [], 
      start_time: start, 
      end_time: end, 
      topic: '',
      sub_session_type: 'discussion',
      description: ''
    }])
  }

  const removeDiscussion = () => {
    setSubtalks(prev => prev.filter(st => st.sub_session_type !== 'discussion'))
  }

  const addCustomField = () => {
    setCustomFields(prev => [...prev, { key: '', value: '' }])
  }

  const updateCustomField = (index: number, field: 'key' | 'value', value: string) => {
    setCustomFields(prev => prev.map((cf, i) => i === index ? { ...cf, [field]: value } : cf))
  }

  const removeCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index))
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
            topic: st.topic || null,
            sub_session_type: st.sub_session_type,
            description: st.description || null
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

  const participantTypes = [
    { key: 'speaker', label: 'Speaker', icon: '🎤' },
    { key: 'moderator', label: 'Moderator', icon: '🎤' },
    { key: 'chairperson', label: 'Chairperson', icon: '👔' },
    { key: 'panelist', label: 'Panelist', icon: '🧑‍⚖️' },
    { key: 'expert', label: 'Expert', icon: '🧠' }
  ] as const

  const subTalks = subtalks.filter(st => st.sub_session_type !== 'discussion')
  const discussion = subtalks.find(st => st.sub_session_type === 'discussion')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Add Workshop Session</h1>
      <Card className="p-6 space-y-6">
        {/* Basic Session Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Session title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., 50"
              type="number"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TimePicker label="Start Time" value={startTime} onChange={setStartTime} required />
          <TimePicker label="End Time" value={endTime} onChange={setEndTime} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Session description"
            rows={3}
          />
        </div>

        {/* Participants Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Participants</h3>
          <div className="space-y-3">
            {participantTypes.map(({ key, label, icon }) => {
              const typeParticipants = participants.filter(p => p.role === key)
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">{icon} {label}s:</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => addParticipant(key as any)}
                      className="px-2 py-0.5 text-xs bg-indigo-50 hover:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
                    >
                      + Add {label}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {typeParticipants.map((p, i) => (
                      <div key={i} className="flex items-end gap-2">
                        <div className="flex-1">
                          <PersonAutocomplete 
                            value={p.speaker_id} 
                            onChange={(v) => updateParticipant(participants.indexOf(p), v)} 
                            placeholder={`Select ${label.toLowerCase()}`} 
                          />
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeParticipant(participants.indexOf(p))}
                          className="px-2 py-0.5 text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    {typeParticipants.length === 0 && (
                      <div className="text-xs text-gray-500">No {label.toLowerCase()} added yet</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sub-talks and Discussion Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Sub-talks & Discussion</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addSubTalk}
                className="px-2 py-0.5 text-xs bg-indigo-50 hover:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
              >
                + Add Sub-talk
              </Button>
              {!discussion ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addDiscussionBlock}
                  className="px-2 py-0.5 text-xs bg-indigo-50 hover:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
                >
                  + Add Discussion
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={removeDiscussion}
                  className="px-2 py-0.5 text-xs bg-red-50 hover:bg-red-100 text-red-600"
                >
                  Remove Discussion
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {subTalks.map((st, i) => (
              <Card key={i} className="p-4 border-2 border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">Sub-talk {i + 1}</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSubtalks(prev => prev.filter((_, idx) => idx !== i))}
                      className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                      <input 
                        className="w-full border rounded px-2 py-1 text-sm" 
                        value={st.title} 
                        onChange={(e) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} 
                        placeholder="Sub-talk title"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                      <input 
                        className="w-full border rounded px-2 py-1 text-sm" 
                        value={st.topic} 
                        onChange={(e) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, topic: e.target.value } : x))} 
                        placeholder="Topic"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Speaker</label>
                      <PersonAutocomplete 
                        value={st.speaker_id} 
                        onChange={(v) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, speaker_id: v } : x))} 
                        placeholder="Select speaker" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Chairperson</label>
                      <PersonAutocomplete 
                        value={st.chairperson_id || ''} 
                        onChange={(v) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, chairperson_id: v } : x))} 
                        placeholder="Select chairperson" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Experts</label>
                      <div className="space-y-1">
                        {(st.expert_ids || []).map((eid, j) => (
                          <div key={j} className="flex items-end gap-2">
                            <div className="flex-1">
                              <PersonAutocomplete 
                                value={eid} 
                                onChange={(v) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, expert_ids: x.expert_ids.map((y, k) => k === j ? v : y) } : x))} 
                                placeholder="Select expert" 
                              />
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, expert_ids: x.expert_ids.filter((_, k) => k !== j) } : x))}
                              className="px-1 py-0.5 text-xs"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, expert_ids: [...(x.expert_ids || []), ''] } : x))}
                          className="px-2 py-0.5 text-xs bg-indigo-50 hover:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
                        >
                          + Add Expert
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <TimePicker 
                      label="Start Time" 
                      value={st.start_time} 
                      onChange={(t) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, start_time: t } : x))} 
                      required 
                    />
                    <TimePicker 
                      label="End Time" 
                      value={st.end_time} 
                      onChange={(t) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, end_time: t } : x))} 
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      className="w-full border rounded px-2 py-1 text-sm" 
                      value={st.description || ''} 
                      onChange={(e) => setSubtalks(prev => prev.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} 
                      placeholder="Sub-talk description"
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            ))}

            {/* Discussion Block */}
            {discussion && (
              <Card className="p-4 border-2 border-blue-200 bg-blue-50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-blue-900">Discussion Block</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={removeDiscussion}
                      className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                      <input 
                        className="w-full border rounded px-2 py-1 text-sm" 
                        value={discussion.title} 
                        onChange={(e) => setSubtalks(prev => prev.map((x, idx) => idx === subtalks.indexOf(discussion) ? { ...x, title: e.target.value } : x))} 
                        placeholder="Discussion title"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                      <input 
                        className="w-full border rounded px-2 py-1 text-sm" 
                        value={discussion.topic} 
                        onChange={(e) => setSubtalks(prev => prev.map((x, idx) => idx === subtalks.indexOf(discussion) ? { ...x, topic: e.target.value } : x))} 
                        placeholder="Discussion topic"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <TimePicker 
                      label="Start Time" 
                      value={discussion.start_time} 
                      onChange={(t) => setSubtalks(prev => prev.map((x, idx) => idx === subtalks.indexOf(discussion) ? { ...x, start_time: t } : x))} 
                      required 
                    />
                    <TimePicker 
                      label="End Time" 
                      value={discussion.end_time} 
                      onChange={(t) => setSubtalks(prev => prev.map((x, idx) => idx === subtalks.indexOf(discussion) ? { ...x, end_time: t } : x))} 
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      className="w-full border rounded px-2 py-1 text-sm" 
                      value={discussion.description || ''} 
                      onChange={(e) => setSubtalks(prev => prev.map((x, idx) => idx === subtalks.indexOf(discussion) ? { ...x, description: e.target.value } : x))} 
                      placeholder="Discussion description"
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Custom Fields Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Custom Fields</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addCustomField}
              className="px-2 py-0.5 text-xs bg-indigo-50 hover:bg-indigo-100 focus:ring-1 focus:ring-indigo-500"
            >
              + Add Custom Field
            </Button>
          </div>
          
          <div className="space-y-2">
            {customFields.map((cf, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Field Name</label>
                  <input 
                    className="w-full border rounded px-2 py-1 text-sm" 
                    value={cf.key} 
                    onChange={(e) => updateCustomField(i, 'key', e.target.value)} 
                    placeholder="Field name"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                  <input 
                    className="w-full border rounded px-2 py-1 text-sm" 
                    value={cf.value} 
                    onChange={(e) => updateCustomField(i, 'value', e.target.value)} 
                    placeholder="Field value"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeCustomField(i)}
                  className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            ))}
            {customFields.length === 0 && (
              <div className="text-xs text-gray-500">No custom fields added yet</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => router.push(`/edit-workshops/${workshopId}`)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Session'}
          </Button>
        </div>
      </Card>
    </div>
  )
}


