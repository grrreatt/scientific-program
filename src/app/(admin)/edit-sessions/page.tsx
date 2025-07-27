'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatTimeRange } from '@/lib/utils'
import { SESSION_TYPES } from '@/lib/constants'
import { Modal } from '@/components/ui/modal'
import { SessionForm } from '@/components/session-form'
import { supabase } from '@/lib/supabase/client'
import { Session, DayTimeSlot, Hall, Day } from '@/types'

export default function EditSessionsPage() {
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [timeSlots, setTimeSlots] = useState<DayTimeSlot[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [days, setDays] = useState<Day[]>([])
  const [selectedDay, setSelectedDay] = useState<string>('Day 1')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [hallToDelete, setHallToDelete] = useState<Hall | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [showAddHallModal, setShowAddHallModal] = useState(false)
  const [newHallName, setNewHallName] = useState('')
  const [sessionToAdd, setSessionToAdd] = useState<{ hallId: string; timeSlotId: string } | null>(null)
  const [showAddDayModal, setShowAddDayModal] = useState(false)
  const [newDayName, setNewDayName] = useState('')
  const [newDayDate, setNewDayDate] = useState('')
  const [editingTimeSlot, setEditingTimeSlot] = useState<DayTimeSlot | null>(null)

  // Load sessions using the new view
  const loadSessions = async () => {
    try {
      console.log('🔄 Loading sessions from Supabase...')
      const { data, error } = await supabase
        .from('sessions_with_times')
        .select('*')
        .order('start_time', { ascending: true })

      if (error) {
        console.error('❌ Error loading sessions:', error)
        setSessions([])
        return
      }

      console.log('✅ Sessions loaded successfully:', data?.length || 0, 'sessions')
      setSessions(data || [])
      setError(null)
    } catch (error) {
      console.error('❌ Exception loading sessions:', error)
      setError('Failed to load sessions. Please refresh the page.')
      setSessions([])
    }
  }

  // Load time slots for the selected day
  const loadTimeSlots = async () => {
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
        setTimeSlots([])
        return
      }

      console.log('✅ Time slots loaded successfully:', data?.length || 0, 'slots')
      setTimeSlots(data || [])
    } catch (error) {
      console.error('❌ Exception loading time slots:', error)
      setTimeSlots([])
    }
  }

  // Load halls from Supabase
  const loadHalls = async () => {
    try {
      console.log('🔄 Loading halls from Supabase...')
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('❌ Error loading halls:', error)
        setHalls([])
        return
      }

      console.log('✅ Halls loaded successfully:', data?.length || 0, 'halls')
      setHalls(data || [])
      setError(null)
    } catch (error) {
      console.error('❌ Exception loading halls:', error)
      setError('Failed to load halls. Please refresh the page.')
      setHalls([])
    }
  }

  // Load days from Supabase
  const loadDays = async () => {
    try {
      const { data, error } = await supabase
        .from('conference_days')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('❌ Error loading days:', error)
        // Create default days if none exist
        const defaultDays: Day[] = [
          { id: 'day-1', name: 'Day 1', date: '2024-03-15' },
          { id: 'day-2', name: 'Day 2', date: '2024-03-16' },
          { id: 'day-3', name: 'Day 3', date: '2024-03-17' }
        ]
        setDays(defaultDays)
        return
      }

      setDays(data || [])
    } catch (error) {
      console.error('Error loading days:', error)
      const defaultDays: Day[] = [
        { id: 'day-1', name: 'Day 1', date: '2024-03-15' },
        { id: 'day-2', name: 'Day 2', date: '2024-03-16' },
        { id: 'day-3', name: 'Day 3', date: '2024-03-17' }
      ]
      setDays(defaultDays)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadSessions(), loadHalls(), loadDays()])
      setLoading(false)
    }
    
    loadData()

    // Set up real-time subscriptions
    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions' }, 
        () => loadSessions()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'stages' }, 
        () => loadHalls()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conference_days' }, 
        () => loadDays()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'day_time_slots' }, 
        () => loadTimeSlots()
      )
      .subscribe()

    return () => {
      sessionsChannel.unsubscribe()
    }
  }, [])

  useEffect(() => {
    loadTimeSlots()
  }, [selectedDay, days])

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

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setIsModalOpen(true)
  }

  const handleAddSession = (hallId: string, timeSlotId: string) => {
    setSessionToAdd({ hallId, timeSlotId })
    setEditingSession(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingSession(null)
    setSessionToAdd(null)
  }

  const handleSubmitSession = async (formData: any, sessionType: string) => {
    console.log('🚀 Starting session submission...')
    console.log('📝 Form data:', formData)
    console.log('🎯 Session type:', sessionType)

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
        stage_id: sessionToAdd?.hallId || editingSession?.stage_id,
        time_slot_id: sessionToAdd?.timeSlotId || editingSession?.time_slot_id,
        topic: formData.topic,
        description: formData.description,
        is_parallel_meal: formData.is_parallel_meal,
        parallel_meal_type: formData.parallel_meal_type,
        data: formData.data || {}
      }

      console.log('📤 Insert/Update payload:', insertData)
      let response
      if (editingSession) {
        response = await supabase.from('sessions').update(insertData).eq('id', editingSession.id)
      } else {
        response = await supabase.from('sessions').insert(insertData)
      }

      console.log('🟢 Supabase response:', response)
      if (response.error) {
        console.error('❌ Supabase error:', response.error)
        alert(`Error saving session:\n${JSON.stringify(response.error, null, 2)}`)
        return
      }

      await loadSessions()
      handleCloseModal()
      console.log('🎉 Session submission completed successfully!')
    } catch (error) {
      console.error('❌ Error saving session:', error)
      alert(`Error saving session: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
          throw error
        }

        await loadSessions()
      } catch (error) {
        console.error('❌ Error deleting session:', error)
        alert('Error deleting session. Please try again.')
      }
    }
  }

  const handleDeleteHall = (hall: Hall) => {
    setHallToDelete(hall)
    setIsDeleteModalOpen(true)
  }

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '1234'
  
  const confirmDeleteHall = async () => {
    if (deletePassword === ADMIN_PASSWORD && hallToDelete) {
      try {
        // Move sessions to first available hall
        const firstHall = halls.find(h => h.id !== hallToDelete.id)
        if (firstHall) {
          const { error } = await supabase
            .from('sessions')
            .update({ stage_id: firstHall.id })
            .eq('stage_id', hallToDelete.id)

          if (error) {
            console.error('❌ Error moving sessions:', error)
          }
        }

        const { error } = await supabase
          .from('stages')
          .delete()
          .eq('id', hallToDelete.id)

        if (error) {
          console.error('❌ Error deleting hall:', error)
          throw error
        }

        await Promise.all([loadSessions(), loadHalls()])
        setIsDeleteModalOpen(false)
        setHallToDelete(null)
        setDeletePassword('')
      } catch (error) {
        console.error('❌ Error deleting hall:', error)
        alert('Error deleting hall. Please try again.')
      }
    } else {
      alert('Incorrect password. Please try again.')
    }
  }

  const handleAddHall = async () => {
    if (!newHallName.trim()) {
      alert('Hall name cannot be empty')
      return
    }
    
    const existingHall = halls.find(h => h.name === newHallName.trim())
    if (existingHall) {
      alert('A hall with this name already exists')
      return
    }
    
    const sanitizedName = newHallName.trim().replace(/[<>]/g, '')
    
    if (sanitizedName) {
      try {
        const { error } = await supabase
          .from('stages')
          .insert({
            name: sanitizedName,
            capacity: 100
          })

        if (error) {
          console.error('❌ Error adding hall:', error)
          alert(`Error adding hall: ${error.message}`)
          return
        }

        await loadHalls()
        setShowAddHallModal(false)
        setNewHallName('')
      } catch (error: any) {
        console.error('❌ Error adding hall:', error)
        alert(`Error adding hall: ${error.message || 'Unknown error'}`)
      }
    }
  }

  const handleQuickAddHall = async () => {
    const hallNames = ['I', 'II', 'III', 'IV', 'V']
    const availableNames = hallNames.filter(name => !halls.some(hall => hall.name === name))
    
    if (availableNames.length > 0) {
      try {
        const { error } = await supabase
          .from('stages')
          .insert({
            name: availableNames[0],
            capacity: 100
          })

        if (error) {
          console.error('❌ Error adding hall:', error)
          alert(`Error adding hall: ${error.message}`)
          setShowAddHallModal(true)
          return
        }

        await loadHalls()
      } catch (error: any) {
        console.error('❌ Error adding hall:', error)
        alert(`Error adding hall: ${error.message || 'Unknown error'}`)
        setShowAddHallModal(true)
      }
    } else {
      setShowAddHallModal(true)
    }
  }

  const handleAddDay = () => {
    setShowAddDayModal(true)
  }

  const handleSaveDay = async () => {
    if (newDayName.trim() && newDayDate) {
      try {
        const { error } = await supabase
          .from('conference_days')
          .insert({
            name: newDayName.trim(),
            date: newDayDate
          })

        if (error) {
          console.error('❌ Error adding day:', error)
          alert('Error adding day. Please try again.')
          return
        }

        await loadDays()
        setShowAddDayModal(false)
        setNewDayName('')
        setNewDayDate('')
      } catch (error) {
        console.error('❌ Error adding day:', error)
        alert('Error adding day. Please try again.')
      }
    }
  }

  const handleEditTimeSlot = (timeSlot: DayTimeSlot) => {
    setEditingTimeSlot(timeSlot)
  }

  const handleSaveTimeSlot = async (timeSlotId: string, startTime: string, endTime: string, isBreak: boolean, breakTitle?: string) => {
    try {
      const { error } = await supabase
        .from('day_time_slots')
        .update({
          start_time: startTime,
          end_time: endTime,
          is_break: isBreak,
          break_title: breakTitle
        })
        .eq('id', timeSlotId)

      if (error) {
        console.error('❌ Error updating time slot:', error)
        alert('Error updating time slot. Please try again.')
        return
      }

      await loadTimeSlots()
      setEditingTimeSlot(null)
    } catch (error) {
      console.error('❌ Error updating time slot:', error)
      alert('Error updating time slot. Please try again.')
    }
  }

  const filteredSessions = sessions.filter(session => session.day_name === selectedDay)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading sessions...</div>
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
      {/* Debug Panel - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">🔧 Debug Information</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <div>📊 Sessions: {sessions.length} | Halls: {halls.length} | Days: {days.length} | Time Slots: {timeSlots.length}</div>
              <div>🌐 Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
              <div>🔑 Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
              <div>🔒 Admin Password: {process.env.NEXT_PUBLIC_ADMIN_PASSWORD ? '✅ Set' : '❌ Missing'}</div>
              <div>📱 Selected Day: {selectedDay}</div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b print:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                Scientific Conference Program
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                March 15-17, 2024
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleAddDay}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Day
              </button>
              <button
                onClick={handleQuickAddHall}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Hall
              </button>
            </div>
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
            <button
              onClick={handleAddDay}
              className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              + Add Day
            </button>
          </nav>
        </div>
      </div>

      {/* Program Content - New Grid Layout */}
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

        {/* Main Grid Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Grid Header */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {/* Time Column Header */}
            <div className="sticky left-0 z-20 bg-gray-50 border-r border-gray-200 px-4 py-3 min-w-[120px] flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">Time</span>
            </div>
            
            {/* Hall Headers */}
            <div className="flex overflow-x-auto">
              {halls.map((hall) => (
                <div 
                  key={hall.id} 
                  className="min-w-[280px] px-4 py-3 border-r border-gray-200 bg-gray-50 flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900">{hall.name}</span>
                    <span className="text-xs text-gray-500">
                      ({filteredSessions.filter(s => s.stage_id === hall.id).length} sessions)
                    </span>
                  </div>
                  
                  {/* Hall Actions */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteHall(hall)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete hall"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid Body */}
          <div className="flex overflow-x-auto">
            {/* Sticky Time Column */}
            <div className="sticky left-0 z-10 bg-white border-r border-gray-200">
              {timeSlots.map((slot) => (
                <div 
                  key={slot.id} 
                  className="h-16 flex items-center justify-center border-b border-gray-100 px-4 min-w-[120px] relative"
                >
                  {editingTimeSlot?.id === slot.id ? (
                    <div className="flex flex-col space-y-1 w-full">
                      <input
                        type="time"
                        defaultValue={slot.start_time}
                        className="text-xs border rounded px-1"
                        onBlur={(e) => handleSaveTimeSlot(slot.id, e.target.value, slot.end_time, slot.is_break, slot.break_title)}
                      />
                      <input
                        type="time"
                        defaultValue={slot.end_time}
                        className="text-xs border rounded px-1"
                        onBlur={(e) => handleSaveTimeSlot(slot.id, slot.start_time, e.target.value, slot.is_break, slot.break_title)}
                      />
                    </div>
                  ) : (
                    <div 
                      className="text-xs text-gray-500 font-medium cursor-pointer hover:text-gray-700"
                      onClick={() => handleEditTimeSlot(slot)}
                    >
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      {slot.is_break && (
                        <div className="text-xs text-gray-400 mt-1">
                          {slot.break_title || 'Break'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Halls Columns */}
            <div className="flex">
              {halls.map((hall) => {
                return (
                  <div 
                    key={hall.id} 
                    className="min-w-[280px] relative border-r border-gray-200 last:border-r-0"
                  >
                    {/* Time Grid Background */}
                    <div className="relative" style={{ height: timeSlots.length * 64 }}>
                      {timeSlots.map((slot) => {
                        const sessionInThisSlot = filteredSessions.find(
                          session => session.stage_id === hall.id && session.time_slot_id === slot.id
                        );
                        
                        return (
                          <div 
                            key={slot.id} 
                            className="h-16 border-b border-gray-100 relative"
                          >
                            {sessionInThisSlot ? (
                              <div
                                className="absolute left-2 right-2 top-1 bottom-1 rounded-lg shadow-md border border-gray-200 bg-white hover:shadow-lg transition-all duration-200 cursor-pointer group"
                                onClick={() => handleEditSession(sessionInThisSlot)}
                              >
                                <div className="p-2 h-full flex flex-col">
                                  {/* Title */}
                                  <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                                    {sessionInThisSlot.title}
                                  </div>
                                  
                                  {/* Session Type Badge */}
                                  <div className="mt-1">
                                    <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium ${getSessionTypeColor(sessionInThisSlot.session_type)}`}>
                                      {getSessionIcon(sessionInThisSlot.session_type)} {getSessionTypeLabel(sessionInThisSlot.session_type)}
                                    </span>
                                  </div>

                                  {/* Action Buttons - Show on Hover */}
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEditSession(sessionInThisSlot); }}
                                      className="p-1 bg-white rounded shadow-sm text-gray-600 hover:text-indigo-600"
                                      title="Edit session"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteSession(sessionInThisSlot.id); }}
                                      className="p-1 bg-white rounded shadow-sm text-gray-600 hover:text-red-600"
                                      title="Delete session"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddSession(hall.id, slot.id)}
                                className="absolute inset-0 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Add session"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSession ? 'Edit Session' : 'Create New Session'}
        maxWidth="max-w-2xl"
      >
        <SessionForm
          initialData={editingSession ? {
            title: editingSession?.title ?? '',
            topic: editingSession?.topic ?? '',
            day_id: editingSession?.day_id ?? '',
            stage_id: editingSession?.stage_id ?? '',
            time_slot_id: editingSession?.time_slot_id ?? '',
            start_time: editingSession?.start_time ?? '',
            end_time: editingSession?.end_time ?? '',
            description: editingSession?.description ?? '',
            is_parallel_meal: editingSession?.is_parallel_meal ?? false,
            parallel_meal_type: editingSession?.parallel_meal_type ?? ''
          } : {
            day_id: days.find(d => d.name === selectedDay)?.id ?? '',
            stage_id: sessionToAdd?.hallId ?? '',
            time_slot_id: sessionToAdd?.timeSlotId ?? '',
            start_time: timeSlots.find(ts => ts.id === sessionToAdd?.timeSlotId)?.start_time ?? '',
            end_time: timeSlots.find(ts => ts.id === sessionToAdd?.timeSlotId)?.end_time ?? ''
          }}
          sessionType={editingSession?.session_type || 'lecture'}
          onSubmit={handleSubmitSession}
          onCancel={handleCloseModal}
          isSubmitting={isSubmitting}
          hideTimeSelection={true}
        />
      </Modal>

      {/* Delete Hall Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setHallToDelete(null)
          setDeletePassword('')
        }}
        title="Delete Hall"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{hallToDelete?.name}</strong>? 
            This action requires a password and will move all sessions to another hall.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter password"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false)
                setHallToDelete(null)
                setDeletePassword('')
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteHall}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Hall
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Hall Modal */}
      <Modal
        isOpen={showAddHallModal}
        onClose={() => {
          setShowAddHallModal(false)
          setNewHallName('')
        }}
        title="Add New Hall"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hall Name
            </label>
            <input
              type="text"
              value={newHallName}
              onChange={(e) => setNewHallName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter hall name (e.g., I, II, III)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddHall()
                } else if (e.key === 'Escape') {
                  setShowAddHallModal(false)
                  setNewHallName('')
                }
              }}
              autoFocus
              maxLength={50}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowAddHallModal(false)
                setNewHallName('')
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={handleAddHall}
              disabled={!newHallName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Hall
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Day Modal */}
      <Modal
        isOpen={showAddDayModal}
        onClose={() => {
          setShowAddDayModal(false)
          setNewDayName('')
          setNewDayDate('')
        }}
        title="Add New Day"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Day Name
            </label>
            <select
              value={newDayName}
              onChange={(e) => setNewDayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Day</option>
              <option value="Day 4">Day 4</option>
              <option value="Day 5">Day 5</option>
              <option value="Day 6">Day 6</option>
              <option value="Day 7">Day 7</option>
              <option value="Day 8">Day 8</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={newDayDate}
              onChange={(e) => setNewDayDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowAddDayModal(false)
                setNewDayName('')
                setNewDayDate('')
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDay}
              disabled={!newDayName.trim() || !newDayDate}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Day
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
} 