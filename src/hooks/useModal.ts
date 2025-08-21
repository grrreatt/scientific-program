import { useState, useCallback } from 'react'
import { Session } from '@/types'

export function useModal() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openModal = useCallback((session?: Session) => {
    setEditingSession(session || null)
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingSession(null)
    setIsSubmitting(false)
  }, [])

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting)
  }, [])

  return {
    isModalOpen,
    editingSession,
    isSubmitting,
    openModal,
    closeModal,
    setSubmitting
  }
}
