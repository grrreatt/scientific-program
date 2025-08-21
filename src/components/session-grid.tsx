'use client'

import React from 'react'
import { Session, DayTimeSlot, DayHall } from '@/types'
import { formatTime, formatTimeRange, formatParticipantsDisplay } from '@/lib/utils'

interface SessionGridProps {
  sessions: Session[]
  timeSlots: DayTimeSlot[]
  dayHalls: DayHall[]
  selectedDay: string
  onEditSession: (session: Session) => void
  onDeleteSession: (session: Session) => void
  onAddSession: (dayId: string, stageId: string, timeSlotId: string) => void
}

export const SessionGrid = React.memo(function SessionGrid({
  sessions,
  timeSlots,
  dayHalls,
  selectedDay,
  onEditSession,
  onDeleteSession,
  onAddSession
}: SessionGridProps) {
  // Filter sessions for selected day
  const daySessions = sessions.filter(s => s.day_name === selectedDay)
  
  // Get halls for selected day
  const dayHallsForSelectedDay = dayHalls.filter(dh => dh.day_name === selectedDay)
  
  // Get time slots for selected day
  const dayTimeSlots = timeSlots.filter(ts => 
    daySessions.some(s => s.time_slot_id === ts.id)
  )

  if (!selectedDay) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Select a day to view sessions
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-2 text-left font-medium text-gray-700 min-w-[120px]">
              Time
            </th>
            {dayHallsForSelectedDay.map((dayHall) => (
              <th key={dayHall.hall_id} className="border border-gray-200 px-4 py-2 text-left font-medium text-gray-700 min-w-[200px]">
                {dayHall.hall_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dayTimeSlots.map((timeSlot) => (
            <tr key={timeSlot.id} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                {formatTimeRange(timeSlot.start_time, timeSlot.end_time)}
              </td>
              {dayHallsForSelectedDay.map((dayHall) => {
                const session = daySessions.find(s => 
                  s.stage_id === dayHall.hall_id && s.time_slot_id === timeSlot.id
                )
                
                return (
                  <td key={dayHall.hall_id} className="border border-gray-200 p-2 relative">
                    {session ? (
                      <div className="group relative">
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 cursor-pointer hover:bg-blue-100 transition-colors">
                          <div className="font-medium text-sm text-gray-900 mb-1">
                            {session.title}
                          </div>
                          <div className="text-xs text-gray-600 mb-1">
                            {session.session_type}
                          </div>
                          {session.topic && (
                            <div className="text-xs text-gray-500 mb-1">
                              {session.topic}
                            </div>
                          )}
                          {session.speakers && session.speakers.length > 0 && (
                            <div className="text-xs text-gray-600">
                              {formatParticipantsDisplay(session.speakers)}
                            </div>
                          )}
                        </div>
                        
                        {/* Hover controls */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditSession(session)
                              }}
                              className="p-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteSession(session)
                              }}
                              className="p-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => onAddSession(dayHall.day_id, dayHall.hall_id, timeSlot.id)}
                        className="w-full h-16 border-2 border-dashed border-gray-300 rounded hover:border-gray-400 hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-700"
                      >
                        + Add Session
                      </button>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
