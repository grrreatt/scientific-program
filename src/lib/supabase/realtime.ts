import { supabase } from './client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeConfig {
  onSessionChange?: (payload: any) => void
  onHallChange?: (payload: any) => void
  onDayChange?: (payload: any) => void
  onTimeSlotChange?: (payload: any) => void
  onConnectionChange?: (status: string) => void
}

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  // Optimistic updates cache
  private optimisticCache = new Map<string, any>()

  constructor() {
    this.setupConnectionMonitoring()
  }

  private setupConnectionMonitoring() {
    // Monitor connection status
    setInterval(() => {
      const status = this.getConnectionStatus()
      if (status !== this.connectionStatus) {
        this.connectionStatus = status
        console.log('🔗 Connection status changed:', status)
      }
    }, 5000)
  }

  private getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    // For now, return the stored connection status
    // We'll track this through the subscription callbacks
    return this.connectionStatus
  }

  public getConnectionStatusPublic() {
    return this.connectionStatus
  }

  public subscribeToAll(config: RealtimeConfig) {
    console.log('🚀 Setting up real-time subscriptions...')
    
    // Subscribe to sessions
    this.subscribeToSessions(config.onSessionChange)
    
    // Subscribe to halls/stages
    this.subscribeToHalls(config.onHallChange)
    
    // Subscribe to days
    this.subscribeToDays(config.onDayChange)
    
    // Subscribe to time slots
    this.subscribeToTimeSlots(config.onTimeSlotChange)
    
    // Monitor connection changes
    if (config.onConnectionChange) {
      setInterval(() => {
        config.onConnectionChange?.(this.connectionStatus)
      }, 2000)
    }
  }

  private subscribeToSessions(onChange?: (payload: any) => void) {
    const channel = supabase
      .channel('sessions-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions' }, 
        (payload) => {
          console.log('🔄 Session change detected:', payload)
          
          // Optimistic update
          this.handleOptimisticUpdate('sessions', payload)
          
          // Call callback
          onChange?.(payload)
        }
      )
      .subscribe((status) => {
        console.log('📡 Sessions subscription status:', status)
        if (status === 'SUBSCRIBED') {
          this.channels.set('sessions', channel)
          this.connectionStatus = 'connected'
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.connectionStatus = 'disconnected'
        } else {
          this.connectionStatus = 'connecting'
        }
      })
  }

  private subscribeToHalls(onChange?: (payload: any) => void) {
    const channel = supabase
      .channel('halls-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'stages' }, 
        (payload) => {
          console.log('🔄 Hall change detected:', payload)
          
          // Optimistic update
          this.handleOptimisticUpdate('halls', payload)
          
          // Call callback
          if (onChange) {
            onChange(payload)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Halls subscription status:', status)
        if (status === 'SUBSCRIBED') {
          this.channels.set('halls', channel)
        }
      })
  }

  private subscribeToDays(onChange?: (payload: any) => void) {
    const channel = supabase
      .channel('days-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conference_days' }, 
        (payload) => {
          console.log('🔄 Day change detected:', payload)
          
          // Optimistic update
          this.handleOptimisticUpdate('days', payload)
          
          // Call callback
          if (onChange) {
            onChange(payload)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Days subscription status:', status)
        if (status === 'SUBSCRIBED') {
          this.channels.set('days', channel)
        }
      })
  }

  private subscribeToTimeSlots(onChange?: (payload: any) => void) {
    const channel = supabase
      .channel('timeslots-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'day_time_slots' }, 
        (payload) => {
          console.log('🔄 Time slot change detected:', payload)
          
          // Optimistic update
          this.handleOptimisticUpdate('timeslots', payload)
          
          // Call callback
          if (onChange) {
            onChange(payload)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Time slots subscription status:', status)
        if (status === 'SUBSCRIBED') {
          this.channels.set('timeslots', channel)
        }
      })
  }

  private handleOptimisticUpdate(type: string, payload: any) {
    const key = `${type}-${payload.new?.id || payload.old?.id}`
    
    switch (payload.eventType) {
      case 'INSERT':
        this.optimisticCache.set(key, { ...payload.new, optimistic: true })
        break
      case 'UPDATE':
        this.optimisticCache.set(key, { ...payload.new, optimistic: true })
        break
      case 'DELETE':
        this.optimisticCache.set(key, { ...payload.old, deleted: true, optimistic: true })
        break
    }
    
    // Clean up optimistic cache after 5 seconds
    setTimeout(() => {
      this.optimisticCache.delete(key)
    }, 5000)
  }

  public getOptimisticData(type: string, id: string) {
    return this.optimisticCache.get(`${type}-${id}`)
  }

  public unsubscribeFromAll() {
    console.log('🔌 Unsubscribing from all channels...')
    this.channels.forEach((channel, name) => {
      console.log(`🔌 Unsubscribing from ${name}`)
      channel.unsubscribe()
    })
    this.channels.clear()
    this.optimisticCache.clear()
  }

  public async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      return false
    }

    console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)
    this.reconnectAttempts++
    
    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay))
    
    // Reconnect logic would go here
    // For now, just reset the attempt counter on successful connection
    if (this.getConnectionStatus() === 'connected') {
      this.reconnectAttempts = 0
      return true
    }
    
    return false
  }
}

// Create singleton instance
export const realtimeService = new RealtimeService()

// Export for use in components
export default realtimeService 