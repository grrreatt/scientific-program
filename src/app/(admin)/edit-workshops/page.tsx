'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { WorkshopWithDetails } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, ChevronDown, ChevronRight, Edit, Trash2, Download } from 'lucide-react'
import { RealtimeStatus } from '@/components/ui/realtime-status'
import realtimeService from '@/lib/supabase/realtime'

export default function EditWorkshopsPage() {
  const [workshops, setWorkshops] = useState<WorkshopWithDetails[]>([])
  const [expandedWorkshops, setExpandedWorkshops] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Load workshops with convenors and session counts
  const loadWorkshops = async () => {
    console.log('🔄 Loading workshops from Supabase...')
    const { data } = await supabase
      .from('workshops')
      .select(`
        *,
        convenor:speakers!convenor_id(name),
        co_convenor:speakers!co_convenor_id(name),
        sessions:workshop_sessions(*)
      `)
      .order('day_date', { ascending: true })
      .order('topic', { ascending: true })
    
    setWorkshops(data || [])
    setLoading(false)
    setLastUpdate(new Date())
    console.log(`✅ Loaded ${data?.length || 0} workshops`)
  }

  // Setup real-time subscriptions
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

  // Toggle workshop expansion
  const toggleWorkshop = (workshopId: string) => {
    const newExpanded = new Set(expandedWorkshops)
    if (newExpanded.has(workshopId)) {
      newExpanded.delete(workshopId)
    } else {
      newExpanded.add(workshopId)
    }
    setExpandedWorkshops(newExpanded)
  }

  // Add new workshop
  const addWorkshop = () => {
    window.location.href = '/edit-workshops/new'
  }

  // Edit workshop
  const editWorkshop = (workshopId: string) => {
    window.location.href = `/edit-workshops/${workshopId}`
  }

  // Delete workshop
  const deleteWorkshop = async (workshopId: string) => {
    if (confirm('Are you sure you want to delete this workshop?')) {
      const { error } = await supabase
        .from('workshops')
        .delete()
        .eq('id', workshopId)
      
      if (!error) {
        console.log('✅ Workshop deleted successfully')
        // Real-time will trigger reload
      } else {
        console.error('❌ Error deleting workshop:', error)
        alert('Error deleting workshop')
      }
    }
  }

  // Export workshops
  const exportWorkshops = async (filter: string, value?: string) => {
    setExportLoading(true)
    try {
      let url = '/api/export/workshops'
      if (filter !== 'all') {
        url += `?filter=${filter}`
        if (value) {
          url += `&${filter === 'day' ? 'day' : 'topic_id'}=${value}`
        }
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'workshops_export.xlsx'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
        console.log('✅ Workshop export completed')
      } else {
        console.error('❌ Export failed:', response.status)
        alert('Export failed')
      }
    } catch (error) {
      console.error('❌ Export error:', error)
      alert('Export failed')
    } finally {
      setExportLoading(false)
      setShowExportModal(false)
    }
  }

  // Get unique days for export filter
  const getUniqueDays = () => {
    const days = new Set<string>()
    workshops.forEach(workshop => {
      if (workshop.day_date) {
        days.add(workshop.day_date)
      }
    })
    return Array.from(days).sort()
  }

  if (loading) return <div className="p-6">Loading workshops...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Edit Workshops</h1>
          <p className="text-gray-600 mt-1">Manage workshop topics and their sessions</p>
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()} • Real-time sync enabled
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeStatus />
          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
            disabled={exportLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Workshops
          </Button>
          <Button onClick={addWorkshop} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Workshop
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {workshops.map(workshop => (
          <Card key={workshop.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleWorkshop(workshop.id)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {expandedWorkshops.has(workshop.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <div>
                  <h3 className="font-medium text-lg">{workshop.topic}</h3>
                  <p className="text-sm text-gray-600">
                    {workshop.day_date ? new Date(workshop.day_date).toLocaleDateString() : 'No date set'} • {workshop.venue || 'No venue'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Convenor: {workshop.convenor?.name || '—'} 
                    {workshop.co_convenor && ` • Co-convenor: ${workshop.co_convenor.name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {workshop.sessions?.length || 0} sessions
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editWorkshop(workshop.id)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteWorkshop(workshop.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {expandedWorkshops.has(workshop.id) && (
              <WorkshopSessionsList workshopId={workshop.id} />
            )}
          </Card>
        ))}

        {workshops.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg font-medium mb-2">No workshops created yet</div>
            <p className="text-gray-400">Click "Add Workshop" to create your first workshop topic.</p>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Export Workshops</h3>
            <div className="space-y-3">
              <Button
                onClick={() => exportWorkshops('all')}
                disabled={exportLoading}
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Export All Workshops ({workshops.length})
              </Button>
              
              {getUniqueDays().length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Export by Day:</p>
                  <div className="space-y-2">
                    {getUniqueDays().map(day => (
                      <Button
                        key={day}
                        variant="outline"
                        onClick={() => exportWorkshops('day', day)}
                        disabled={exportLoading}
                        className="w-full justify-start text-sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {new Date(day).toLocaleDateString()} ({workshops.filter(w => w.day_date === day).length} workshops)
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {workshops.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Export Single Workshop:</p>
                  <div className="space-y-2">
                    {workshops.map(workshop => (
                      <Button
                        key={workshop.id}
                        variant="outline"
                        onClick={() => exportWorkshops('topic', workshop.id)}
                        disabled={exportLoading}
                        className="w-full justify-start text-sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {workshop.topic}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setShowExportModal(false)}
                disabled={exportLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Workshop Sessions List Component
function WorkshopSessionsList({ workshopId }: { workshopId: string }) {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSessions = async () => {
      const { data } = await supabase
        .from('workshop_sessions')
        .select(`
          *,
          participants:workshop_session_participants(
            role,
            speaker:speakers(name)
          )
        `)
        .eq('workshop_id', workshopId)
        .order('session_order', { ascending: true })
      
      setSessions(data || [])
      setLoading(false)
    }
    loadSessions()
  }, [workshopId])

  if (loading) return <div className="mt-4 text-sm text-gray-500">Loading sessions...</div>

  return (
    <div className="mt-4 space-y-2">
      {sessions.map(session => (
        <div key={session.id} className="ml-8 p-3 bg-gray-50 rounded border">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{session.title}</h4>
              <p className="text-sm text-gray-600">
                {session.start_time} - {session.end_time}
              </p>
              {session.participants && session.participants.length > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  {session.participants.map((p: any) => (
                    <span key={p.id} className="mr-2">
                      {p.speaker?.name} ({p.role})
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/edit-workshops/session/${session.id}`}
            >
              Edit Session
            </Button>
          </div>
        </div>
      ))}
      
      <div className="ml-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = `/edit-workshops/${workshopId}/add-session`}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Session
        </Button>
      </div>
    </div>
  )
}
