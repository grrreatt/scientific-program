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

  // Time slot editing state
  const [editingTimeSlot, setEditingTimeSlot] = useState<DayTimeSlot | null>(null)
  
  // Add hall state
  const [showAddHallModal, setShowAddHallModal] = useState(false)
  const [newHallName, setNewHallName] = useState('')
  
  // Add day state
  const [showAddDayModal, setShowAddDayModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

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

      // Load sessions with a more robust query
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          conference_days(name),
          stages(name),
          day_time_slots(start_time, end_time, is_break, break_title)
        `)
        .order('created_at', { ascending: true })

      if (sessionsError) {
        console.error('❌ Error loading sessions:', sessionsError)
        // Don't fail completely, just set empty sessions
        setSessions([])
      } else {
        // Transform the data to match the expected format
        const transformedSessions = sessionsData?.map(session => ({
          ...session,
          day_name: session.conference_days?.name || 'Unknown Day',
          stage_name: session.stages?.name || 'Unknown Hall',
          start_time: session.day_time_slots?.start_time || session.start_time || '',
          end_time: session.day_time_slots?.end_time || session.end_time || '',
          is_break: session.day_time_slots?.is_break || false,
          break_title: session.day_time_slots?.break_title
        })) || []

        setSessions(transformedSessions)
      }
      console.log('✅ All data loaded successfully')
      console.log('📊 Data summary:', {
        days: daysData?.length || 0,
        halls: hallsData?.length || 0,
        sessions: sessionsData?.length || 0,
        sessionsCount: sessions.length
      })

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
        // Try to create default time slots
        await createDefaultTimeSlots(selectedDayData.id)
        return
      }

      if (data && data.length > 0) {
        setTimeSlots(data)
      } else {
        // Create default time slots if none exist
        await createDefaultTimeSlots(selectedDayData.id)
      }
    } catch (error) {
      console.error('❌ Exception loading time slots:', error)
      // Try to create default time slots
      const selectedDayData = days.find(d => d.name === selectedDay)
      if (selectedDayData) {
        await createDefaultTimeSlots(selectedDayData.id)
      }
    }
  }

  // Create default time slots for a day
  const createDefaultTimeSlots = async (dayId: string) => {
    try {
      console.log('🔄 Creating default time slots for day:', dayId)
      
      const slots = []
      let currentTime = new Date()
      currentTime.setHours(8, 0, 0, 0) // Start at 8:00 AM
      
      const endTime = new Date()
      endTime.setHours(20, 30, 0, 0) // End at 8:30 PM
      
      let slotOrder = 1
      
      while (currentTime <= endTime) {
        const startTime = currentTime.toTimeString().slice(0, 5)
        
        // Add 30 minutes
        currentTime.setMinutes(currentTime.getMinutes() + 30)
        const endTimeStr = currentTime.toTimeString().slice(0, 5)
        
        slots.push({
          day_id: dayId,
          slot_order: slotOrder,
          start_time: startTime,
          end_time: endTimeStr,
          is_break: false,
          break_title: null
        })
        
        slotOrder++
      }

      const { data, error } = await supabase
        .from('day_time_slots')
        .insert(slots)
        .select()

      if (error) {
        console.error('❌ Error creating default time slots:', error)
        return
      }

      console.log('✅ Default time slots created successfully:', data?.length || 0, 'slots')
      setTimeSlots(data || [])
    } catch (error) {
      console.error('❌ Exception creating default time slots:', error)
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
      lecture: 'bg-blue-100 text-blue-800 border-blue-200',
      panel: 'bg-green-100 text-green-800 border-green-200',
      workshop: 'bg-purple-100 text-purple-800 border-purple-200',
      symposium: 'bg-orange-100 text-orange-800 border-orange-200',
      oration: 'bg-red-100 text-red-800 border-red-200',
      guest_lecture: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      discussion: 'bg-teal-100 text-teal-800 border-teal-200',
      break: 'bg-gray-100 text-gray-800 border-gray-200',
      other: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getSessionIcon = (type: string) => {
    const icons: Record<string, string> = {
      lecture: '🩺',
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

  const handleAddDay = async (date: Date) => {
    const dayName = `Day ${days.length + 1}`
    const dateString = date.toISOString().split('T')[0]
    
    try {
      const { error } = await supabase
        .from('conference_days')
        .insert({
          name: dayName,
          date: dateString
        })

      if (error) {
        console.error('❌ Error adding day:', error)
        alert('Error adding day. Please try again.')
        return
      }

      setShowAddDayModal(false)
      setSelectedDate(null)
      await loadAllData()
      console.log('✅ Day added successfully')
      
    } catch (error) {
      console.error('❌ Error adding day:', error)
      alert('Error adding day. Please try again.')
    }
  }

  const handleDeleteDay = async (day: Day) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${day.name}"? This will also delete all sessions and time slots scheduled for this day.`
    )
    
    if (confirmed) {
      try {
        // First delete all sessions for this day
        const { error: sessionsError } = await supabase
          .from('sessions')
          .delete()
          .eq('day_id', day.id)

        if (sessionsError) {
          console.error('❌ Error deleting sessions:', sessionsError)
          alert('Error deleting sessions for this day.')
          return
        }

        // Then delete all time slots for this day
        const { error: timeSlotsError } = await supabase
          .from('day_time_slots')
          .delete()
          .eq('day_id', day.id)

        if (timeSlotsError) {
          console.error('❌ Error deleting time slots:', timeSlotsError)
          alert('Error deleting time slots for this day.')
          return
        }

        // Finally delete the day
        const { error: dayError } = await supabase
          .from('conference_days')
          .delete()
          .eq('id', day.id)

        if (dayError) {
          console.error('❌ Error deleting day:', dayError)
          alert('Error deleting day.')
          return
        }

        await loadAllData()
        if (selectedDay === day.name) {
          const remainingDays = days.filter(d => d.id !== day.id)
          if (remainingDays.length > 0) {
            setSelectedDay(remainingDays[0].name)
          }
        }
        console.log('✅ Day deleted successfully')
        
      } catch (error) {
        console.error('❌ Error deleting day:', error)
        alert('Error deleting day. Please try again.')
      }
    }
  }

  const handleAddHall = async () => {
    if (!newHallName.trim()) {
      alert('Please enter a hall name')
      return
    }

    try {
      const { error } = await supabase
        .from('stages')
        .insert({
          name: newHallName.trim(),
          capacity: null
        })

      if (error) {
        console.error('❌ Error adding hall:', error)
        alert('Error adding hall. Please try again.')
        return
      }

      setNewHallName('')
      setShowAddHallModal(false)
      await loadAllData()
      console.log('✅ Hall added successfully')
      
    } catch (error) {
      console.error('❌ Error adding hall:', error)
      alert('Error adding hall. Please try again.')
    }
  }

  const handleDeleteHall = async (hall: Hall) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${hall.name}"? This will also delete all sessions scheduled in this hall.`
    )
    
    if (confirmed) {
      try {
        // First delete all sessions in this hall
        const { error: sessionsError } = await supabase
          .from('sessions')
          .delete()
          .eq('stage_id', hall.id)

        if (sessionsError) {
          console.error('❌ Error deleting sessions:', sessionsError)
          alert('Error deleting sessions in this hall.')
          return
        }

        // Then delete the hall
        const { error: hallError } = await supabase
          .from('stages')
          .delete()
          .eq('id', hall.id)

        if (hallError) {
          console.error('❌ Error deleting hall:', hallError)
          alert('Error deleting hall.')
          return
        }

        await loadAllData()
        console.log('✅ Hall deleted successfully')
        
      } catch (error) {
        console.error('❌ Error deleting hall:', error)
        alert('Error deleting hall. Please try again.')
      }
    }
  }

  // Time slot editing functions
  const handleEditTimeSlot = (timeSlot: DayTimeSlot) => {
    setEditingTimeSlot(timeSlot)
  }

  const handleSaveTimeSlot = async (timeSlotId: string, startTime: string, endTime: string) => {
    try {
      const { error } = await supabase
        .from('day_time_slots')
        .update({
          start_time: startTime,
          end_time: endTime
        })
        .eq('id', timeSlotId)

      if (error) {
        console.error('❌ Error updating time slot:', error)
        alert('Error updating time slot. Please try again.')
        return
      }

      await loadTimeSlots()
      setEditingTimeSlot(null)
      console.log('✅ Time slot updated successfully')
      
    } catch (error) {
      console.error('❌ Error updating time slot:', error)
      alert('Error updating time slot. Please try again.')
    }
  }

  // Get sessions for a specific time slot and hall
  const getSessionForTimeSlotAndHall = (timeSlotId: string, hallId: string) => {
    return sessions.find(session => 
      session.time_slot_id === timeSlotId && 
      session.stage_id === hallId &&
      session.day_name === selectedDay
    )
  }

  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek }
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const isDateSelected = (date: Date) => {
    const dateString = formatDate(date)
    return days.some(day => day.date === dateString)
  }

  const isDateToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1)
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1)
      }
      return newMonth
    })
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
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Conference Program Editor
              </h1>
              <p className="text-sm text-gray-600">
                {selectedDay} Schedule - {halls.length} Halls • {timeSlots.length} Time Slots
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <RealtimeStatus />
            </div>
          </div>
        </div>
      </div>

      {/* Day Navigation */}
      <div className="bg-white border-b sticky top-16 z-10">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex space-x-8 overflow-x-auto">
              {days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => setSelectedDay(day.name)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
                    selectedDay === day.name
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>{day.name} - {day.date}</span>
                  {days.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteDay(day)
                      }}
                      className="text-red-400 hover:text-red-600"
                      title="Delete day"
                    >
                      🗑️
                    </button>
                  )}
                </button>
              ))}
            </div>
            
            {/* Add Day Button */}
            <button
              onClick={() => setShowAddDayModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm font-medium flex items-center space-x-2 whitespace-nowrap"
            >
              <span>📅</span>
              <span>Add Day</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Grid Layout */}
      <div className="overflow-auto">
        <div className="min-w-max">
          {/* Header Row - Hall Names */}
          <div className="bg-white border-b sticky top-32 z-10">
            <div className="flex">
              {/* Time Column Header */}
              <div className="w-32 bg-gray-50 border-r border-gray-200 p-3 font-semibold text-sm text-gray-700">
                🕘 Time
              </div>
              
              {/* Hall Column Headers */}
              {halls.map((hall) => (
                <div key={hall.id} className="w-80 bg-gray-50 border-r border-gray-200 p-3 font-semibold text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>🏛️ {hall.name}</span>
                    <button
                      onClick={() => handleDeleteHall(hall)}
                      className="text-red-600 hover:text-red-800 text-xs p-1"
                      title="Delete Hall"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Add Hall Column */}
              <div className="w-80 bg-gray-50 border-r border-gray-200 p-3">
                <button
                  onClick={() => setShowAddHallModal(true)}
                  className="w-full h-full flex items-center justify-center text-indigo-600 hover:text-indigo-800 text-sm font-medium border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 transition-colors"
                >
                  + Add Hall
                </button>
              </div>
            </div>
          </div>

          {/* Time Slot Rows */}
          {timeSlots.map((timeSlot, index) => (
            <div key={timeSlot.id} className="bg-white border-b">
              <div className="flex">
                {/* Time Column */}
                <div className="w-32 bg-gray-50 border-r border-gray-200 p-3">
                  {editingTimeSlot?.id === timeSlot.id ? (
                    <div className="space-y-2">
                      <input
                        type="time"
                        value={timeSlot.start_time}
                        onChange={(e) => {
                          const newTimeSlots = [...timeSlots]
                          newTimeSlots[index] = { ...timeSlot, start_time: e.target.value }
                          setTimeSlots(newTimeSlots)
                        }}
                        className="w-full text-sm border rounded px-2 py-1"
                      />
                      <input
                        type="time"
                        value={timeSlot.end_time}
                        onChange={(e) => {
                          const newTimeSlots = [...timeSlots]
                          newTimeSlots[index] = { ...timeSlot, end_time: e.target.value }
                          setTimeSlots(newTimeSlots)
                        }}
                        className="w-full text-sm border rounded px-2 py-1"
                      />
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleSaveTimeSlot(timeSlot.id, timeSlot.start_time, timeSlot.end_time)}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTimeSlot(null)}
                          className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <div className="font-medium">{timeSlot.start_time}</div>
                      <div className="text-gray-500">{timeSlot.end_time}</div>
                      <button
                        onClick={() => handleEditTimeSlot(timeSlot)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Hall Columns */}
                {halls.map((hall) => {
                  const session = getSessionForTimeSlotAndHall(timeSlot.id, hall.id)
                  
                  return (
                    <div key={hall.id} className="w-80 border-r border-gray-200 p-3">
                      {session ? (
                        <div className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                          {/* Session Card */}
                          <div className="space-y-2">
                            {/* Title */}
                            <div className="font-semibold text-sm text-gray-900 flex items-center">
                              <span className="mr-2">{getSessionIcon(session.session_type)}</span>
                              {session.title}
                            </div>
                            
                            {/* Speaker */}
                            {session.topic && (
                              <div className="text-xs text-gray-600 flex items-center">
                                <span className="mr-1">🎤</span>
                                {session.topic}
                              </div>
                            )}
                            
                            {/* Location */}
                            <div className="text-xs text-gray-600 flex items-center">
                              <span className="mr-1">📍</span>
                              {session.stage_name}
                            </div>
                            
                            {/* Format/Type */}
                            <div className="text-xs flex items-center">
                              <span className="mr-1">🧪</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionTypeColor(session.session_type)}`}>
                                {getSessionTypeLabel(session.session_type)}
                              </span>
                            </div>
                            
                            {/* Tags */}
                            {session.description && (
                              <div className="text-xs text-gray-600 flex items-center">
                                <span className="mr-1">🏷️</span>
                                {session.description.substring(0, 50)}{session.description.length > 50 ? '...' : ''}
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-1 pt-2">
                              <button
                                onClick={() => handleEditSession(session)}
                                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <button
                            onClick={() => handleAddSession(hall.id, timeSlot.id)}
                            className="text-gray-400 hover:text-gray-600 text-sm border-2 border-dashed border-gray-300 rounded-lg p-4 w-full h-20 flex items-center justify-center hover:border-gray-400 transition-colors"
                          >
                            + Add Session
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* Add Hall Column */}
                <div className="w-80 border-r border-gray-200 p-3">
                  <div className="h-full flex items-center justify-center">
                    <div className="text-gray-400 text-sm text-center">
                      Add Hall to<br />add sessions here
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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

      {/* Add Hall Modal */}
      <Modal
        isOpen={showAddHallModal}
        onClose={() => setShowAddHallModal(false)}
        title="Add New Hall"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="hallName" className="block text-sm font-medium text-gray-700 mb-2">
              Hall Name
            </label>
            <input
              type="text"
              id="hallName"
              value={newHallName}
              onChange={(e) => setNewHallName(e.target.value)}
              placeholder="Enter hall name (e.g., Main Hall, Seminar Room A)"
              className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddHall()
                }
              }}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddHallModal(false)}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddHall}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add Hall
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Day Calendar Modal */}
      <Modal
        isOpen={showAddDayModal}
        onClose={() => setShowAddDayModal(false)}
        title="Select day"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          {/* Calendar Header */}
          <div className="bg-teal-600 text-white p-3 rounded-t-lg">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateMonth('prev')}
                className="text-white hover:text-teal-100 transition-colors"
              >
                ‹
              </button>
              <h3 className="text-lg font-medium">{getMonthName(currentMonth)}</h3>
              <button
                onClick={() => navigateMonth('next')}
                className="text-white hover:text-teal-100 transition-colors"
              >
                ›
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 px-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 px-3">
            {(() => {
              const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)
              const days = []
              
              // Add empty cells for days before the first day of the month
              for (let i = 0; i < startingDayOfWeek; i++) {
                days.push(<div key={`empty-${i}`} className="h-10"></div>)
              }
              
              // Add days of the month
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                const isSelected = isDateSelected(date)
                const isToday = isDateToday(date)
                const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
                
                days.push(
                  <button
                    key={day}
                    onClick={() => {
                      if (!isSelected && !isPast) {
                        setSelectedDate(date)
                        handleAddDay(date)
                      }
                    }}
                    disabled={isSelected || isPast}
                    className={`
                      h-10 w-10 rounded-full text-sm font-medium transition-colors
                      ${isSelected 
                        ? 'bg-green-500 text-white' 
                        : isToday 
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                          : isPast
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                      }
                    `}
                  >
                    {day}
                  </button>
                )
              }
              
              return days
            })()}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={() => setShowAddDayModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
} 