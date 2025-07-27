'use client'

import { useState, useEffect } from 'react'
import realtimeService from '@/lib/supabase/realtime'

interface RealtimeStatusProps {
  className?: string
}

export function RealtimeStatus({ className = '' }: RealtimeStatusProps) {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [updateCount, setUpdateCount] = useState(0)

  useEffect(() => {
    // Subscribe to connection status changes
    const interval = setInterval(() => {
      const status = realtimeService.getConnectionStatusPublic()
      setConnectionStatus(status)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600 bg-green-100 border-green-200'
      case 'connecting':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'disconnected':
        return 'text-red-600 bg-red-100 border-red-200'
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢'
      case 'connecting':
        return '🟡'
      case 'disconnected':
        return '🔴'
      default:
        return '⚪'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live'
      case 'connecting':
        return 'Connecting...'
      case 'disconnected':
        return 'Offline'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor()} ${className}`}>
      <span className="animate-pulse">{getStatusIcon()}</span>
      <span>{getStatusText()}</span>
      {connectionStatus === 'connected' && (
        <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
      )}
    </div>
  )
}

export function RealtimeIndicator() {
  const [isVisible, setIsVisible] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Show indicator for 3 seconds when updates happen
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setMessage('')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  const showUpdate = (msg: string) => {
    setMessage(msg)
    setIsVisible(true)
  }

  return (
    <>
      {isVisible && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-right">
          <div className="flex items-center space-x-2">
            <span>🔄</span>
            <span>{message}</span>
          </div>
        </div>
      )}
    </>
  )
} 