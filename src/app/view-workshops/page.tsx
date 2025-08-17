'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RealtimeStatus } from '@/components/ui/realtime-status'
import { formatTime12h } from '@/lib/utils'

interface Workshop {
  id: string
  topic: string
  description?: string
  convenor_name?: string
  co_convenor_name?: string
  venue?: string
  day_date: string
  sessions?: WorkshopSession[]
}

interface WorkshopSession {
  id: string
  title: string
  start_time: string
  end_time: string
  session_order: number
  participants?: WorkshopSessionParticipant[]
}

interface WorkshopSessionParticipant {
  id: string
  role: string
  speaker_name?: string
}

export default function ViewWorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedWorkshop, setExpandedWorkshop] = useState<string | null>(null)

  const loadWorkshops = async () => {
    try {
      // Load workshops with related data
      const { data: workshopsData, error: workshopsError } = await supabase
        .from('workshops')
        .select(`
          *,
          convenor:convenor_id(name),
          co_convenor:co_convenor_id(name)
        `)
        .order('topic', { ascending: true })

      if (workshopsError) {
        console.error('Error loading workshops:', workshopsError)
        return
      }

      // Load all workshop sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('workshop_sessions')
        .select(`
          *,
          workshop_session_participants(
            id,
            role,
            speakers(name)
          )
        `)
        .order('session_order')

      if (sessionsError) {
        console.error('Error loading workshop sessions:', sessionsError)
        return
      }

      // Transform and combine data
      const transformedWorkshops = (workshopsData || []).map((workshop: any) => {
        const workshopSessions = (sessionsData || [])
          .filter((session: any) => session.workshop_id === workshop.id)
          .map((session: any) => ({
            ...session,
            participants: (session.workshop_session_participants || []).map((p: any) => ({
              ...p,
              speaker_name: p.speakers?.name
            }))
          }))

        return {
          ...workshop,
          convenor_name: workshop.convenor?.name,
          co_convenor_name: workshop.co_convenor?.name,
          sessions: workshopSessions
        }
      })

      setWorkshops(transformedWorkshops)
    } catch (error) {
      console.error('Error loading workshops:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkshops()
  }, [])

  const handleExpandWorkshop = (workshopId: string) => {
    setExpandedWorkshop(expandedWorkshop === workshopId ? null : workshopId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold text-gray-900">Scientific Conference</span>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <a
                    href="/"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Home
                  </a>
                  <a
                    href="/public-program"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    View Program
                  </a>
                  <a
                    href="/view-workshops"
                    className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    View Workshops
                  </a>
                </div>
              </div>
              <div className="flex items-center">
                <RealtimeStatus className="mr-3" />
              </div>
            </div>
          </div>
        </nav>

        {/* Loading State */}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">Loading workshops...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-gray-900">Scientific Conference</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a
                  href="/"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Home
                </a>
                <a
                  href="/public-program"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  View Program
                </a>
                <a
                  href="/view-workshops"
                  className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  View Workshops
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <RealtimeStatus className="mr-3" />
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-sm border-b print:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold drop-shadow-sm">
              Conference Workshops
            </h1>
            <p className="mt-2 text-lg text-blue-100">
              Hands-on learning sessions and specialized training
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {workshops.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No workshops available</div>
            <p className="text-sm text-gray-400">Check back later for workshop announcements</p>
          </div>
        ) : (
          <div className="space-y-6">
            {workshops.map((workshop) => (
              <div key={workshop.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleExpandWorkshop(workshop.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-xl font-bold text-gray-900">{workshop.topic}</h2>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                          {new Date(workshop.day_date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      
                      {workshop.description && (
                        <p className="text-gray-600 mb-3">{workshop.description}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {workshop.venue && (
                          <div className="flex items-center text-gray-500">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{workshop.venue}</span>
                          </div>
                        )}
                        
                        {workshop.convenor_name && (
                          <div className="flex items-center text-gray-500">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Convenor: {workshop.convenor_name}</span>
                          </div>
                        )}
                        
                        {workshop.co_convenor_name && (
                          <div className="flex items-center text-gray-500">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>Co-Convenor: {workshop.co_convenor_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm text-gray-500">
                        <div>{workshop.sessions?.length || 0} sessions</div>
                      </div>
                      <svg 
                        className={`w-6 h-6 text-gray-400 transform transition-transform ${
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
                </div>

                {/* Expanded Sessions */}
                {expandedWorkshop === workshop.id && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Workshop Sessions</h3>
                      
                      {workshop.sessions && workshop.sessions.length > 0 ? (
                        <div className="space-y-4">
                          {workshop.sessions.map((session, index) => (
                            <div key={session.id} className="bg-white rounded-lg p-5 shadow-sm border">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium">
                                      {index + 1}
                                    </span>
                                    <h4 className="text-lg font-medium text-gray-900">{session.title}</h4>
                                  </div>
                                  
                                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                                    <div className="flex items-center">
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {formatTime12h(session.start_time)} - {formatTime12h(session.end_time)}
                                    </div>
                                  </div>
                                  
                                  {session.participants && session.participants.length > 0 && (
                                    <div>
                                      <h5 className="text-sm font-medium text-gray-700 mb-2">Session Team:</h5>
                                      <div className="flex flex-wrap gap-2">
                                        {session.participants.map((participant) => (
                                          <span 
                                            key={participant.id} 
                                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                          >
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
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p>No sessions scheduled yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Print Button */}
        <div className="mt-8 text-center print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Workshops
          </button>
        </div>
      </div>
    </div>
  )
}