'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { SessionForm } from '@/components/session-form'
import { SessionGrid } from '@/components/session-grid'
import { DaySelector } from '@/components/day-selector'
import { RealtimeStatus } from '@/components/ui/realtime-status'
import { SessionGridSkeleton } from '@/components/loading-skeleton'
import { useSessions } from '@/hooks/useSessions'
import { useModal } from '@/hooks/useModal'
import { Session, SessionType, MealType } from '@/types'
import { ensurePersonByNameOrId } from '@/lib/utils'

export default function EditSessionsPage() {
  const {
    sessions,
    timeSlots,
    halls,
    dayHalls,
    days,
    speakers,
    loading,
    error,
    addSession,
    updateSession,
    deleteSession,
    addDay,
    addHall,
    deleteDay,
    deleteHall
  } = useSessions()

  const {
    isModalOpen,
    editingSession,
    isSubmitting,
    openModal,
    closeModal,
    setSubmitting
  } = useModal()

  // UI state
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [showAddDayModal, setShowAddDayModal] = useState(false)
  const [newDayName, setNewDayName] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAddHallModal, setShowAddHallModal] = useState(false)
  const [newHallName, setNewHallName] = useState('')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'day' | 'hall', item: any } | null>(null)

  // Persist selected day across reloads
  const selectDay = (dayName: string) => {
    setSelectedDay(dayName)
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('selectedDay', dayName) } catch {}
    }
  }

  // Load selected day from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selectedDay')
        if (saved && days.some(d => d.name === saved)) {
          setSelectedDay(saved)
        } else if (days.length > 0) {
          setSelectedDay(days[0].name)
        }
      } catch {}
    }
  }, [days])

  const handleAddSession = (dayId: string, stageId: string, timeSlotId: string) => {
    const timeSlot = timeSlots.find(ts => ts.id === timeSlotId)
    const day = days.find(d => d.id === dayId)
    const hall = halls.find(h => h.id === stageId)
    
    openModal()
  }

  const handleEditSession = (session: Session) => {
    openModal(session)
  }

  const handleDeleteSession = async (session: Session) => {
    if (confirm(`Are you sure you want to delete "${session.title}"?`)) {
      try {
        await deleteSession(session.id)
      } catch (err) {
        console.error('Error deleting session:', err)
        alert('Failed to delete session')
      }
    }
  }

  const handleSubmitSession = async (formData: any, sessionType: string) => {
    setSubmitting(true)
    try {
      // Process participants from the form data
      const participants = []
      
      // Add speakers
      if (formData.speakers && formData.speakers.length > 0) {
        formData.speakers.forEach((speaker: any) => {
          participants.push({ speaker_id: speaker.id, role: 'speaker' })
        })
      } else if (formData.speaker_id) {
        participants.push({ speaker_id: formData.speaker_id, role: 'speaker' })
      }
      
      // Add moderators
      if (formData.moderators && formData.moderators.length > 0) {
        formData.moderators.forEach((moderator: any) => {
          participants.push({ speaker_id: moderator.id, role: 'moderator' })
        })
      } else if (formData.moderator_id) {
        participants.push({ speaker_id: formData.moderator_id, role: 'moderator' })
      }
      
      // Add chairpersons
      if (formData.chairpersons && formData.chairpersons.length > 0) {
        formData.chairpersons.forEach((chairperson: any) => {
          participants.push({ speaker_id: chairperson.id, role: 'chairperson' })
        })
      } else if (formData.chairperson_id) {
        participants.push({ speaker_id: formData.chairperson_id, role: 'chairperson' })
      }
      
      // Add panelists
      if (formData.panelist_ids) {
        formData.panelist_ids.forEach((id: string) => {
          participants.push({ speaker_id: id, role: 'panelist' })
        })
      }

      const sessionData = {
        title: formData.title,
        session_type: sessionType,
        day_id: formData.day_id,
        stage_id: formData.stage_id,
        time_slot_id: formData.time_slot_id,
        topic: formData.topic,
        description: formData.description,
        is_parallel_meal: formData.is_parallel_meal,
        parallel_meal_type: formData.parallel_meal_type,
        custom_start_time: formData.start_time,
        custom_end_time: formData.end_time,
        data: {
          symposium_subtalks: formData.symposium_subtalks,
          sub_sessions: formData.sub_sessions,
          custom_data: formData.custom_data
        }
      }

      if (editingSession) {
        // For updates, we need to handle participants separately
        await updateSession(editingSession.id, sessionData)
        
        // TODO: Update session participants in a separate call
        // This would require additional API endpoints to handle participant updates
      } else {
        await addSession(sessionData)
        
        // TODO: Add session participants in a separate call
        // This would require additional API endpoints to handle participant creation
      }

      closeModal()
    } catch (err) {
      console.error('Error saving session:', err)
      alert('Failed to save session')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddDay = () => {
    setShowAddDayModal(true)
  }

  const handleSubmitDay = async () => {
    if (!newDayName.trim() || !selectedDate) {
      alert('Please enter a day name and select a date')
      return
    }

    try {
      await addDay({
        name: newDayName.trim(),
        date: selectedDate.toISOString().split('T')[0]
      })
      setShowAddDayModal(false)
      setNewDayName('')
      setSelectedDate(null)
    } catch (err) {
      console.error('Error adding day:', err)
      alert('Failed to add day')
    }
  }

  const handleAddHall = () => {
    setShowAddHallModal(true)
  }

  const handleSubmitHall = async () => {
    if (!newHallName.trim()) {
      alert('Please enter a hall name')
      return
    }

    try {
      await addHall({ name: newHallName.trim() })
      setShowAddHallModal(false)
      setNewHallName('')
    } catch (err) {
      console.error('Error adding hall:', err)
      alert('Failed to add hall')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Sessions</h1>
          <RealtimeStatus />
        </div>
        <SessionGridSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Sessions</h1>
        <div className="flex gap-2">
          <button
            onClick={handleAddHall}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            + Add Hall
          </button>
          <RealtimeStatus />
        </div>
      </div>

      <DaySelector
        days={days}
        selectedDay={selectedDay}
        onSelectDay={selectDay}
        onAddDay={handleAddDay}
      />

      <SessionGrid
        sessions={sessions}
        timeSlots={timeSlots}
        dayHalls={dayHalls}
        selectedDay={selectedDay}
        onEditSession={handleEditSession}
        onDeleteSession={handleDeleteSession}
        onAddSession={handleAddSession}
      />

      {/* Session Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSession ? "Edit Session" : "Add Session"}>
        <SessionForm
          initialData={editingSession ? {
            title: editingSession.title,
            day_id: editingSession.day_id,
            stage_id: editingSession.stage_id,
            time_slot_id: editingSession.time_slot_id,
            topic: editingSession.topic,
            description: editingSession.description,
            custom_start_time: editingSession.custom_start_time || editingSession.start_time || '',
            custom_end_time: editingSession.custom_end_time || editingSession.end_time || '',
            is_parallel_meal: editingSession.is_parallel_meal || false,
            parallel_meal_type: editingSession.parallel_meal_type || '',
            // Transform speaker arrays to the format expected by the form
            speaker_id: editingSession.speakers?.[0] || '',
            chairperson_id: editingSession.chairpersons?.[0] || '',
            moderator_id: editingSession.moderators?.[0] || ''
          } : {}}
          sessionType={editingSession ? editingSession.session_type : 'lecture'}
          onSubmit={handleSubmitSession}
          onCancel={closeModal}
          isSubmitting={isSubmitting}
          days={days}
          halls={halls}
          timeSlots={timeSlots}
          speakers={speakers}
          selectedDay={selectedDay}
        />
      </Modal>

      {/* Add Day Modal */}
      <Modal isOpen={showAddDayModal} onClose={() => setShowAddDayModal(false)} title="Add New Day">
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day Name
              </label>
              <input
                type="text"
                value={newDayName}
                onChange={(e) => setNewDayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Day 1, Opening Day"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSubmitDay}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Day
              </button>
              <button
                onClick={() => setShowAddDayModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Hall Modal */}
      <Modal isOpen={showAddHallModal} onClose={() => setShowAddHallModal(false)} title="Add New Hall">
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hall Name
              </label>
              <input
                type="text"
                value={newHallName}
                onChange={(e) => setNewHallName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Main Hall, Room A"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSubmitHall}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Hall
              </button>
              <button
                onClick={() => setShowAddHallModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
} 