'use client'

import { useState, useEffect } from 'react'
import { SESSION_TYPES } from '@/lib/constants'
import { Modal } from '@/components/ui/modal'
import { SessionForm } from '@/components/session-form'
import { supabase } from '@/lib/supabase/client'
import { Session, Day, Hall, DayTimeSlot } from '@/types'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [days, setDays] = useState<Day[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [timeSlots, setTimeSlots] = useState<DayTimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load all data from database
  const loadAllData = async () => {
    setLoading(true)
    
    try {
      console.log('🔄 Loading all data from Supabase...')
      
      // Load days
      const { data: daysData, error: daysError } = await supabase
        .from('conference_days')
        .select('*')
        .order('name', { ascending: true })

      if (daysError) {
        console.error('❌ Error loading days:', daysError)
        return
      }

      setDays(daysData || [])
      
      // Load halls
      const { data: hallsData, error: hallsError } = await supabase
        .from('stages')
        .select('*')
        .order('name', { ascending: true })

      if (hallsError) {
        console.error('❌ Error loading halls:', hallsError)
        return
      }

      setHalls(hallsData || [])

      // Load time slots
      const { data: timeSlotsData, error: timeSlotsError } = await supabase
        .from('day_time_slots')
        .select('*')
        .order('slot_order', { ascending: true })

      if (timeSlotsError) {
        console.error('❌ Error loading time slots:', timeSlotsError)
        return
      }

      setTimeSlots(timeSlotsData || [])

      // Load sessions using the sessions_with_times view
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions_with_times')
        .select('*')
        .order('day_date', { ascending: true })
        .order('slot_order', { ascending: true })

      if (sessionsError) {
        console.error('❌ Error loading sessions:', sessionsError)
        setSessions([])
      } else {
        setSessions(sessionsData || [])
      }

      console.log('✅ All data loaded successfully')
      
    } catch (error) {
      console.error('❌ Exception loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const formatTime = (time: string | undefined) => {
    if (!time) return 'TBD'
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'pm' : 'am'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`
  }

  const getSessionTypeLabel = (type: string) => {
    return SESSION_TYPES[type]?.name || type
  }

  const getSessionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      lecture: 'bg-blue-100 text-blue-800',
      panel: 'bg-green-100 text-green-800',
      workshop: 'bg-purple-100 text-purple-800',
      symposium: 'bg-yellow-100 text-yellow-800',
      oration: 'bg-red-100 text-red-800',
      guest_lecture: 'bg-indigo-100 text-indigo-800',
      discussion: 'bg-pink-100 text-pink-800',
      break: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const handleAddSession = () => {
    setEditingSession(null)
    setIsModalOpen(true)
  }

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingSession(null)
  }

  const handleSubmitSession = async (formData: any, sessionType: string) => {
    setIsSubmitting(true)
    
    try {
      if (editingSession) {
        // Update existing session
        const { error: updateError } = await supabase
          .from('sessions')
          .update({
            title: formData.title,
            session_type: sessionType,
            day_id: formData.day_id,
            stage_id: formData.stage_id,
            time_slot_id: formData.time_slot_id,
            topic: formData.topic,
            description: formData.description,
            is_parallel_meal: formData.is_parallel_meal,
            parallel_meal_type: formData.parallel_meal_type
          })
          .eq('id', editingSession.id)

        if (updateError) {
          console.error('❌ Error updating session:', updateError)
          alert('Error updating session. Please try again.')
          return
        }
      } else {
        // Create new session
        const { data: newSession, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            title: formData.title,
            session_type: sessionType,
            day_id: formData.day_id,
            stage_id: formData.stage_id,
            time_slot_id: formData.time_slot_id,
            topic: formData.topic,
            description: formData.description,
            is_parallel_meal: formData.is_parallel_meal,
            parallel_meal_type: formData.parallel_meal_type
          })
          .select()
          .single()

        if (sessionError) {
          console.error('❌ Error creating session:', sessionError)
          alert('Error creating session. Please try again.')
          return
        }

        // Add session participants if speaker_id is provided
        if (formData.speaker_id) {
          const { error: participantError } = await supabase
            .from('session_participants')
            .insert({
              session_id: newSession.id,
              speaker_id: formData.speaker_id,
              role: 'speaker'
            })

          if (participantError) {
            console.error('❌ Error adding speaker:', participantError)
          }
        }
      }

      // Reload data to get the updated sessions
      await loadAllData()
      handleCloseModal()
      console.log('✅ Session saved successfully')
      
    } catch (error) {
      console.error('❌ Error saving session:', error)
      alert('Error saving session. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      setSessions(prev => prev.filter(session => session.id !== sessionId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading sessions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sessions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your conference sessions and schedule
          </p>
        </div>
        <button
          onClick={handleAddSession}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Session
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="day-filter" className="block text-sm font-medium text-gray-700">
              Day
            </label>
            <select
              id="day-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Days</option>
              <option value="day1">Day 1</option>
              <option value="day2">Day 2</option>
              <option value="day3">Day 3</option>
            </select>
          </div>
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Types</option>
              {Object.entries(SESSION_TYPES).map(([key, type]) => (
                <option key={key} value={key}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stage-filter" className="block text-sm font-medium text-gray-700">
              Stage
            </label>
            <select
              id="stage-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Stages</option>
              <option value="main-hall">Main Hall</option>
              <option value="seminar-a">Seminar Room A</option>
              <option value="seminar-b">Seminar Room B</option>
              <option value="workshop">Workshop Room</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {sessions.map((session) => (
            <li key={session.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSessionTypeColor(session.session_type)}`}>
                        {getSessionTypeLabel(session.session_type)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {session.title}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <p>
                          {session.day_name} • {session.stage_name} • {formatTime(session.start_time)}–{formatTime(session.end_time)}
                        </p>
                      </div>
                      {session.topic && (
                        <div className="mt-1 text-sm text-gray-500">
                          <p>Topic: {session.topic}</p>
                        </div>
                      )}
                      {session.description && (
                        <div className="mt-1 text-sm text-gray-500">
                          <p>Description: {session.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditSession(session)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new session.
          </p>
          <div className="mt-6">
            <button
              onClick={handleAddSession}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Session
            </button>
          </div>
        </div>
      )}

      {/* Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSession ? 'Edit Session' : 'Create New Session'}
        maxWidth="max-w-2xl"
      >
        <SessionForm
          initialData={editingSession ? {
            title: editingSession.title,
            topic: editingSession.topic || '',
            day_id: editingSession.day_id,
            stage_id: editingSession.stage_id,
            time_slot_id: editingSession.time_slot_id,
            description: editingSession.description || '',
            is_parallel_meal: editingSession.is_parallel_meal || false,
            parallel_meal_type: editingSession.parallel_meal_type || ''
          } : {}}
          sessionType={editingSession?.session_type || 'lecture'}
          onSubmit={handleSubmitSession}
          onCancel={handleCloseModal}
          isSubmitting={isSubmitting}
          days={days}
          halls={halls}
          timeSlots={timeSlots}
        />
      </Modal>
    </div>
  )
} 