'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { generateId } from '@/lib/utils'
import { SESSION_TYPES, MEAL_TYPES } from '@/lib/constants'
import { TimePicker } from '@/components/ui/time-picker'
import { Combobox } from '@/components/ui/combobox'
import { formatTime12h, parseTime12h, getSessionNumberDisplay, getSessionTitleSuggestions, getNextStartTime, calculateDuration } from '@/lib/utils'

interface SessionFormData {
  title: string
  topic: string
  day_id: string
  stage_id: string
  time_slot_id: string
  custom_start_time: string
  custom_end_time: string
  description: string
  is_parallel_meal: boolean
  parallel_meal_type: string
  speaker_id: string
  chairperson_id: string
  moderator_id: string
  panelist_ids: string[]
  workshop_lead_ids: string[]
  assistant_ids: string[]
  capacity: string
  introducer_id: string
  presenter_ids: string[]
  discussion_leader_id: string
  meal_type: string
  // Dynamic participant arrays for all session types
  speakers: Array<{ id: string; role: string }>
  moderators: Array<{ id: string; role: string }>
  chairpersons: Array<{ id: string; role: string }>
  panelists: Array<{ id: string; role: string }>
  experts: Array<{ id: string; role: string }>
  // Symposium specific
  symposium_subtalks: Array<{
    title: string
    speaker_name: string
    start_time: string
    end_time: string
    topic: string
    description?: string
  }>
  // Sub-sessions for Session type
  sub_sessions: Array<{
    id?: string
    title: string
    speaker_id: string
    start_time: string
    end_time: string
    topic: string
    sub_session_type: 'lecture' | 'discussion'
  }>
  // Custom data for other session types
  custom_data: Record<string, any>
}

interface SessionFormProps {
  initialData?: Partial<SessionFormData>
  sessionType?: string
  onSubmit: (data: SessionFormData, sessionType: string) => void
  onCancel: () => void
  onDelete?: () => void
  isSubmitting?: boolean
  days?: Array<{ id: string; name: string; date: string }>
  halls?: Array<{ id: string; name: string; capacity?: number }>
  timeSlots?: Array<{ id: string; start_time: string; end_time: string; is_break: boolean; break_title?: string }>
  isAddingNewSession?: boolean
  speakers?: Array<{ id: string; name: string; email?: string; title?: string; organization?: string }>
  sessions?: Array<any>
  selectedDay?: string
  onPersonCreated?: (person: { id: string; name: string }) => void
}

export function SessionForm({ 
  initialData = {}, 
  sessionType = 'session', 
  onSubmit, 
  onCancel, 
  onDelete,
  isSubmitting = false,
  days = [],
  halls = [],
  timeSlots = [],
  isAddingNewSession = false,
  speakers = [],
  sessions = [],
  selectedDay = '',
  onPersonCreated
}: SessionFormProps) {
  const [currentSessionType, setCurrentSessionType] = useState(sessionType)
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false)
  const [participantSearchTerms, setParticipantSearchTerms] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createPerson = async (name: string) => {
    const term = (name || '').trim()
    if (!term) return { value: '', label: '' }
    const existing = speakers.find(s => (s.name || '').toLowerCase() === term.toLowerCase())
    if (existing) return { value: existing.id, label: existing.name }
    try {
      const { supabase } = await import('@/lib/supabase/client')
      const { data, error } = await supabase
        .from('speakers')
        .insert({ name: term })
        .select('id, name')
        .single()
      if (error) throw error
      if (onPersonCreated) onPersonCreated({ id: data!.id, name: data!.name })
      return { value: data!.id, label: data!.name }
    } catch (err) {
      console.error('Error creating person:', err)
      alert('Could not add person. Please try again.')
      return { value: `temp:${term}`, label: term }
    }
  }

  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.participant-dropdown')) {
        setShowParticipantDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    topic: '',
    day_id: '',
    stage_id: '',
    time_slot_id: '',
    custom_start_time: '08:00',
    custom_end_time: '08:30',
    description: '',
    is_parallel_meal: false,
    parallel_meal_type: '',
    speaker_id: '',
    chairperson_id: '',
    moderator_id: '',
    panelist_ids: [],
    workshop_lead_ids: [],
    assistant_ids: [],
    capacity: '',
    introducer_id: '',
    presenter_ids: [],
    discussion_leader_id: '',
    meal_type: '',
    speakers: [],
    moderators: [],
    chairpersons: [],
    panelists: [],
    experts: [],
    symposium_subtalks: [],
    sub_sessions: [],
    custom_data: {}
  })

  // Initialize form with provided initialData (hall, time slot, etc.) only once on mount
  const hasInitializedRef = useRef(false)
  useEffect(() => {
    if (hasInitializedRef.current) return
    setFormData(prev => ({
      ...prev,
      ...initialData,
    }))
    hasInitializedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When adding a new session from a grid click, pre-fill custom times from the selected time slot
  useEffect(() => {
    if (isAddingNewSession && initialData?.time_slot_id && timeSlots && timeSlots.length > 0) {
      const slot = timeSlots.find(s => s.id === initialData.time_slot_id)
      if (slot) {
        setFormData(prev => ({
          ...prev,
          time_slot_id: initialData.time_slot_id as string,
          stage_id: (initialData as any).stage_id || prev.stage_id,
          custom_start_time: prev.custom_start_time || slot.start_time,
          custom_end_time: prev.custom_end_time || slot.end_time,
        }))
      }
    }
  }, [isAddingNewSession, initialData, timeSlots])

  const handleInputChange = (field: string, value: any) => {
    console.log(`🔄 Input change: ${field} = ${value}`)
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // live validation
    if ((field === 'custom_start_time' || field === 'custom_end_time')) {
      const startStr = field === 'custom_start_time' ? value : formData.custom_start_time
      const endStr = field === 'custom_end_time' ? value : formData.custom_end_time
      if (startStr && endStr) {
        const start = new Date(`2000-01-01T${startStr}`)
        const end = new Date(`2000-01-01T${endStr}`)
      if (end <= start) {
        setErrors(prev => ({ ...prev, time: 'End time must be after start time' }))
      } else {
        setErrors(prev => { const { time, ...rest } = prev; return rest })
        }
      }
    }
  }

  const handleArrayChange = (field: string, index: number, value: string) => {
    console.log(`🔄 Array change: ${field}[${index}] = ${value}`)
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).map((item: string, i: number) => 
        i === index ? value : item
      )
    }))
  }

  const addArrayItem = (field: string) => {
    console.log(`➕ Adding array item to: ${field}`)
    if (field === 'symposium_subtalks') {
      setFormData(prev => ({
        ...prev,
        symposium_subtalks: [...(prev.symposium_subtalks || []), {
          title: '',
          speaker_name: '',
          start_time: '',
          end_time: '',
          topic: '',
          description: ''
        }]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof typeof prev] as string[]), '']
      }))
    }
  }

  const removeArrayItem = (field: string, index: number) => {
    console.log(`➖ Removing array item from: ${field}[${index}]`)
    if (field === 'symposium_subtalks') {
      setFormData(prev => ({
        ...prev,
        symposium_subtalks: (prev.symposium_subtalks || []).filter((_: any, i: number) => i !== index)
      }))
    } else if (field === 'speakers' || field === 'moderators' || field === 'chairpersons' || field === 'panelists' || field === 'experts') {
      setFormData(prev => ({
        ...prev,
        [field]: (prev[field as keyof typeof prev] as Array<{ id: string; role: string }>).filter((_: any, i: number) => i !== index)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: (prev[field as keyof typeof prev] as string[]).filter((_: string, i: number) => i !== index)
      }))
    }
  }

  const addParticipant = (type: 'speakers' | 'moderators' | 'chairpersons' | 'panelists' | 'experts') => {
    // Note: extended to support 'panelists' as well
    console.log(`➕ Adding participant to: ${type}`)
    setFormData(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), { id: '', role: type.slice(0, -1) }] // Remove 's' from end
    }))
  }

  // Sub-session management functions
  const addSubSession = () => {
    const lastSubSession = formData.sub_sessions[formData.sub_sessions.length - 1];
    const suggestedStartTime = lastSubSession ? getNextStartTime(lastSubSession.end_time) : formData.custom_start_time;
    const nextIndex = (formData.sub_sessions || []).filter(s => s.sub_session_type !== 'discussion').length + 1;
    
    setFormData(prev => ({
      ...prev,
      sub_sessions: [...(prev.sub_sessions || []), {
        id: generateId(),
        title: `Talk ${nextIndex}`,
        speaker_id: '',
        chairperson_id: '',
        expert_ids: [],
        start_time: suggestedStartTime,
        end_time: '',
        topic: '',
        sub_session_type: 'lecture'
      }]
    }))
  }

  const updateSubSession = (id: string | undefined, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      sub_sessions: prev.sub_sessions.map((subSession) => 
        subSession.id === id ? { ...subSession, [field]: value } : subSession
      )
    }))
  }

  const removeSubSession = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sub_sessions: prev.sub_sessions.filter((_, i) => i !== index)
    }))
  }

  // Auto-suggest session title
  const getSuggestedSessionTitle = () => {
    if (currentSessionType === 'session') {
      const sessionCount = sessions.filter(s => s.session_type === 'session' && s.day_name === selectedDay).length;
      const suggestions = getSessionTitleSuggestions(sessionCount + 1);
      return suggestions[0]; // Return first suggestion
    }
    return '';
  }

  const updateParticipant = (type: 'speakers' | 'moderators' | 'chairpersons' | 'panelists' | 'experts', index: number, speakerId: string) => {
    console.log(`🔄 Updating participant: ${type}[${index}] = ${speakerId}`)
    setFormData(prev => ({
      ...prev,
      [type]: (prev[type] || []).map((participant: any, i: number) => 
        i === index ? { ...participant, id: speakerId } : participant
      )
    }))
  }

  const getSortedSpeakers = (search: string) => {
    const term = (search || '').trim().toLowerCase()
    if (!term) return speakers
    return speakers.filter(s =>
      (s.name || '').toLowerCase().includes(term) || (s.email || '').toLowerCase().includes(term)
    )
  }

  // time conflict detection for selected participants (basic)
  const participantConflicts = useMemo(() => {
    const conflicts: Array<{ roleKey: string; index: number; speakerId: string }> = []
    const sessionStart = formData.custom_start_time
    const sessionEnd = formData.custom_end_time
    if (!sessionStart || !sessionEnd) return conflicts
    const sStart = new Date(`2000-01-01T${sessionStart}`).getTime()
    const sEnd = new Date(`2000-01-01T${sessionEnd}`).getTime()
    const selectedIds = [
      ...(formData.speakers || []).map(x => ({ key: 'speakers', id: x.id })),
      ...(formData.moderators || []).map(x => ({ key: 'moderators', id: x.id })),
      ...(formData.chairpersons || []).map(x => ({ key: 'chairpersons', id: x.id })),
      ...(formData.panelists || []).map(x => ({ key: 'panelists', id: x.id })),
      ...(formData.experts || []).map(x => ({ key: 'experts', id: x.id })),
    ].filter(x => x.id)
    selectedIds.forEach(({ key, id }, idx) => {
      // look through provided sessions prop for collisions on same day
      (sessions || []).forEach((sess: any) => {
        if (sess.day_name !== selectedDay) return
        const hasId = [
          ...(sess.speakers_ids || []),
          ...(sess.moderators_ids || []),
          ...(sess.chairpersons_ids || []),
          ...(sess.panelists_ids || []),
          ...(sess.experts_ids || [])
        ].includes(id)
        if (!hasId) return
        const otherStart = new Date(`2000-01-01T${sess.start_time || sess.custom_start_time || ''}`).getTime()
        const otherEnd = new Date(`2000-01-01T${sess.end_time || sess.custom_end_time || ''}`).getTime()
        if (!isNaN(otherStart) && !isNaN(otherEnd)) {
          const overlap = otherStart < sEnd && sStart < otherEnd
          if (overlap) conflicts.push({ roleKey: key, index: idx, speakerId: id })
        }
      })
    })
    return conflicts
  }, [formData.custom_start_time, formData.custom_end_time, formData.speakers, formData.moderators, formData.chairpersons, formData.panelists, formData.experts, sessions, selectedDay])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: require title for lecture sessions
    if (currentSessionType === 'lecture' && !formData.title?.trim()) {
      alert('Please enter a talk title for the lecture')
      return
    }
    
    // Validation: require start/end time for all sessions
    if (!formData.custom_start_time || !formData.custom_end_time) {
      alert('Please select session start and end time')
      return
    }

    // Auto-fill title for session if empty to satisfy DB NOT NULL constraint
    const dataToSubmit = { ...formData }
    if (currentSessionType === 'session' && !dataToSubmit.title) {
      const fallback = getSuggestedSessionTitle() || 'Session'
      dataToSubmit.title = fallback
    }

    onSubmit(dataToSubmit, currentSessionType)
  }

  const renderField = (fieldName: string, label: string, type: string = 'text', required: boolean = false) => {
    const value = formData[fieldName as keyof typeof formData]
    
    if (type === 'select') {
      const peopleFields = new Set([
        'speaker_id',
        'chairperson_id',
        'moderator_id',
        'discussion_leader_id',
        'introducer_id'
      ])
      const isPeopleSelect = peopleFields.has(fieldName)
      return (
        <div key={fieldName} className="w-full">
          {isPeopleSelect ? (
            <div className="w-full">
              <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <input
                id={fieldName}
                type="text"
                value={(value as string) || ''}
                onChange={(e) => handleInputChange(fieldName, e.target.value)}
                placeholder={`Type a name (new or existing)`}
                className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
              />
              <p className="text-xs text-gray-500 mt-1">You can type an existing name or a new person; it will be created on save.</p>
            </div>
          ) : (
            <>
          <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            id={fieldName}
            value={value as string}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            required={required}
            className="w-full block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
          >
            <option value="">Select {label}</option>
            {fieldName === 'day_id' && days.map(day => (
              <option key={day.id} value={day.id}>
                {day.name} - {day.date}
              </option>
            ))}
            {fieldName === 'stage_id' && halls.map(hall => (
              <option key={hall.id} value={hall.id}>
                {hall.name} {hall.capacity ? `(${hall.capacity} capacity)` : ''}
              </option>
            ))}
            {fieldName === 'time_slot_id' && timeSlots.map(slot => (
              <option key={slot.id} value={slot.id}>
                {slot.start_time} - {slot.end_time} {slot.is_break ? `(${slot.break_title || 'Break'})` : ''}
              </option>
            ))}
            {fieldName === 'meal_type' && (
              <>
                {MEAL_TYPES.map(meal => (
                  <option key={meal.value} value={meal.value}>
                    {meal.label}
                  </option>
                ))}
              </>
            )}
          </select>
            </>
          )}
        </div>
      )
    }

    if (type === 'checkbox') {
      return (
        <div key={fieldName} className="flex items-center">
          <input
            id={fieldName}
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => handleInputChange(fieldName, e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor={fieldName} className="ml-2 block text-sm text-gray-900">
            {label}
          </label>
        </div>
      )
    }

    if (type === 'textarea') {
      return (
        <div key={fieldName} className="w-full">
          <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id={fieldName}
            value={value as string}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            required={required}
            rows={3}
            className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
      )
    }

    return (
      <div key={fieldName} className="w-full">
        <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          id={fieldName}
          value={value as string}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          required={required}
          className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
        />
      </div>
    )
  }

  const renderArrayField = (fieldName: string, label: string, required: boolean = false) => {
    const values = formData[fieldName as keyof typeof formData] as string[]
    
    return (
      <div key={fieldName} className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {values.map((value, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">{index === 0 ? 'Assistant' : 'Assistant'}</label>
              <input
                type="text"
                value={value}
                onChange={(val) => handleArrayChange(fieldName, index, (val.target as HTMLInputElement).value)}
                placeholder="Type a name"
                className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
              />
            </div>
            {values.length > 1 && (
              <button
                type="button"
                onClick={() => removeArrayItem(fieldName, index)}
                className="text-red-600 hover:text-red-900 text-sm"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem(fieldName)}
          className="text-sm text-indigo-600 hover:text-indigo-900"
        >
          + Add {label}
        </button>
      </div>
    )
  }

  const renderSymposiumSubtalkFields = () => {
    const subtalks = formData.symposium_subtalks as Array<{
      title: string;
      speaker_name: string;
      start_time: string;
      end_time: string;
      topic: string;
      description?: string;
    }>;

    return (
      <div className="space-y-4">
        {subtalks.map((subtalk, index) => (
          <div key={index} className="grid grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor={`subtalk-title-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                Subtalk Title {index + 1}
              </label>
              <input
                type="text"
                id={`subtalk-title-${index}`}
                value={subtalk.title}
                onChange={(e) => {
                  const newSubtalks = [...subtalks];
                  newSubtalks[index].title = e.target.value;
                  setFormData(prev => ({ ...prev, symposium_subtalks: newSubtalks }));
                }}
                className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
              />
            </div>
            <div>
              <label htmlFor={`subtalk-speaker-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                Speaker
              </label>
              <select
                id={`subtalk-speaker-${index}`}
                value={(subtalk as any).speaker_id || ''}
                onChange={(e) => {
                  const newSubtalks = [...subtalks];
                  (newSubtalks[index] as any).speaker_id = e.target.value;
                  setFormData(prev => ({ ...prev, symposium_subtalks: newSubtalks }));
                }}
                className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3 text-gray-900"
              >
                <option value="">Select Speaker</option>
                {speakers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <TimePicker
                value={subtalk.start_time}
                onChange={(time) => {
                  const newSubtalks = [...subtalks];
                  newSubtalks[index].start_time = time;
                  setFormData(prev => ({ ...prev, symposium_subtalks: newSubtalks }));
                }}
                label="Start Time"
                required={true}
              />
            </div>
            <div>
              <TimePicker
                value={subtalk.end_time}
                onChange={(time) => {
                  const newSubtalks = [...subtalks];
                  newSubtalks[index].end_time = time;
                  setFormData(prev => ({ ...prev, symposium_subtalks: newSubtalks }));
                }}
                label="End Time"
                required={true}
              />
            </div>
            <div>
              <label htmlFor={`subtalk-topic-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                id={`subtalk-topic-${index}`}
                value={subtalk.topic}
                onChange={(e) => {
                  const newSubtalks = [...subtalks];
                  newSubtalks[index].topic = e.target.value;
                  setFormData(prev => ({ ...prev, symposium_subtalks: newSubtalks }));
                }}
                className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3 text-gray-900"
              />
            </div>
            {/* Description removed for de-clutter */}
            {subtalks.length > 1 && (
              <button
                type="button"
                onClick={() => removeArrayItem('symposium_subtalks', index)}
                className="text-red-600 hover:text-red-900 text-sm"
              >
                Remove Subtalk
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('symposium_subtalks')}
          className="text-sm text-indigo-600 hover:text-indigo-900"
        >
          + Add Subtalk
        </button>
      </div>
    );
  };

  // Unified Sub-talks section for Session and Symposium (optional for Symposium)
  const renderSubSessionsSection = () => {
    const isContainer = currentSessionType === 'session' || currentSessionType === 'symposium'
    if (!isContainer) return null

    const subSessions = formData.sub_sessions || []

    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center space-y-3">
          <h3 className="text-lg font-bold text-gray-900 text-center">Sub-talks</h3>
          <button
            type="button"
            onClick={addSubSession}
            data-testid="add-subtalk"
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none"
          >
            + Add Sub-talk
          </button>
        </div>

        {subSessions.length === 0 ? (
          <div className="text-xs text-gray-500">No sub-talks added yet</div>
        ) : (
          <div className="space-y-2">
            {subSessions.map((st, index) => (
              <div key={st.id || index} className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-2 rounded" data-testid="subtalk-row">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={st.title}
                    onChange={(e) => updateSubSession(st.id, 'title', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    placeholder={`Talk ${index + 1}`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={st.sub_session_type}
                    onChange={(e) => updateSubSession(st.id, 'sub_session_type', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="lecture">Lecture/Talk</option>
                    <option value="discussion">Discussion</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Speaker</label>
                  <input
                    type="text"
                    value={st.speaker_id || ''}
                    onChange={(e) => updateSubSession(st.id, 'speaker_id', e.target.value)}
                    placeholder="Type a name"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <TimePicker
                    value={st.start_time}
                    onChange={(t) => updateSubSession(st.id, 'start_time', t)}
                    label="Start"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <TimePicker
                    value={st.end_time}
                    onChange={(t) => updateSubSession(st.id, 'end_time', t)}
                    label="End"
                    required
                  />
                </div>
                <div className="col-span-11">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Topic</label>
                  <input
                    type="text"
                    value={st.topic}
                    onChange={(e) => updateSubSession(st.id, 'topic', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    placeholder="Enter topic"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeSubSession(formData.sub_sessions.findIndex(ss => ss.id === st.id))}
                    data-testid="remove-subtalk"
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderCustomDataFields = () => {
    const customData = formData.custom_data as Record<string, any>;
    const keys = Object.keys(customData);

    return (
      <div className="space-y-4">
        {keys.map((key, index) => (
          <div key={key} className="grid grid-cols-2 gap-2 items-end">
            <div>
              <label htmlFor={`custom-key-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                Key
              </label>
              <input
                type="text"
                id={`custom-key-${index}`}
                value={key}
                onChange={(e) => {
                  const newCustomData = { ...customData };
                  newCustomData[e.target.value] = newCustomData[key];
                  delete newCustomData[key];
                  setFormData(prev => ({ ...prev, custom_data: newCustomData }));
                }}
                className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
              />
            </div>
            <div>
              <label htmlFor={`custom-value-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="text"
                id={`custom-value-${index}`}
                value={customData[key] || ''}
                onChange={(e) => {
                  const newCustomData = { ...customData };
                  newCustomData[key] = e.target.value;
                  setFormData(prev => ({ ...prev, custom_data: newCustomData }));
                }}
                className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
              />
            </div>
            {keys.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const newCustomData = { ...customData };
                  delete newCustomData[key];
                  setFormData(prev => ({ ...prev, custom_data: newCustomData }));
                }}
                className="text-red-600 hover:text-red-900 text-sm"
              >
                Remove Custom Field
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, custom_data: { ...prev.custom_data, [`custom_field_${Object.keys(prev.custom_data).length + 1}`]: '' } }))}
          className="text-sm text-indigo-600 hover:text-indigo-900"
        >
          + Add Custom Field
        </button>
      </div>
    );
  };

  const renderDynamicParticipants = () => {
    const participantTypes = [
      { key: 'speakers', label: 'Speaker', role: 'speaker', icon: '👨‍🏫' },
      { key: 'moderators', label: 'Moderator', role: 'moderator', icon: '🎤' },
      { key: 'chairpersons', label: 'Chairperson', role: 'chairperson', icon: '👔' },
      { key: 'panelists', label: 'Panelist', role: 'panelist', icon: '🧑‍⚖️' },
      { key: 'experts', label: 'Expert', role: 'expert', icon: '🧠' }
    ] as const;

    return (
      <div className="space-y-4">
          <h4 className="text-lg font-bold text-gray-900 text-center">Participants</h4>

        {/* Compact Participant Display */}
        <div className="space-y-2">
          {participantTypes.map(({ key, label, icon }) => {
          const participants = formData[key] || [];
            
            // Always render a role section; show helper if empty
          
          return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">{icon} {label}s:</span>
                  {/* Quick add buttons */}
                  <button type="button" onClick={() => addParticipant(key)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Add {label}</button>
              </div>
                <div className="space-y-1">
                  {participants.map((participant, index) => {
                    const rowKey = `${key}-${index}`
                    const searchTerm = participantSearchTerms[rowKey] || ''
                    return (
                      <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <input
                        type="text"
                        value={(() => {
                          // If participant.id is a UUID, resolve it to a name, otherwise show as-is
                          const id = participant.id || ''
                          if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
                            const speaker = speakers.find(s => s.id === id)
                            return speaker?.name || id
                          }
                          return id
                        })()}
                        onChange={(e) => updateParticipant(key as any, index, e.target.value)}
                        placeholder={`Type ${label.toLowerCase()} name (new or existing)`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                      {/* Conflict indicator */}
                      {participant.id && participantConflicts.some(c => c.speakerId === participant.id) && (
                        <span className="text-xs text-amber-600">⚠️ conflict</span>
                      )}
                      <button
                        type="button"
                          onClick={() => removeArrayItem(key as any, index)}
                          className="text-red-600 hover:text-red-900 text-sm font-bold"
                      >
                          ×
                      </button>
                    </div>
                    );
                  })}
                  {participants.length === 0 && (
                    <div className="text-sm text-gray-500 text-center italic">No {label.toLowerCase()}s added yet</div>
                  )}
                </div>
            </div>
          );
        })}
        </div>
      </div>
    );
  };

  const sessionConfig = SESSION_TYPES[currentSessionType]
  const requiredFields = sessionConfig.fields.required
  const optionalFields = sessionConfig.fields.optional

  const getSessionTypeLabel = (type: string) => {
    const sessionTypeConfig = SESSION_TYPES[type];
    return sessionTypeConfig ? sessionTypeConfig.name : type;
  };

  // Helpers specific to Session simplified flow
  const getSessionDurationMinutes = (): number => {
    const start = formData.custom_start_time
    const end = formData.custom_end_time
    if (!start || !end) return 0
    const s = new Date(`2000-01-01T${start}`)
    const e = new Date(`2000-01-01T${end}`)
    return Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000))
  }

  const getCoveredMinutes = (): number => {
    const items = (formData.sub_sessions || []).filter(ss => ss.start_time && ss.end_time)
    let total = 0
    items.forEach(ss => {
      const s = new Date(`2000-01-01T${ss.start_time}`)
      const e = new Date(`2000-01-01T${ss.end_time}`)
      total += Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000))
    })
    return total
  }

  const addDiscussionBlock = () => {
    const existingIndex = formData.sub_sessions.findIndex(ss => ss.sub_session_type === 'discussion')
    if (existingIndex !== -1) return
    // Start at last lecture end or session start; end at session end
    const lectureOnly = formData.sub_sessions.filter(ss => ss.sub_session_type !== 'discussion')
    const start = lectureOnly.length > 0 ? (lectureOnly[lectureOnly.length - 1].end_time || formData.custom_start_time) : formData.custom_start_time
    const end = formData.custom_end_time
    setFormData(prev => ({
      ...prev,
      sub_sessions: [...prev.sub_sessions, {
        title: 'Discussion',
        speaker_id: '',
        start_time: start,
        end_time: end,
        topic: '',
        sub_session_type: 'discussion'
      }]
    }))
  }

  const updateDiscussionTime = (field: 'start_time' | 'end_time', value: string) => {
    const idx = formData.sub_sessions.findIndex(ss => ss.sub_session_type === 'discussion')
    if (idx === -1) return
    setFormData(prev => ({
      ...prev,
      sub_sessions: prev.sub_sessions.map((ss, i) => i === idx ? { ...ss, [field]: value } : ss)
    }))
  }

  const removeDiscussion = () => {
    setFormData(prev => ({
      ...prev,
      sub_sessions: prev.sub_sessions.filter(ss => ss.sub_session_type !== 'discussion')
    }))
  }

  const renderSessionSimplifiedFlow = () => {
    if (currentSessionType !== 'session') return null

    const subTalks = (formData.sub_sessions || []).filter(ss => ss.sub_session_type !== 'discussion')
    const discussion = (formData.sub_sessions || []).find(ss => ss.sub_session_type === 'discussion')
    const sessionMinutes = getSessionDurationMinutes()
    const coveredMinutes = getCoveredMinutes()
    const coverageOk = sessionMinutes > 0 && coveredMinutes === sessionMinutes

  return (
      <div className="space-y-4">
        {/* Actions */}
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={addSubSession}
            className="text-sm text-indigo-600 hover:text-indigo-800"
            data-testid="add-subtalk"
          >
            + Add Subtalk
          </button>
          <div className="hidden sm:block h-4 w-px bg-gray-300" />
          <div className="flex flex-col gap-2 min-w-[280px]">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Chairpersons</label>
              <button
                type="button"
                onClick={() => addParticipant('chairpersons')}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                + Add Chairperson
              </button>
            </div>
            {/* Selected chips */}
            {(formData.chairpersons || []).filter((c: any) => c.id).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(formData.chairpersons || []).filter((c: any) => c.id).map((c: any, idx: number) => {
                  const person = speakers.find(s => s.id === c.id)
                  return (
                    <span key={`${c.id}-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {person?.name || 'Unknown'}
                    </span>
                  )
                })}
              </div>
            )}
            {/* Inputs */}
            <div className="space-y-2">
              {(formData.chairpersons || []).map((c: any, idx: number) => (
                <div key={`chair-${idx}`} className="flex items-center gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Chairperson</label>
                    <input
                      type="text"
                      value={c.id || ''}
                      onChange={(e) => updateParticipant('chairpersons', idx, e.target.value)}
                      placeholder="Type a name"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('chairpersons', idx)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden sm:block h-4 w-px bg-gray-300" />
          {!discussion ? (
            <button
              type="button"
              onClick={addDiscussionBlock}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              + Add Discussion
            </button>
          ) : (
            <button
              type="button"
              onClick={removeDiscussion}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Remove Discussion
            </button>
          )}
        </div>

        {/* Subtalks list */}
        {subTalks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-gray-900 text-center">Subtalks</h4>
            {subTalks.map((st, index) => {
              const isFirst = index === 0
              return (
                <div
                  key={st.id || index}
                  role="group"
                  aria-label={`Subtalk ${index + 1}`}
                  className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-visible"
                  data-testid="subtalk-row"
                >
                  {/* Talk Header */}
                  <div className="text-center">
                    <h5 className="text-lg font-bold text-gray-800">Talk {index + 1}</h5>
                  </div>
                  {/* Row 1: Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-center">
                    <div className="sm:col-span-3 min-w-[160px] relative focus-within:z-20">
                    <TimePicker
                      value={isFirst ? formData.custom_start_time : st.start_time}
                      onChange={(t) => updateSubSession(st.id, 'start_time', t)}
                      label="Start"
                      required
                        idBase={`subtalk-${st.id || index}-start`}
                        ariaDescribedById={`subtalk-${st.id || index}-help`}
                    />
                  </div>
                    <div className="sm:col-span-3 min-w-[160px] relative focus-within:z-20">
                    <TimePicker
                      value={st.end_time}
                      onChange={(t) => updateSubSession(st.id, 'end_time', t)}
                      label="End"
                      required
                        idBase={`subtalk-${st.id || index}-end`}
                        ariaDescribedById={`subtalk-${st.id || index}-help`}
                    />
                  </div>
                  </div>

                  {/* Row 2: Speaker + Chairperson */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-6 min-w-[180px] relative focus-within:z-10">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Speaker *</label>
                      <input
                        type="text"
                        value={st.speaker_id}
                        onChange={(e) => updateSubSession(st.id, 'speaker_id', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        aria-describedby={`subtalk-${st.id || index}-help`}
                      />
                    </div>
                    <div className="sm:col-span-6 min-w-[180px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Chairperson</label>
                      <input
                        type="text"
                        value={(st as any).chairperson_id || ''}
                        onChange={(e) => updateSubSession(st.id, 'chairperson_id', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                  </div>
                  {/* Row 3: Expert + Topic */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-6 min-w-[180px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Expert</label>
                      <input
                        type="text"
                        value={(((st as any).expert_ids || [])[0]) || ''}
                        onChange={(e) => updateSubSession(st.id, 'expert_ids', e.target.value ? [e.target.value] : [])}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div className="sm:col-span-6 min-w-[180px] relative">
                      <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor={`subtalk-${st.id || index}-topic`}>Topic</label>
                    <input
                        id={`subtalk-${st.id || index}-topic`}
                      type="text"
                      value={st.topic}
                      onChange={(e) => updateSubSession(st.id, 'topic', e.target.value)}
                        className="w-full h-11 px-3 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter topic"
                        aria-describedby={`subtalk-${st.id || index}-help`}
                    />
                  </div>
                    <div className="sm:col-span-1 flex justify-end items-center">
                    <button
                      type="button"
                      onClick={() => removeSubSession(formData.sub_sessions.findIndex(ss => ss.id === st.id))}
                        className="text-red-600 hover:text-red-800 text-sm h-11 px-2"
                      aria-label={`Remove Subtalk`}
                      data-testid="remove-subtalk"
                    >
                      ×
                    </button>
                  </div>
                  </div>

                  <div id={`subtalk-${st.id || index}-help`} className="sr-only">Subtalk {index + 1} controls: Start, End, Speaker, Topic, Remove</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Discussion block */}
        {discussion && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Discussion</h4>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end bg-gray-50 p-2 rounded overflow-visible">
              <div className="col-span-3">
                <TimePicker
                  value={discussion.start_time}
                  onChange={(t) => updateDiscussionTime('start_time', t)}
                  label="Start"
                  required
                  idBase="discussion-start"
                />
              </div>
              <div className="col-span-3">
                <TimePicker
                  value={formData.custom_end_time}
                  onChange={(t) => handleInputChange('custom_end_time', t)}
                  label="End (Session End)"
                  required
                  disabled
                  idBase="discussion-end"
                />
              </div>
            </div>
            <div className="text-xs text-gray-600">
              Duration: {calculateDuration(discussion.start_time, formData.custom_end_time)}
            </div>
          </div>
        )}

        {/* Coverage indicator */}
        {formData.custom_start_time && formData.custom_end_time && (
          <div>
            <div className={`text-xs mb-1 ${coverageOk ? 'text-green-600' : 'text-amber-600'}`}>
              Covered {coveredMinutes} min of {sessionMinutes} min
            </div>
            {/* completeness bar: title + time + >=1 speaker for non-session types; "session" completeness is time only */}
            <div className="h-1 bg-gray-200 rounded">
              <div
                className={`h-1 rounded ${((formData.title || currentSessionType==='session') && formData.custom_start_time && formData.custom_end_time && (formData.speakers?.some(s=>s.id) || currentSessionType==='session')) ? 'bg-green-500 w-full' : 'bg-amber-500 w-2/3'}`}
              />
            </div>
            {errors.time && <div className="text-[11px] text-red-600 mt-1">{errors.time}</div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Session Type Selection */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-5 text-center">Session Type</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            'lecture',
            'session',
            'panel',
            'symposium',
            // 'workshop' removed from session form; handled in dedicated Workshops page
            'oration',
            'guest_lecture',
            'discussion',
            // 'break' removed; use Global Block for breaks/meals
            'other'
          ].filter(key => SESSION_TYPES[key]).map((key) => {
            const type = SESSION_TYPES[key]
            return (
            <div
              key={key}
              className={`relative rounded-lg border p-4 cursor-pointer text-sm transition-all duration-200 ${
                currentSessionType === key
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
              }`}
              onClick={() => setCurrentSessionType(key)}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name="sessionType"
                  value={key}
                  checked={currentSessionType === key}
                  onChange={() => setCurrentSessionType(key)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label className="ml-3 block text-base font-bold text-gray-900">
                  {type.name}
                </label>
              </div>
            </div>
            )
          })}
        </div>
      </div>

      {/* Core Fields: Title, Topic, Time */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h3 className="text-xl font-bold text-gray-900 text-center border-b border-gray-100 pb-3">Session Details</h3>
        
        <div className="space-y-6">
          {/* Session Title - Show for ALL session types */}
          <div>
            <label className="block text-xl font-bold text-gray-800 mb-3 text-center">
              {currentSessionType === 'lecture' ? 'Talk Title *' : 
               currentSessionType === 'session' ? 'Session Title' : 'Session Title *'}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder={currentSessionType === 'lecture' ? 'Enter talk title' : 
                          currentSessionType === 'session' ? getSuggestedSessionTitle() : 'Enter session title'}
              className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 text-base ${
                (currentSessionType === 'lecture' && !formData.title) ? 'border-red-300 focus:ring-red-300 focus:border-red-400' : 
                'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
              required={currentSessionType === 'lecture'}
            />
          </div>

          {/* Topic - Show for all types except lecture (since lecture uses title as topic) */}
          {currentSessionType !== 'lecture' && (
            <div>
              <label className="block text-xl font-bold text-gray-800 mb-3 text-center">
                {currentSessionType === 'session' ? 'Session Topic' : 'Topic'}
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => handleInputChange('topic', e.target.value)}
                placeholder={currentSessionType === 'session' ? 'Enter session topic' : 'Enter topic'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base"
              />
            </div>
          )}

          {/* Time Range - Always visible */}
          <div>
            <h4 className="text-lg font-bold text-gray-800 mb-4 text-center">Session Time</h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm text-gray-600 font-medium text-center">Start Time</div>
              <TimePicker
                value={formData.custom_start_time}
                onChange={(t) => handleInputChange('custom_start_time', t)}
                label="Start Time"
                required
                idBase="session-start"
                ariaInvalid={Boolean(errors.time)}
              />
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 font-medium text-center">End Time</div>
                <TimePicker
                  value={formData.custom_end_time}
                  onChange={(t) => handleInputChange('custom_end_time', t)}
                  label="End Time"
                  required
                  idBase="session-end"
                  ariaInvalid={Boolean(errors.time)}
                  ariaDescribedById={errors.time ? 'session-time-error' : undefined}
                />
              </div>
            </div>
          </div>
          {errors.time && (
            <div id="session-time-error" className="text-[11px] text-red-600">{errors.time}</div>
          )}
        </div>
      </div>

      {/* Optional minimal fields by type (hidden for simplified Session flow and lecture/talk) */}
      {currentSessionType !== 'session' && currentSessionType !== 'lecture' && (
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h3 className="text-xl font-bold text-gray-900 text-center border-b border-gray-100 pb-3">Additional Details</h3>
        <div className="space-y-4">
          {optionalFields.map(field => {
            // Description removed globally
            if (field === 'description') return null
            if (field === 'chairperson_id') return renderField(field, 'Chairperson', 'select')
            if (field === 'assistant_ids') return renderArrayField(field, 'Assistant')
            if (field === 'capacity') return renderField(field, 'Capacity', 'number')
            if (field === 'introducer_id') return renderField(field, 'Introducer', 'select')
            if (field === 'is_parallel_meal') return renderField(field, 'Parallel with Meal', 'checkbox')
            if (field === 'parallel_meal_type') {
              return formData.is_parallel_meal ? renderField(field, 'Meal Type', 'select') : null
            }
            if (field === 'symposium_subtalks') {
              return currentSessionType === 'symposium' ? renderSymposiumSubtalkFields() : null
            }
            if (field === 'custom_data') {
              return currentSessionType === 'other' ? renderCustomDataFields() : null
            }
            return null
          })}
        </div>
        </div>
      )}

      {/* Lecture/Talk specific: primary Speaker free-text */}
      {currentSessionType === 'lecture' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 text-center border-b border-gray-100 pb-3 mb-6">Speaker Information</h3>
          <div>
            <label className="block text-lg font-bold text-gray-800 mb-3 text-center">Speaker *</label>
            <input
              type="text"
              value={formData.speaker_id}
              onChange={(e) => handleInputChange('speaker_id', e.target.value)}
              required
              placeholder="Type a name (new or existing)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base"
            />
          </div>
        </div>
      )}

      {/* Simplified Session flow */}
      {currentSessionType === 'session' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 text-center border-b border-gray-100 pb-3">Session Management</h3>
          <div className="space-y-6 will-change-auto">
            {renderSessionSimplifiedFlow()}
          </div>
        </div>
      )}

      {/* Dynamic Participants Section (hidden for simplified Session flow) */}
      {currentSessionType !== 'session' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 text-center border-b border-gray-100 pb-3">Participants</h3>
          <div className="space-y-4">
            {renderDynamicParticipants()}
          </div>
        </div>
      )}

      {/* Symposium Subtalks Section */}
      {currentSessionType === 'symposium' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 text-center border-b border-gray-100 pb-3">Symposium Subtalks</h3>
          <div className="space-y-4">
            {renderSymposiumSubtalkFields()}
          </div>
        </div>
      )}

      {/* Custom Data Section */}
      {currentSessionType === 'other' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 text-center border-b border-gray-100 pb-3">Custom Fields</h3>
          <div className="space-y-4">
            {renderCustomDataFields()}
          </div>
        </div>
      )}

      {/* Removed preview to keep form compact */}

      {/* Actions */}
      <div className="bg-gray-50 rounded-xl p-6 border-t-4 border-indigo-500">
        <div className="flex items-center justify-between">
          {/* Left: Delete when editing */}
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-6 py-3 border border-transparent text-base font-semibold rounded-lg shadow-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 hover:scale-105"
              >
                🗑️ Delete Session
              </button>
            )}
          </div>
          {/* Right: Cancel / Save */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 shadow-lg text-base font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 hover:scale-105"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 border border-transparent text-base font-semibold rounded-lg shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
            >
              {isSubmitting ? '💾 Saving...' : '✅ Save Session'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
} 