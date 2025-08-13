import { supabaseUtils } from '@/lib/utils'

test('transformSession falls back to custom times when day_time_slots missing', () => {
  const input: any = {
    custom_start_time: '10:00',
    custom_end_time: '10:30',
    day_time_slots: null,
    session_participants: [],
    sub_sessions: []
  }
  const out = supabaseUtils.transformSession(input)
  expect(out.start_time).toBe('10:00')
  expect(out.end_time).toBe('10:30')
})


