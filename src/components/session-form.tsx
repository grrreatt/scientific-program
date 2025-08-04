'use client'

import React, { useState, useEffect } from 'react'
import { SESSION_TYPES, MEAL_TYPES } from '@/lib/constants'
import { TimePicker } from '@/components/ui/time-picker'

interface SessionFormData {
  title: string
  topic: string
  day_id: string
  stage_id: string
  time_slot_id: string
  start_time: string
  end_time: string
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
  // Symposium specific
  symposium_subtalks: Array<{
    title: string
    speaker_name: string
    start_time: string
    end_time: string
    topic: string
    description?: string
  }>
  // Custom data for other session types
  custom_data: Record<string, any>
}

interface SessionFormProps {
  initialData?: Partial<SessionFormData>
  sessionType?: string
  onSubmit: (data: SessionFormData, sessionType: string) => void
  onCancel: () => void
  isSubmitting?: boolean
  days?: Array<{ id: string; name: string; date: string }>
  halls?: Array<{ id: string; name: string; capacity?: number }>
  timeSlots?: Array<{ id: string; start_time: string; end_time: string; is_break: boolean; break_title?: string }>
  isAddingNewSession?: boolean
  speakers?: Array<{ id: string; name: string; email?: string; title?: string; organization?: string }>
}

export function SessionForm({ 
  initialData = {}, 
  sessionType = 'lecture', 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  days = [],
  halls = [],
  timeSlots = [],
  isAddingNewSession = false,
  speakers = []
}: SessionFormProps) {
  const [currentSessionType, setCurrentSessionType] = useState(sessionType)
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false)
  
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
    start_time: '',
    end_time: '',
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
    symposium_subtalks: [],
    custom_data: {}
  })

  const handleInputChange = (field: string, value: any) => {
    console.log(`🔄 Input change: ${field} = ${value}`)
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
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
    } else if (field === 'speakers' || field === 'moderators' || field === 'chairpersons') {
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

  const addParticipant = (type: 'speakers' | 'moderators' | 'chairpersons') => {
    console.log(`➕ Adding participant to: ${type}`)
    setFormData(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), { id: '', role: type.slice(0, -1) }] // Remove 's' from end
    }))
  }

  const updateParticipant = (type: 'speakers' | 'moderators' | 'chairpersons', index: number, speakerId: string) => {
    console.log(`🔄 Updating participant: ${type}[${index}] = ${speakerId}`)
    setFormData(prev => ({
      ...prev,
      [type]: (prev[type] || []).map((participant: any, i: number) => 
        i === index ? { ...participant, id: speakerId } : participant
      )
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields based on session type
    const sessionConfig = SESSION_TYPES[currentSessionType]
    const requiredFields = sessionConfig.fields.required
    const optionalFields = sessionConfig.fields.optional
    
    for (const field of requiredFields) {
      // Skip validation for pre-selected fields when adding new session
      if (isAddingNewSession && (field === 'day_id' || field === 'stage_id' || field === 'time_slot_id')) {
        continue
      }
      
      if (!formData[field as keyof typeof formData]) {
        alert(`Please fill in the required field: ${field}`)
        return
      }
    }

    onSubmit(formData, currentSessionType)
  }

  const renderField = (fieldName: string, label: string, type: string = 'text', required: boolean = false) => {
    const value = formData[fieldName as keyof typeof formData]
    
    if (type === 'select') {
      return (
        <div key={fieldName} className="w-full">
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
            {fieldName === 'speaker_id' && speakers.map(speaker => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.name} {speaker.title ? `(${speaker.title})` : ''} {speaker.organization ? `- ${speaker.organization}` : ''}
              </option>
            ))}
            {fieldName === 'chairperson_id' && speakers.map(speaker => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.name} {speaker.title ? `(${speaker.title})` : ''} {speaker.organization ? `- ${speaker.organization}` : ''}
              </option>
            ))}
            {fieldName === 'moderator_id' && speakers.map(speaker => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.name} {speaker.title ? `(${speaker.title})` : ''} {speaker.organization ? `- ${speaker.organization}` : ''}
              </option>
            ))}
            {fieldName === 'discussion_leader_id' && speakers.map(speaker => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.name} {speaker.title ? `(${speaker.title})` : ''} {speaker.organization ? `- ${speaker.organization}` : ''}
              </option>
            ))}
            {fieldName === 'introducer_id' && speakers.map(speaker => (
              <option key={speaker.id} value={speaker.id}>
                {speaker.name} {speaker.title ? `(${speaker.title})` : ''} {speaker.organization ? `- ${speaker.organization}` : ''}
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
          autoFocus={fieldName === 'title'}
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
            <select
              value={value}
              onChange={(e) => handleArrayChange(fieldName, index, e.target.value)}
              required={required && index === 0}
              className="flex-1 block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
            >
              <option value="">Select speaker</option>
              {speakers.map(speaker => (
                <option key={speaker.id} value={speaker.id}>
                  {speaker.name} {speaker.title ? `(${speaker.title})` : ''} {speaker.organization ? `- ${speaker.organization}` : ''}
                </option>
              ))}
            </select>
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
                Speaker Name
              </label>
              <input
                type="text"
                id={`subtalk-speaker-${index}`}
                value={subtalk.speaker_name}
                onChange={(e) => {
                  const newSubtalks = [...subtalks];
                  newSubtalks[index].speaker_name = e.target.value;
                  setFormData(prev => ({ ...prev, symposium_subtalks: newSubtalks }));
                }}
                className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
              />
            </div>
            <div>
              <label htmlFor={`subtalk-start-time-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
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
              <label htmlFor={`subtalk-end-time-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
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
                className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
              />
            </div>
            <div>
              <label htmlFor={`subtalk-description-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id={`subtalk-description-${index}`}
                value={subtalk.description || ''}
                onChange={(e) => {
                  const newSubtalks = [...subtalks];
                  newSubtalks[index].description = e.target.value;
                  setFormData(prev => ({ ...prev, symposium_subtalks: newSubtalks }));
                }}
                rows={1}
                className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
              />
            </div>
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
      { key: 'speakers', label: 'Speakers', role: 'speaker' },
      { key: 'moderators', label: 'Moderators', role: 'moderator' },
      { key: 'chairpersons', label: 'Chairpersons', role: 'chairperson' }
    ] as const;

    return (
      <div className="space-y-6">
        {/* Single Add More Button with Dropdown */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Participants</h4>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowParticipantDropdown(!showParticipantDropdown)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add More
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {showParticipantDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  {participantTypes.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        addParticipant(key)
                        setShowParticipantDropdown(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                    >
                      Add {label.slice(0, -1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Participant Sections */}
        {participantTypes.map(({ key, label, role }) => {
          const participants = formData[key] || [];
          
          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">{label}</h4>
              </div>
              
              {participants.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No {label.toLowerCase()} added yet</div>
              ) : (
                <div className="space-y-2">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <select
                        value={participant.id}
                        onChange={(e) => updateParticipant(key, index, e.target.value)}
                        className="flex-1 block pl-3 pr-10 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                      >
                        <option value="">Select {label.slice(0, -1)}</option>
                        {speakers.map(speaker => (
                          <option key={speaker.id} value={speaker.id}>
                            {speaker.name} {speaker.title ? `(${speaker.title})` : ''} {speaker.organization ? `- ${speaker.organization}` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeArrayItem(key, index)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Session Type Selection */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Session Type</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(SESSION_TYPES).map(([key, type]) => (
            <div
              key={key}
              className={`relative rounded-lg border p-3 cursor-pointer ${
                currentSessionType === key
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
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
                <label className="ml-2 block text-sm font-medium text-gray-900">
                  {type.name}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Form Fields */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Session Details</h3>
        
        {/* Show pre-selected hall and time slot when adding new session */}
        {isAddingNewSession && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Session Location & Time</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Hall:</span>
                <span className="ml-2 text-blue-600">
                  {halls.find(h => h.id === formData.stage_id)?.name || 'Unknown Hall'}
                </span>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Time:</span>
                <span className="ml-2 text-blue-600">
                  {timeSlots.find(t => t.id === formData.time_slot_id)?.start_time} - {timeSlots.find(t => t.id === formData.time_slot_id)?.end_time}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4">
          {/* Required Fields */}
          {requiredFields.map(field => {
            if (field === 'title') return renderField(field, 'Session Title', 'text', true)
            if (field === 'topic') return renderField(field, 'Topic', 'text', true)
            if (field === 'day_id' && !isAddingNewSession) return renderField(field, 'Day', 'select', true)
            if (field === 'stage_id' && !isAddingNewSession) return renderField(field, 'Stage/Hall', 'select', true)
            if (field === 'time_slot_id' && !isAddingNewSession) return renderField(field, 'Time Slot', 'select', true)
            if (field === 'speaker_id') return renderField(field, 'Speaker', 'select', true)
            if (field === 'moderator_id') return renderField(field, 'Moderator', 'select', true)
            if (field === 'discussion_leader_id') return renderField(field, 'Discussion Leader', 'select', true)
            if (field === 'meal_type') return renderField(field, 'Meal Type', 'select', true)
            if (field === 'panelist_ids') return renderArrayField(field, 'Panelist', true)
            if (field === 'workshop_lead_ids') return renderArrayField(field, 'Workshop Lead', true)
            if (field === 'presenter_ids') return renderArrayField(field, 'Presenter', true)
            return null
          })}

          {/* Optional Fields */}
          {optionalFields.map(field => {
            if (field === 'description') return renderField(field, 'Description', 'textarea')
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

      {/* Dynamic Participants Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Participants</h3>
        {renderDynamicParticipants()}
      </div>

      {/* Symposium Subtalks Section */}
      {currentSessionType === 'symposium' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Symposium Subtalks</h3>
          {renderSymposiumSubtalkFields()}
        </div>
      )}

      {/* Custom Data Section */}
      {currentSessionType === 'other' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Custom Fields</h3>
          {renderCustomDataFields()}
        </div>
      )}

      {/* Session Block Preview */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Session Block Preview:</h3>
        <div className="bg-white border border-gray-200 rounded p-1 shadow-sm max-w-xs mx-auto">
          <div className="text-center space-y-0.5">
            {/* TYPE */}
            <div className="text-xs font-medium text-gray-700 border-b border-gray-100 pb-0.5">
              {getSessionTypeLabel(sessionType)}
            </div>
            
            {/* TITLE */}
            <div className="text-xs font-semibold text-gray-900 border-b border-gray-100 pb-0.5">
              {formData.title || 'Session Title'}
            </div>
            
            {/* SPEAKERS */}
            {formData.speakers && formData.speakers.length > 0 && (
              <div className="text-xs text-gray-600 border-b border-gray-100 pb-0.5">
                {formData.speakers.map((s: any) => s.role || 'Speaker').join(', ')}
              </div>
            )}
            
            {/* MODERATORS */}
            {formData.moderators && formData.moderators.length > 0 && (
              <div className="text-xs text-gray-600 border-b border-gray-100 pb-0.5">
                {formData.moderators.map((m: any) => m.role || 'Moderator').join(', ')}
              </div>
            )}
            
            {/* CHAIRPERSONS */}
            {formData.chairpersons && formData.chairpersons.length > 0 && (
              <div className="text-xs text-gray-600 pb-0.5">
                {formData.chairpersons.map((c: any) => c.role || 'Chairperson').join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Session'}
        </button>
      </div>
    </form>
  )
} 