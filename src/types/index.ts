export type SessionType = 
  | 'lecture'
  | 'panel'
  | 'symposium'
  | 'workshop'
  | 'oration'
  | 'guest_lecture'
  | 'discussion'
  | 'break'
  | 'other';

export type Role = 
  | 'speaker'
  | 'moderator'
  | 'panelist'
  | 'chairperson'
  | 'workshop_lead'
  | 'assistant'
  | 'presenter'
  | 'introducer'
  | 'orator'
  | 'discussion_leader';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'coffee_break';

export interface SessionTypeConfig {
  id: string;
  name: string;
  fields: {
    required: string[];
    optional: string[];
    roles: Role[];
  };
}

export interface Session {
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
}

export interface DayTimeSlot {
  id: string
  day_id: string
  start_time: string
  end_time: string
  slot_order: number
  is_break: boolean
  break_title?: string
  created_at?: string
}

export interface Hall {
  id: string
  name: string
  capacity?: number
  created_at?: string
}

export interface Day {
  id: string
  name: string
  date: string
  created_at?: string
}

export interface Speaker {
  id: string
  name: string
  email?: string
  title?: string
  organization?: string
  bio?: string
  created_at?: string
}

export interface SessionParticipant {
  id: string
  session_id: string
  speaker_id: string
  role: string
  created_at?: string
}

export interface SessionTypeConfig {
  id: string
  name: string
  fields: {
    required: string[];
    optional: string[];
    roles: Role[];
  }
  created_at?: string
}

export interface SymposiumSubtalk {
  id: string;
  title: string;
  speaker_id: string;
  start_time: string;
  end_time: string;
  topic: string;
}

export interface SessionFormData {
  title: string;
  session_type: SessionType;
  day_id: string;
  stage_id: string;
  start_time: string;
  end_time: string;
  topic?: string;
  description?: string;
  is_parallel_meal: boolean;
  parallel_meal_type?: MealType;
  
  // Dynamic fields based on session type
  speaker_id?: string;
  chairperson_id?: string;
  moderator_id?: string;
  panelist_ids?: string[];
  workshop_lead_ids?: string[];
  assistant_ids?: string[];
  capacity?: number;
  introducer_id?: string;
  presenter_ids?: string[];
  discussion_leader_id?: string;
  
  // Symposium specific
  symposium_subtalks?: SymposiumSubtalk[];
  
  // Other custom fields
  custom_data?: Record<string, any>;
}

export interface CSVExportRow {
  session_name: string;
  session_type: string;
  day: string;
  stage: string;
  start_time: string;
  end_time: string;
  duration: string;
  topic: string;
  person_name: string;
  role: string;
  organization?: string;
  email?: string;
}

export interface DashboardStats {
  total_sessions: number;
  total_speakers: number;
  total_days: number;
  total_stages: number;
  sessions_by_type: Record<SessionType, number>;
  upcoming_sessions: number;
} 