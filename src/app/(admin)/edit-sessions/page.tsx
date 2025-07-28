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
  const [showAddHallModal, setShowAddHallModal] = useState(false)
  const [newHallName, setNewHallName] = useState('')
  const [sessionToAdd, setSessionToAdd] = useState<{ hallId: string; timeSlotId: string } | null>(null)
  const [showAddDayModal, setShowAddDayModal] = useState(false)
  const [newDayName, setNewDayName] = useState('')
  const [newDayDate, setNewDayDate] = useState('')
  const [editingTimeSlot, setEditingTimeSlot] = useState<DayTimeSlot | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [zoomLevel, setZoomLevel] = useState(100)
  const [selectedHallFilter, setSelectedHallFilter] = useState<string>('all')
  const [showStageDropdown, setShowStageDropdown] = useState(false)
  const [showDateDropdown, setShowDateDropdown] = useState(false)


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

  // Generate half-hour time slots from 8:00 AM to 8:30 PM
  const generateTimeSlots = () => {
    const slots: DayTimeSlot[] = []
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
        id: `slot-${slotOrder}`,
        day_id: days.find(d => d.name === selectedDay)?.id || '',
        slot_order: slotOrder,
        start_time: startTime,
        end_time: endTimeStr,
        is_break: false,
        break_title: undefined
      })
      
      slotOrder++
    }
    
    return slots
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
        // Try to create default time slots in database
        await createDefaultTimeSlots(selectedDayData.id)
        return
      }

      if (data && data.length > 0) {
        console.log('✅ Time slots loaded successfully:', data.length, 'slots')
        setTimeSlots(data)
      } else {
        // Create default time slots in database if none exist
        await createDefaultTimeSlots(selectedDayData.id)
      }
    } catch (error) {
      console.error('❌ Exception loading time slots:', error)
      // Try to create default time slots in database
      const selectedDayData = days.find(d => d.name === selectedDay)
      if (selectedDayData) {
        await createDefaultTimeSlots(selectedDayData.id)
      }
    }
  }

  // Create default time slots in the database
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
        // Fallback to local generation
        const defaultSlots = generateTimeSlots()
        setTimeSlots(defaultSlots)
        return
      }

      console.log('✅ Default time slots created successfully:', data?.length || 0, 'slots')
      setTimeSlots(data || [])
    } catch (error) {
      console.error('❌ Exception creating default time slots:', error)
      // Fallback to local generation
      const defaultSlots = generateTimeSlots()
      setTimeSlots(defaultSlots)
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

    // Set up enhanced real-time subscriptions
    realtimeService.subscribeToAll({
      onSessionChange: (payload) => {
        console.log('🔄 Session change detected:', payload)
        setLastUpdate(new Date())
        loadSessions()
      },
      onHallChange: (payload) => {
        console.log('🔄 Hall change detected:', payload)
        setLastUpdate(new Date())
        loadHalls()
      },
      onDayChange: (payload) => {
        console.log('🔄 Day change detected:', payload)
        setLastUpdate(new Date())
        loadDays()
      },
      onTimeSlotChange: (payload) => {
        console.log('🔄 Time slot change detected:', payload)
        setLastUpdate(new Date())
        loadTimeSlots()
      },
      onConnectionChange: (status) => {
        console.log('🔗 Connection status changed:', status)
        setConnectionStatus(status as 'connected' | 'disconnected' | 'connecting')
      }
    })

    return () => {
      realtimeService.unsubscribeFromAll()
    }
  }, [])

  useEffect(() => {
    loadTimeSlots()
  }, [selectedDay, days])

  // Handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.dropdown-container')) {
        setShowStageDropdown(false)
        setShowDateDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
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

      // Check if we're using a generated time slot (starts with 'slot-')
      const timeSlotId = sessionToAdd?.timeSlotId || editingSession?.time_slot_id
      if (timeSlotId && timeSlotId.startsWith('slot-')) {
        alert('Cannot save session with a generated time slot. Please use an existing time slot or create a proper time slot first.')
        setIsSubmitting(false)
        return
      }

      const insertData = {
        title: formData.title,
        session_type: sessionType,
        day_id: selectedDayData.id,
        stage_id: sessionToAdd?.hallId || editingSession?.stage_id,
        time_slot_id: timeSlotId,
        topic: formData.topic,
        description: formData.description,
        is_parallel_meal: formData.is_parallel_meal,
        parallel_meal_type: formData.parallel_meal_type
      }

      console.log('📤 Insert/Update payload:', insertData)
      
      // Optimistic update - immediately update UI
      if (editingSession) {
        // Update existing session optimistically
        setSessions(prev => prev.map(s => 
          s.id === editingSession.id 
            ? { ...s, ...insertData, optimistic: true } as Session
            : s
        ))
      } else {
        // Add new session optimistically
        const optimisticSession: Session = {
          id: `temp-${Date.now()}`,
          title: formData.title,
          session_type: sessionType,
          day_id: selectedDayData.id,
          stage_id: sessionToAdd?.hallId || '',
          time_slot_id: sessionToAdd?.timeSlotId || '',
          topic: formData.topic,
          description: formData.description,
          is_parallel_meal: formData.is_parallel_meal,
          parallel_meal_type: formData.parallel_meal_type,
          optimistic: true,
          day_name: selectedDay,
          stage_name: halls.find(h => h.id === sessionToAdd?.hallId)?.name || '',
          start_time: timeSlots.find(ts => ts.id === sessionToAdd?.timeSlotId)?.start_time || '',
          end_time: timeSlots.find(ts => ts.id === sessionToAdd?.timeSlotId)?.end_time || ''
        }
        setSessions(prev => [...prev, optimisticSession])
      }

      // Close modal immediately for better UX
      handleCloseModal()

      // Perform actual database operation
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
        // Revert optimistic update on error
        await loadSessions()
        return
      }

      // Remove optimistic flag and update with real data
      await loadSessions()
      console.log('🎉 Session submission completed successfully!')
    } catch (error) {
      console.error('❌ Error saving session:', error)
      alert(`Error saving session: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Revert optimistic update on error
      await loadSessions()
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

  const handleDeleteDay = async (day: Day) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${day.name}"? This will also delete all sessions scheduled for this day.`
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

        // Then delete the day
        const { error: dayError } = await supabase
          .from('conference_days')
          .delete()
          .eq('id', day.id)

        if (dayError) {
          console.error('❌ Error deleting day:', dayError)
          alert('Error deleting day.')
          return
        }

        await loadDays()
        if (selectedDay === day.name) {
          const remainingDays = days.filter(d => d.id !== day.id)
          if (remainingDays.length > 0) {
            setSelectedDay(remainingDays[0].name)
          }
        }
        alert('Day deleted successfully!')
      } catch (error) {
        console.error('❌ Error deleting day:', error)
        alert('Error deleting day. Please try again.')
      }
    }
  }

  const confirmDeleteHall = async () => {
    if (!hallToDelete) {
      alert('No hall selected for deletion.')
      return
    }
    
    try {
      console.log('🔧 Starting hall deletion process...')
      
      // Move sessions to first available hall
      const firstHall = halls.find(h => h.id !== hallToDelete.id)
      if (firstHall) {
        console.log('🔧 Moving sessions to hall:', firstHall.name)
        const { error } = await supabase
          .from('sessions')
          .update({ stage_id: firstHall.id })
          .eq('stage_id', hallToDelete.id)

        if (error) {
          console.error('❌ Error moving sessions:', error)
          alert(`Error moving sessions: ${error.message}`)
          return
        }
        console.log('✅ Sessions moved successfully')
      }

      console.log('🔧 Deleting hall:', hallToDelete.name)
      const { error } = await supabase
        .from('stages')
        .delete()
        .eq('id', hallToDelete.id)

      if (error) {
        console.error('❌ Error deleting hall:', error)
        alert(`Error deleting hall: ${error.message}`)
        return
      }

      console.log('✅ Hall deleted successfully')
      await Promise.all([loadSessions(), loadHalls()])
      setIsDeleteModalOpen(false)
      setHallToDelete(null)
      alert('Hall deleted successfully!')
    } catch (error) {
      console.error('❌ Error deleting hall:', error)
      alert(`Error deleting hall: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleAddHall = async () => {
    if (!newHallName.trim()) {
      alert('Hall name cannot be empty')
      return
    }
    
    const existingHall = halls.find(h => h.name.toLowerCase() === newHallName.trim().toLowerCase())
    if (existingHall) {
      alert('A hall with this name already exists')
      return
    }
    
    const sanitizedName = newHallName.trim().replace(/[<>]/g, '')
    
    if (sanitizedName) {
      try {
        console.log('🔄 Adding new hall:', sanitizedName)
        
        const { data, error } = await supabase
          .from('stages')
          .insert({
            name: sanitizedName,
            capacity: 100
          })
          .select()

        if (error) {
          console.error('❌ Error adding hall:', error)
          alert(`Error adding hall: ${error.message}`)
          return
        }

        console.log('✅ Hall added successfully:', data)
        await loadHalls()
        setShowAddHallModal(false)
        setNewHallName('')
        alert('Hall added successfully!')
      } catch (error: any) {
        console.error('❌ Error adding hall:', error)
        alert(`Error adding hall: ${error.message || 'Unknown error'}`)
      }
    }
  }

  const handleQuickAddHall = async () => {
    // Always show the modal for custom naming
    setShowAddHallModal(true)
  }

  const handleAddDay = () => {
    setShowAddDayModal(true)
  }

  const handleSaveDay = async () => {
    if (!newDayName.trim()) {
      alert('Please enter a day name.')
      return
    }
    
    if (!newDayDate) {
      alert('Please select a date.')
      return
    }

    try {
      console.log('🔄 Adding new day:', { name: newDayName.trim(), date: newDayDate })
      
      const { data, error } = await supabase
        .from('conference_days')
        .insert({
          name: newDayName.trim(),
          date: newDayDate
        })
        .select()

      if (error) {
        console.error('❌ Error adding day:', error)
        alert(`Error adding day: ${error.message || 'Database error occurred'}`)
        return
      }

      console.log('✅ Day added successfully:', data)
      await loadDays()
      setShowAddDayModal(false)
      setNewDayName('')
      setNewDayDate('')
      alert('Day added successfully!')
    } catch (error) {
      console.error('❌ Error adding day:', error)
      alert(`Error adding day: ${error instanceof Error ? error.message : 'Network or database error occurred'}`)
    }
  }

  const handleEditTimeSlot = (timeSlot: DayTimeSlot) => {
    setEditingTimeSlot(timeSlot)
  }

  const handleSaveTimeSlot = async (timeSlotId: string, startTime: string, endTime: string, isBreak: boolean, breakTitle?: string) => {
    try {
      // Check if this is a generated slot (starts with 'slot-')
      if (timeSlotId.startsWith('slot-')) {
        // For generated slots, create a proper database entry
        const selectedDayData = days.find(d => d.name === selectedDay)
        if (!selectedDayData) {
          alert('Selected day not found!')
          return
        }

        const slotData = timeSlots.find(slot => slot.id === timeSlotId)
        if (!slotData) {
          alert('Time slot not found!')
          return
        }

        const { data, error } = await supabase
          .from('day_time_slots')
          .insert({
            day_id: selectedDayData.id,
            slot_order: slotData.slot_order,
            start_time: startTime,
            end_time: endTime,
            is_break: isBreak,
            break_title: breakTitle
          })
          .select()
          .single()

        if (error) {
          console.error('❌ Error creating time slot:', error)
          alert('Error creating time slot. Please try again.')
          return
        }

        console.log('✅ Time slot created successfully:', data)
        await loadTimeSlots()
        setEditingTimeSlot(null)
        return
      }

      // For database slots, update in Supabase
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
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-48 mx-auto"></div>
              </div>
              <div className="flex space-x-3">
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Day Navigation Skeleton */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-32 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-48 mx-auto"></div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <div className="text-lg text-gray-600 mb-2">Loading your conference program...</div>
              <div className="text-sm text-gray-500">Connecting to real-time database</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="text-lg text-red-600 mb-2">⚠️ Connection Error</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <div className="space-y-2">
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                loadSessions()
                loadHalls()
                loadDays()
              }}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              🔄 Retry Connection
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              🔄 Refresh Page
            </button>
          </div>
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
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered')
                    loadSessions()
                    loadHalls()
                    loadDays()
                    loadTimeSlots()
                  }}
                  className="text-xs bg-yellow-200 px-2 py-1 rounded hover:bg-yellow-300"
                >
                  🔄 Refresh All Data
                </button>
                <button
                  onClick={() => {
                    console.log('🔍 Current State:', {
                      sessions,
                      halls,
                      days,
                      timeSlots,
                      selectedDay,
                      error
                    })
                    alert('Check browser console for detailed state information')
                  }}
                  className="text-xs bg-yellow-200 px-2 py-1 rounded hover:bg-yellow-300"
                >
                  📊 Log State
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b print:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900">
                  APCON 2025
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Draft
                  </span>
                  <span className="text-sm text-gray-600">
                    3 - 11 Dec, 2025
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <RealtimeStatus />
              <button
                onClick={() => window.open('/public-program', '_blank')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Publish
              </button>
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                GM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard
            </button>
            <button className="py-4 px-1 border-b-2 font-medium text-sm border-teal-500 text-teal-600">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Content
            </button>
            <button className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Engagement
            </button>
            <button className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Users
            </button>
            <button className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Secondary Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button className="py-3 px-1 border-b-2 font-medium text-sm border-teal-500 text-teal-600">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule
            </button>
            <button className="py-3 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Speakers
            </button>
            <button className="py-3 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Workshops
            </button>
            <button className="py-3 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Custom menu
            </button>
            <button className="py-3 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Partners
            </button>
          </nav>
        </div>
      </div>

      {/* Program Content - Modern Card Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            {/* Date Selector */}
            <div className="flex items-center space-x-4">
              <div className="relative dropdown-container">
                <button 
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {days.find(d => d.name === selectedDay)?.date || '3 Dec - 2025'}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Date Dropdown */}
                {showDateDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      {days.map(day => (
                        <button
                          key={day.id}
                          onClick={() => {
                            setSelectedDay(day.name)
                            setShowDateDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span>{day.name} - {day.date}</span>
                          {days.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDay(day)
                              }}
                              className="p-1 text-red-400 hover:text-red-600"
                              title="Delete day"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </button>
                      ))}
                      <div className="border-t border-gray-200">
                        <button
                          onClick={() => {
                            setShowDateDropdown(false)
                            handleAddDay()
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-teal-600 hover:bg-teal-50"
                        >
                          + Add New Day
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center space-x-2">
              {/* Zoom Controls */}
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                  className="px-3 py-2 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700"
                >
                  -
                </button>
                <button className="px-3 py-2 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700">
                  {zoomLevel}%
                </button>
                <button 
                  onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                  className="px-3 py-2 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700"
                >
                  +
                </button>
              </div>

              {/* Action Buttons */}
              <button 
                onClick={() => {
                  loadSessions()
                  loadHalls()
                  loadDays()
                  loadTimeSlots()
                }}
                className="p-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                title="Refresh data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button className="p-2 bg-teal-600 text-white rounded hover:bg-teal-700" title="Toggle visibility">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button className="p-2 bg-teal-600 text-white rounded hover:bg-teal-700" title="Time settings">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Stage Filter */}
              <div className="relative dropdown-container">
                <button 
                  onClick={() => setShowStageDropdown(!showStageDropdown)}
                  className="inline-flex items-center px-3 py-2 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {selectedHallFilter === 'all' ? 'All Stages' : halls.find(h => h.id === selectedHallFilter)?.name || 'Stage'}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Stage Dropdown */}
                {showStageDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setSelectedHallFilter('all')
                          setShowStageDropdown(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        All Stages
                      </button>
                      {halls.map(hall => (
                        <button
                          key={hall.id}
                          onClick={() => {
                            setSelectedHallFilter(hall.id)
                            setShowStageDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span>{hall.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteHall(hall)
                            }}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Delete hall"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </button>
                      ))}
                      <div className="border-t border-gray-200">
                        <button
                          onClick={() => {
                            setShowStageDropdown(false)
                            handleQuickAddHall()
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-teal-600 hover:bg-teal-50"
                        >
                          + Add New Stage
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hall Columns Layout */}
        <div className="overflow-x-auto" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}>
          <div className="flex space-x-6" style={{ minWidth: `${Math.max(halls.length * 320, 100)}px` }}>
            {(selectedHallFilter === 'all' ? halls : halls.filter(h => h.id === selectedHallFilter)).map((hall) => (
              <div key={hall.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-shrink-0" style={{ width: '300px' }}>
                {/* Hall Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900">{hall.name}</h3>
                    <button
                      onClick={() => handleDeleteHall(hall)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete hall"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <button
                    className="p-1 text-gray-400 hover:text-teal-600 rounded"
                    title="Edit hall"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>

                {/* Time Slots and Sessions */}
                <div className="p-4 space-y-3">
                  {timeSlots.map((slot) => {
                    const sessionInThisSlot = filteredSessions.find(
                      session => session.stage_id === hall.id && session.time_slot_id === slot.id
                    );
                    
                    return (
                      <div key={slot.id} className="relative">
                        {/* Time Indicator */}
                        <div className="absolute left-0 top-0 w-16 text-xs text-gray-500 font-medium">
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </div>
                        
                        {/* Session Card or Add Button */}
                        <div className="ml-20">
                          {sessionInThisSlot ? (
                            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                              {/* Session Header */}
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900 text-sm">{sessionInThisSlot.title}</h4>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEditSession(sessionInThisSlot)}
                                    className="p-1 text-gray-400 hover:text-teal-600 rounded"
                                    title="Edit session"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSession(sessionInThisSlot.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                                    title="Delete session"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              
                              {/* Session Details */}
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
                              </div>
                              
                              {/* Session Type Badge */}
                              <div className="mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSessionTypeColor(sessionInThisSlot.session_type)}`}>
                                  {getSessionIcon(sessionInThisSlot.session_type)} {getSessionTypeLabel(sessionInThisSlot.session_type)}
                                </span>
                              </div>
                              
                              {/* Description */}
                              {sessionInThisSlot.description && (
                                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                  {sessionInThisSlot.description}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddSession(hall.id, slot.id)}
                              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-400 hover:text-teal-600 hover:border-teal-400 hover:bg-teal-50 transition-all duration-200 group"
                            >
                              <div className="flex items-center justify-center space-x-2">
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="text-sm font-medium">Add Session</span>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
        />
      </Modal>

      {/* Delete Hall Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setHallToDelete(null)
        }}
        title="Delete Hall"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{hallToDelete?.name}</strong>? 
            This action will move all sessions to another hall.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false)
                setHallToDelete(null)
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
        <form onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleAddHall()
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hall Name
              </label>
              <input
                type="text"
                value={newHallName}
                onChange={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setNewHallName(e.target.value)
                }}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddHall()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    setShowAddHallModal(false)
                    setNewHallName('')
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter hall name (e.g., Hall A, Seminar Room)"
                autoFocus
                maxLength={50}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowAddHallModal(false)
                  setNewHallName('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newHallName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Hall
              </button>
            </div>
          </div>
        </form>
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