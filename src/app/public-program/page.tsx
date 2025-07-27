'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatTimeRange, calculateDuration } from '@/lib/utils'
import { SESSION_TYPES } from '@/lib/constants'

interface Session {
  id: string
  title: string
  session_type: string
  day_name: string
  stage_name: string
  start_time: string
  end_time: string
  topic?: string
  speaker_name?: string
  moderator_name?: string
  panelist_names?: string[]
  description?: string
  is_parallel_meal?: boolean
  parallel_meal_type?: string
  discussion_leader_id?: string
}

interface TimeSlot {
  time: string
  sessions: Session[]
}

export default function PublicProgramPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedDay, setSelectedDay] = useState('Day 1')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for demo
    setSessions([
      {
        id: '1',
        title: 'Opening Keynote: Future of Medical Technology',
        session_type: 'lecture',
        day_name: 'Day 1',
        stage_name: 'Main Hall',
        start_time: '09:00',
        end_time: '10:30',
        topic: 'Medical Technology Trends',
        speaker_name: 'Dr. Sarah Johnson'
      },
      {
        id: '2',
        title: 'Panel: AI in Healthcare',
        session_type: 'panel',
        day_name: 'Day 1',
        stage_name: 'Main Hall',
        start_time: '14:00',
        end_time: '15:30',
        topic: 'Artificial Intelligence Applications',
        moderator_name: 'Dr. Michael Chen',
        panelist_names: ['Dr. Emily Rodriguez', 'Prof. David Thompson', 'Dr. Lisa Wang']
      },
      {
        id: '3',
        title: 'Workshop: Advanced Surgical Techniques',
        session_type: 'workshop',
        day_name: 'Day 2',
        stage_name: 'Workshop Room',
        start_time: '10:00',
        end_time: '12:00',
        topic: 'Surgical Innovation',
        speaker_name: 'Dr. Emily Rodriguez'
      },
      {
        id: '4',
        title: 'Lunch Break',
        session_type: 'break',
        day_name: 'Day 1',
        stage_name: 'Dining Hall',
        start_time: '12:00',
        end_time: '13:30',
        topic: 'Lunch'
      },
      {
        id: '5',
        title: 'Symposium: Emerging Technologies',
        session_type: 'symposium',
        day_name: 'Day 2',
        stage_name: 'Main Hall',
        start_time: '09:00',
        end_time: '11:00',
        topic: 'Technology Innovation',
        moderator_name: 'Dr. Michael Chen',
        speaker_name: 'Multiple Speakers'
      },
      {
        id: '6',
        title: 'Coffee Break',
        session_type: 'break',
        day_name: 'Day 1',
        stage_name: 'Lobby',
        start_time: '10:30',
        end_time: '11:00',
        topic: 'Coffee Break'
      },
      {
        id: '7',
        title: 'Research Presentation: Novel Therapies',
        session_type: 'lecture',
        day_name: 'Day 1',
        stage_name: 'Seminar Room A',
        start_time: '14:00',
        end_time: '15:00',
        topic: 'Therapeutic Innovations',
        speaker_name: 'Dr. Lisa Wang'
      },
      {
        id: '8',
        title: 'Discussion: Ethics in Medicine',
        session_type: 'discussion',
        day_name: 'Day 1',
        stage_name: 'Seminar Room B',
        start_time: '14:00',
        end_time: '15:30',
        topic: 'Medical Ethics',
        discussion_leader_id: 'Prof. David Thompson'
      }
    ])
    setLoading(false)
  }, [])

  const getSessionTypeLabel = (type: string) => {
    return SESSION_TYPES[type]?.name || type
  }

  const getSessionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      lecture: 'bg-blue-50 border-blue-200 text-blue-800',
      panel: 'bg-green-50 border-green-200 text-green-800',
      workshop: 'bg-purple-50 border-purple-200 text-purple-800',
      symposium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      oration: 'bg-red-50 border-red-200 text-red-800',
      guest_lecture: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      discussion: 'bg-pink-50 border-pink-200 text-pink-800',
      break: 'bg-gray-50 border-gray-200 text-gray-800',
      other: 'bg-gray-50 border-gray-200 text-gray-800'
    }
    return colors[type] || 'bg-gray-50 border-gray-200 text-gray-800'
  }

  const getSessionIcon = (type: string) => {
    const icons: Record<string, string> = {
      lecture: '🎤',
      panel: '👥',
      workshop: '🔧',
      symposium: '🎓',
      oration: '🏆',
      guest_lecture: '👨‍🏫',
      discussion: '💬',
      break: '☕',
      other: '📋'
    }
    return icons[type] || '📋'
  }

  const filteredSessions = sessions.filter(session => session.day_name === selectedDay)
  const days = Array.from(new Set(sessions.map(s => s.day_name)))

  // Get unique stages/halls
  const stages = Array.from(new Set(filteredSessions.map(s => s.stage_name))).sort()

  // Create time slots
  const timeSlots: TimeSlot[] = []
  const allTimes = Array.from(new Set(filteredSessions.map(s => s.start_time))).sort()
  
  allTimes.forEach(time => {
    const sessionsAtTime = filteredSessions.filter(s => s.start_time === time)
    timeSlots.push({ time, sessions: sessionsAtTime })
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading program...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b print:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Scientific Conference Program
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              March 15-17, 2024
            </p>
          </div>
        </div>
      </div>

      {/* Day Navigation */}
      <div className="bg-white border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {days.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedDay === day
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {day}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Program Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Day Header */}
        <div className="mb-8 text-center print:mb-4">
          <h2 className="text-2xl font-bold text-gray-900 print:text-xl">
            {selectedDay}
          </h2>
          <p className="mt-1 text-gray-600 print:text-sm">
            {selectedDay === 'Day 1' && 'March 15, 2024'}
            {selectedDay === 'Day 2' && 'March 16, 2024'}
            {selectedDay === 'Day 3' && 'March 17, 2024'}
          </p>
        </div>

        {/* Schedule Grid */}
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No sessions scheduled for this day.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-gray-300">
            {/* Grid Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-b border-gray-200 bg-gray-50">
              <div className="p-4 font-medium text-gray-900 border-r border-gray-200">
                Time
              </div>
              {stages.map((stage, index) => (
                <div 
                  key={stage} 
                  className={`p-4 font-medium text-gray-900 ${
                    index < stages.length - 1 ? 'border-r border-gray-200' : ''
                  }`}
                >
                  {stage}
                </div>
              ))}
            </div>

            {/* Grid Content */}
            <div className="divide-y divide-gray-200">
              {timeSlots.map((timeSlot, timeIndex) => (
                <div 
                  key={timeSlot.time}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {/* Time Column */}
                  <div className="p-4 bg-gray-50 border-r border-gray-200 flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {formatTime(timeSlot.time)}
                    </div>
                  </div>

                  {/* Stage Columns */}
                  {stages.map((stage, stageIndex) => {
                    const session = timeSlot.sessions.find(s => s.stage_name === stage)
                    
                    return (
                      <div 
                        key={stage}
                        className={`p-4 ${
                          stageIndex < stages.length - 1 ? 'border-r border-gray-200' : ''
                        }`}
                      >
                        {session ? (
                          <div className="space-y-2">
                            {/* Session Type Badge */}
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getSessionIcon(session.session_type)}</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSessionTypeColor(session.session_type)}`}>
                                {getSessionTypeLabel(session.session_type)}
                              </span>
                            </div>

                            {/* Session Title */}
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                              {session.title}
                            </h3>

                            {/* Session Details */}
                            <div className="text-xs text-gray-600 space-y-1">
                              <p>{formatTimeRange(session.start_time, session.end_time)}</p>
                              {session.topic && <p>Topic: {session.topic}</p>}
                              {session.speaker_name && <p>Speaker: {session.speaker_name}</p>}
                              {session.moderator_name && <p>Moderator: {session.moderator_name}</p>}
                              {session.panelist_names && session.panelist_names.length > 0 && (
                                <p>Panelists: {session.panelist_names.join(', ')}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">
                            —
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Print Button */}
        <div className="mt-8 text-center print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Program
          </button>
        </div>
      </div>
    </div>
  )
} 