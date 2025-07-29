'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatTimeRange } from '@/lib/utils'
import { SESSION_TYPES } from '@/lib/constants'
import { Modal } from '@/components/ui/modal'
import { SessionForm } from '@/components/session-form'
import { supabase } from '@/lib/supabase/client'
import { Session, DayTimeSlot, Hall, Day, DayHall } from '@/types'
import realtimeService from '@/lib/supabase/realtime'
import { RealtimeStatus } from '@/components/ui/realtime-status'

export default function EditSessionsPage() {
  // Database state
  const [sessions, setSessions] = useState<Session[]>([])
  const [timeSlots, setTimeSlots] = useState<DayTimeSlot[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [dayHalls, setDayHalls] = useState<DayHall[]>([])
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
  const [newDayName, setNewDayName] = useState('')
  const [selectedHallForSession, setSelectedHallForSession] = useState<string>('')
  const [selectedTimeSlotForSession, setSelectedTimeSlotForSession] = useState<string>('')
  const [speakers, setSpeakers] = useState<Array<{ id: string; name: string; email?: string; title?: string; organization?: string }>>([])

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'day' | 'hall', item: any } | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Session[]>([])
  
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

      // Load speakers
      const { data: speakersData, error: speakersError } = await supabase
        .from('speakers')
        .select('*')
        .order('name', { ascending: true })

      if (speakersError) {
        console.error('❌ Error loading speakers:', speakersError)
        setError('Failed to load speakers')
        return
      }

      setSpeakers(speakersData || [])

      // Load day-specific halls
      const { data: dayHallsData, error: dayHallsError } = await supabase
        .from('halls_with_days')
        .select('*')
        .order('day_date', { ascending: true })
        .order('hall_order', { ascending: true })

      if (dayHallsError) {
        console.error('❌ Error loading day halls:', dayHallsError)
        setError('Failed to load day halls')
        return
      }

      setDayHalls(dayHallsData || [])

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
    const selectedDayData = days.find(day => day.name === selectedDay)
    const selectedHall = getHallsForSelectedDay().find(hall => hall.id === hallId)
    const selectedTimeSlot = timeSlots.find(slot => slot.id === timeSlotId)
    
    if (!selectedDayData || !selectedHall || !selectedTimeSlot) {
      alert('Selected day, hall, or time slot not found!')
      return
    }
    
    setSelectedHallForSession(hallId)
    setSelectedTimeSlotForSession(timeSlotId)
    setEditingSession(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingSession(null)
    setSelectedHallForSession('')
    setSelectedTimeSlotForSession('')
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
    const dayName = newDayName.trim() || `Day ${days.length + 1}`
    const dateString = date.toISOString().split('T')[0]
    
    try {
      // First, create the day
      const { data: newDay, error: dayError } = await supabase
        .from('conference_days')
        .insert({
          name: dayName,
          date: dateString
        })
        .select('id')
        .single()

      if (dayError) {
        console.error('❌ Error adding day:', dayError)
        alert('Error adding day. Please try again.')
        return
      }

      // Then, add all existing halls to this new day
      if (halls.length > 0) {
        const dayHallInserts = halls.map((hall, index) => ({
          day_id: newDay.id,
          hall_id: hall.id,
          hall_order: index
        }))

        const { error: dayHallsError } = await supabase
          .from('day_halls')
          .insert(dayHallInserts)

        if (dayHallsError) {
          console.error('❌ Error adding halls to new day:', dayHallsError)
          // Don't fail completely, the day was created successfully
        }
      }

      setShowAddDayModal(false)
      setSelectedDate(null)
      setNewDayName('')
      await loadAllData()
      console.log('✅ Day added successfully with halls')
      
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

    const selectedDayData = days.find(day => day.name === selectedDay)
    if (!selectedDayData) {
      alert('Please select a day first')
      return
    }

    try {
      // First, create the hall if it doesn't exist
      const { data: existingHall, error: checkError } = await supabase
        .from('stages')
        .select('id')
        .eq('name', newHallName.trim())
        .single()

      let hallId: string

      if (checkError && checkError.code === 'PGRST116') {
        // Hall doesn't exist, create it
        const { data: newHall, error: createError } = await supabase
          .from('stages')
          .insert({ name: newHallName.trim(), capacity: null })
          .select('id')
          .single()

        if (createError) {
          console.error('❌ Error creating hall:', createError)
          alert('Error creating hall. Please try again.')
          return
        }

        hallId = newHall.id
      } else if (checkError) {
        console.error('❌ Error checking hall:', checkError)
        alert('Error checking hall. Please try again.')
        return
      } else {
        hallId = existingHall.id
      }

      // Get the next hall order for this day
      const dayHallsForSelectedDay = dayHalls.filter(dh => dh.day_id === selectedDayData.id)
      const nextOrder = dayHallsForSelectedDay.length

      // Add the hall to this specific day
      const { error: dayHallError } = await supabase
        .from('day_halls')
        .insert({
          day_id: selectedDayData.id,
          hall_id: hallId,
          hall_order: nextOrder
        })

      if (dayHallError) {
        console.error('❌ Error adding hall to day:', dayHallError)
        alert('Error adding hall to day. Please try again.')
        return
      }

      setNewHallName('')
      setShowAddHallModal(false)
      await loadAllData()
      console.log('✅ Hall added to day successfully')
      
    } catch (error) {
      console.error('❌ Error adding hall:', error)
      alert('Error adding hall. Please try again.')
    }
  }

  const handleDeleteHall = async (hall: Hall) => {
    try {
      console.log('🗑️ Deleting hall:', hall.name)
      
      // First, delete all sessions in this hall for the selected day
      const dayId = days.find(d => d.name === selectedDay)?.id
      if (dayId) {
        const { error: sessionsError } = await supabase
          .from('sessions')
          .delete()
          .eq('day_id', dayId)
          .eq('stage_id', hall.id)

        if (sessionsError) {
          console.error('❌ Error deleting sessions:', sessionsError)
          alert('Error deleting sessions in this hall')
          return
        }
      }

      // Then delete the hall-day association
      const { error: dayHallError } = await supabase
        .from('halls_with_days')
        .delete()
        .eq('hall_id', hall.id)
        .eq('day_date', selectedDay)

      if (dayHallError) {
        console.error('❌ Error deleting hall-day association:', dayHallError)
        alert('Error removing hall from day')
        return
      }

      console.log('✅ Hall deleted successfully')
      
      // Reload data to reflect changes
      await loadAllData()
      
    } catch (error) {
      console.error('❌ Error deleting hall:', error)
      alert('Error deleting hall')
    }
  }

  const handleDeleteConfirmation = (type: 'day' | 'hall', item: any) => {
    setItemToDelete({ type, item })
    setShowDeleteConfirmation(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    try {
      if (itemToDelete.type === 'day') {
        await handleDeleteDay(itemToDelete.item)
      } else if (itemToDelete.type === 'hall') {
        await handleDeleteHall(itemToDelete.item)
      }
      
      setShowDeleteConfirmation(false)
      setItemToDelete(null)
    } catch (error) {
      console.error('❌ Error in delete confirmation:', error)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false)
    setItemToDelete(null)
  }

  // Search functionality
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const results = sessions.filter(session => {
      const searchLower = query.toLowerCase()
      return (
        session.title?.toLowerCase().includes(searchLower) ||
        session.topic?.toLowerCase().includes(searchLower) ||
        session.stage_name?.toLowerCase().includes(searchLower) ||
        session.session_type?.toLowerCase().includes(searchLower) ||
        session.description?.toLowerCase().includes(searchLower)
      )
    })
    setSearchResults(results)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    performSearch(query)
  }

  // Time slot editing functions
  const handleEditTimeSlot = (timeSlot: DayTimeSlot) => {
    setEditingTimeSlot(timeSlot)
  }

  const handleSaveTimeSlot = async (timeSlotId: string, startTime: string, endTime: string) => {
    try {
      // Find the current time slot index
      const currentIndex = timeSlots.findIndex(slot => slot.id === timeSlotId)
      if (currentIndex === -1) {
        alert('Time slot not found!')
        return
      }

      // Prepare updates for current and potentially next time slot
      const updates = []
      
      // Update current time slot
      updates.push(
        supabase
          .from('day_time_slots')
          .update({
            start_time: startTime,
            end_time: endTime
          })
          .eq('id', timeSlotId)
      )

      // If there's a next time slot and its start time was auto-updated, save it too
      if (currentIndex < timeSlots.length - 1) {
        const nextTimeSlot = timeSlots[currentIndex + 1]
        if (nextTimeSlot.start_time === endTime) {
          updates.push(
            supabase
              .from('day_time_slots')
              .update({
                start_time: endTime
              })
              .eq('id', nextTimeSlot.id)
          )
        }
      }

      // If there's a previous time slot and its end time was auto-updated, save it too
      if (currentIndex > 0) {
        const prevTimeSlot = timeSlots[currentIndex - 1]
        if (prevTimeSlot.end_time === startTime) {
          updates.push(
            supabase
              .from('day_time_slots')
              .update({
                end_time: startTime
              })
              .eq('id', prevTimeSlot.id)
          )
        }
      }

      // Execute all updates
      const results = await Promise.all(updates)
      
      // Check for errors
      for (const result of results) {
        if (result.error) {
          console.error('❌ Error updating time slot:', result.error)
          alert('Error updating time slot. Please try again.')
          return
        }
      }

      // Check if we need to create a new time slot after the current one
      const selectedDayData = days.find(d => d.name === selectedDay)
      if (selectedDayData && currentIndex === timeSlots.length - 1) {
        // This is the last time slot, check if we should create a new one
        const endTimeObj = new Date(`2000-01-01T${endTime}`)
        const maxEndTime = new Date(`2000-01-01T20:30`) // 8:30 PM
        
        if (endTimeObj < maxEndTime) {
          // Create a new time slot starting from the current end time
          const newEndTime = new Date(endTimeObj.getTime() + 30 * 60000) // Add 30 minutes
          const newEndTimeStr = newEndTime.toTimeString().slice(0, 5)
          
          const { error: createError } = await supabase
            .from('day_time_slots')
            .insert({
              day_id: selectedDayData.id,
              slot_order: timeSlots.length + 1,
              start_time: endTime,
              end_time: newEndTimeStr,
              is_break: false,
              break_title: null
            })

          if (createError) {
            console.error('❌ Error creating new time slot:', createError)
            // Don't fail the whole operation, just log the error
          } else {
            console.log('✅ New time slot created automatically')
          }
        }
      }

      await loadTimeSlots()
      setEditingTimeSlot(null)
      console.log('✅ Time slot(s) updated successfully')
      
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

  // Helper function to calculate default end time (30 minutes after start time)
  const calculateDefaultEndTime = (startTime: string) => {
    const startTimeObj = new Date(`2000-01-01T${startTime}`)
    const endTimeObj = new Date(startTimeObj.getTime() + 30 * 60000) // Add 30 minutes
    return endTimeObj.toTimeString().slice(0, 5)
  }

  // Get halls for selected day
  const getHallsForSelectedDay = () => {
    const selectedDayData = days.find(day => day.name === selectedDay)
    if (!selectedDayData) return []
    
    return dayHalls
      .filter(dayHall => dayHall.day_id === selectedDayData.id)
      .sort((a, b) => a.hall_order - b.hall_order)
      .map(dayHall => ({
        id: dayHall.hall_id,
        name: dayHall.hall_name || 'Unknown Hall',
        capacity: dayHall.hall_capacity
      }))
  }

  // Filter sessions for selected day and search
  const filteredSessions = sessions.filter(session => {
    const matchesDay = session.day_name === selectedDay
    if (!matchesDay) return false
    
    if (!searchQuery.trim()) return true
    
    const searchLower = searchQuery.toLowerCase()
    return (
      session.title?.toLowerCase().includes(searchLower) ||
      session.topic?.toLowerCase().includes(searchLower) ||
      session.stage_name?.toLowerCase().includes(searchLower) ||
      session.session_type?.toLowerCase().includes(searchLower) ||
      session.description?.toLowerCase().includes(searchLower)
    )
  })

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
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
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
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <RealtimeStatus />
            </div>
          </div>
        </div>
      </div>

      {/* Day Navigation */}
      <div className="bg-white border-b sticky top-20 z-40">
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
                        handleDeleteConfirmation('day', day)
                      }}
                      className="text-red-500 hover:text-red-700 text-lg font-bold"
                      title="Delete day"
                    >
                      ❌
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

            {/* Add Hall Button */}
            <button
              onClick={() => setShowAddHallModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center space-x-2 whitespace-nowrap"
            >
              <span>🏛️</span>
              <span>Add Hall</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Grid Layout */}
      {getHallsForSelectedDay().length > 0 ? (
        <div className="h-[calc(100vh-200px)] overflow-auto">
          <div className="min-w-max">
            {/* Header Row - Hall Names */}
            <div className="bg-white border-b sticky top-0 z-40">
              <div className="flex">
                {/* Time Column Header - Sticky */}
                <div className="w-32 bg-gray-50 border-r border-gray-200 p-3 font-semibold text-sm text-gray-700 sticky left-0 z-50">
                  🕘 Time
                </div>
                
                {/* Hall Column Headers */}
                {getHallsForSelectedDay().map((hall) => (
                  <div key={hall.id} className="w-80 bg-gray-50 border-r border-gray-200 p-3 font-semibold text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>🏛️ {hall.name}</span>
                      <button
                        onClick={() => handleDeleteConfirmation('hall', hall)}
                        className="text-red-500 hover:text-red-700 text-lg font-bold"
                        title="Remove Hall from Day"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slot Rows */}
            {timeSlots.map((timeSlot, index) => (
            <div key={timeSlot.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
              <div className="flex">
                {/* Time Column - Sticky */}
                <div className="w-32 bg-gray-50 border-r border-gray-200 p-4 sticky left-0 z-30">
                  {editingTimeSlot?.id === timeSlot.id ? (
                    <div className="space-y-2">
                      <input
                        type="time"
                        value={timeSlot.start_time}
                        onChange={(e) => {
                          const newTimeSlots = [...timeSlots]
                          const newStartTime = e.target.value
                          const newEndTime = calculateDefaultEndTime(newStartTime)
                          
                          newTimeSlots[index] = { 
                            ...timeSlot, 
                            start_time: newStartTime,
                            end_time: newEndTime
                          }
                          
                          // Auto-update previous time slot's end time if it exists
                          if (index > 0) {
                            newTimeSlots[index - 1] = { 
                              ...newTimeSlots[index - 1], 
                              end_time: newStartTime 
                            }
                          }
                          
                          setTimeSlots(newTimeSlots)
                        }}
                        className="w-full text-sm border rounded px-2 py-1"
                      />
                      {index > 0 && (
                        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          🔗 Previous slot will end at this time
                        </div>
                      )}
                      <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          ⏰ End time auto-calculated (+30 min)
                        </div>
                      <input
                        type="time"
                        value={timeSlot.end_time}
                        onChange={(e) => {
                          const newTimeSlots = [...timeSlots]
                          newTimeSlots[index] = { ...timeSlot, end_time: e.target.value }
                          
                          // Auto-update next time slot's start time if it exists
                          if (index < timeSlots.length - 1) {
                            newTimeSlots[index + 1] = { 
                              ...newTimeSlots[index + 1], 
                              start_time: e.target.value 
                            }
                          }
                          
                          setTimeSlots(newTimeSlots)
                        }}
                        className="w-full text-sm border rounded px-2 py-1"
                      />
                      {index < timeSlots.length - 1 && (
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          ⚡ Next slot will start at this time
                        </div>
                      )}
                      {index === timeSlots.length - 1 && (
                        <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                          ➕ New slot will be created after this
                        </div>
                      )}
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
                      <div className="font-medium text-gray-900">{timeSlot.start_time}</div>
                      <div className="text-gray-500">{timeSlot.end_time}</div>
                      <div className="flex space-x-1 mt-2">
                        <button
                          onClick={() => handleEditTimeSlot(timeSlot)}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Edit
                        </button>
                        {index < timeSlots.length - 1 && (
                          <button
                            onClick={() => {
                              const newTimeSlots = [...timeSlots]
                              const nextSlot = newTimeSlots[index + 1]
                              newTimeSlots[index] = { ...timeSlot, end_time: nextSlot.start_time }
                              setTimeSlots(newTimeSlots)
                              handleSaveTimeSlot(timeSlot.id, timeSlot.start_time, nextSlot.start_time)
                            }}
                            className="text-xs text-green-600 hover:text-green-800"
                            title="Quick adjust to next slot start time"
                          >
                            Quick
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Hall Columns */}
                {getHallsForSelectedDay().map((hall) => {
                  const session = getSessionForTimeSlotAndHall(timeSlot.id, hall.id)
                  
                  return (
                    <div key={hall.id} className="w-80 border-r border-gray-200 p-4">
                      {session ? (
                        <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                          {/* Session Card */}
                          <div className="space-y-3">
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
                            <div className="flex space-x-2 pt-2">
                              <button
                                onClick={() => handleEditSession(session)}
                                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
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
                            className="text-gray-400 hover:text-gray-600 text-sm border-2 border-dashed border-gray-300 rounded-lg p-6 w-full h-24 flex items-center justify-center hover:border-gray-400 transition-colors hover:bg-gray-50"
                          >
                            + Add Session
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-4">No halls added for this day yet</div>
            <button
              onClick={() => setShowAddHallModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Add First Hall
            </button>
          </div>
        </div>
      )}

      {/* Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSession ? 'Edit Session' : `Add New Session - ${halls.find(h => h.id === selectedHallForSession)?.name || 'Unknown Hall'}`}
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
            stage_id: selectedHallForSession || getHallsForSelectedDay()[0]?.id || '',
            time_slot_id: selectedTimeSlotForSession || timeSlots[0]?.id || ''
          }}
          sessionType={editingSession?.session_type || 'lecture'}
          onSubmit={handleSubmitSession}
          onCancel={handleCloseModal}
          isSubmitting={isSubmitting}
          days={days}
          halls={getHallsForSelectedDay()}
          timeSlots={timeSlots}
          isAddingNewSession={!editingSession}
          speakers={speakers}
        />
      </Modal>

      {/* Add Hall Modal */}
      {showAddHallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Add New Hall</h3>
              <button
                onClick={() => setShowAddHallModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="hallNameInput" className="block text-sm font-medium text-gray-700 mb-2">
                  Hall Name
                </label>
                <input
                  type="text"
                  id="hallNameInput"
                  value={newHallName}
                  onChange={(e) => setNewHallName(e.target.value)}
                  placeholder="e.g., Hall A - Auditorium"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddHall()
                    } else if (e.key === 'Escape') {
                      setShowAddHallModal(false)
                    }
                  }}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddHallModal(false)}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHall}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add Hall
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Day Calendar Modal */}
      {showAddDayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Add New Day</h3>
              <button
                onClick={() => {
                  setShowAddDayModal(false)
                  setNewDayName('')
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {/* Day Name Input */}
              <div className="mb-4">
                <label htmlFor="dayNameInput" className="block text-sm font-medium text-gray-700 mb-2">
                  Day Name
                </label>
                <input
                  type="text"
                  id="dayNameInput"
                  value={newDayName}
                  onChange={(e) => setNewDayName(e.target.value)}
                  placeholder="e.g., Day 4 - IAP-ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowAddDayModal(false)
                      setNewDayName('')
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use default name (Day {days.length + 1})
                </p>
              </div>

              {/* Calendar Header */}
              <div className="bg-teal-600 text-white p-3 rounded-t-lg mb-4">
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
              <div className="grid grid-cols-7 gap-1 px-3 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 px-3 mb-4">
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
                  onClick={() => {
                    setShowAddDayModal(false)
                    setNewDayName('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && itemToDelete && (
        <Modal
          isOpen={showDeleteConfirmation}
          onClose={handleCancelDelete}
          title={`Confirm Delete`}
          maxWidth="max-w-md"
        >
          <div className="text-center py-6">
            <p className="text-lg text-gray-800 mb-4">
              Are you sure you want to delete this {itemToDelete.type}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
} 