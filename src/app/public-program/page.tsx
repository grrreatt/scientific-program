'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatTimeRange, calculateDuration } from '@/lib/utils'
import { SESSION_TYPES } from '@/lib/constants'
import { supabase } from '@/lib/supabase/client'

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

interface Hall {
  id: string
  name: string
  color: string
}

interface Day {
  id: string
  name: string
  date: string
}

export default function PublicProgramPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [days, setDays] = useState<Day[]>([])
  const [selectedDay, setSelectedDay] = useState('Day 1')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load sessions from Supabase
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading sessions:', error)
        // Fallback to mock data
    setSessions([
      {
        id: '1',
            title: 'Mock Session',
        session_type: 'lecture',
        day_name: 'Day 1',
            stage_name: 'Example Hall',
        start_time: '09:00',
            end_time: '10:00',
            topic: 'Introduction to Mock Data',
            speaker_name: 'Dr. Mock Speaker'
          }
        ])
        return
      }

      // Helper function to map stage_id to stage_name
      const getStageName = (stageId: string) => {
        switch (stageId) {
          case 'main-hall': return 'Main Hall'
          case 'seminar-a': return 'Seminar Room A'
          case 'seminar-b': return 'Seminar Room B'
          case 'example-hall': return 'Example Hall'
          case 'hall-a': return 'Hall A'
          case 'hall-b': return 'Hall B'
          default: return 'Workshop Room'
        }
      }

      // Helper function to map day_id to day_name
      const getDayName = (dayId: string) => {
        switch (dayId) {
          case 'day1': return 'Day 1'
          case 'day2': return 'Day 2'
          case 'day3': return 'Day 3'
          case 'day-1': return 'Day 1'
          default: return 'Day 1'
        }
      }

      // Transform Supabase data to our Session format
      const transformedSessions: Session[] = data.map((session: any) => ({
        id: session.id,
        title: session.title,
        session_type: session.session_type,
        day_name: getDayName(session.day_id),
        stage_name: getStageName(session.stage_id),
        start_time: session.start_time,
        end_time: session.end_time,
        topic: session.topic,
        speaker_name: session.people_data?.speaker_name,
        moderator_name: session.people_data?.moderator_name,
        panelist_names: session.people_data?.panelist_names,
        description: session.description,
        is_parallel_meal: session.is_parallel_meal,
        parallel_meal_type: session.parallel_meal_type,
        discussion_leader_id: session.people_data?.discussion_leader_id
      }))

      setSessions(transformedSessions.length > 0 ? transformedSessions : [
        {
          id: '1',
          title: 'Mock Session',
          session_type: 'lecture',
        day_name: 'Day 1',
          stage_name: 'Example Hall',
        start_time: '09:00',
          end_time: '10:00',
          topic: 'Introduction to Mock Data',
          speaker_name: 'Dr. Mock Speaker'
        }
      ])
      setError(null)
    } catch (error) {
      console.error('Error loading sessions:', error)
      setError('Failed to load sessions. Please refresh the page.')
      // Fallback to mock data
      setSessions([
      {
          id: '1',
          title: 'Mock Session',
        session_type: 'lecture',
        day_name: 'Day 1',
          stage_name: 'Example Hall',
          start_time: '09:00',
          end_time: '10:00',
          topic: 'Introduction to Mock Data',
          speaker_name: 'Dr. Mock Speaker'
        }
      ])
    }
  }

  // Load halls from Supabase
  const loadHalls = async () => {
    try {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading halls:', error)
        // Fallback to default halls
        const defaultHalls: Hall[] = [
          { id: 'hall-1', name: 'Example Hall', color: 'bg-blue-50 border-blue-200' },
          { id: 'hall-2', name: 'Hall A', color: 'bg-green-50 border-green-200' },
          { id: 'hall-3', name: 'Hall B', color: 'bg-purple-50 border-purple-200' }
        ]
        setHalls(defaultHalls)
        return
      }

      // Transform Supabase data to our Hall format
      const transformedHalls: Hall[] = data.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        color: 'bg-gray-50 border-gray-200'
      }))

      setHalls(transformedHalls.length > 0 ? transformedHalls : [
        { id: 'hall-1', name: 'Example Hall', color: 'bg-blue-50 border-blue-200' },
        { id: 'hall-2', name: 'Hall A', color: 'bg-green-50 border-green-200' },
        { id: 'hall-3', name: 'Hall B', color: 'bg-purple-50 border-purple-200' }
      ])
      setError(null)
    } catch (error) {
      console.error('Error loading halls:', error)
      setError('Failed to load halls. Please refresh the page.')
      // Fallback to default halls
      const defaultHalls: Hall[] = [
        { id: 'hall-1', name: 'Example Hall', color: 'bg-blue-50 border-blue-200' },
        { id: 'hall-2', name: 'Hall A', color: 'bg-green-50 border-green-200' },
        { id: 'hall-3', name: 'Hall B', color: 'bg-purple-50 border-purple-200' }
      ]
      setHalls(defaultHalls)
    }
  }

  // Load days from Supabase
  const loadDays = async () => {
    try {
      const { data, error } = await supabase
        .from('days')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading days:', error)
        // Fallback to mock days
        const mockDays: Day[] = [
          { id: 'day-1', name: 'Day 1', date: 'March 15, 2024' },
          { id: 'day-2', name: 'Day 2', date: 'March 16, 2024' },
          { id: 'day-3', name: 'Day 3', date: 'March 17, 2024' }
        ]
        setDays(mockDays)
        return
      }

      // Transform Supabase data to our Day format
      const transformedDays: Day[] = data.map((day: any) => ({
        id: day.id,
        name: day.name,
        date: day.date
      }))

      setDays(transformedDays.length > 0 ? transformedDays : [
        { id: 'day-1', name: 'Day 1', date: 'March 15, 2024' },
        { id: 'day-2', name: 'Day 2', date: 'March 16, 2024' },
        { id: 'day-3', name: 'Day 3', date: 'March 17, 2024' }
      ])
      setError(null)
    } catch (error) {
      console.error('Error loading days:', error)
      setError('Failed to load days. Please refresh the page.')
      // Fallback to mock days
      const mockDays: Day[] = [
        { id: 'day-1', name: 'Day 1', date: 'March 15, 2024' },
        { id: 'day-2', name: 'Day 2', date: 'March 16, 2024' },
        { id: 'day-3', name: 'Day 3', date: 'March 17, 2024' }
      ]
      setDays(mockDays)
    }
  }

  useEffect(() => {
    // Load data from Supabase
    const loadData = async () => {
      await Promise.all([loadSessions(), loadHalls(), loadDays()])
    setLoading(false)
    }
    
    loadData()

    // Set up real-time subscriptions for instant updates
    const sessionsChannel = supabase
      .channel('public-sessions-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions' }, 
        (payload) => {
          console.log('Public: Session change detected:', payload)
          // Reload sessions when any change occurs
          loadSessions()
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'stages' }, 
        (payload) => {
          console.log('Public: Stage change detected:', payload)
          // Reload halls when any change occurs
          loadHalls()
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'days' }, 
        (payload) => {
          console.log('Public: Day change detected:', payload)
          // Reload days when any change occurs
          loadDays()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      sessionsChannel.unsubscribe()
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading program...</div>
        <div className="mt-2 text-sm text-gray-500">Please wait while we fetch your data</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error Loading Data</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Refresh Page
          </button>
        </div>
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
                key={day.id}
                onClick={() => setSelectedDay(day.name)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedDay === day.name
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {day.name}
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
            {days.find(d => d.name === selectedDay)?.date || 'March 15, 2024'}
          </p>
        </div>

        {/* Halls Layout - Same as Edit Sessions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {halls.map((hall) => (
            <div key={hall.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Hall Header */}
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">{hall.name}</h3>
            </div>

              {/* Hall Content - Sessions */}
              <div className="p-4">
                {/* Find sessions for this hall */}
                {(() => {
                  const hallSessions = filteredSessions.filter(session => 
                    session.stage_name === hall.name
                  )
                    
                  if (hallSessions.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <div className="text-gray-400 text-sm">No sessions scheduled</div>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      {hallSessions.map((session) => (
                        <div 
                          key={session.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                        >
                            {/* Session Type Badge */}
                          <div className="flex items-center space-x-2 mb-2">
                              <span className="text-lg">{getSessionIcon(session.session_type)}</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSessionTypeColor(session.session_type)}`}>
                                {getSessionTypeLabel(session.session_type)}
                              </span>
                            </div>

                            {/* Session Title */}
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2">
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
                      ))}
                      </div>
                    )
                })()}
              </div>
                </div>
              ))}
            </div>

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