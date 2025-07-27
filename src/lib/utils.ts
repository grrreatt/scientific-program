import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'pm' : 'am'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  return `${displayHours}:${displayMinutes}${period}`
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)}–${formatTime(endTime)}`
}

export function calculateDuration(startTime: string, endTime: string): string {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  
  let startTotal = startHours * 60 + startMinutes
  let endTotal = endHours * 60 + endMinutes
  
  if (endTotal < startTotal) {
    endTotal += 24 * 60 // Add 24 hours if end time is next day
  }
  
  const durationMinutes = endTotal - startTotal
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  
  if (hours === 0) {
    return `${minutes}m`
  } else if (minutes === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${minutes}m`
  }
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