'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RealtimeStatus } from '@/components/ui/realtime-status'
import { formatTime12h } from '@/lib/utils'

interface Workshop {
  id: string
  topic: string
  description?: string
  convenor_id?: string
  co_convenor_id?: string
  venue?: string
  day_date: string
  created_at?: string
  convenor_name?: string
  co_convenor_name?: string
}

interface WorkshopSession {
  id: string
  workshop_id: string
  title: string
  start_time: string
  end_time: string
  session_order: number
  participants?: WorkshopSessionParticipant[]
}

interface WorkshopSessionParticipant {
  id: string
  workshop_session_id: string
  speaker_id: string
  role: string
  speaker_name?: string
}

interface Speaker {
  id: string
  name: string
  email?: string
}

export default function EditWorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedWorkshop, setExpandedWorkshop] = useState<string | null>(null)
  const [workshopSessions, setWorkshopSessions] = useState<Record<string, WorkshopSession[]>>({})
  
  // Add workshop modal
  const [showAddWorkshopModal, setShowAddWorkshopModal] = useState(false)
  const [newWorkshop, setNewWorkshop] = useState({
    topic: '',
    description: '',
    convenor_id: '',
    co_convenor_id: '',
    venue: '',
    day_date: ''
  })
  
  // Add session modal
  const [showAddSessionModal, setShowAddSessionModal] = useState(false)
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('')
  const [newSession, setNewSession] = useState({
    title: '',
    start_time: '09:00',
    end_time: '10:00',
    participants: [] as { speaker_id: string; role: string }[]
  })

  const loadWorkshops = async () => {
    try {
      const { data: workshopsData, error: workshopsError } = await supabase
        .from('workshops')
        .select(`
          *,
          convenor:convenor_id(name),
          co_convenor:co_convenor_id(name)
        `)
        .order('day_date', { ascending: true })

      if (workshopsError) {
        console.error('Error loading workshops:', workshopsError)
        return
      }

      const transformedWorkshops = (workshopsData || []).map((w: any) => ({
        ...w,
        convenor_name: w.convenor?.name,
        co_convenor_name: w.co_convenor?.name
      }))

      setWorkshops(transformedWorkshops)
    } catch (error) {
      console.error('Error loading workshops:', error)
    }
  }

  const loadSpeakers = async () => {
    try {
      const { data, error } = await supabase
        .from('speakers')
        .select('id, name, email')
        .order('name')

      if (error) {
        console.error('Error loading speakers:', error)
        return
      }

      setSpeakers(data || [])
    } catch (error) {
      console.error('Error loading speakers:', error)
    }
  }

  const loadWorkshopSessions = async (workshopId: string) => {
    try {
      const { data, error } = await supabase
        .from('workshop_sessions')
        .select(`
          *,
          workshop_session_participants(
            id,
            speaker_id,
            role,
            speakers(name)
          )
        `)
        .eq('workshop_id', workshopId)
        .order('session_order')

      if (error) {
        console.error('Error loading workshop sessions:', error)
        return
      }

      const transformedSessions = (data || []).map((session: any) => ({
        ...session,
        participants: (session.workshop_session_participants || []).map((p: any) => ({
          ...p,
          speaker_name: p.speakers?.name
        }))
      }))

      setWorkshopSessions(prev => ({
        ...prev,
        [workshopId]: transformedSessions
      }))
    } catch (error) {
      console.error('Error loading workshop sessions:', error)
    }
  }

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadWorkshops(), loadSpeakers()])
      setLoading(false)
    }
    init()
  }, [])

  const handleAddWorkshop = async () => {
    if (!newWorkshop.topic.trim() || !newWorkshop.day_date) {
      alert('Please enter workshop topic and select a day')
      return
    }

    try {
      const { error } = await supabase
        .from('workshops')
        .insert([{
          topic: newWorkshop.topic.trim(),
          description: newWorkshop.description.trim() || null,
          convenor_id: newWorkshop.convenor_id || null,
          co_convenor_id: newWorkshop.co_convenor_id || null,
          venue: newWorkshop.venue.trim() || null,
          day_date: newWorkshop.day_date
        }])

      if (error) {
        console.error('Error adding workshop:', error)
        alert('Error adding workshop. Please try again.')
        return
      }

      setShowAddWorkshopModal(false)
      setNewWorkshop({
        topic: '',
        description: '',
        convenor_id: '',
        co_convenor_id: '',
        venue: '',
        day_date: ''
      })
      await loadWorkshops()
    } catch (error) {
      console.error('Error adding workshop:', error)
      alert('Error adding workshop. Please try again.')
    }
  }

  const handleExpandWorkshop = async (workshopId: string) => {
    if (expandedWorkshop === workshopId) {
      setExpandedWorkshop(null)
    } else {
      setExpandedWorkshop(workshopId)
      if (!workshopSessions[workshopId]) {
        await loadWorkshopSessions(workshopId)
      }
    }
  }

  const handleAddSession = async () => {
    if (!newSession.title.trim() || !selectedWorkshopId) {
      alert('Please enter session title')
      return
    }

    try {
      // Add session
      const { data: sessionData, error: sessionError } = await supabase
        .from('workshop_sessions')
        .insert([{
          workshop_id: selectedWorkshopId,
          title: newSession.title.trim(),
          start_time: newSession.start_time,
          end_time: newSession.end_time,
          session_order: (workshopSessions[selectedWorkshopId]?.length || 0) + 1
        }])
        .select()
        .single()

      if (sessionError) {
        console.error('Error adding session:', sessionError)
        alert('Error adding session. Please try again.')
        return
      }

      // Add participants if any
      if (newSession.participants.length > 0) {
        const participantsData = newSession.participants
          .filter(p => p.speaker_id && p.role)
          .map(p => ({
            workshop_session_id: sessionData.id,
            speaker_id: p.speaker_id,
            role: p.role
          }))

        if (participantsData.length > 0) {
          const { error: participantsError } = await supabase
            .from('workshop_session_participants')
            .insert(participantsData)

          if (participantsError) {
            console.error('Error adding participants:', participantsError)
          }
        }
      }

      setShowAddSessionModal(false)
      setNewSession({
        title: '',
        start_time: '09:00',
        end_time: '10:00',
        participants: []
      })
      setSelectedWorkshopId('')
      
      // Reload sessions for this workshop
      await loadWorkshopSessions(selectedWorkshopId)
    } catch (error) {
      console.error('Error adding session:', error)
      alert('Error adding session. Please try again.')
    }
  }

  const addParticipant = () => {
    setNewSession(prev => ({
      ...prev,
      participants: [...prev.participants, { speaker_id: '', role: 'speaker' }]
    }))
  }

  const updateParticipant = (index: number, field: string, value: string) => {
    setNewSession(prev => ({
      ...prev,
      participants: prev.participants.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    }))
  }

  const removeParticipant = (index: number) => {
    setNewSession(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading workshops...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Edit Workshops</h1>
          <p className="mt-1 text-sm text-gray-500">Manage workshop topics and sessions</p>
        </div>
        <div className="flex items-center space-x-4">
          <RealtimeStatus />
          <button
            onClick={() => setShowAddWorkshopModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            + Add Workshop
          </button>
        </div>
      </div>

      {/* Workshops List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Workshop Topics</h2>
        </div>
        
        {workshops.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No workshops found</div>
            <button
              onClick={() => setShowAddWorkshopModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add First Workshop
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {workshops.map((workshop) => (
              <div key={workshop.id} className="p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => handleExpandWorkshop(workshop.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{workshop.topic}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {new Date(workshop.day_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500 space-y-1">
                      {workshop.venue && <div>📍 {workshop.venue}</div>}
                      {workshop.convenor_name && (
                        <div>👨‍🏫 Convenor: {workshop.convenor_name}</div>
                      )}
                      {workshop.co_convenor_name && (
                        <div>👥 Co-Convenor: {workshop.co_convenor_name}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">
                      {workshopSessions[workshop.id]?.length || 0} sessions
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transform transition-transform ${
                        expandedWorkshop === workshop.id ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Sessions */}
                {expandedWorkshop === workshop.id && (
                  <div className="mt-4 pl-4 border-l-2 border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Sessions</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedWorkshopId(workshop.id)
                          setShowAddSessionModal(true)
                        }}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        + Add Session
                      </button>
                    </div>
                    
                    {workshopSessions[workshop.id]?.length === 0 ? (
                      <div className="text-sm text-gray-500 py-4">No sessions added yet</div>
                    ) : (
                      <div className="space-y-3">
                        {workshopSessions[workshop.id]?.map((session) => (
                          <div key={session.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{session.title}</h5>
                                <div className="mt-1 text-sm text-gray-500">
                                  {formatTime12h(session.start_time)} - {formatTime12h(session.end_time)}
                                </div>
                                {session.participants && session.participants.length > 0 && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    <div className="flex flex-wrap gap-2">
                                      {session.participants.map((participant) => (
                                        <span key={participant.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200">
                                          {participant.role}: {participant.speaker_name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Workshop Modal */}
      {showAddWorkshopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Add New Workshop</h3>
              <button
                onClick={() => setShowAddWorkshopModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workshop Topic *
                  </label>
                  <input
                    type="text"
                    value={newWorkshop.topic}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, topic: e.target.value })}
                    placeholder="e.g., AI in Healthcare"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day *
                  </label>
                  <input
                    type="date"
                    value={newWorkshop.day_date}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, day_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Venue
                  </label>
                  <input
                    type="text"
                    value={newWorkshop.venue}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, venue: e.target.value })}
                    placeholder="e.g., Conference Hall A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Convenor
                  </label>
                  <select
                    value={newWorkshop.convenor_id}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, convenor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Convenor</option>
                    {speakers.map(speaker => (
                      <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Co-Convenor
                  </label>
                  <select
                    value={newWorkshop.co_convenor_id}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, co_convenor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Co-Convenor</option>
                    {speakers.map(speaker => (
                      <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newWorkshop.description}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, description: e.target.value })}
                    rows={3}
                    placeholder="Workshop description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowAddWorkshopModal(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWorkshop}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add Workshop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Add Session</h3>
              <button
                onClick={() => setShowAddSessionModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Title *
                  </label>
                  <input
                    type="text"
                    value={newSession.title}
                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                    placeholder="e.g., Introduction to AI"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newSession.start_time}
                    onChange={(e) => setNewSession({ ...newSession, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newSession.end_time}
                    onChange={(e) => setNewSession({ ...newSession, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              {/* Participants */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Participants
                  </label>
                  <button
                    onClick={addParticipant}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                  >
                    + Add Participant
                  </button>
                </div>
                
                <div className="space-y-2">
                  {newSession.participants.map((participant, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <select
                        value={participant.speaker_id}
                        onChange={(e) => updateParticipant(index, 'speaker_id', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Select Person</option>
                        {speakers.map(speaker => (
                          <option key={speaker.id} value={speaker.id}>{speaker.name}</option>
                        ))}
                      </select>
                      <select
                        value={participant.role}
                        onChange={(e) => updateParticipant(index, 'role', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="speaker">Speaker</option>
                        <option value="lead">Lead</option>
                        <option value="assistant">Assistant</option>
                        <option value="moderator">Moderator</option>
                      </select>
                      <button
                        onClick={() => removeParticipant(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSession}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}