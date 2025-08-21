'use client'

import React from 'react'
import { Day } from '@/types'

interface DaySelectorProps {
  days: Day[]
  selectedDay: string
  onSelectDay: (dayName: string) => void
  onAddDay: () => void
}

export const DaySelector = React.memo(function DaySelector({
  days,
  selectedDay,
  onSelectDay,
  onAddDay
}: DaySelectorProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex gap-2">
        {days.map((day) => (
          <button
            key={day.id}
            onClick={() => onSelectDay(day.name)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDay === day.name
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {day.name}
          </button>
        ))}
      </div>
      
      <button
        onClick={onAddDay}
        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
      >
        + Add Day
      </button>
    </div>
  )
})
