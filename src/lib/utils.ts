import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: string): string {
  if (!time) return ''
  
  try {
    const [hours, minutes] = time.split(':').slice(0, 2).map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0)
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch (error) {
    console.error('Error formatting time:', error)
    return time
  }
}

export function formatTimeRange(startTime: string, endTime: string): string {
  const formattedStart = formatTime(startTime)
  const formattedEnd = formatTime(endTime)
  
  if (!formattedStart || !formattedEnd) return ''
  
  return `${formattedStart} - ${formattedEnd}`
}

export function formatTimeCompact(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hours = parseInt(h, 10)
  const minutes = parseInt(m || '0', 10)
  const period = hours >= 12 ? 'pm' : 'am'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${period}`
}

export function formatTimeRangeCompact(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return ''
  return `${formatTimeCompact(startTime)}-${formatTimeCompact(endTime)}`
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

export function formatParticipantsDisplay(participants: string[]): string {
  if (!participants || participants.length === 0) return ''
  if (participants.length === 1) return participants[0]
  if (participants.length === 2) return participants.join(' & ')
  return `${participants[0]} +${participants.length - 1} more`
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function ensurePersonByNameOrId(nameOrId: string, speakers: any[]): string {
  if (!nameOrId) return ''
  
  // If it's already an ID, return it
  if (speakers.some(s => s.id === nameOrId)) {
    return nameOrId
  }
  
  // If it's a name, find the ID
  const speaker = speakers.find(s => s.name.toLowerCase() === nameOrId.toLowerCase())
  return speaker?.id || ''
}

// Time conversion utilities
export function formatTime12h(time24h: string): string {
  if (!time24h) return ''
  const [hours, minutes] = time24h.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

export function parseTime12h(time12h: string): string {
  if (!time12h) return ''
  const match = time12h.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return time12h
  
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const period = match[3].toUpperCase()
  
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function getSessionNumberDisplay(number: number): string {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  return romanNumerals[number - 1] || String(number)
}

export function getSessionTitleSuggestions(sessionType: string): string[] {
  const suggestions: Record<string, string[]> = {
    lecture: ['Introduction to Topic', 'Advanced Concepts', 'Case Study Presentation'],
    panel: ['Expert Panel Discussion', 'Industry Roundtable', 'Q&A Session'],
    symposium: ['Research Symposium', 'Academic Discussion', 'Scientific Presentation'],
    workshop: ['Hands-on Workshop', 'Interactive Session', 'Practical Training'],
    oration: ['Keynote Address', 'Plenary Lecture', 'Opening Ceremony'],
    guest_lecture: ['Guest Speaker Presentation', 'Special Lecture', 'Invited Talk'],
    discussion: ['Open Discussion', 'Free Paper Session', 'Interactive Discussion'],
    break: ['Coffee Break', 'Lunch Break', 'Networking Session'],
    other: ['Special Session', 'Custom Event', 'Additional Activity']
  }
  
  return suggestions[sessionType] || ['Session Title']
}

export function getNextStartTime(sessions: any[], dayId: string, stageId: string): string {
  const daySessions = sessions.filter(s => s.day_id === dayId && s.stage_id === stageId)
  if (daySessions.length === 0) return '09:00'
  
  const lastSession = daySessions.sort((a, b) => 
    new Date(`2000-01-01T${b.end_time}`).getTime() - new Date(`2000-01-01T${a.end_time}`).getTime()
  )[0]
  
  if (!lastSession.end_time) return '09:00'
  
  const endTime = new Date(`2000-01-01T${lastSession.end_time}`)
  endTime.setMinutes(endTime.getMinutes() + 15) // 15 min break
  
  return endTime.toTimeString().slice(0, 5)
} 

// Utilities used by public program page for consistent Supabase queries and transforms
export const supabaseUtils = {
  // Build a typed select for sessions including joined participant names and view fields
  getSessionQuery(): string {
    // Select base session fields and join related tables for names/times
    // Also join participant names via session_participants for display
    return `
      id, title, session_type, day_id, stage_id, time_slot_id, topic, description,
      is_parallel_meal, parallel_meal_type, data, created_at, updated_at,
      session_number, status, custom_start_time, custom_end_time,
      day_time_slots:start_time_id(
        start_time, end_time, is_break, break_title
      ),
      conference_days:day_id(name, date),
      stages:stage_id(name),
      session_participants!left(
        role,
        speakers!inner(name)
      )
    `
  },

  // Transform a raw row into the shape the UI expects
  transformSession(raw: any) {
    const speakers: string[] = []
    const moderators: string[] = []
    const chairpersons: string[] = []

    const participants = Array.isArray(raw.session_participants) ? raw.session_participants : []
    for (const p of participants) {
      const personName = p?.speakers?.name || ''
      const role = (p?.role || '').toLowerCase()
      if (!personName) continue
      if (role === 'speaker' || role === 'panelist' || role === 'presenter') {
        speakers.push(personName)
      } else if (role === 'moderator') {
        moderators.push(personName)
      } else if (role === 'chairperson' || role === 'chair') {
        chairpersons.push(personName)
      }
    }

    // Extract joined fields safely depending on how Postgrest aliases are returned
    const day = (raw as any).conference_days || (raw as any).day_id || {}
    const slot = (raw as any).day_time_slots || (raw as any).start_time_id || {}
    const stage = (raw as any).stages || (raw as any).stage_id || {}

    return {
      ...raw,
      start_time: raw.custom_start_time || slot.start_time,
      end_time: raw.custom_end_time || slot.end_time,
      is_break: slot.is_break,
      break_title: slot.break_title,
      day_name: day.name,
      stage_name: stage.name,
      speakers,
      moderators,
      chairpersons,
    }
  },
}