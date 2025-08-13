import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { SessionForm } from '@/components/session-form'

test('submits minimal session for session type with only times', () => {
  const onSubmit = jest.fn()
  render(
    <SessionForm
      onSubmit={onSubmit as any}
      onCancel={() => {}}
      days={[{ id: 'd1', name: 'Day 1', date: '2024-01-01' }]}
      halls={[{ id: 'h1', name: 'Hall A' }]}
      timeSlots={[{ id: 't1', start_time: '08:00', end_time: '08:30', is_break: false }]}
      isAddingNewSession
      initialData={{ time_slot_id: 't1', stage_id: 'h1' }}
      sessionType="session"
    />
  )

  const save = screen.getByRole('button', { name: /save session/i })
  fireEvent.click(save)
  expect(onSubmit).toHaveBeenCalled()
})


