'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Person {
  id: string
  name: string
  email?: string
  title?: string
  organization?: string
}

interface PersonAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  onPersonSelect?: (person: Person | null) => void
}

export function PersonAutocomplete({
  value,
  onChange,
  placeholder = "Type a name (new or existing)",
  className = "",
  required = false,
  disabled = false,
  onPersonSelect
}: PersonAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Person[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load suggestions from database
  const loadSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('speakers')
        .select('id, name, email, title, organization')
        .ilike('name', `%${query}%`)
        .order('name', { ascending: true })
        .limit(10)

      if (error) {
        console.error('Error loading suggestions:', error)
        setSuggestions([])
      } else {
        setSuggestions(data || [])
      }
    } catch (error) {
      console.error('Error loading suggestions:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadSuggestions(value)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [value])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setSelectedIndex(-1)
    setShowSuggestions(true)
    
    if (onPersonSelect) {
      onPersonSelect(null) // Clear selected person when typing
    }
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (person: Person) => {
    onChange(person.name)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    
    if (onPersonSelect) {
      onPersonSelect(person)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${className}`}
      />
      
      {/* Suggestions dropdown */}
      {showSuggestions && (suggestions.length > 0 || loading) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Loading suggestions...
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((person, index) => (
                <div
                  key={person.id}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                    index === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                  }`}
                  onClick={() => handleSuggestionSelect(person)}
                >
                  <div className="font-medium">{person.name}</div>
                  {(person.title || person.organization) && (
                    <div className="text-xs text-gray-500">
                      {person.title && person.organization 
                        ? `${person.title} at ${person.organization}`
                        : person.title || person.organization
                      }
                    </div>
                  )}
                </div>
              ))}
              <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200">
                Press Enter to select, or continue typing to add a new person
              </div>
            </>
          ) : value.trim() && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No matches found. Press Enter to add "{value}" as a new person.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
