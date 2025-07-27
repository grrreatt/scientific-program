'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatTimeRange, calculateDuration } from '@/lib/utils'
import { SESSION_TYPES } from '@/lib/constants'
import { Modal } from '@/components/ui/modal'
import { SessionForm } from '@/components/session-form'
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

interface TimeSlot {
  id: string
  start_time: string
  end_time: string
  sessions: Record<string, Session | null> // hallId -> session
}

export default function EditSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [halls, setHalls] = useState<Hall[]>([
    { id: 'hall-1', name: 'Main Hall', color: 'bg-blue-50 border-blue-200' },
    { id: 'hall-2', name: 'Seminar Room A', color: 'bg-green-50 border-green-200' },
    { id: 'hall-3', name: 'Seminar Room B', color: 'bg-purple-50 border-purple-200' }
  ])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedDay, setSelectedDay] = useState('Day 1')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingHallId, setEditingHallId] = useState<string | null>(null)
  const [editingHallName, setEditingHallName] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [hallToDelete, setHallToDelete] = useState<Hall | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [showAddHallModal, setShowAddHallModal] = useState(false)
  const [newHallName, setNewHallName] = useState('')
  const [sessionToAdd, setSessionToAdd] = useState<{ hallId: string; timeSlotId: string } | null>(null)
  const [showAddDayModal, setShowAddDayModal] = useState(false)
  const [newDayName, setNewDayName] = useState('')
  const [newDayDate, setNewDayDate] = useState('')

  // Generate time slots from 8:00 AM to 6:00 PM with 30-minute intervals
  const generateTimeSlots = () => {
    const slots: TimeSlot[] = []
    let currentTime = new Date()
    currentTime.setHours(8, 0, 0, 0) // Start at 8:00 AM
    
    for (let i = 0; i < 20; i++) { // 20 slots = 10 hours (30-minute intervals)
      const startTime = new Date(currentTime)
      const endTime = new Date(currentTime.getTime() + 30 * 60 * 1000) // Add 30 minutes
      
      slots.push({
        id: `slot-${i}`,
        start_time: startTime.toTimeString().slice(0, 5),
        end_time: endTime.toTimeString().slice(0, 5),
        sessions: {}
      })
      
      currentTime = endTime
    }
    
    return slots
  }

  // Load sessions from Supabase
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error loading sessions:', error)
        return
      }

      // Helper function to map stage_id to stage_name
      const getStageName = (stageId: string) => {
        switch (stageId) {
          case 'main-hall': return 'Main Hall'
          case 'seminar-a': return 'Seminar Room A'
          case 'seminar-b': return 'Seminar Room B'
          default: return 'Workshop Room'
        }
      }

      // Helper function to map day_id to day_name
      const getDayName = (dayId: string) => {
        switch (dayId) {
          case 'day1': return 'Day 1'
          case 'day2': return 'Day 2'
          case 'day3': return 'Day 3'
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
        speaker_name: session.data?.speaker_name,
        moderator_name: session.data?.moderator_name,
        panelist_names: session.data?.panelist_names,
        description: session.description,
        is_parallel_meal: session.is_parallel_meal,
        parallel_meal_type: session.parallel_meal_type,
        discussion_leader_id: session.data?.discussion_leader_id
      }))

      setSessions(transformedSessions)
    } catch (error) {
      console.error('Error loading sessions:', error)
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
        return
      }

      // Transform Supabase data to our Hall format
      const transformedHalls: Hall[] = data.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        color: 'bg-gray-50 border-gray-200'
      }))

      setHalls(transformedHalls.length > 0 ? transformedHalls : [
        { id: 'hall-1', name: 'Main Hall', color: 'bg-blue-50 border-blue-200' },
        { id: 'hall-2', name: 'Seminar Room A', color: 'bg-green-50 border-green-200' },
        { id: 'hall-3', name: 'Seminar Room B', color: 'bg-purple-50 border-purple-200' }
      ])
    } catch (error) {
      console.error('Error loading halls:', error)
    }
  }

  useEffect(() => {
    // Initialize time slots
    setTimeSlots(generateTimeSlots())
    
    // Load data from Supabase
    const loadData = async () => {
      await Promise.all([loadSessions(), loadHalls()])
      setLoading(false)
    }
    
    loadData()
  }, [])

  // Populate time slots with sessions
  useEffect(() => {
    if (sessions.length > 0 && timeSlots.length > 0) {
      const updatedTimeSlots = timeSlots.map(slot => {
        const slotSessions: Record<string, Session | null> = {}
        
        halls.forEach(hall => {
          const session = sessions.find(s => 
            s.day_name === selectedDay && 
            s.stage_name === hall.name &&
            s.start_time === slot.start_time
          )
          slotSessions[hall.id] = session || null
        })
        
        return { ...slot, sessions: slotSessions }
      })
      
      setTimeSlots(updatedTimeSlots)
    }
  }, [sessions, selectedDay, halls])

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
    setIsSubmitting(true)
    
    try {
      let hall: Hall | undefined
      let timeSlot: TimeSlot | undefined
      
      if (editingSession) {
        // For editing, find hall by name
        hall = halls.find(h => h.name === editingSession.stage_name)
        timeSlot = timeSlots.find(ts => ts.start_time === editingSession.start_time)
      } else {
        // For new session, find hall by ID
        hall = halls.find(h => h.id === sessionToAdd?.hallId)
        timeSlot = timeSlots.find(ts => ts.id === sessionToAdd?.timeSlotId)
      }
      
      if (editingSession) {
        // Update existing session in Supabase
        const { error } = await supabase
          .from('sessions')
          .update({
            title: formData.title,
            session_type: sessionType,
            topic: formData.topic,
            description: formData.description,
            start_time: formData.start_time || editingSession.start_time,
            end_time: formData.end_time || editingSession.end_time,
            data: {
              speaker_name: formData.speaker_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                           formData.speaker_id === 'speaker2' ? 'Dr. Michael Chen' :
                           formData.speaker_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                           formData.speaker_id === 'speaker4' ? 'Prof. David Thompson' :
                           formData.speaker_id === 'speaker5' ? 'Dr. Lisa Wang' : '',
              moderator_name: formData.moderator_name,
              panelist_names: formData.panelist_names
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSession.id)

        if (error) {
          console.error('Error updating session:', error)
          throw error
        }
      } else {
        // Create new session in Supabase
        const { error } = await supabase
          .from('sessions')
          .insert({
            title: formData.title,
            session_type: sessionType,
            day_id: selectedDay === 'Day 1' ? 'day1' : selectedDay === 'Day 2' ? 'day2' : 'day3',
            stage_id: hall?.name === 'Main Hall' ? 'main-hall' :
                      hall?.name === 'Seminar Room A' ? 'seminar-a' :
                      hall?.name === 'Seminar Room B' ? 'seminar-b' : 'workshop',
            start_time: timeSlot?.start_time || '09:00',
            end_time: formData.end_time || timeSlot?.end_time || '10:00',
            topic: formData.topic,
            description: formData.description,
            data: {
              speaker_name: formData.speaker_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                           formData.speaker_id === 'speaker2' ? 'Dr. Michael Chen' :
                           formData.speaker_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                           formData.speaker_id === 'speaker4' ? 'Prof. David Thompson' :
                           formData.speaker_id === 'speaker5' ? 'Dr. Lisa Wang' : '',
              moderator_name: formData.moderator_name,
              panelist_names: formData.panelist_names
            }
          })

        if (error) {
          console.error('Error creating session:', error)
          throw error
        }
      }
      
      // Reload sessions from database
      await loadSessions()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving session:', error)
      alert('Error saving session. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        const { error } = await supabase
          .from('sessions')
          .delete()
          .eq('id', sessionId)

        if (error) {
          console.error('Error deleting session:', error)
          throw error
        }

        // Reload sessions from database
        await loadSessions()
      } catch (error) {
        console.error('Error deleting session:', error)
        alert('Error deleting session. Please try again.')
      }
    }
  }

  const handleEditHallName = (hallId: string) => {
    const hall = halls.find(h => h.id === hallId)
    if (hall) {
      setEditingHallId(hallId)
      setEditingHallName(hall.name)
    }
  }

  const handleSaveHallName = async () => {
    if (editingHallId && editingHallName.trim()) {
      try {
        const { error } = await supabase
          .from('stages')
          .update({ name: editingHallName.trim() })
          .eq('id', editingHallId)

        if (error) {
          console.error('Error updating hall:', error)
          throw error
        }

        // Reload halls from database
        await loadHalls()
        setEditingHallId(null)
        setEditingHallName('')
      } catch (error) {
        console.error('Error updating hall:', error)
        alert('Error updating hall name. Please try again.')
      }
    }
  }

  const handleCancelEditHall = () => {
    setEditingHallId(null)
    setEditingHallName('')
  }

  const handleDeleteHall = (hall: Hall) => {
    setHallToDelete(hall)
    setIsDeleteModalOpen(true)
  }

  // Helper function to map hall names to stage_ids
  const getStageId = (hallName: string) => {
    switch (hallName) {
      case 'Main Hall': return 'main-hall'
      case 'Seminar Room A': return 'seminar-a'
      case 'Seminar Room B': return 'seminar-b'
      default: return 'workshop'
    }
  }

  const confirmDeleteHall = async () => {
    if (deletePassword === '1234' && hallToDelete) {
      try {
        // Move sessions from deleted hall to first available hall
        const firstHall = halls.find(h => h.id !== hallToDelete.id)
        if (firstHall) {
          const { error } = await supabase
            .from('sessions')
            .update({ stage_id: getStageId(firstHall.name) })
            .eq('stage_id', getStageId(hallToDelete.name))

          if (error) {
            console.error('Error moving sessions:', error)
          }
        }

        // Delete the hall
        const { error } = await supabase
          .from('stages')
          .delete()
          .eq('id', hallToDelete.id)

        if (error) {
          console.error('Error deleting hall:', error)
          throw error
        }

        // Reload data
        await Promise.all([loadSessions(), loadHalls()])
        setIsDeleteModalOpen(false)
        setHallToDelete(null)
        setDeletePassword('')
      } catch (error) {
        console.error('Error deleting hall:', error)
        alert('Error deleting hall. Please try again.')
      }
    } else {
      alert('Incorrect password. Please try again.')
    }
  }

  const handleAddHall = async () => {
    if (newHallName.trim()) {
      try {
        const { error } = await supabase
          .from('stages')
          .insert({
            name: newHallName.trim(),
            capacity: 100
          })

        if (error) {
          console.error('Error adding hall:', error)
          throw error
        }

        // Reload halls from database
        await loadHalls()
        setShowAddHallModal(false)
        setNewHallName('')
      } catch (error) {
        console.error('Error adding hall:', error)
        alert('Error adding hall. Please try again.')
      }
    }
  }

  const handleQuickAddHall = async () => {
    const hallNames = ['Workshop Room', 'Auditorium', 'Conference Room', 'Exhibition Hall', 'Outdoor Stage']
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
          console.error('Error adding hall:', error)
          throw error
        }

        // Reload halls from database
        await loadHalls()
      } catch (error) {
        console.error('Error adding hall:', error)
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
        // For now, we'll add it to the days list locally
        // In a real app, you'd save this to a days table in the database
        // For now, we'll just close the modal and let the user know
        alert(`Day "${newDayName}" with date "${newDayDate}" would be added to the database. This feature needs backend implementation.`)
        
        setShowAddDayModal(false)
        setNewDayName('')
        setNewDayDate('')
      } catch (error) {
        console.error('Error adding day:', error)
        alert('Error adding day. Please try again.')
      }
    }
  }

  const filteredSessions = sessions.filter(session => session.day_name === selectedDay)
  const days = Array.from(new Set(sessions.map(s => s.day_name)))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading sessions...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Same as public page */}
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
              <button
                onClick={() => handleAddSession(halls[0]?.id || '', timeSlots[0]?.id || '')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Day Navigation - Same as public page */}
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
            <button
              onClick={handleAddDay}
              className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              + Add Day
            </button>
          </nav>
        </div>
      </div>

      {/* Program Content - Same layout as public page */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Day Header - Same as public page */}
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

        {/* Schedule Grid - Same design as public page but with editing */}
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No sessions scheduled for this day.</p>
            <button
              onClick={() => handleAddSession(halls[0]?.id || '', timeSlots[0]?.id || '')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add First Session
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-gray-300">
            {/* Grid Header - Same as public page */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-b border-gray-200 bg-gray-50">
              <div className="p-4 font-medium text-gray-900 border-r border-gray-200">
                Time
              </div>
              {halls.map((hall, index) => (
                <div 
                  key={hall.id} 
                  className={`p-4 font-medium text-gray-900 border-r border-gray-200 relative group ${
                    index < halls.length - 1 ? 'border-r border-gray-200' : ''
                  }`}
                >
                  {editingHallId === hall.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingHallName}
                        onChange={(e) => setEditingHallName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleSaveHallName()
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            handleCancelEditHall()
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveHallName}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEditHall}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span 
                        className="cursor-pointer hover:text-indigo-600"
                        onClick={() => handleEditHallName(hall.id)}
                      >
                        {hall.name}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleDeleteHall(hall)}
                          className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 text-sm transition-opacity"
                        >
                          ×
                        </button>
                        {index === halls.length - 1 && (
                          <button
                            onClick={handleQuickAddHall}
                            className="opacity-0 group-hover:opacity-100 text-green-600 hover:text-green-800 text-sm transition-opacity"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Grid Content - Same as public page but with editing */}
            <div className="divide-y divide-gray-200">
              {timeSlots.map((timeSlot, timeIndex) => (
                <div 
                  key={timeSlot.id}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 hover:bg-gray-50 transition-colors relative group"
                >
                  {/* Time Column - Same as public page but editable */}
                  <div className="p-4 bg-gray-50 border-r border-gray-200 flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      {formatTime(timeSlot.start_time)}
                    </div>
                  </div>

                  {/* Hall Columns - Same as public page but with editing */}
                  {halls.map((hall, hallIndex) => {
                    const session = timeSlot.sessions[hall.id]
                    
                    return (
                      <div 
                        key={hall.id}
                        className={`p-4 ${
                          hallIndex < halls.length - 1 ? 'border-r border-gray-200' : ''
                        }`}
                      >
                        {session ? (
                          <div className="space-y-2 group">
                            {/* Session Type Badge - Same as public page */}
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getSessionIcon(session.session_type)}</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSessionTypeColor(session.session_type)}`}>
                                {getSessionTypeLabel(session.session_type)}
                              </span>
                            </div>

                            {/* Session Title - Same as public page */}
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                              {session.title}
                            </h3>

                            {/* Session Details - Same as public page */}
                            <div className="text-xs text-gray-600 space-y-1">
                              <p>{formatTimeRange(session.start_time, session.end_time)}</p>
                              {session.topic && <p>Topic: {session.topic}</p>}
                              {session.speaker_name && <p>Speaker: {session.speaker_name}</p>}
                              {session.moderator_name && <p>Moderator: {session.moderator_name}</p>}
                              {session.panelist_names && session.panelist_names.length > 0 && (
                                <p>Panelists: {session.panelist_names.join(', ')}</p>
                              )}
                            </div>

                            {/* Edit Controls - Only visible on hover */}
                            <div className="flex space-x-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditSession(session)}
                                className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="text-xs text-red-600 hover:text-red-900 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="text-gray-400 text-sm flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                            onClick={() => handleAddSession(hall.id, timeSlot.id)}
                          >
                            <span>+ Add Session</span>
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

        {/* Print Button - Same as public page */}
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
            day_id: editingSession.day_name === 'Day 1' ? 'day1' : 
                    editingSession.day_name === 'Day 2' ? 'day2' : 'day3',
            stage_id: editingSession.stage_name === 'Main Hall' ? 'main-hall' :
                      editingSession.stage_name === 'Seminar Room A' ? 'seminar-a' :
                      editingSession.stage_name === 'Seminar Room B' ? 'seminar-b' : 'workshop',
            start_time: editingSession.start_time,
            end_time: editingSession.end_time,
            speaker_id: editingSession.speaker_name === 'Dr. Sarah Johnson' ? 'speaker1' :
                       editingSession.speaker_name === 'Dr. Michael Chen' ? 'speaker2' :
                       editingSession.speaker_name === 'Dr. Emily Rodriguez' ? 'speaker3' :
                       editingSession.speaker_name === 'Prof. David Thompson' ? 'speaker4' :
                       editingSession.speaker_name === 'Dr. Lisa Wang' ? 'speaker5' : ''
          } : {}}
          sessionType={editingSession?.session_type || 'lecture'}
          onSubmit={handleSubmitSession}
          onCancel={handleCloseModal}
          isSubmitting={isSubmitting}
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
              placeholder="Enter hall name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddHall()
                }
              }}
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