'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatTimeRange, calculateDuration, supabaseUtils, formatTimeRangeCompact } from '@/lib/utils'
import { SESSION_TYPES } from '@/lib/constants'
import { supabase } from '@/lib/supabase/client'
import realtimeService from '@/lib/supabase/realtime'
const REALTIME_ENABLED = (process.env.NEXT_PUBLIC_ENABLE_REALTIME || '').toLowerCase() === 'true'
import { RealtimeStatus } from '@/components/ui/realtime-status'

interface Session {
  id: string
  title: string
  session_type: string
  day_id: string
  stage_id: string
  time_slot_id: string
  topic?: string
  description?: string
  is_parallel_meal?: boolean
  parallel_meal_type?: string
  data?: any
  created_at?: string
  updated_at?: string
  // Joined fields from view
  start_time?: string
  end_time?: string
  day_name?: string
  stage_name?: string
  // Participant fields
  speakers?: string[]
  moderators?: string[]
  chairpersons?: string[]
  // Break fields
  is_break?: boolean
  break_title?: string
  // Optimistic update flag
  optimistic?: boolean
}

interface Hall {
  id: string
  name: string
  capacity?: number
  created_at?: string
}

interface Day {
  id: string
  name: string
  date: string
}

interface DayTimeSlot {
  id: string
  day_id: string
  start_time: string
  end_time: string
  slot_order: number
  is_break: boolean
  break_title?: string
  created_at?: string
}

export default function PublicProgramPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [days, setDays] = useState<Day[]>([])
  const [timeSlots, setTimeSlots] = useState<DayTimeSlot[]>([])
  const [selectedDay, setSelectedDay] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Persist/restore selected day
  const selectDay = (dayName: string) => {
    setSelectedDay(dayName)
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('selectedDayPublic', dayName) } catch {}
    }
  }

  // Load sessions from Supabase - single source of truth
  const loadSessions = async () => {
    try {
      console.log('🔄 Loading sessions from Supabase...')
      
      // Load sessions with participants using consistent query
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(supabaseUtils.getSessionQuery())
        .order('created_at', { ascending: true })

      if (sessionsError) {
        console.error('❌ Error loading sessions:', sessionsError)
        setSessions([])
        setError('Failed to load sessions from database')
        return
      }

      // Transform sessions using consistent utility function
      const transformedSessions: Session[] = (sessionsData || []).map(supabaseUtils.transformSession)

      setSessions(transformedSessions)
      setError(null)
      console.log('✅ Sessions loaded successfully:', transformedSessions.length)
    } catch (error) {
      console.error('❌ Exception loading sessions:', error)
      setError('Failed to load sessions. Please refresh the page.')
      setSessions([])
    }
  }

  // Load time slots for selected day - EXACTLY same as edit sessions page
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
        console.error('Error loading time slots:', error)
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
      console.error('Error loading time slots:', error)
      // Try to create default time slots
      const selectedDayData = days.find(d => d.name === selectedDay)
      if (selectedDayData) {
        await createDefaultTimeSlots(selectedDayData.id)
      }
    }
  }

  // Create default time slots for a day - EXACTLY same as edit sessions page
  const createDefaultTimeSlots = async (dayId: string) => {
    try {
      console.log('Creating default time slots for day:', dayId)
      
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
        console.error('Error creating default time slots:', error)
        return
      }

      console.log('Default time slots created successfully:', data?.length || 0, 'slots')
      setTimeSlots(data || [])
    } catch (error) {
      console.error('Exception creating default time slots:', error)
    }
  }

  // Load all halls and day-hall relationships from Supabase - EXACTLY same as edit sessions page
  const [allHalls, setAllHalls] = useState<Hall[]>([])
  const [dayHalls, setDayHalls] = useState<any[]>([])

  const loadHalls = async () => {
    try {
      // Load halls - EXACTLY same as edit sessions page
      const { data: hallsData, error: hallsError } = await supabase
        .from('stages')
        .select('*')
        .order('name', { ascending: true })

      if (hallsError) {
        console.error('Error loading halls:', hallsError)
        setAllHalls([])
        return
      }

      setAllHalls(hallsData || [])

      // Load day-specific halls - EXACTLY same as edit sessions page
      const { data: dayHallsData, error: dayHallsError } = await supabase
        .from('halls_with_days')
        .select('*')
        .order('day_date', { ascending: true })
        .order('hall_order', { ascending: true })

      if (dayHallsError) {
        console.error('Error loading day halls:', dayHallsError)
        setDayHalls([])
        return
      }

      setDayHalls(dayHallsData || [])
      setError(null)
    } catch (error) {
      console.error('Error loading halls:', error)
      setError('Failed to load halls. Please refresh the page.')
      setAllHalls([])
      setDayHalls([])
    }
  }

  // Get halls for selected day - EXACTLY same as edit sessions page
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

  // Load days from Supabase
  const loadDays = async () => {
    try {
      const { data, error } = await supabase
        .from('conference_days')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading days:', error)
        setDays([])
        return
      }

      // Transform Supabase data to our Day format
      const transformedDays: Day[] = (data || []).map((day: any) => ({
        id: day.id,
        name: day.name,
        date: day.date
      }))

      setDays(transformedDays)
      // Initialize/repair selected day once days are known
      const persisted = (typeof window !== 'undefined') ? (() => { try { return localStorage.getItem('selectedDayPublic') } catch { return null } })() : null
      const firstDayName = transformedDays[0]?.name
      const next = (persisted && transformedDays.some(d => d.name === persisted)) ? persisted : firstDayName || ''
      if (next && next !== selectedDay) setSelectedDay(next)
      setError(null)
    } catch (error) {
      console.error('Error loading days:', error)
      setError('Failed to load days. Please refresh the page.')
      setDays([])
    }
  }

  useEffect(() => {
    // Load data from Supabase
    const loadData = async () => {
      await Promise.all([loadSessions(), loadHalls(), loadDays()])
      setLoading(false)
    }
    loadData()

    // Set up enhanced real-time subscriptions
    if (REALTIME_ENABLED) {
      realtimeService.subscribeToAll({
        onSessionChange: (payload) => {
          console.log('Public: Session change detected:', payload)
          setLastUpdate(new Date())
          loadSessions()
        },
        onHallChange: (payload) => {
          console.log('Public: Hall change detected:', payload)
          setLastUpdate(new Date())
          loadHalls()
        },
        onDayChange: (payload) => {
          console.log('Public: Day change detected:', payload)
          setLastUpdate(new Date())
          loadDays()
        },
        onTimeSlotChange: (payload) => {
          console.log('Public: Time slot change detected:', payload)
          setLastUpdate(new Date())
          // Reload time slots to get updated time slots
          loadTimeSlots()
        },
        onDayHallChange: (payload) => {
          console.log('Public: Day Hall change detected:', payload)
          setLastUpdate(new Date())
          // Reload halls to get updated day-hall relationships
          loadHalls()
        },
        onConnectionChange: (status) => {
          console.log('Public: Connection status changed:', status)
          setConnectionStatus(status as 'connected' | 'disconnected' | 'connecting')
        }
      })
    }

    return () => {
      realtimeService.unsubscribeFromAll()
    }
  }, [])

  // Polling fallback when realtime disabled
  useEffect(() => {
    if (REALTIME_ENABLED) return
    const intervalMs = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS || 15000)
    let timer: any
    const tick = async () => {
      try {
        await Promise.all([loadSessions(), loadHalls(), loadDays()])
      } finally {
        timer = setTimeout(tick, intervalMs)
      }
    }
    timer = setTimeout(tick, intervalMs)
    const onVisible = () => { if (document.visibilityState === 'visible') Promise.all([loadSessions(), loadHalls(), loadDays()]) }
    const onOnline = () => { Promise.all([loadSessions(), loadHalls(), loadDays()]) }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  // Load time slots when selected day changes
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
      lecture: '🎓',
      panel: '👥',
      symposium: '🏛️',
      workshop: '🔧',
      oration: '🎤',
      guest_lecture: '🌟',
      discussion: '💬',
      break: '☕',
      other: '📋'
    }
    return icons[type] || '📋'
  }

  // Search functionality
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const filteredSessions = sessions.filter(session => {
    const selectedDayData = days.find(d => d.name === selectedDay)
    const matchesDay = session.day_name === selectedDay || (selectedDayData ? (session as any).day_id === selectedDayData.id : false)
    if (!matchesDay) return false
    
    if (!searchQuery.trim()) return true
    
    const searchLower = searchQuery.toLowerCase()
    return (
      session.title?.toLowerCase().includes(searchLower) ||
      session.topic?.toLowerCase().includes(searchLower) ||
      session.stage_name?.toLowerCase().includes(searchLower) ||
      session.session_type?.toLowerCase().includes(searchLower) ||
      session.description?.toLowerCase().includes(searchLower) ||
      session.speakers?.some(speaker => speaker.toLowerCase().includes(searchLower)) ||
      session.moderators?.some(moderator => moderator.toLowerCase().includes(searchLower)) ||
      session.chairpersons?.some(chairperson => chairperson.toLowerCase().includes(searchLower))
    )
  })

  // Get sessions for a specific time slot and hall - EXACTLY same as edit sessions page
  const getSessionForTimeSlotAndHall = (timeSlotId: string, hallId: string) => {
    const selectedDayData = days.find(d => d.name === selectedDay)
    
    // Find session by exact match first (most reliable)
    const exactMatch = sessions.find(session => {
      const matchesDay = session.day_name === selectedDay || (selectedDayData ? session.day_id === selectedDayData.id : false)
      const matchesHall = session.stage_id === hallId
      const matchesTimeSlot = session.time_slot_id === timeSlotId
      
      return matchesDay && matchesHall && matchesTimeSlot
    })
    
    if (exactMatch) {
      return exactMatch
    }
    
    // Fallback: match by time overlap (for sessions without time_slot_id)
    const slot = timeSlots.find(s => s.id === timeSlotId)
    if (!slot) return undefined
    
    const slotStart = slot.start_time
    const slotEnd = slot.end_time
    
    const toMinutes = (t: string) => {
      if (!t) return -1
      const [h, m] = t.split(':').map(Number)
      return h * 60 + (m || 0)
    }
    
    const sStartMin = toMinutes(slotStart)
    const sEndMin = toMinutes(slotEnd)
    
    const timeMatch = sessions.find(session => {
      const matchesDay = session.day_name === selectedDay || (selectedDayData ? session.day_id === selectedDayData.id : false)
      const matchesHall = session.stage_id === hallId
      
      if (!matchesDay || !matchesHall) return false
      
      // Only use time overlap if session doesn't have a time_slot_id
      if (session.time_slot_id) return false
      
      if (session.start_time && session.end_time) {
        const a1 = toMinutes(String(session.start_time))
        const a2 = toMinutes(String(session.end_time))
        if (a1 === -1 || a2 === -1 || sStartMin === -1 || sEndMin === -1) return false
        
        return a1 < sEndMin && sStartMin < a2
      }
      
      return false
    })
    
    return timeMatch || undefined
  }

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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-sm border-b print:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-extrabold drop-shadow-sm">
                APCON 2025
              </h1>
              <p className="mt-1 text-sm opacity-90">3 - 11 Dec, 2025</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-64 pl-10 pr-4 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 text-gray-900"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <RealtimeStatus />
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-white/90 text-gray-800 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-300 print:hidden"
              >
                🖨️ Print Program
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
                onClick={() => selectDay(day.name)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedDay === day.name
                    ? 'border-teal-500 text-teal-600'
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
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        {/* Day Header */}
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            {selectedDay}
          </h2>
          <p className="text-xl text-indigo-600 font-medium">
            {days.find(d => d.name === selectedDay)?.date || 'March 15, 2024'}
          </p>
        </div>

        {/* Hall Headers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 mb-8">
          {getHallsForSelectedDay().map((hall) => (
            <div key={hall.id} className="text-center">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl shadow-lg">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl">🏛️</span>
                  <h3 className="text-xl font-bold">{hall.name}</h3>
                </div>
                {hall.capacity && (
                  <p className="text-sm opacity-90 mt-1">Capacity: {hall.capacity}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Cards */}
        <div className="space-y-8">
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot.id} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Time Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">🕘</span>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {formatTimeRangeCompact(timeSlot.start_time, timeSlot.end_time)}
                  </h3>
                </div>
              </div>

              {/* Check if this is a global block (break) */}
              {timeSlot.is_break ? (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-8 py-12">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🔶</div>
                    <h3 className="text-3xl font-bold text-orange-800 mb-2">
                      {timeSlot.break_title || 'Global Block'}
                    </h3>
                    <p className="text-lg text-orange-700 font-medium">
                      All Halls - {formatTimeRangeCompact(timeSlot.start_time, timeSlot.end_time)}
                    </p>
                  </div>
                </div>
              ) : (
                /* Hall Sessions Grid */
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 p-8">
                  {getHallsForSelectedDay().map((hall) => {
                    const session = getSessionForTimeSlotAndHall(timeSlot.id, hall.id)
                    return (
                      <div key={hall.id} className="space-y-3">
                        {/* Hall Name Badge */}
                        <div className="flex items-center justify-center">
                          <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-semibold">
                            🏛️ {hall.name}
                          </div>
                        </div>

                        {session ? (
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                            {/* Session Type Icon & Badge */}
                            <div className="flex items-center justify-center mb-6">
                              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${getSessionTypeColor(session.session_type)}`}>
                                <span className="text-lg mr-2">{getSessionIcon(session.session_type)}</span>
                                {getSessionTypeLabel(session.session_type)}
                              </div>
                            </div>

                            {/* Session Content */}
                            <div className="text-center space-y-6">
                              {/* TITLE (large and prominent) */}
                              <h4 className="text-2xl font-bold text-gray-900 leading-tight">
                                {session.title}
                              </h4>

                              {/* Topic */}
                              {session.topic && (
                                <div className="bg-white/70 rounded-xl px-6 py-3">
                                  <p className="text-lg font-semibold text-gray-700">
                                    <span className="text-indigo-600">Topic:</span> {session.topic}
                                  </p>
                                </div>
                              )}

                              {/* Participants */}
                              <div className="space-y-4">
                                {session.speakers && session.speakers.length > 0 && (
                                  <div className="bg-blue-50 rounded-xl px-6 py-4">
                                    <p className="text-lg font-semibold text-blue-900">
                                      <span className="flex items-center justify-center mb-2">
                                        <span className="text-xl mr-2">🎤</span>
                                        Speaker{session.speakers.length > 1 ? 's' : ''}
                                      </span>
                                      <span className="text-blue-800">{session.speakers.join(', ')}</span>
                                    </p>
                                  </div>
                                )}
                                
                                {session.moderators && session.moderators.length > 0 && (
                                  <div className="bg-purple-50 rounded-xl px-6 py-4">
                                    <p className="text-lg font-semibold text-purple-900">
                                      <span className="flex items-center justify-center mb-2">
                                        <span className="text-xl mr-2">👨‍⚖️</span>
                                        Moderator{session.moderators.length > 1 ? 's' : ''}
                                      </span>
                                      <span className="text-purple-800">{session.moderators.join(', ')}</span>
                                    </p>
                                  </div>
                                )}
                                
                                {session.chairpersons && session.chairpersons.length > 0 && (
                                  <div className="bg-amber-50 rounded-xl px-6 py-4">
                                    <p className="text-lg font-semibold text-amber-900">
                                      <span className="flex items-center justify-center mb-2">
                                        <span className="text-xl mr-2">👑</span>
                                        Chairperson{session.chairpersons.length > 1 ? 's' : ''}
                                      </span>
                                      <span className="text-amber-800">{session.chairpersons.join(', ')}</span>
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Sub-talks */}
                              {Array.isArray((session as any).sub_sessions) && (session as any).sub_sessions.length > 0 && (
                                <div className="bg-gray-50 rounded-xl px-6 py-6 border-2 border-gray-200">
                                  <h5 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-center">
                                    <span className="text-2xl mr-2">📋</span>
                                    Sub-talks
                                  </h5>
                                  <div className="space-y-4">
                                    {(session as any).sub_sessions.map((st: any, idx: number) => (
                                      <div key={st.id || idx} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                        <div className="text-center space-y-3">
                                          <div className="text-sm font-bold text-indigo-600">
                                            🕘 {formatTime(st.start_time)}–{formatTime(st.end_time)}
                                          </div>
                                          <h6 className="text-lg font-bold text-gray-900">{st.title}</h6>
                                          {st.speaker_name && (
                                            <p className="text-base text-gray-700">
                                              <span className="font-semibold">Speaker:</span> {st.speaker_name}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
                            <div className="text-4xl mb-4 text-gray-300">📅</div>
                            <p className="text-lg text-gray-500 font-medium">No Session Scheduled</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Print Button */}
        <div className="mt-16 text-center print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-105 transition-all duration-200"
          >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Program
          </button>
        </div>
      </div>
    </div>
  )
} 