import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: string): string {
  if (!time) return ''
  
  // Handle both "HH:MM" and "HH:MM:SS" formats
  const timeStr = time.split(':').slice(0, 2).join(':')
  
  try {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0)
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    console.error('Error formatting time:', error)
    return timeStr
  }
}

export function formatTimeRange(startTime: string, endTime: string): string {
  const formattedStart = formatTime(startTime)
  const formattedEnd = formatTime(endTime)
  
  if (!formattedStart || !formattedEnd) return ''
  
  return `${formattedStart} - ${formattedEnd}`
}

export function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return ''
  
  try {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    const diffMs = end.getTime() - start.getTime()
    const diffMinutes = Math.round(diffMs / (1000 * 60))
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`
    } else {
      const hours = Math.floor(diffMinutes / 60)
      const minutes = diffMinutes % 60
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
  } catch (error) {
    console.error('Error calculating duration:', error)
    return ''
  }
}

// Supabase data loading utilities for consistent data fetching
export const supabaseUtils = {
  // Transform session data consistently across pages
  transformSession: (session: any) => {
    const participants = session.session_participants || []
    const speakers = participants
      .filter((p: any) => ['speaker', 'orator', 'presenter', 'workshop_lead'].includes(p.role))
      .map((p: any) => p.speakers?.name || 'Unknown Speaker')
    const moderators = participants
      .filter((p: any) => ['moderator', 'discussion_leader'].includes(p.role))
      .map((p: any) => p.speakers?.name || 'Unknown Moderator')
    const chairpersons = participants
      .filter((p: any) => ['chairperson', 'introducer'].includes(p.role))
      .map((p: any) => p.speakers?.name || 'Unknown Chairperson')

    return {
      ...session,
      day_name: session.conference_days?.name || 'Unknown Day',
      stage_name: session.stages?.name || 'Unknown Hall',
      start_time: session.day_time_slots?.start_time || session.start_time || '',
      end_time: session.day_time_slots?.end_time || session.end_time || '',
      is_break: session.day_time_slots?.is_break || false,
      break_title: session.day_time_slots?.break_title,
      speakers,
      moderators,
      chairpersons
    }
  },

  // Standard session query for both pages
  getSessionQuery: () => `
    *,
    conference_days(name),
    stages(name),
    day_time_slots(start_time, end_time, is_break, break_title),
    session_participants(
      id,
      role,
      speakers(id, name, title, organization)
    )
  `,

  // Standard halls query
  getHallsQuery: () => `
    *,
    day_halls!inner(day_id, hall_order)
  `,

  // Standard days query
  getDaysQuery: () => `
    *,
    day_halls(hall_id, hall_order)
  `
}

export function parseTimeInput(timeString: string): string {
  // Convert 12-hour format to 24-hour format
  const match = timeString.match(/^(\d{1,2}):(\d{2})(am|pm)$/i)
  if (!match) return timeString
  
  let [_, hours, minutes, period] = match
  let hour = parseInt(hours)
  
  if (period.toLowerCase() === 'pm' && hour !== 12) {
    hour += 12
  } else if (period.toLowerCase() === 'am' && hour === 12) {
    hour = 0
  }
  
  return `${hour.toString().padStart(2, '0')}:${minutes}`
}

export function formatTimeForInput(time: string): string {
  // Convert 24-hour format to 12-hour format for input fields
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'pm' : 'am'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  return `${displayHours}:${displayMinutes}${period}`
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
} 