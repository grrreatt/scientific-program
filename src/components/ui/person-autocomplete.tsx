'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Search, ChevronDown, X } from 'lucide-react'

interface Speaker {
  id: string
  name: string
  email?: string
  title?: string
  organization?: string
}

interface PersonAutocompleteProps {
  value: string
  onChange: (speakerId: string) => void
  placeholder?: string
  className?: string
}

export function PersonAutocomplete({ value, onChange, placeholder = "Select person", className = "" }: PersonAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [filteredSpeakers, setFilteredSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load all speakers from people master
  const loadSpeakers = async () => {
    setLoading(true)
    try {
      console.log('🔄 Loading speakers for autocomplete...')
      
      // Load speakers from speakers table
      const { data: speakersData, error: speakersError } = await supabase
        .from('speakers')
        .select('id, name, email, title, organization')
        .order('name', { ascending: true })

      if (speakersError) {
        console.error('❌ Error loading speakers:', speakersError)
        return
      }

      // Load speakers from session_participants (scientific program)
      const { data: sessionParticipantsData, error: sessionError } = await supabase
        .from('session_participants')
        .select(`
          speaker_id,
          speakers!inner(id, name, email, title, organization)
        `)
        .not('speaker_id', 'is', null)

      // Load speakers from workshop_session_participants (workshops)
      const { data: workshopParticipantsData, error: workshopError } = await supabase
        .from('workshop_session_participants')
        .select(`
          speaker_id,
          speakers!inner(id, name, email, title, organization)
        `)
        .not('speaker_id', 'is', null)

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

      // Add speakers from workshop participants
      workshopParticipantsData?.forEach(participant => {
        if (participant.speakers && !allSpeakers.has(participant.speaker_id)) {
          allSpeakers.set(participant.speaker_id, participant.speakers as unknown as Speaker)
        }
      })

      // Convert to array and deduplicate
      const seen = new Set<string>()
      const deduped = Array.from(allSpeakers.values()).filter((s: Speaker) => {
        const key = (s.email ? s.email.toLowerCase() : `name:${(s.name || '').toLowerCase()}`)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

      setSpeakers(deduped)
      setFilteredSpeakers(deduped)
      console.log(`✅ Loaded ${deduped.length} speakers for autocomplete`)
    } catch (error) {
      console.error('❌ Error loading speakers:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load speakers on mount
  useEffect(() => {
    loadSpeakers()
  }, [])

  // Filter speakers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSpeakers(speakers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = speakers.filter(speaker => 
        speaker.name?.toLowerCase().includes(query) ||
        speaker.email?.toLowerCase().includes(query) ||
        speaker.title?.toLowerCase().includes(query) ||
        speaker.organization?.toLowerCase().includes(query)
      )
      setFilteredSpeakers(filtered)
    }
  }, [searchQuery, speakers])

  // Set selected speaker when value changes
  useEffect(() => {
    if (value) {
      const speaker = speakers.find(s => s.id === value)
      setSelectedSpeaker(speaker || null)
    } else {
      setSelectedSpeaker(null)
    }
  }, [value, speakers])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (speaker: Speaker) => {
    setSelectedSpeaker(speaker)
    onChange(speaker.id)
    setSearchQuery('')
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelectedSpeaker(null)
    onChange('')
    setSearchQuery('')
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setIsOpen(true)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={selectedSpeaker ? selectedSpeaker.name : searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {selectedSpeaker && (
            <button
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : filteredSpeakers.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No people found</div>
          ) : (
            <div className="py-1">
              {filteredSpeakers.map((speaker) => (
                <button
                  key={speaker.id}
                  onClick={() => handleSelect(speaker)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="font-medium text-gray-900">{speaker.name}</div>
                  <div className="text-sm text-gray-500">
                    {speaker.email && `${speaker.email}`}
                    {speaker.title && speaker.email && ' • '}
                    {speaker.title && `${speaker.title}`}
                    {speaker.organization && (speaker.email || speaker.title) && ' • '}
                    {speaker.organization && `${speaker.organization}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
