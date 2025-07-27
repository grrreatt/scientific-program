import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export type Database = {
  public: {
    Tables: {
      conference_days: {
        Row: {
          id: string
          name: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string
          created_at?: string
        }
      }
      stages: {
        Row: {
          id: string
          name: string
          capacity: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          capacity?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          capacity?: number | null
          created_at?: string
        }
      }
      speakers: {
        Row: {
          id: string
          name: string
          email: string | null
          title: string | null
          organization: string | null
          bio: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          title?: string | null
          organization?: string | null
          bio?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          title?: string | null
          organization?: string | null
          bio?: string | null
          created_at?: string
        }
      }
      session_types: {
        Row: {
          id: string
          name: string
          fields: any
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          fields: any
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          fields?: any
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          title: string
          session_type: string
          day_id: string
          stage_id: string
          start_time: string
          end_time: string
          topic: string | null
          description: string | null
          is_parallel_meal: boolean
          parallel_meal_type: string | null
          data: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          session_type: string
          day_id: string
          stage_id: string
          start_time: string
          end_time: string
          topic?: string | null
          description?: string | null
          is_parallel_meal?: boolean
          parallel_meal_type?: string | null
          data?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          session_type?: string
          day_id?: string
          stage_id?: string
          start_time?: string
          end_time?: string
          topic?: string | null
          description?: string | null
          is_parallel_meal?: boolean
          parallel_meal_type?: string | null
          data?: any
          created_at?: string
          updated_at?: string
        }
      }
      session_participants: {
        Row: {
          id: string
          session_id: string
          speaker_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          speaker_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          speaker_id?: string
          role?: string
          created_at?: string
        }
      }
    }
  }
} 