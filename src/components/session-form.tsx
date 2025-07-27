'use client'

import { useState, useEffect } from 'react'
import { SESSION_TYPES, MEAL_TYPES } from '@/lib/constants'
import { TimePicker } from '@/components/ui/time-picker'

interface SessionFormData {
  title: string
  topic: string
  day_id: string
  stage_id: string
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
}

interface SessionFormProps {
  initialData?: Partial<SessionFormData>
  sessionType?: string
  onSubmit: (data: SessionFormData, sessionType: string) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function SessionForm({ 
  initialData = {}, 
  sessionType = 'lecture', 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: SessionFormProps) {
  const [currentSessionType, setCurrentSessionType] = useState(sessionType)
  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    topic: '',
    day_id: '',
    stage_id: '',
    start_time: '',
    end_time: '',
    description: '',
    is_parallel_meal: false,
    parallel_meal_type: '',
    speaker_id: '',
    chairperson_id: '',
    moderator_id: '',
    panelist_ids: [''],
    workshop_lead_ids: [''],
    assistant_ids: [''],
    capacity: '',
    introducer_id: '',
    presenter_ids: [''],
    discussion_leader_id: '',
    meal_type: '',
    ...initialData
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleArrayChange = (field: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].map((item: string, i: number) => 
        i === index ? value : item
      )
    }))
  }

  const addArrayItem = (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field as keyof typeof prev], '']
    }))
  }

  const removeArrayItem = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].filter((_: string, i: number) => i !== index)
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields based on session type
    const sessionConfig = SESSION_TYPES[currentSessionType]
    const requiredFields = sessionConfig.fields.required
    
    for (const field of requiredFields) {
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
            {fieldName === 'day_id' && (
              <>
                <option value="day1">Day 1</option>
                <option value="day2">Day 2</option>
                <option value="day3">Day 3</option>
              </>
            )}
            {fieldName === 'stage_id' && (
              <>
                <option value="main-hall">Main Hall</option>
                <option value="seminar-a">Seminar Room A</option>
                <option value="seminar-b">Seminar Room B</option>
                <option value="workshop">Workshop Room</option>
              </>
            )}
            {fieldName === 'speaker_id' && (
              <>
                <option value="speaker1">Dr. Sarah Johnson</option>
                <option value="speaker2">Dr. Michael Chen</option>
                <option value="speaker3">Dr. Emily Rodriguez</option>
                <option value="speaker4">Prof. David Thompson</option>
                <option value="speaker5">Dr. Lisa Wang</option>
              </>
            )}
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
              <option value="speaker1">Dr. Sarah Johnson</option>
              <option value="speaker2">Dr. Michael Chen</option>
              <option value="speaker3">Dr. Emily Rodriguez</option>
              <option value="speaker4">Prof. David Thompson</option>
              <option value="speaker5">Dr. Lisa Wang</option>
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

  const sessionConfig = SESSION_TYPES[currentSessionType]
  const requiredFields = sessionConfig.fields.required
  const optionalFields = sessionConfig.fields.optional

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
        <div className="grid grid-cols-1 gap-4">
          {/* Required Fields */}
          {requiredFields.map(field => {
            if (field === 'title') return renderField(field, 'Session Title', 'text', true)
            if (field === 'topic') return renderField(field, 'Topic', 'text', true)
            if (field === 'day_id') return renderField(field, 'Day', 'select', true)
            if (field === 'stage_id') return renderField(field, 'Stage/Hall', 'select', true)
            if (field === 'start_time') return (
              <TimePicker
                key={field}
                value={formData.start_time}
                onChange={(time) => handleInputChange(field, time)}
                label="Start Time"
                required={true}
              />
            )
            if (field === 'end_time') return (
              <TimePicker
                key={field}
                value={formData.end_time}
                onChange={(time) => handleInputChange(field, time)}
                label="End Time"
                required={true}
              />
            )
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
            return null
          })}
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