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

interface Day {
  id: string
  name: string
  date: string
}

interface TimeSlot {
  id: string
  start_time: string
  end_time: string
}

export default function EditSessionsPage() {
  // Error state for better error handling
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [days, setDays] = useState<Day[]>([])
  const [selectedDay, setSelectedDay] = useState<string>('Day 1')
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

  // No time slots needed - we're removing the time column
  const timeSlots: TimeSlot[] = []

  // Create mock data for development
  const createMockData = () => {
    const mockDay: Day = {
      id: 'day-1',
      name: 'Day 1',
      date: 'March 15, 2024'
    }

    const mockHall: Hall = {
      id: 'mock-hall-1',
      name: 'Example Hall',
      color: 'bg-blue-50 border-blue-200'
    }

    const mockSession: Session = {
      id: 'mock-session-1',
      title: 'Mock Session',
        session_type: 'lecture',
        day_name: 'Day 1',
      stage_name: 'Example Hall',
        start_time: '09:00',
      end_time: '10:00',
      topic: 'Introduction to Mock Data',
      speaker_name: 'Dr. Mock Speaker',
      description: 'This is a mock session for testing purposes.'
    }

    return { mockDay, mockHall, mockSession }
  }

  // Load sessions from Supabase
  const loadSessions = async () => {
    try {
      console.log('🔄 Loading sessions from Supabase...')
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('start_time', { ascending: true })

      if (error) {
        console.error('❌ Error loading sessions:', error)
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        // If no data, create mock data
        const { mockSession } = createMockData()
        setSessions([mockSession])
        return
      }

      console.log('✅ Sessions loaded successfully:', data?.length || 0, 'sessions')

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

      setSessions(transformedSessions.length > 0 ? transformedSessions : [createMockData().mockSession])
      setError(null)
    } catch (error) {
      console.error('❌ Exception loading sessions:', error)
      setError('Failed to load sessions. Please refresh the page.')
      // Fallback to mock data
      const { mockSession } = createMockData()
      setSessions([mockSession])
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
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        // If no data, create mock data
        const { mockHall } = createMockData()
        setHalls([mockHall])
        return
      }

      console.log('✅ Halls loaded successfully:', data?.length || 0, 'halls')
      console.log('📋 Hall data:', data)

      // Transform Supabase data to our Hall format
      const transformedHalls: Hall[] = data.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        color: 'bg-gray-50 border-gray-200'
      }))

      // Initialize with 3 default halls if no data from database
      const defaultHalls: Hall[] = [
        { id: 'hall-1', name: 'Example Hall', color: 'bg-blue-50 border-blue-200' },
        { id: 'hall-2', name: 'Hall A', color: 'bg-green-50 border-green-200' },
        { id: 'hall-3', name: 'Hall B', color: 'bg-purple-50 border-purple-200' }
      ]
      
      const finalHalls = transformedHalls.length > 0 ? transformedHalls : defaultHalls
      console.log('🎯 Setting halls to:', finalHalls)
      setHalls(finalHalls)
      setError(null)
    } catch (error) {
      console.error('❌ Exception loading halls:', error)
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

  // Load days from Supabase (or create mock)
  const loadDays = async () => {
    try {
      // For now, we'll create mock days since we don't have a days table yet
      const mockDays: Day[] = [
        { id: 'day-1', name: 'Day 1', date: 'March 15, 2024' },
        { id: 'day-2', name: 'Day 2', date: 'March 16, 2024' },
        { id: 'day-3', name: 'Day 3', date: 'March 17, 2024' }
      ]
      setDays(mockDays)
    } catch (error) {
      console.error('Error loading days:', error)
      const { mockDay } = createMockData()
      setDays([mockDay])
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
      .channel('sessions-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions' }, 
        (payload) => {
          console.log('Session change detected:', payload)
          // Reload sessions when any change occurs
          loadSessions()
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'stages' }, 
        (payload) => {
          console.log('Stage change detected:', payload)
          // Reload halls when any change occurs
          loadHalls()
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'days' }, 
        (payload) => {
          console.log('Day change detected:', payload)
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

  // Find session for a specific hall (no time slot needed)
  const findSession = (hallId: string): Session | null => {
    return sessions.find(session => 
      session.day_name === selectedDay &&
      session.stage_name === halls.find(h => h.id === hallId)?.name
    ) || null
  }

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setIsModalOpen(true)
  }

  const handleAddSession = (hallId: string) => {
    setSessionToAdd({ hallId, timeSlotId: 'default' })
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
    
    // Input validation
    if (!formData.title?.trim()) {
      alert('Session title is required')
      return
    }
    
    if (!formData.start_time || !formData.end_time) {
      alert('Start and end times are required')
      return
    }
    
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(formData.start_time) || !timeRegex.test(formData.end_time)) {
      alert('Invalid time format. Please use HH:MM format.')
      return
    }
    
    // Validate that end time is after start time
    if (formData.start_time >= formData.end_time) {
      alert('End time must be after start time')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      let hall: Hall | undefined
      let timeSlot: TimeSlot | undefined
      
      if (editingSession) {
        console.log('✏️ Editing existing session:', editingSession)
        // For editing, find hall by name
        hall = halls.find(h => h.name === editingSession.stage_name)
        timeSlot = timeSlots.find(ts => ts.start_time === editingSession.start_time)
      } else {
        console.log('➕ Creating new session for hall:', sessionToAdd?.hallId)
        // For new session, find hall by ID
        hall = halls.find(h => h.id === sessionToAdd?.hallId)
        timeSlot = timeSlots.find(ts => ts.id === sessionToAdd?.timeSlotId)
      }
      
      console.log('🏢 Found hall:', hall)
      console.log('⏰ Found time slot:', timeSlot)
      
      if (editingSession) {
        console.log('🔄 Updating existing session in Supabase...')
        // Update existing session in Supabase
        const updateData = {
          title: formData.title,
          session_type: sessionType,
          topic: formData.topic,
          description: formData.description,
          start_time: formData.start_time || editingSession.start_time,
          end_time: formData.end_time || editingSession.end_time,
          people_data: {
            speaker_id: formData.speaker_id,
            speaker_name: formData.speaker_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                         formData.speaker_id === 'speaker2' ? 'Dr. Michael Chen' :
                         formData.speaker_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                         formData.speaker_id === 'speaker4' ? 'Prof. David Thompson' :
                         formData.speaker_id === 'speaker5' ? 'Dr. Lisa Wang' : '',
            moderator_id: formData.moderator_id,
            moderator_name: formData.moderator_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                           formData.moderator_id === 'speaker2' ? 'Dr. Michael Chen' :
                           formData.moderator_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                           formData.moderator_id === 'speaker4' ? 'Prof. David Thompson' :
                           formData.moderator_id === 'speaker5' ? 'Dr. Lisa Wang' : '',
            panelist_ids: formData.panelist_ids,
            panelist_names: formData.panelist_ids?.map((id: string) => 
              id === 'speaker1' ? 'Dr. Sarah Johnson' :
              id === 'speaker2' ? 'Dr. Michael Chen' :
              id === 'speaker3' ? 'Dr. Emily Rodriguez' :
              id === 'speaker4' ? 'Prof. David Thompson' :
              id === 'speaker5' ? 'Dr. Lisa Wang' : ''
            ).filter((name: string) => name),
            chairperson_id: formData.chairperson_id,
            chairperson_name: formData.chairperson_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                             formData.chairperson_id === 'speaker2' ? 'Dr. Michael Chen' :
                             formData.chairperson_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                             formData.chairperson_id === 'speaker4' ? 'Prof. David Thompson' :
                             formData.chairperson_id === 'speaker5' ? 'Dr. Lisa Wang' : '',
            workshop_lead_ids: formData.workshop_lead_ids,
            workshop_lead_names: formData.workshop_lead_ids?.map((id: string) => 
              id === 'speaker1' ? 'Dr. Sarah Johnson' :
              id === 'speaker2' ? 'Dr. Michael Chen' :
              id === 'speaker3' ? 'Dr. Emily Rodriguez' :
              id === 'speaker4' ? 'Prof. David Thompson' :
              id === 'speaker5' ? 'Dr. Lisa Wang' : ''
            ).filter((name: string) => name),
            assistant_ids: formData.assistant_ids,
            assistant_names: formData.assistant_ids?.map((id: string) => 
              id === 'speaker1' ? 'Dr. Sarah Johnson' :
              id === 'speaker2' ? 'Dr. Michael Chen' :
              id === 'speaker3' ? 'Dr. Emily Rodriguez' :
              id === 'speaker4' ? 'Prof. David Thompson' :
              id === 'speaker5' ? 'Dr. Lisa Wang' : ''
            ).filter((name: string) => name),
            introducer_id: formData.introducer_id,
            introducer_name: formData.introducer_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                            formData.introducer_id === 'speaker2' ? 'Dr. Michael Chen' :
                            formData.introducer_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                            formData.introducer_id === 'speaker4' ? 'Prof. David Thompson' :
                            formData.introducer_id === 'speaker5' ? 'Dr. Lisa Wang' : '',
            presenter_ids: formData.presenter_ids,
            presenter_names: formData.presenter_ids?.map((id: string) => 
              id === 'speaker1' ? 'Dr. Sarah Johnson' :
              id === 'speaker2' ? 'Dr. Michael Chen' :
              id === 'speaker3' ? 'Dr. Emily Rodriguez' :
              id === 'speaker4' ? 'Prof. David Thompson' :
              id === 'speaker5' ? 'Dr. Lisa Wang' : ''
            ).filter((name: string) => name),
            discussion_leader_id: formData.discussion_leader_id,
            discussion_leader_name: formData.discussion_leader_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                                  formData.discussion_leader_id === 'speaker2' ? 'Dr. Michael Chen' :
                                  formData.discussion_leader_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                                  formData.discussion_leader_id === 'speaker4' ? 'Prof. David Thompson' :
                                  formData.discussion_leader_id === 'speaker5' ? 'Dr. Lisa Wang' : ''
          },
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          is_parallel_meal: formData.is_parallel_meal,
          parallel_meal_type: formData.parallel_meal_type,
          meal_type: formData.meal_type,
          symposium_data: sessionType === 'symposium' ? {
            subtalks: formData.symposium_subtalks || []
          } : {},
          custom_data: sessionType === 'other' ? {
            custom_fields: formData.custom_data || {}
          } : {},
          updated_at: new Date().toISOString()
        }
        
        console.log('📤 Update data:', updateData)
        
        const { error } = await supabase
          .from('sessions')
          .update(updateData)
          .eq('id', editingSession.id)

        if (error) {
          console.error('❌ Error updating session:', error)
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }
        
        console.log('✅ Session updated successfully')
      } else {
        console.log('🆕 Creating new session in Supabase...')
        // Create new session in Supabase
        const insertData = {
          title: formData.title,
          session_type: sessionType,
          day_id: selectedDay === 'Day 1' ? 'day1' : selectedDay === 'Day 2' ? 'day2' : 'day3',
          stage_id: hall?.name === 'Main Hall' ? 'main-hall' :
                    hall?.name === 'Seminar Room A' ? 'seminar-a' :
                    hall?.name === 'Seminar Room B' ? 'seminar-b' : 
                    hall?.name === 'Example Hall' ? 'example-hall' :
                    hall?.name === 'Hall A' ? 'hall-a' :
                    hall?.name === 'Hall B' ? 'hall-b' : 'workshop',
          start_time: timeSlot?.start_time || '09:00',
          end_time: formData.end_time || timeSlot?.end_time || '10:00',
          topic: formData.topic,
          description: formData.description,
          people_data: {
            speaker_id: formData.speaker_id,
            speaker_name: formData.speaker_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                         formData.speaker_id === 'speaker2' ? 'Dr. Michael Chen' :
                         formData.speaker_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                         formData.speaker_id === 'speaker4' ? 'Prof. David Thompson' :
                         formData.speaker_id === 'speaker5' ? 'Dr. Lisa Wang' : '',
            moderator_id: formData.moderator_id,
            moderator_name: formData.moderator_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                           formData.moderator_id === 'speaker2' ? 'Dr. Michael Chen' :
                           formData.moderator_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                           formData.moderator_id === 'speaker4' ? 'Prof. David Thompson' :
                           formData.moderator_id === 'speaker5' ? 'Dr. Lisa Wang' : '',
            panelist_ids: formData.panelist_ids,
            panelist_names: formData.panelist_ids?.map((id: string) => 
              id === 'speaker1' ? 'Dr. Sarah Johnson' :
              id === 'speaker2' ? 'Dr. Michael Chen' :
              id === 'speaker3' ? 'Dr. Emily Rodriguez' :
              id === 'speaker4' ? 'Prof. David Thompson' :
              id === 'speaker5' ? 'Dr. Lisa Wang' : ''
            ).filter((name: string) => name),
            chairperson_id: formData.chairperson_id,
            chairperson_name: formData.chairperson_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                             formData.chairperson_id === 'speaker2' ? 'Dr. Michael Chen' :
                             formData.chairperson_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                             formData.chairperson_id === 'speaker4' ? 'Prof. David Thompson' :
                             formData.chairperson_id === 'speaker5' ? 'Dr. Lisa Wang' : '',
            workshop_lead_ids: formData.workshop_lead_ids,
            workshop_lead_names: formData.workshop_lead_ids?.map((id: string) => 
              id === 'speaker1' ? 'Dr. Sarah Johnson' :
              id === 'speaker2' ? 'Dr. Michael Chen' :
              id === 'speaker3' ? 'Dr. Emily Rodriguez' :
              id === 'speaker4' ? 'Prof. David Thompson' :
              id === 'speaker5' ? 'Dr. Lisa Wang' : ''
            ).filter((name: string) => name),
            assistant_ids: formData.assistant_ids,
            assistant_names: formData.assistant_ids?.map((id: string) => 
              id === 'speaker1' ? 'Dr. Sarah Johnson' :
              id === 'speaker2' ? 'Dr. Michael Chen' :
              id === 'speaker3' ? 'Dr. Emily Rodriguez' :
              id === 'speaker4' ? 'Prof. David Thompson' :
              id === 'speaker5' ? 'Dr. Lisa Wang' : ''
            ).filter((name: string) => name),
            introducer_id: formData.introducer_id,
            introducer_name: formData.introducer_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                            formData.introducer_id === 'speaker2' ? 'Dr. Michael Chen' :
                            formData.introducer_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                            formData.introducer_id === 'speaker4' ? 'Prof. David Thompson' :
                            formData.introducer_id === 'speaker5' ? 'Dr. Lisa Wang' : '',
            presenter_ids: formData.presenter_ids,
            presenter_names: formData.presenter_ids?.map((id: string) => 
              id === 'speaker1' ? 'Dr. Sarah Johnson' :
              id === 'speaker2' ? 'Dr. Michael Chen' :
              id === 'speaker3' ? 'Dr. Emily Rodriguez' :
              id === 'speaker4' ? 'Prof. David Thompson' :
              id === 'speaker5' ? 'Dr. Lisa Wang' : ''
            ).filter((name: string) => name),
            discussion_leader_id: formData.discussion_leader_id,
            discussion_leader_name: formData.discussion_leader_id === 'speaker1' ? 'Dr. Sarah Johnson' :
                                  formData.discussion_leader_id === 'speaker2' ? 'Dr. Michael Chen' :
                                  formData.discussion_leader_id === 'speaker3' ? 'Dr. Emily Rodriguez' :
                                  formData.discussion_leader_id === 'speaker4' ? 'Prof. David Thompson' :
                                  formData.discussion_leader_id === 'speaker5' ? 'Dr. Lisa Wang' : ''
          },
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          is_parallel_meal: formData.is_parallel_meal,
          parallel_meal_type: formData.parallel_meal_type,
          meal_type: formData.meal_type,
          symposium_data: sessionType === 'symposium' ? {
            subtalks: formData.symposium_subtalks || []
          } : {},
          custom_data: sessionType === 'other' ? {
            custom_fields: formData.custom_data || {}
          } : {}
        }
        
        console.log('📤 Insert data:', insertData)
        
        const { error } = await supabase
          .from('sessions')
          .insert(insertData)

        if (error) {
          console.error('❌ Error creating session:', error)
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }
        
        console.log('✅ Session created successfully')
      }
      
      // Reload sessions from database
      console.log('🔄 Reloading sessions...')
      await loadSessions()
      handleCloseModal()
      console.log('🎉 Session submission completed successfully!')
    } catch (error) {
      console.error('❌ Error saving session:', error)
      console.error('❌ Full error object:', error)
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
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }

        await loadSessions()
      } catch (error) {
        console.error('❌ Error deleting session:', error)
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
    if (!editingHallId || !editingHallName.trim()) {
      alert('Hall name cannot be empty')
      return
    }
    
    const existingHall = halls.find(h => h.name === editingHallName.trim() && h.id !== editingHallId)
    if (existingHall) {
      alert('A hall with this name already exists')
      return
    }
    
    const sanitizedName = editingHallName.trim().replace(/[<>]/g, '')
    
    if (editingHallId && sanitizedName) {
      try {
        const { error } = await supabase
          .from('stages')
          .update({ name: sanitizedName })
          .eq('id', editingHallId)

        if (error) {
          console.error('❌ Error updating hall:', error)
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }

        await loadHalls()
        setEditingHallId(null)
        setEditingHallName('')
      } catch (error) {
        console.error('❌ Error updating hall:', error)
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

  const getStageId = (hallName: string) => {
    switch (hallName) {
      case 'Main Hall': return 'main-hall'
      case 'Seminar Room A': return 'seminar-a'
      case 'Seminar Room B': return 'seminar-b'
      case 'Example Hall': return 'example-hall'
      case 'Hall A': return 'hall-a'
      case 'Hall B': return 'hall-b'
      default: return 'workshop'
    }
  }

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '1234'
  
  const confirmDeleteHall = async () => {
    if (deletePassword === ADMIN_PASSWORD && hallToDelete) {
      try {
        const firstHall = halls.find(h => h.id !== hallToDelete.id)
        if (firstHall) {
          const { error } = await supabase
            .from('sessions')
            .update({ stage_id: getStageId(firstHall.name) })
            .eq('stage_id', getStageId(hallToDelete.name))

          if (error) {
            console.error('❌ Error moving sessions:', error)
            console.error('❌ Error details:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            })
          }
        }

        const { error } = await supabase
          .from('stages')
          .delete()
          .eq('id', hallToDelete.id)

        if (error) {
          console.error('❌ Error deleting hall:', error)
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
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
        // First, let's check if the stages table exists and get its structure
        const { data: tableInfo, error: tableError } = await supabase
          .from('stages')
          .select('*')
          .limit(1)

        if (tableError) {
          console.error('❌ Table error:', tableError)
          console.error('❌ Error details:', {
            message: tableError.message,
            details: tableError.details,
            hint: tableError.hint,
            code: tableError.code
          })
          // If table doesn't exist, create a mock hall locally for now
          const newHall: Hall = {
            id: `hall-${Date.now()}`,
            name: sanitizedName,
            color: 'bg-gray-50 border-gray-200'
          }
          setHalls(prev => [...prev, newHall])
          setShowAddHallModal(false)
          setNewHallName('')
          alert('Hall added locally (database table may not exist yet)')
          return
        }

        const { error } = await supabase
          .from('stages')
          .insert({
            name: sanitizedName,
            capacity: 100
          })

        if (error) {
          console.error('❌ Error adding hall:', error)
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          // Show the actual error message
          alert(`Error adding hall: ${error.message}`)
          return
        }

        await loadHalls()
        setShowAddHallModal(false)
        setNewHallName('')
      } catch (error: any) {
        console.error('❌ Error adding hall:', error)
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        alert(`Error adding hall: ${error.message || 'Unknown error'}`)
      }
    }
  }

  const handleQuickAddHall = async () => {
    const hallNames = ['Workshop Room', 'Auditorium', 'Conference Room', 'Exhibition Hall', 'Outdoor Stage']
    const availableNames = hallNames.filter(name => !halls.some(hall => hall.name === name))
    
    if (availableNames.length > 0) {
      try {
        // Check if stages table exists
        const { data: tableInfo, error: tableError } = await supabase
          .from('stages')
          .select('*')
          .limit(1)

        if (tableError) {
          console.error('❌ Table error:', tableError)
          console.error('❌ Error details:', {
            message: tableError.message,
            details: tableError.details,
            hint: tableError.hint,
            code: tableError.code
          })
          // If table doesn't exist, create a mock hall locally
          const newHall: Hall = {
            id: `hall-${Date.now()}`,
            name: availableNames[0],
            color: 'bg-gray-50 border-gray-200'
          }
          setHalls(prev => [...prev, newHall])
          alert('Hall added locally (database table may not exist yet)')
          return
        }

        const { error } = await supabase
          .from('stages')
          .insert({
            name: availableNames[0],
            capacity: 100
          })

        if (error) {
          console.error('❌ Error adding hall:', error)
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          alert(`Error adding hall: ${error.message}`)
          setShowAddHallModal(true)
          return
        }

        await loadHalls()
      } catch (error: any) {
        console.error('❌ Error adding hall:', error)
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
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
        // For now, we'll add it to the days list locally
        // In a real app, you'd save this to a days table in the database
        alert(`Day "${newDayName}" with date "${newDayDate}" would be added to the database. This feature needs backend implementation.`)
        
        setShowAddDayModal(false)
        setNewDayName('')
        setNewDayDate('')
      } catch (error) {
        console.error('❌ Error adding day:', error)
        alert('Error adding day. Please try again.')
      }
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
              <div>📊 Sessions: {sessions.length} | Halls: {halls.length} | Days: {days.length}</div>
              <div>🌐 Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
              <div>🔑 Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
              <div>🔒 Admin Password: {process.env.NEXT_PUBLIC_ADMIN_PASSWORD ? '✅ Set' : '❌ Missing'}</div>
              <div>📱 Selected Day: {selectedDay}</div>
              <button
                onClick={() => {
                  console.log('🔍 Current State:', {
                    sessions,
                    halls,
                    days,
                    selectedDay,
                    error
                  })
                  alert('Check browser console for detailed state information')
                }}
                className="text-xs bg-yellow-200 px-2 py-1 rounded hover:bg-yellow-300"
              >
                Log State to Console
              </button>
            </div>
          </div>
        </div>
      )}
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

      {/* Program Content - Grid Layout */}
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

        {/* Halls Layout - No Time Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {halls.map((hall, index) => (
            <div key={hall.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Hall Header */}
              <div className="p-4 bg-gray-50 border-b border-gray-200 relative group">
                {editingHallId === hall.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editingHallName}
                      onChange={(e) => setEditingHallName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveHallName()
                        } else if (e.key === 'Escape') {
                          handleCancelEditHall()
                        }
                      }}
                      autoFocus
                      aria-label="Edit hall name"
                      maxLength={50}
                    />
                    <button
                      onClick={handleSaveHallName}
                      className="text-green-600 hover:text-green-800 text-sm"
                      aria-label="Save hall name"
                      title="Save changes"
                    >
                      ✓
                    </button>
            <button
                      onClick={handleCancelEditHall}
                      className="text-red-600 hover:text-red-800 text-sm"
                      aria-label="Cancel editing"
                      title="Cancel changes"
                    >
                      ✕
            </button>
          </div>
        ) : (
                  <div className="flex items-center justify-between">
                    <span 
                      className="cursor-pointer hover:text-indigo-600 font-medium text-gray-900"
                      onClick={() => handleEditHallName(hall.id)}
                    >
                      {hall.name}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleDeleteHall(hall)}
                        className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 text-sm transition-opacity"
                        title="Delete hall"
                      >
                        ×
                      </button>
                      {index === halls.length - 1 && (
                        <button
                          onClick={handleQuickAddHall}
                          className="opacity-0 group-hover:opacity-100 text-green-600 hover:text-green-800 text-sm transition-opacity"
                          title="Add new hall"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
                        <div className="text-gray-400 text-sm mb-4">No sessions yet</div>
                        <button
                          onClick={() => handleAddSession(hall.id)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          + Add Session
                        </button>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      {hallSessions.map((session) => (
                        <div 
                          key={session.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer group"
                          onClick={() => handleEditSession(session)}
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

                          {/* Edit Controls - Only visible on hover */}
                            <div className="flex space-x-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditSession(session)
                              }}
                                className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                              >
                                Edit
                              </button>
                              <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSession(session.id)
                              }}
                                className="text-xs text-red-600 hover:text-red-900 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                      ))}
                      
                      {/* Add Session Button */}
                      <button
                        onClick={() => handleAddSession(hall.id)}
                        className="w-full p-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
                      >
                        + Add Session
                      </button>
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
                      editingSession.stage_name === 'Seminar Room B' ? 'seminar-b' : 
                      editingSession.stage_name === 'Example Hall' ? 'example-hall' :
                      editingSession.stage_name === 'Hall A' ? 'hall-a' :
                      editingSession.stage_name === 'Hall B' ? 'hall-b' : 'workshop',
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