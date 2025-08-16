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

// Compact 12-hour time format without space and with lowercase am/pm, e.g., 08:30am
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

    const panelists = participants
      .filter((p: any) => p.role === 'panelist')
      .map((p: any) => p.speakers?.name || 'Unknown Panelist')

    const experts = participants
      .filter((p: any) => p.role === 'expert')
      .map((p: any) => p.speakers?.name || 'Unknown Expert')

    // Sub-sessions (sub-talks)
    const subSessionsRaw = session.sub_sessions || []
    const subSessions = subSessionsRaw.map((st: any) => ({
      id: st.id,
      title: st.title,
      topic: st.topic || '',
      start_time: st.start_time || '',
      end_time: st.end_time || '',
      type: st.sub_session_type || 'lecture',
      speaker_name: st.speakers?.name || ''
    }))

    const transformed = {
      ...session,
      day_name: session.conference_days?.name || 'Unknown Day',
      stage_name: session.stages?.name || 'Unknown Hall',
      // Prefer custom_* if present, else day_time_slots
      start_time: session.custom_start_time || session.day_time_slots?.start_time || '',
      end_time: session.custom_end_time || session.day_time_slots?.end_time || '',
      is_break: session.day_time_slots?.is_break || false,
      break_title: session.day_time_slots?.break_title,
      speakers,
      moderators,
      chairpersons,
      panelists,
      experts,
      sub_sessions: subSessions
    }

    return transformed
  },

  // Standard session query for both pages
  getSessionQuery: () => `
    id,
    title,
    session_type,
    day_id,
    stage_id,
    time_slot_id,
    topic,
    description,
    is_parallel_meal,
    parallel_meal_type,
    custom_start_time,
    custom_end_time,
    start_time,
    end_time,
    session_number,
    status,
    created_at,
    updated_at,
    conference_days(name),
    stages(name),
    day_time_slots(start_time, end_time, is_break, break_title),
    session_participants(
      id,
      role,
      speakers(id, name, title, organization)
    ),
    sub_sessions(
      id,
      title,
      start_time,
      end_time,
      topic,
      sub_session_type,
      speaker_id,
      speakers!sub_sessions_speaker_id_fkey(name)
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

// Person resolution helper used by save flows
// Pass a Supabase client and an optional in-memory list to speed lookups.
export async function ensurePersonByNameOrId(
  supabaseClient: any,
  existingPeople: Array<{ id: string; name: string }> | undefined,
  rawInput: string | null | undefined,
  onCreated?: (person: { id: string; name: string }) => void
): Promise<string | null> {
  const isUuid = (val: string) => /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(val || '')
  if (!rawInput) return null
  let value = String(rawInput).trim()
  
  // Handle optimistic placeholders like "temp:Name" - extract the name and try to create the person
  if (value.toLowerCase().startsWith('temp:')) {
    value = value.slice(5)
    console.warn('Found temp ID, attempting to resolve:', value)
  }
  
  if (!value) return null
  if (isUuid(value)) return value
  
  // Check existing people first
  const match = (existingPeople || []).find(p => (p.name || '').toLowerCase() === value.toLowerCase())
  if (match) return match.id
  
  // Try to create the person
  try {
    const { data, error } = await supabaseClient
      .from('speakers')
      .insert({ name: value })
      .select('id, name')
      .single()
    if (error) {
      console.error('Failed to create person', error)
      return null
    }
    console.log('Successfully created person:', data.name)
    if (onCreated) onCreated({ id: data!.id, name: data!.name })
    return data!.id
  } catch (e) {
    console.error('Exception creating person', e)
    return null
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

// Time utility functions
export const formatTime12h = (time: string): string => {
  if (!time) return '';
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
};

export const parseTime12h = (timeStr: string): string => {
  if (!timeStr) return '';
  try {
    // Handle formats like "9:00 AM", "9.00am", "09:00 PM"
    const cleanTime = timeStr.replace(/\./g, ':').toUpperCase();
    const match = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (match) {
      let [_, hours, minutes, ampm] = match;
      let hour = parseInt(hours);
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${minutes}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
};

// Session numbering utility
export const getSessionNumberDisplay = (number: number): string => {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  if (number >= 1 && number <= 10) {
    return `Session ${romanNumerals[number - 1]}`;
  }
  return `Session ${number}`;
};

// Participant display utility
export const formatParticipantsDisplay = (session: any): string => {
  const parts = [];
  
  if (session.speakers && session.speakers.length > 0) {
    parts.push(`S: ${session.speakers.join(', ')}`);
  }
  
  if (session.moderators && session.moderators.length > 0) {
    parts.push(`M: ${session.moderators.join(', ')}`);
  }
  
  if (session.chairpersons && session.chairpersons.length > 0) {
    parts.push(`C: ${session.chairpersons.join(', ')}`);
  }

  if (session.panelists && session.panelists.length > 0) {
    parts.push(`P: ${session.panelists.join(', ')}`);
  }

  if (session.experts && session.experts.length > 0) {
    parts.push(`E: ${session.experts.join(', ')}`);
  }
  
  return parts.join(' | ');
};

// Time suggestion utility
export const getNextStartTime = (endTime: string): string => {
  if (!endTime) return '';
  try {
    const [hours, minutes] = endTime.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date.toTimeString().slice(0, 5);
  } catch {
    return '';
  }
};

// Session title suggestions
export const getSessionTitleSuggestions = (sessionNumber: number): string[] => {
  const baseSuggestions = [
    getSessionNumberDisplay(sessionNumber),
    `Session ${sessionNumber}`,
    `Day ${sessionNumber} Session`,
    `Main Session ${sessionNumber}`
  ];
  
  return baseSuggestions;
}; 