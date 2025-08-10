'use client'

import { useState, useEffect } from 'react'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  label: string
  required?: boolean
  className?: string
  disabled?: boolean
}

export function TimePicker({ value, onChange, label, required = false, className = '', disabled = false }: TimePickerProps) {
  const [hour, setHour] = useState('10')
  const [minute, setMinute] = useState('00')
  const [period, setPeriod] = useState<'am' | 'pm'>('am')

  // Parse initial value
  useEffect(() => {
    if (!value) {
      // Default visible state: 10:00 AM
      setHour('10')
      setMinute('00')
      setPeriod('am')
      return
    }
    const [hours, minutes] = value.split(':').map(Number)
    const isPM = hours >= 12
    const displayHour = hours % 12 || 12
    const displayMinute = minutes.toString().padStart(2, '0')
    setHour(displayHour.toString())
    setMinute(displayMinute)
    setPeriod(isPM ? 'pm' : 'am')
  }, [value])

  // Update parent when local state changes
  useEffect(() => {
    let hourNum = parseInt(hour)
    if (period === 'pm' && hourNum !== 12) {
      hourNum += 12
    } else if (period === 'am' && hourNum === 12) {
      hourNum = 0
    }
    
    const timeString = `${hourNum.toString().padStart(2, '0')}:${minute}`
    onChange(timeString)
  }, [hour, minute, period, onChange])

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className={`flex items-center space-x-2 time-picker-container ${disabled ? 'opacity-60' : ''}`}>
        {/* Hour Select */}
        <select
          value={hour || '08'}
          onChange={(e) => setHour(e.target.value)}
          className="w-16 block pl-3 pr-8 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md time-picker-select"
          required={required}
          disabled={disabled}
        >
          <option value="" disabled hidden>
            HH
          </option>
          {hours.map(h => (
            <option key={h} value={h.toString()}>
              {h}
            </option>
          ))}
        </select>

        <span className="text-gray-500 font-medium">:</span>

        {/* Minute Select */}
        <select
          value={minute || '00'}
          onChange={(e) => setMinute(e.target.value)}
          className="w-16 block pl-3 pr-8 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md time-picker-select"
          required={required}
          disabled={disabled}
        >
          <option value="" disabled hidden>
            MM
          </option>
          {minutes.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* AM/PM Toggle */}
        <div className="flex border border-gray-300 rounded-md overflow-hidden am-pm-toggle">
          <button
            type="button"
            onClick={() => !disabled && setPeriod('am')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              period === 'am'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            disabled={disabled}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => !disabled && setPeriod('pm')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              period === 'pm'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            disabled={disabled}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  )
} 