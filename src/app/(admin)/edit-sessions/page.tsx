'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatTimeRange } from '@/lib/utils'
import { SESSION_TYPES } from '@/lib/constants'
import { Modal } from '@/components/ui/modal'
import { SessionForm } from '@/components/session-form'
import { supabase } from '@/lib/supabase/client'
import { Session, DayTimeSlot, Hall, Day } from '@/types'
import realtimeService from '@/lib/supabase/realtime'
import { RealtimeStatus } from '@/components/ui/realtime-status'

export default function EditSessionsPage() {
  // Database state
  const [sessions, setSessions] = useState<Session[]>([])
  const [timeSlots, setTimeSlots] = useState<DayTimeSlot[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [days, setDays] = useState<Day[]>([])
  
  // UI state
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Realtime state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Load all data from database
  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Loading all data from Supabase...')
      
      // Load days first
      const { data: daysData, error: daysError } = await supabase
        .from('conference_days')
        .select('*')
        .order('name', { ascending: true })

      if (daysError) {
        console.error('❌ Error loading days:', daysError)
        setError('Failed to load conference days')
        return
      }

      setDays(daysData || [])
      
      // Set selected day to first day if available
      if (daysData && daysData.length > 0 && !selectedDay) {
        setSelectedDay(daysData[0].name)
      }

      // Load halls
      const { data: hallsData, error: hallsError } = await supabase
        .from('stages')
        .select('*')
        .order('name', { ascending: true })

      if (hallsError) {
        console.error('❌ Error loading halls:', hallsError)
        setError('Failed to load halls')
        return
      }

      setHalls(hallsData || [])

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions_with_times')
        .select('*')
        .order('start_time', { ascending: true })

      if (sessionsError) {
        console.error('❌ Error loading sessions:', sessionsError)
        setError('Failed to load sessions')
        return
      }

      setSessions(sessionsData || [])
      console.log('✅ All data loaded successfully')

    } catch (error) {
      console.error('❌ Exception loading data:', error)
      setError('Failed to load data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  // Load time slots for selected day
  const loadTimeSlots = async () => {
    if (!selectedDay) return

    try {
      const selectedDayData = days.find(d => d.name === selectedDay)
      if (!selectedDayData) return

      const { data, error } = await supabase
        .from('day_time_slots')
        .select('*')
        .eq('day_id', selectedDayData.id)
        .order('slot_order', { ascending: true })

      if (error) {
        console.error('❌ Error loading time slots:', error)
        return
      }

      setTimeSlots(data || [])
    } catch (error) {
      console.error('❌ Exception loading time slots:', error)
    }
  }

  // Initialize realtime connection
  useEffect(() => {
    const initRealtime = () => {
      try {
        console.log('🚀 Initializing realtime connections...')
        
        realtimeService.subscribeToAll({
          onSessionChange: () => {
            console.log('🔄 Sessions updated via realtime')
            loadAllData()
            setLastUpdate(new Date())
          },
          onHallChange: () => {
            console.log('🔄 Halls updated via realtime')
            loadAllData()
            setLastUpdate(new Date())
          },
          onDayChange: () => {
            console.log('🔄 Days updated via realtime')
            loadAllData()
            setLastUpdate(new Date())
          },
          onTimeSlotChange: () => {
            console.log('🔄 Time slots updated via realtime')
            loadTimeSlots()
            setLastUpdate(new Date())
          },
          onConnectionChange: (status) => {
            console.log('🔗 Connection status changed:', status)
            setConnectionStatus(status as 'connected' | 'disconnected' | 'connecting')
          }
        })

        setConnectionStatus('connecting')
      } catch (error) {
        console.error('❌ Error initializing realtime:', error)
        setConnectionStatus('disconnected')
      }
    }

    initRealtime()

    return () => {
      realtimeService.unsubscribeFromAll()
    }
  }, [])

  // Load data on mount and when selected day changes
  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    loadTimeSlots()
  }, [selectedDay, days])

  // Utility functions
  const getSessionTypeLabel = (type: string) => {
    return SESSION_TYPES[type]?.name || type
  }

  const getSessionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      lecture: 'bg-blue-100 text-blue-800',
      panel: 'bg-green-100 text-green-800',
      workshop: 'bg-purple-100 text-purple-800',
      symposium: 'bg-orange-100 text-orange-800',
      oration: 'bg-red-100 text-red-800',
      guest_lecture: 'bg-indigo-100 text-indigo-800',
      discussion: 'bg-teal-100 text-teal-800',
      break: 'bg-gray-100 text-gray-800',
      other: 'bg-yellow-100 text-yellow-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
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

  // Session management functions
  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setIsModalOpen(true)
  }

  const handleAddSession = (hallId: string, timeSlotId: string) => {
    setEditingSession(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingSession(null)
  }

  const handleSubmitSession = async (formData: any, sessionType: string) => {
    setIsSubmitting(true)
    
    try {
      const selectedDayData = days.find(d => d.name === selectedDay)
      if (!selectedDayData) {
        alert('Selected day not found!')
        return
      }

      const insertData = {
        title: formData.title,
        session_type: sessionType,
        day_id: selectedDayData.id,
        stage_id: formData.stage_id,
        time_slot_id: formData.time_slot_id,
        topic: formData.topic,
        description: formData.description,
        is_parallel_meal: formData.is_parallel_meal,
        parallel_meal_type: formData.parallel_meal_type
      }

      let response
      if (editingSession) {
        response = await supabase
          .from('sessions')
          .update(insertData)
          .eq('id', editingSession.id)
      } else {
        response = await supabase
          .from('sessions')
          .insert(insertData)
      }

      if (response.error) {
        console.error('❌ Error saving session:', response.error)
        alert(`Error saving session: ${response.error.message}`)
        return
      }

      handleCloseModal()
      await loadAllData()
      console.log('✅ Session saved successfully')
      
    } catch (error) {
      console.error('❌ Error saving session:', error)
      alert('Error saving session. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    const confirmed = window.confirm(
      `Are you sure you want to delete "${session?.title || 'this session'}"? This action cannot be undone.`
    )
    
    if (confirmed) {
      try {
        const { error } = await supabase
          .from('sessions')
          .delete()
          .eq('id', sessionId)

        if (error) {
          console.error('❌ Error deleting session:', error)
          alert('Error deleting session. Please try again.')
          return
        }

        await loadAllData()
        console.log('✅ Session deleted successfully')
        
      } catch (error) {
        console.error('❌ Error deleting session:', error)
        alert('Error deleting session. Please try again.')
      }
    }
  }

  // Filter sessions for selected day
  const filteredSessions = sessions.filter(session => session.day_name === selectedDay)

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading conference program...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-lg text-red-600 mb-2">⚠️ Error</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <button
            onClick={loadAllData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Conference Program Editor
              </h1>
              <p className="text-sm text-gray-600">
                Manage sessions, time slots, and conference structure
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <RealtimeStatus 
                status={connectionStatus} 
                lastUpdate={lastUpdate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Day Navigation */}
      {days.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 py-4">
              {days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => setSelectedDay(day.name)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedDay === day.name
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {day.name} - {day.date}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedDay ? (
          <div>
            {/* Day Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {selectedDay} Schedule
              </h2>
              <p className="text-sm text-gray-600">
                {filteredSessions.length} sessions • {halls.length} halls • {timeSlots.length} time slots
              </p>
            </div>

            {/* Sessions Grid */}
            <div className="grid gap-6">
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-2xl">{getSessionIcon(session.session_type)}</span>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {session.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionTypeColor(session.session_type)}`}>
                            {getSessionTypeLabel(session.session_type)}
                          </span>
                        </div>
                        
                        {session.topic && (
                          <p className="text-sm text-gray-600 mb-2">
                            Topic: {session.topic}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>📍 {session.stage_name}</span>
                          <span>🕐 {formatTimeRange(session.start_time, session.end_time)}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditSession(session)}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {session.description && (
                      <p className="text-sm text-gray-600 border-t pt-4">
                        {session.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📅</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No sessions scheduled
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Get started by adding sessions to {selectedDay}
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Add First Session
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No conference days available
            </h3>
            <p className="text-sm text-gray-600">
              Please add conference days to get started
            </p>
          </div>
        )}
      </div>

      {/* Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSession ? 'Edit Session' : 'Add New Session'}
        maxWidth="max-w-2xl"
      >
        <SessionForm
          initialData={editingSession ? {
            title: editingSession.title,
            topic: editingSession.topic || '',
            day_id: editingSession.day_id,
            stage_id: editingSession.stage_id,
            time_slot_id: editingSession.time_slot_id,
            start_time: editingSession.start_time || '',
            end_time: editingSession.end_time || '',
            description: editingSession.description || '',
            is_parallel_meal: editingSession.is_parallel_meal || false,
            parallel_meal_type: editingSession.parallel_meal_type || ''
          } : {
            day_id: days.find(d => d.name === selectedDay)?.id || '',
            stage_id: halls[0]?.id || '',
            time_slot_id: timeSlots[0]?.id || ''
          }}
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