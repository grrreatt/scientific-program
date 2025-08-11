'use client'

import { useEffect, useMemo, useState } from 'react'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  label: string
  required?: boolean
  className?: string
  disabled?: boolean
  idBase?: string
  ariaDescribedById?: string
  ariaInvalid?: boolean
  /**
   * On small screens, prefer a single native input type="time" for better mobile UX
   */
  useNativeOnMobile?: boolean
}

function to12HourParts(value: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  if (!value) return { hour: '', minute: '', period: 'AM' }
  const [hStr, mStr] = value.split(':')
  let h = Number(hStr)
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return { hour: String(h), minute: mStr.padStart(2, '0'), period }
}

function to24HourString(hour12: string, minute: string, period: 'AM' | 'PM'): string {
  const h12 = Number(hour12)
  if (!h12 && h12 !== 0) return ''
  if (minute === '') return ''
  let h24 = h12 % 12
  if (period === 'PM') h24 += 12
  return `${String(h24).padStart(2, '0')}:${String(Number(minute)).padStart(2, '0')}`
}

export function TimePicker({
  value,
  onChange,
  label,
  required = false,
  className = '',
  disabled = false,
  idBase,
  ariaDescribedById,
  ariaInvalid,
  useNativeOnMobile = true,
}: TimePickerProps) {
  const initial = to12HourParts(value)
  const [hour, setHour] = useState<string>(initial.hour)
  const [minute, setMinute] = useState<string>(initial.minute)
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.period)

  // Keep local state in sync if external value changes (e.g., form reset)
  useEffect(() => {
    const next = to12HourParts(value)
    setHour(next.hour)
    setMinute(next.minute)
    setPeriod(next.period)
  }, [value])

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), [])
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), [])

  const handlePartChange = (next: Partial<{ hour: string; minute: string; period: 'AM' | 'PM' }>) => {
    const newHour = next.hour !== undefined ? next.hour : hour
    const newMinute = next.minute !== undefined ? next.minute : minute
    const newPeriod = next.period !== undefined ? next.period : period
    // Update local state immediately so selection is preserved
    if (next.hour !== undefined) setHour(next.hour)
    if (next.minute !== undefined) setMinute(next.minute)
    if (next.period !== undefined) setPeriod(next.period)
    // Only emit when both parts are selected
    if (newHour && newMinute) {
      onChange(to24HourString(newHour, newMinute, newPeriod))
    }
  }

  const hourId = idBase ? `${idBase}-hour` : undefined
  const minuteId = idBase ? `${idBase}-minute` : undefined
  const periodId = idBase ? `${idBase}-period` : undefined

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={hourId}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Native mobile-friendly input (optional) */}
      {useNativeOnMobile && (
        <div className="sm:hidden">
          <input
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedById}
            className="block w-full h-11 border border-gray-300 rounded-md px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      )}

      {/* Custom tri-select control for desktop/tablet */}
      <div className="hidden sm:flex items-center gap-2 isolate relative z-0">
        <select
          id={hourId}
          value={hour}
          onChange={(e) => handlePartChange({ hour: e.target.value })}
          className="w-20 h-11 block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 text-gray-900 pointer-events-auto"
          disabled={disabled}
          required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedById}
        >
          <option value="" hidden>HH</option>
          {hours.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-gray-500" aria-hidden>:</span>
        <select
          id={minuteId}
          value={minute}
          onChange={(e) => handlePartChange({ minute: e.target.value })}
          className="w-24 h-11 block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 text-gray-900 pointer-events-auto"
          disabled={disabled}
          required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedById}
        >
          <option value="" hidden>MM</option>
          {minutes.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          id={periodId}
          value={period}
          onChange={(e) => handlePartChange({ period: e.target.value as 'AM' | 'PM' })}
          className="w-24 h-11 block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm px-3 text-gray-900 pointer-events-auto"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedById}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  )
}