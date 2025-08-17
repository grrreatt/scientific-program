'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { WorkshopWithDetails } from '@/types'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronRight, MapPin, Calendar, Users } from 'lucide-react'
import realtimeService from '@/lib/supabase/realtime'

export default function ViewWorkshopsPage() {
  const [workshops, setWorkshops] = useState<WorkshopWithDetails[]>([])
  const [expandedWorkshops, setExpandedWorkshops] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const loadWorkshops = async () => {
    console.log('🔄 Loading workshops from Supabase...')
    const { data } = await supabase
      .from('workshops')
      .select(`
        *,
        convenor:speakers!convenor_id(name),
        co_convenor:speakers!co_convenor_id(name),
        sessions:workshop_sessions(
          *,
          participants:workshop_session_participants(
            role,
            speaker:speakers(name)
          )
        )
      `)
      .order('day_date', { ascending: true })
      .order('topic', { ascending: true })
    
    setWorkshops(data || [])
    setLoading(false)
    setLastUpdate(new Date())
    console.log(`✅ Loaded ${data?.length || 0} workshops`)
  }

  useEffect(() => {
    // Load initial data
    loadWorkshops()

    // Setup real-time subscriptions
    realtimeService.subscribeToAll({
      onWorkshopChange: (payload) => {
        console.log('🔄 Workshop change detected, reloading data...')
        loadWorkshops()
      },
      onWorkshopSessionChange: (payload) => {
        console.log('🔄 Workshop session change detected, reloading data...')
        loadWorkshops()
      },
      onWorkshopParticipantChange: (payload) => {
        console.log('🔄 Workshop participant change detected, reloading data...')
        loadWorkshops()
      }
    })

    // Cleanup on unmount
    return () => {
      realtimeService.unsubscribeFromAll()
    }
  }, [])

  const toggleWorkshop = (workshopId: string) => {
    const newExpanded = new Set(expandedWorkshops)
    if (newExpanded.has(workshopId)) {
      newExpanded.delete(workshopId)
    } else {
      newExpanded.add(workshopId)
    }
    setExpandedWorkshops(newExpanded)
  }

  if (loading) return <div className="p-6">Loading workshops...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            <a
              href="/"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Home
            </a>
            <a
              href="/public-program"
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              View Scientific Program
            </a>
            <a
              href="/view-workshops"
              className="text-indigo-600 border-b-2 border-indigo-600 px-3 py-2 text-sm font-medium"
            >
              View Workshops
            </a>
          </nav>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workshops</h1>
          <p className="text-gray-600">
            Explore our hands-on workshop sessions designed to provide practical skills and knowledge.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()} • Real-time sync enabled
          </p>
        </div>

        <div className="space-y-6">
          {workshops.map(workshop => (
            <Card key={workshop.id} className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <button
                        onClick={() => toggleWorkshop(workshop.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {expandedWorkshops.has(workshop.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {workshop.topic}
                      </h2>
                    </div>

                    {workshop.description && (
                      <p className="text-gray-600 mb-4 ml-10">
                        {workshop.description}
                      </p>
                    )}

                    <div className="flex items-center gap-6 text-sm text-gray-500 ml-10">
                      {workshop.day_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(workshop.day_date).toLocaleDateString()}
                        </div>
                      )}
                      {workshop.venue && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {workshop.venue}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {workshop.convenor?.name}
                        {workshop.co_convenor && ` & ${workshop.co_convenor.name}`}
                      </div>
                    </div>
                  </div>
                </div>

                {expandedWorkshops.has(workshop.id) && workshop.sessions && (
                  <div className="mt-6 ml-10 space-y-3">
                    <h3 className="font-medium text-gray-900">Sessions</h3>
                    {workshop.sessions.map(session => (
                      <div key={session.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{session.title}</h4>
                            <p className="text-sm text-gray-600">
                              {session.start_time} - {session.end_time}
                            </p>
                            {session.participants && session.participants.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                  <span className="font-medium">Participants:</span>
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {session.participants.map((participant: any) => (
                                    <span
                                      key={participant.id}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                                    >
                                      {participant.speaker?.name} ({participant.role})
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
            </Card>
          ))}

          {workshops.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No workshops available</div>
              <p className="text-gray-400">Check back later for upcoming workshop sessions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
