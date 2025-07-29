'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { DashboardStats } from '@/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_sessions: 0,
    total_speakers: 0,
    total_days: 0,
    total_stages: 0,
    sessions_by_type: {
      lecture: 0,
      panel: 0,
      symposium: 0,
      workshop: 0,
      oration: 0,
      guest_lecture: 0,
      discussion: 0,
      break: 0,
      other: 0
    },
    upcoming_sessions: 0
  })

  // People management state
  const [showAddPersonModal, setShowAddPersonModal] = useState(false)
  const [personType, setPersonType] = useState<'speaker' | 'moderator' | 'chairperson'>('speaker')
  const [newPerson, setNewPerson] = useState({
    name: '',
    designation: '',
    email: ''
  })

  // Bulk upload state
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [bulkUploadType, setBulkUploadType] = useState<'speaker' | 'moderator' | 'chairperson'>('speaker')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteExisting, setDeleteExisting] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  const loadStats = async () => {
    try {
      console.log('🔄 Loading dashboard stats...')
      
      // Load total sessions
      const { count: sessionsCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })

      // Load total speakers
      const { count: speakersCount } = await supabase
        .from('speakers')
        .select('*', { count: 'exact', head: true })

      // Load total days
      const { count: daysCount } = await supabase
        .from('conference_days')
        .select('*', { count: 'exact', head: true })

      // Load total stages
      const { count: stagesCount } = await supabase
        .from('stages')
        .select('*', { count: 'exact', head: true })

      // Load sessions by type
      const { data: sessionsByType } = await supabase
        .from('sessions')
        .select('session_type')

      const sessionsByTypeCount: Record<string, number> = {
        lecture: 0,
        panel: 0,
        symposium: 0,
        workshop: 0,
        oration: 0,
        guest_lecture: 0,
        discussion: 0,
        break: 0,
        other: 0
      }

      sessionsByType?.forEach(session => {
        sessionsByTypeCount[session.session_type] = (sessionsByTypeCount[session.session_type] || 0) + 1
      })

      // Load upcoming sessions (sessions in the future)
      const today = new Date().toISOString().split('T')[0]
      const { count: upcomingCount } = await supabase
        .from('sessions_with_times')
        .select('*', { count: 'exact', head: true })
        .gte('day_date', today)

      setStats({
        total_sessions: sessionsCount || 0,
        total_speakers: speakersCount || 0,
        total_days: daysCount || 0,
        total_stages: stagesCount || 0,
        sessions_by_type: sessionsByTypeCount,
        upcoming_sessions: upcomingCount || 0
      })

      console.log('✅ Dashboard stats loaded successfully')
      
    } catch (error) {
      console.error('❌ Error loading dashboard stats:', error)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleAddPerson = async () => {
    try {
      const { error } = await supabase
        .from('speakers')
        .insert({
          name: newPerson.name,
          title: newPerson.designation,
          email: newPerson.email,
          role_type: personType
        })

      if (error) {
        console.error('❌ Error adding person:', error)
        alert('Error adding person. Please try again.')
        return
      }

      setShowAddPersonModal(false)
      setNewPerson({ name: '', designation: '', email: '' })
      await loadStats()
      console.log('✅ Person added successfully')
      
    } catch (error) {
      console.error('❌ Error adding person:', error)
      alert('Error adding person. Please try again.')
    }
  }

  const openAddPersonModal = (type: 'speaker' | 'moderator' | 'chairperson') => {
    setPersonType(type)
    setShowAddPersonModal(true)
  }

  const openBulkUploadModal = (type: 'speaker' | 'moderator' | 'chairperson') => {
    setBulkUploadType(type)
    setShowBulkUploadModal(true)
    setCsvFile(null)
    setUploadProgress(0)
    setIsUploading(false)
    setDeleteExisting(false)
    setUploadError('')
    setUploadSuccess('')
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      setUploadError('')
    } else if (file) {
      setUploadError('Please select a valid CSV file')
      setCsvFile(null)
    }
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data = lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })
    return data
  }

  const handleBulkUpload = async () => {
    if (!csvFile) {
      setUploadError('Please select a CSV file')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadError('')
    setUploadSuccess('')

    try {
      const text = await csvFile.text()
      const data = parseCSV(text)
      
      if (data.length === 0) {
        setUploadError('No valid data found in CSV file')
        setIsUploading(false)
        return
      }

      // Validate CSV structure
      const requiredFields = ['name', 'email', 'title', 'organization']
      const firstRow = data[0]
      const missingFields = requiredFields.filter(field => !firstRow[field])
      
      if (missingFields.length > 0) {
        setUploadError(`Missing required fields: ${missingFields.join(', ')}`)
        setIsUploading(false)
        return
      }

      // Delete existing records if requested
      if (deleteExisting) {
        setUploadProgress(10)
        const { error: deleteError } = await supabase
          .from('speakers')
          .delete()
          .eq('role_type', bulkUploadType)
        
        if (deleteError) {
          setUploadError(`Error deleting existing ${bulkUploadType}s: ${deleteError.message}`)
          setIsUploading(false)
          return
        }
      }

      setUploadProgress(30)

      // Prepare data for insertion
      const speakersData = data.map((row, index) => ({
        name: row.name,
        email: row.email,
        title: row.title,
        organization: row.organization,
        bio: row.bio || '',
        role_type: bulkUploadType
      }))

      setUploadProgress(50)

      // Insert new records
      const { error: insertError } = await supabase
        .from('speakers')
        .insert(speakersData)

      if (insertError) {
        setUploadError(`Error uploading ${bulkUploadType}s: ${insertError.message}`)
        setIsUploading(false)
        return
      }

      setUploadProgress(100)
      setUploadSuccess(`Successfully uploaded ${data.length} ${bulkUploadType}s`)
      
      // Reload stats
      await loadStats()
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowBulkUploadModal(false)
        setUploadSuccess('')
      }, 2000)

    } catch (error) {
      console.error('Error processing CSV:', error)
      setUploadError('Error processing CSV file. Please check the format.')
    }

    setIsUploading(false)
  }

  const downloadTemplate = async (type: 'speaker' | 'moderator' | 'chairperson') => {
    const template = `name,email,title,organization,bio
"Dr. John Doe","john.doe@university.edu","Professor","University of Medical Sciences","Expert in medical research with 15+ years of experience"
"Dr. Jane Smith","jane.smith@hospital.com","Chief Medical Officer","City General Hospital","Specialist in emergency medicine and hospital administration"`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}s_template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to your conference program management dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sessions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_sessions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Speakers</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_speakers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Conference Days</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_days}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Stages/Halls</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_stages}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* People Management */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            People Management
          </h3>
          
          {/* Individual Add Buttons */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            <button
              onClick={() => openAddPersonModal('speaker')}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Add Speaker</p>
                <p className="text-sm text-gray-500">Register a new speaker</p>
              </div>
            </button>

            <button
              onClick={() => openAddPersonModal('moderator')}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Add Moderator</p>
                <p className="text-sm text-gray-500">Register a new moderator</p>
              </div>
            </button>

            <button
              onClick={() => openAddPersonModal('chairperson')}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Add Chairperson</p>
                <p className="text-sm text-gray-500">Register a new chairperson</p>
              </div>
            </button>
          </div>

          {/* Bulk Upload Section */}
          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Bulk Upload</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                onClick={() => openBulkUploadModal('speaker')}
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Bulk Upload Speakers</p>
                  <p className="text-sm text-gray-500">Upload CSV with multiple speakers</p>
                </div>
              </button>

              <button
                onClick={() => openBulkUploadModal('moderator')}
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Bulk Upload Moderators</p>
                  <p className="text-sm text-gray-500">Upload CSV with multiple moderators</p>
                </div>
              </button>

              <button
                onClick={() => openBulkUploadModal('chairperson')}
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Bulk Upload Chairpersons</p>
                  <p className="text-sm text-gray-500">Upload CSV with multiple chairpersons</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Link
              href="/edit-sessions"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Edit Sessions</p>
                <p className="text-sm text-gray-500">Grid view editing</p>
              </div>
            </Link>

            <Link
              href="/sessions"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Sessions List</p>
                <p className="text-sm text-gray-500">View all sessions</p>
              </div>
            </Link>

            <Link
              href="/speakers/new"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Add Speaker</p>
                <p className="text-sm text-gray-500">Register a new speaker</p>
              </div>
            </Link>

            <Link
              href="/public-program"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">View Program</p>
                <p className="text-sm text-gray-500">See public program</p>
              </div>
            </Link>

            <Link
              href="/export"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Export Data</p>
                <p className="text-sm text-gray-500">Download CSV</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Sessions
          </h3>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              <li className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Opening Keynote: Future of Medical Technology
                    </p>
                    <p className="text-sm text-gray-500">
                      Dr. Sarah Johnson • Day 1 • 9:00am-10:30am
                    </p>
                  </div>
                </div>
              </li>
              <li className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Panel: AI in Healthcare
                    </p>
                    <p className="text-sm text-gray-500">
                      Dr. Michael Chen (Moderator) • Day 1 • 2:00pm-3:30pm
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div className="mt-6">
            <Link
              href="/sessions"
              className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              View all sessions
            </Link>
          </div>
        </div>
      </div>

      {/* Add Person Modal */}
      {showAddPersonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Add {personType.charAt(0).toUpperCase() + personType.slice(1)}
              </h3>
              <button
                onClick={() => {
                  setShowAddPersonModal(false)
                  setNewPerson({ name: '', designation: '', email: '' })
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="personName" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="personName"
                    value={newPerson.name}
                    onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter full name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowAddPersonModal(false)
                        setNewPerson({ name: '', designation: '', email: '' })
                      }
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="personDesignation" className="block text-sm font-medium text-gray-700 mb-2">
                    Designation/Title
                  </label>
                  <input
                    type="text"
                    id="personDesignation"
                    value={newPerson.designation}
                    onChange={(e) => setNewPerson({ ...newPerson, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Professor, CEO, Director"
                  />
                </div>
                <div>
                  <label htmlFor="personEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="personEmail"
                    value={newPerson.email}
                    onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter email address"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddPerson()
                      } else if (e.key === 'Escape') {
                        setShowAddPersonModal(false)
                        setNewPerson({ name: '', designation: '', email: '' })
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAddPersonModal(false)
                      setNewPerson({ name: '', designation: '', email: '' })
                    }}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPerson}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Add {personType.charAt(0).toUpperCase() + personType.slice(1)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Bulk Upload {bulkUploadType.charAt(0).toUpperCase() + bulkUploadType.slice(1)}s
              </h3>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false)
                  setCsvFile(null)
                  setUploadError('')
                  setUploadSuccess('')
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Required columns: name, email, title, organization</li>
                    <li>• Optional column: bio</li>
                    <li>• Use commas to separate values</li>
                    <li>• Enclose text in quotes if it contains commas</li>
                  </ul>
                </div>

                {/* Template Download */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Download Template</h4>
                    <p className="text-sm text-gray-500">Get a sample CSV file to use as a template</p>
                  </div>
                  <button
                    onClick={() => downloadTemplate(bulkUploadType)}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Download Template
                  </button>
                </div>

                {/* File Upload */}
                <div>
                  <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File
                  </label>
                  <input
                    type="file"
                    id="csvFile"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {csvFile && (
                    <p className="mt-2 text-sm text-green-600">
                      ✓ Selected: {csvFile.name}
                    </p>
                  )}
                </div>

                {/* Delete Existing Option */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="deleteExisting"
                    checked={deleteExisting}
                    onChange={(e) => setDeleteExisting(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="deleteExisting" className="ml-2 block text-sm text-gray-900">
                    Delete existing {bulkUploadType}s before uploading
                  </label>
                </div>

                {/* Progress Bar */}
                {isUploading && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-800">{uploadError}</p>
                  </div>
                )}

                {/* Success Message */}
                {uploadSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm text-green-800">{uploadSuccess}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowBulkUploadModal(false)
                      setCsvFile(null)
                      setUploadError('')
                      setUploadSuccess('')
                    }}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkUpload}
                    disabled={!csvFile || isUploading}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : `Upload ${bulkUploadType.charAt(0).toUpperCase() + bulkUploadType.slice(1)}s`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 