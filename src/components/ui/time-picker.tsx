'use client'

import { useMemo } from 'react'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  label: string
  required?: boolean
  className?: string
  disabled?: boolean
  stepMinutes?: number // interval between times
  from?: string // inclusive start HH:MM
  to?: string // inclusive end HH:MM
}

export function TimePicker({
  value,
  onChange,
  label,
  required = false,
  className = '',
  disabled = false,
  stepMinutes = 30,
  from = '06:00',
  to = '23:30',
}: TimePickerProps) {
  const options = useMemo(() => {
    const list: string[] = []
    const [fromH, fromM] = from.split(':').map(Number)
    const [toH, toM] = to.split(':').map(Number)
    let cur = new Date(2000, 0, 1, fromH, fromM, 0, 0)
    const end = new Date(2000, 0, 1, toH, toM, 0, 0)
    while (cur <= end) {
      const hh = String(cur.getHours()).padStart(2, '0')
      const mm = String(cur.getMinutes()).padStart(2, '0')
      list.push(`${hh}:${mm}`)
      cur = new Date(cur.getTime() + stepMinutes * 60000)
    }
    return list
  }, [stepMinutes, from, to])

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3 text-gray-900"
        required={required}
        disabled={disabled}
      >
        <option value="" disabled hidden>
          Select time
        </option>
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  )
}