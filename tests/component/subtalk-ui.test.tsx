import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { SessionForm } from '@/components/session-form'

test('can add and remove subtalk row', async () => {
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

  // Ensure async effects settle, then find the button
  const addBtn = await screen.findByText(/Add\s*Subtalk/i)
  fireEvent.click(addBtn)
  const rows = await screen.findAllByTestId('subtalk-row')
  expect(rows.length).toBe(1)
  const removeBtn = await screen.findByRole('button', { name: /remove subtalk/i })
  fireEvent.click(removeBtn)
  expect(screen.queryByTestId('subtalk-row')).toBeNull()
})


