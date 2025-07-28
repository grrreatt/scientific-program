import { SessionTypeConfig } from '@/types'

export const SESSION_TYPES: Record<string, SessionTypeConfig> = {
  lecture: {
    id: 'lecture',
    name: 'Lecture / Talk',
    fields: {
      required: ['title', 'topic', 'day_id', 'stage_id', 'time_slot_id', 'speaker_id'],
      optional: ['chairperson_id', 'description', 'is_parallel_meal'],
      roles: ['speaker', 'chairperson']
    }
  },
  panel: {
    id: 'panel',
    name: 'Panel Discussion',
    fields: {
      required: ['title', 'topic', 'day_id', 'stage_id', 'time_slot_id', 'moderator_id', 'panelist_ids'],
      optional: ['description', 'is_parallel_meal'],
      roles: ['moderator', 'panelist']
    }
  },
  symposium: {
    id: 'symposium',
    name: 'Symposium',
    fields: {
      required: ['title', 'topic', 'day_id', 'stage_id', 'time_slot_id', 'moderator_id', 'symposium_subtalks'],
      optional: ['description'],
      roles: ['moderator', 'speaker']
    }
  },
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    fields: {
      required: ['title', 'topic', 'day_id', 'stage_id', 'time_slot_id', 'workshop_lead_ids'],
      optional: ['assistant_ids', 'capacity', 'description'],
      roles: ['workshop_lead', 'assistant']
    }
  },
  oration: {
    id: 'oration',
    name: 'Oration / Keynote / Plenary',
    fields: {
      required: ['title', 'topic', 'day_id', 'stage_id', 'time_slot_id', 'speaker_id'],
      optional: ['introducer_id', 'description'],
      roles: ['speaker', 'introducer']
    }
  },
  guest_lecture: {
    id: 'guest_lecture',
    name: 'Guest Lecture',
    fields: {
      required: ['title', 'topic', 'day_id', 'stage_id', 'time_slot_id', 'speaker_id'],
      optional: ['chairperson_id', 'description'],
      roles: ['speaker', 'chairperson']
    }
  },
  discussion: {
    id: 'discussion',
    name: 'Discussion / Free Paper Session',
    fields: {
      required: ['title', 'topic', 'day_id', 'stage_id', 'time_slot_id', 'discussion_leader_id', 'presenter_ids'],
      optional: ['description'],
      roles: ['discussion_leader', 'presenter']
    }
  },
  break: {
    id: 'break',
    name: 'Break / Meal (Only)',
    fields: {
      required: ['title', 'day_id', 'stage_id', 'time_slot_id', 'meal_type'],
      optional: ['description'],
      roles: []
    }
  },
  other: {
    id: 'other',
    name: 'Other / Custom',
    fields: {
      required: ['title', 'day_id', 'stage_id', 'time_slot_id'],
      optional: ['topic', 'description', 'custom_data'],
      roles: []
    }
  }
}

export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'coffee_break', label: 'Coffee Break' }
] as const

export const ROLE_LABELS: Record<string, string> = {
  speaker: 'Speaker',
  moderator: 'Moderator',
  panelist: 'Panelist',
  chairperson: 'Chairperson',
  workshop_lead: 'Workshop Lead',
  assistant: 'Assistant',
  presenter: 'Presenter',
  introducer: 'Introducer',
  orator: 'Orator',
  discussion_leader: 'Discussion Leader'
}

export const DEFAULT_CREDENTIALS = {
  email: 'admin@conference.com',
  password: 'admin123'
}

export const TIME_SLOTS = [
  '8:00am', '8:30am', '9:00am', '9:30am', '10:00am', '10:30am',
  '11:00am', '11:30am', '12:00pm', '12:30pm', '1:00pm', '1:30pm',
  '2:00pm', '2:30pm', '3:00pm', '3:30pm', '4:00pm', '4:30pm',
  '5:00pm', '5:30pm', '6:00pm', '6:30pm', '7:00pm', '7:30pm',
  '8:00pm', '8:30pm', '9:00pm', '9:30pm', '10:00pm'
]

export const CONFERENCE_NAME = 'Welcome Organizer' 