'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { RealtimeStatus } from '@/components/ui/realtime-status'
import realtimeService from '@/lib/supabase/realtime'

interface Speaker {
  id: string
  name: string
  email?: string
  title?: string
  organization?: string
  bio?: string
  created_at?: string
}

export default function ParticipantsPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [csvData, setCsvData] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')

  // Load speakers from database
  const loadSpeakers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Loading ALL speakers from Supabase...')
      
      // Load speakers from speakers table
      const { data: speakersData, error: speakersError } = await supabase
        .from('speakers')
        .select('id, name, email, title, organization, bio, role_type, created_at')
        .order('name', { ascending: true })

      if (speakersError) {
        console.error('❌ Error loading speakers:', speakersError)
        setError('Failed to load speakers')
        return
      }

      // Load speakers from session_participants (scientific program)
      const { data: sessionParticipantsData, error: sessionError } = await supabase
        .from('session_participants')
        .select(`
          speaker_id,
          speakers!inner(id, name, email, title, organization, bio, created_at)
        `)
        .not('speaker_id', 'is', null)

      if (sessionError) {
        console.error('❌ Error loading session participants:', sessionError)
      }



      // Combine all speakers
      const allSpeakers = new Map<string, Speaker>()
      
      // Add speakers from speakers table
      speakersData?.forEach(speaker => {
        allSpeakers.set(speaker.id, speaker)
      })

      // Add speakers from session participants
      sessionParticipantsData?.forEach(participant => {
        if (participant.speakers && !allSpeakers.has(participant.speaker_id)) {
          allSpeakers.set(participant.speaker_id, participant.speakers as unknown as Speaker)
        }
      })



      // Convert to array and deduplicate by email or name
      const seen = new Set<string>()
      const deduped = Array.from(allSpeakers.values()).filter((s: Speaker) => {
        const key = (s.email ? s.email.toLowerCase() : `name:${(s.name || '').toLowerCase()}`)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

      setSpeakers(deduped)
      console.log(`✅ Loaded ${deduped.length} unique speakers from all sources`)
    } catch (error) {
      console.error('❌ Exception loading speakers:', error)
      setError('Failed to load speakers')
    } finally {
      setLoading(false)
    }
  }

  // Parse CSV data
  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return []
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      
      data.push(row)
    }
    
    return data
  }

  // Handle CSV file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvData(text)
      const parsed = parseCSV(text)
      setPreviewData(parsed.slice(0, 5)) // Show first 5 rows as preview
    }
    reader.readAsText(file)
  }

  // Handle CSV text input
  const handleCSVTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value
    setCsvData(text)
    const parsed = parseCSV(text)
    setPreviewData(parsed.slice(0, 5)) // Show first 5 rows as preview
  }

  // Upload speakers to database (duplicate-safe and resilient)
  const uploadSpeakers = async () => {
    if (!csvData.trim()) {
      alert('Please provide CSV data')
      return
    }

    setUploading(true)
    
    try {
      const parsedData = parseCSV(csvData)

      if (parsedData.length === 0) {
        alert('No valid data found in CSV')
        return
      }

      // Normalize and validate rows
      const toRow = (row: any) => {
        const email = (row.email || '').trim()
        const normalizedEmail = email ? email.toLowerCase() : null
        const role = (row.role_type || row.role || '').toString().trim().toLowerCase() || null
        const phone = (row.phone || row.mobile || '').toString().trim() || null
        return {
          name: (row.name || '').toString().trim(),
          email: normalizedEmail,
          title: (row.title || '').toString().trim() || null,
          organization: (row.organization || row.organisation || '').toString().trim() || null,
          bio: (row.bio || '').toString().trim() || null,
          role_type: role,
          phone
        }
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
      const normalized = parsedData.map(toRow)

      // Filter invalid rows (must have name; email optional but if present must be valid)
      const invalid: any[] = []
      const valid = normalized.filter(r => {
        const okName = !!r.name
        const okEmail = !r.email || emailRegex.test(r.email)
        const ok = okName && okEmail
        if (!ok) invalid.push(r)
        return ok
      })

      // Deduplicate within CSV by lower(email) when email present; otherwise by name+org
      const seen = new Set<string>()
      const csvDeduped = valid.filter(r => {
        const key = r.email ? `e:${r.email}` : `n:${(r.name || '').toLowerCase()}|${(r.organization || '').toLowerCase()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // Fetch existing emails to avoid unique violation
      const { data: existing, error: existingErr } = await supabase
        .from('speakers')
        .select('email')
      if (existingErr) {
        console.error('❌ Error loading existing people:', existingErr)
        alert('Failed loading existing people. Please retry.')
        return
      }
      const existingEmails = new Set<string>((existing || []).map((r: any) => (r.email || '').toLowerCase()).filter(Boolean))

      const toInsert = csvDeduped.filter(r => !r.email || !existingEmails.has(r.email))
      const skippedDuplicates = csvDeduped.filter(r => r.email && existingEmails.has(r.email))

      // Insert in chunks to be safe with payload size
      const chunkSize = 500
      let inserted = 0
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize)
        if (chunk.length === 0) continue
        const { error: insertErr } = await supabase.from('speakers').insert(chunk)
        if (insertErr) {
          console.error('❌ Insert error:', insertErr)
          // best-effort: continue after skipping this chunk
          continue
        }
        inserted += chunk.length
      }

      const summary = [
        `Inserted: ${inserted}`,
        `Skipped (existing email): ${skippedDuplicates.length}`,
        `Invalid rows: ${invalid.length}`
      ].join('\n')

      alert(`✅ Upload complete\n\n${summary}`)
      setShowUploadModal(false)
      setCsvData('')
      setPreviewData([])
      await loadSpeakers()
      
    } catch (error) {
      console.error('❌ Error uploading speakers:', error)
      alert('Error uploading speakers. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Delete speaker
  const handleDeleteSpeaker = async (speakerId: string) => {
    const speaker = speakers.find(s => s.id === speakerId)
    const confirmed = window.confirm(
      `Are you sure you want to delete "${speaker?.name}"? This action cannot be undone.`
    )
    
    if (confirmed) {
      try {
        const { error } = await supabase
          .from('speakers')
          .delete()
          .eq('id', speakerId)

        if (error) {
          console.error('❌ Error deleting speaker:', error)
          alert('Error deleting speaker. Please try again.')
          return
        }

        await loadSpeakers()
        console.log('✅ Speaker deleted successfully')
        
      } catch (error) {
        console.error('❌ Error deleting speaker:', error)
        alert('Error deleting speaker. Please try again.')
      }
    }
  }

  // Bulk delete all
  const deleteAllSpeakers = async () => {
    const ok = window.confirm('Delete ALL participants? This cannot be undone.')
    if (!ok) return
    // Use a safe filter that matches all rows without type casting issues
    const { error } = await supabase.from('speakers').delete().not('id', 'is', null)
    if (error) {
      alert('Failed to delete all: ' + error.message)
      return
    }
    await loadSpeakers()
  }

  // Export speakers to CSV
  const exportSpeakersToCSV = () => {
    if (speakers.length === 0) {
      alert('No speakers to export')
      return
    }

    const headers = ['name', 'email', 'title', 'organization', 'bio']
    const csvContent = [
      headers.join(','),
      ...speakers.map(speaker => [
        `"${speaker.name}"`,
        `"${speaker.email || ''}"`,
        `"${speaker.title || ''}"`,
        `"${speaker.organization || ''}"`,
        `"${speaker.bio || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'speakers_export.csv'
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Load data on mount
  useEffect(() => {
    // Load initial data
    loadSpeakers()

    // Setup real-time subscriptions
    realtimeService.subscribeToAll({
      onSessionChange: (payload) => {
        console.log('🔄 Session change detected, reloading speakers...')
        loadSpeakers()
      },
      onWorkshopChange: (payload) => {
        console.log('🔄 Workshop change detected, reloading speakers...')
        loadSpeakers()
      },
      onWorkshopSessionChange: (payload) => {
        console.log('🔄 Workshop session change detected, reloading speakers...')
        loadSpeakers()
      },
      onWorkshopParticipantChange: (payload) => {
        console.log('🔄 Workshop participant change detected, reloading speakers...')
    loadSpeakers()
      }
    })

    // Cleanup on unmount
    return () => {
      realtimeService.unsubscribeFromAll()
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading participants...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-lg text-red-600 mb-2">⚠️ Error</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <button
            onClick={loadSpeakers}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                 Participants
              </h1>
              <p className="text-sm text-gray-600">
                Master list for all people. Add names and emails once; assign roles later in sessions.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <RealtimeStatus />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Roles</option>
                <option value="speaker">Speaker</option>
                <option value="moderator">Moderator</option>
                <option value="chairperson">Chairperson</option>
                <option value="expert">Expert</option>
                <option value="panelist">Panelist</option>
              </select>
              <button
                onClick={exportSpeakersToCSV}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                📤 Export CSV
              </button>
              <button
                onClick={deleteAllSpeakers}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                🗑️ Delete All
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = '/api/download-template?type=participants_master'
                  link.download = 'participants_master_template.csv'
                  link.click()
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                📥 Download Master Template
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                📤 Upload CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Speakers</p>
                <p className="text-2xl font-bold text-gray-900">{speakers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">🎤</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Email</p>
                <p className="text-2xl font-bold text-gray-900">
                  {speakers.filter(s => s.email).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-xl">🏢</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Organizations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(speakers.filter(s => s.organization).map(s => s.organization)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Speakers List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">All Participants</h2>
          </div>
          
          {speakers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">No participants found</div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Upload First Participant
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {speakers
                    .filter(s => {
                      const q = search.trim().toLowerCase()
                      const matchQuery = q.length === 0 || (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)
                      const matchRole = !roleFilter || ((s as any).role_type || '').toLowerCase() === roleFilter.toLowerCase()
                      return matchQuery && matchRole
                    })
                    .map((speaker) => (
                    <tr key={speaker.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {speaker.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {speaker.title || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {speaker.organization || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {speaker.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(speaker as any).role_type || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteSpeaker(speaker.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
  <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Participants CSV"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          {/* CSV Format Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">CSV Format Instructions</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Required columns:</strong> name, email</p>
              <p><strong>Optional columns:</strong> title, organization, bio</p>
              <p><strong>Example:</strong></p>
              <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`name,email
"Dr. Sarah Johnson","sarah.johnson@university.edu"
"Dr. Michael Chen","michael.chen@research.org"`}
              </pre>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 px-3"
            />
          </div>

          {/* CSV Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Paste CSV Data
            </label>
            <textarea
              value={csvData}
              onChange={handleCSVTextChange}
              placeholder="Paste your CSV data here..."
              rows={8}
              className="w-full block border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Preview (First 5 rows)
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        {Object.keys(previewData[0]).map((header) => (
                          <th key={header} className="text-left font-medium text-gray-700 px-2 py-1">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value: any, colIndex) => (
                            <td key={colIndex} className="px-2 py-1 text-gray-600">
                              {value || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={uploadSpeakers}
              disabled={uploading || !csvData.trim()}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Participants'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
} 