import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Session, DayTimeSlot, Hall, Day, DayHall, Speaker } from '@/types'
import realtimeService from '@/lib/supabase/realtime'

const REALTIME_ENABLED = (process.env.NEXT_PUBLIC_ENABLE_REALTIME || '').toLowerCase() === 'true'

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [timeSlots, setTimeSlots] = useState<DayTimeSlot[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [dayHalls, setDayHalls] = useState<DayHall[]>([])
  const [days, setDays] = useState<Day[]>([])
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // Load all data in parallel
      const [sessionsResult, timeSlotsResult, hallsResult, dayHallsResult, daysResult, speakersResult] = await Promise.all([
        supabase.from('sessions_with_times').select('*').order('day_name').order('start_time'),
        supabase.from('day_time_slots').select('*').order('slot_order'),
        supabase.from('stages').select('*').order('name'),
        supabase.from('halls_with_days').select('*').order('day_name').order('hall_order'),
        supabase.from('conference_days').select('*').order('date'),
        supabase.from('speakers').select('*').order('name')
      ])

      if (sessionsResult.error) throw sessionsResult.error
      if (timeSlotsResult.error) throw timeSlotsResult.error
      if (hallsResult.error) throw hallsResult.error
      if (dayHallsResult.error) throw dayHallsResult.error
      if (daysResult.error) throw daysResult.error
      if (speakersResult.error) throw speakersResult.error

      setSessions(sessionsResult.data || [])
      setTimeSlots(timeSlotsResult.data || [])
      setHalls(hallsResult.data || [])
      setDayHalls(dayHallsResult.data || [])
      setDays(daysResult.data || [])
      setSpeakers(speakersResult.data || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  const addSession = useCallback(async (sessionData: any) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single()

      if (error) throw error

      // Add to local state optimistically
      setSessions(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error adding session:', err)
      throw err
    }
  }, [])

  const updateSession = useCallback(async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Update local state
      setSessions(prev => prev.map(s => s.id === id ? data : s))
      return data
    } catch (err) {
      console.error('Error updating session:', err)
      throw err
    }
  }, [])

  const deleteSession = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Remove from local state
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Error deleting session:', err)
      throw err
    }
  }, [])

  const addDay = useCallback(async (dayData: { name: string; date: string }) => {
    try {
      const { data, error } = await supabase
        .from('conference_days')
        .insert(dayData)
        .select()
        .single()

      if (error) throw error

      setDays(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error adding day:', err)
      throw err
    }
  }, [])

  const addHall = useCallback(async (hallData: { name: string; capacity?: number }) => {
    try {
      const { data, error } = await supabase
        .from('stages')
        .insert(hallData)
        .select()
        .single()

      if (error) throw error

      setHalls(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Error adding hall:', err)
      throw err
    }
  }, [])

  const deleteDay = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('conference_days')
        .delete()
        .eq('id', id)

      if (error) throw error

      setDays(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error('Error deleting day:', err)
      throw err
    }
  }, [])

  const deleteHall = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('stages')
        .delete()
        .eq('id', id)

      if (error) throw error

      setHalls(prev => prev.filter(h => h.id !== id))
    } catch (err) {
      console.error('Error deleting hall:', err)
      throw err
    }
  }, [])

  // Initialize realtime subscriptions
  useEffect(() => {
    if (!REALTIME_ENABLED) return

    const unsubscribe = realtimeService.subscribeToSessions((payload) => {
      if (payload.eventType === 'INSERT') {
        setSessions(prev => [...prev, payload.new])
      } else if (payload.eventType === 'UPDATE') {
        setSessions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s))
      } else if (payload.eventType === 'DELETE') {
        setSessions(prev => prev.filter(s => s.id !== payload.old.id))
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  return {
    sessions,
    timeSlots,
    halls,
    dayHalls,
    days,
    speakers,
    loading,
    error,
    addSession,
    updateSession,
    deleteSession,
    addDay,
    addHall,
    deleteDay,
    deleteHall,
    reload: loadAllData
  }
}
