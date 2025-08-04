'use client'

import { useState, useEffect } from 'react'
import { formatTime, formatTimeRange, calculateDuration, supabaseUtils } from '@/lib/utils'
import { SESSION_TYPES } from '@/lib/constants'
import { supabase } from '@/lib/supabase/client'
import realtimeService from '@/lib/supabase/realtime'
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
  const [selectedDay, setSelectedDay] = useState('Day 1')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

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

    return () => {
      realtimeService.unsubscribeFromAll()
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
    const matchesDay = session.day_name === selectedDay
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
    return sessions.find(session => 
      session.time_slot_id === timeSlotId && 
      session.stage_id === hallId &&
      session.day_name === selectedDay
    )
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
      <div className="bg-white shadow-sm border-b print:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                APCON 2025
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                3 - 11 Dec, 2025
              </p>
            </div>
            <div className="flex items-center space-x-3">
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
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 print:hidden"
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
                onClick={() => setSelectedDay(day.name)}
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

        {/* Timeline Table */}
        <div className="h-[calc(100vh-200px)] overflow-x-auto overflow-y-auto">
          <div className="min-w-max">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {/* Time Column Header */}
                  <th className="w-32 bg-gray-50 border-r border-gray-200 p-2 font-semibold text-sm text-gray-700 sticky left-0 z-50 text-left">
                    🕘 Time
                  </th>
                  
                  {/* Hall Column Headers */}
                  {getHallsForSelectedDay().map((hall) => (
                    <th key={hall.id} className="w-64 bg-gray-50 border-r border-gray-200 p-2 font-semibold text-sm text-gray-700 text-left">
                      🏛️ {hall.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    {/* Time Column - Sticky */}
                    <td className="w-32 bg-gray-50 border-r border-gray-200 p-2 sticky left-0 z-30">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {timeSlot.start_time}
                        </div>
                        <div className="text-xs text-gray-500">
                          {timeSlot.end_time}
                        </div>
                      </div>
                    </td>
                    
                    {/* Check if this is a global block (break) */}
                    {timeSlot.is_break ? (
                      <td colSpan={getHallsForSelectedDay().length} className="bg-orange-50 border-r border-gray-200 p-2 text-center">
                        <div className="text-sm font-medium text-orange-800">
                          🔶 {timeSlot.break_title || 'Global Block'}
                        </div>
                      </td>
                    ) : (
                      /* Hall Columns */
                      getHallsForSelectedDay().map((hall) => {
                        const session = getSessionForTimeSlotAndHall(timeSlot.id, hall.id)
                        
                        return (
                          <td key={hall.id} className="w-64 border-r border-gray-200 p-1">
                            {session ? (
                              <div className="bg-white border border-gray-200 rounded p-1 shadow-sm">
                                {/* Uniform Session Block Structure */}
                                <div className="text-center space-y-0.5">
                                  {/* TYPE */}
                                  <div className="text-xs font-medium text-gray-700 border-b border-gray-100 pb-0.5">
                                    {getSessionTypeLabel(session.session_type)}
                                  </div>
                                  
                                  {/* TITLE */}
                                  <div className="text-xs font-semibold text-gray-900 border-b border-gray-100 pb-0.5">
                                    {session.title}
                                  </div>
                                  
                                  {/* SPEAKERS */}
                                  {session.speakers && session.speakers.length > 0 && (
                                    <div className="text-xs text-gray-600 border-b border-gray-100 pb-0.5">
                                      {session.speakers.join(', ')}
                                    </div>
                                  )}
                                  
                                  {/* MODERATORS */}
                                  {session.moderators && session.moderators.length > 0 && (
                                    <div className="text-xs text-gray-600 border-b border-gray-100 pb-0.5">
                                      {session.moderators.join(', ')}
                                    </div>
                                  )}
                                  
                                  {/* CHAIRPERSONS */}
                                  {session.chairpersons && session.chairpersons.length > 0 && (
                                    <div className="text-xs text-gray-600 pb-0.5">
                                      {session.chairpersons.join(', ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center">
                                <div className="text-gray-300 text-xs border-2 border-dashed border-gray-200 rounded p-2 w-full h-16 flex items-center justify-center">
                                  No Session
                                </div>
                              </div>
                            )}
                          </td>
                        )
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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