'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

export interface ComboOption {
  value: string
  label: string
}

interface ComboboxProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: ComboOption[]
  placeholder?: string
  idBase: string
  className?: string
  disabled?: boolean
  ariaDescribedById?: string
  allowFreeText?: boolean
}

export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder = 'Type to search…',
  idBase,
  className = '',
  disabled = false,
  ariaDescribedById,
  allowFreeText = false,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Keep input text in sync with current selection when closed
  useEffect(() => {
    if (isOpen) return
    const selected = options.find(o => o.value === value)
    setInputValue(selected ? selected.label : '')
  }, [value, options, isOpen])

  const filtered = useMemo(() => {
    const term = inputValue.trim().toLowerCase()
    if (!term) return options
    return options.filter(o => o.label.toLowerCase().includes(term))
  }, [options, inputValue])

  // Close on outside click
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const listboxId = `${idBase}-listbox`
  const inputId = `${idBase}-input`

  const openList = () => {
    if (disabled) return
    setIsOpen(true)
    // initialize active index to selected or first
    const selectedIdx = filtered.findIndex(o => o.value === value)
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : (filtered.length > 0 ? 0 : -1))
  }

  const closeList = () => {
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const selectIndex = (idx: number) => {
    const opt = filtered[idx]
    if (!opt) return
    onChange(opt.value)
    setInputValue(opt.label)
    closeList()
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      openList()
      return
    }
    if (!isOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % Math.max(filtered.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0) selectIndex(activeIndex)
      else if (allowFreeText) {
        // Commit free text value
        onChange(inputValue)
        closeList()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeList()
    }
  }

  const handleBlur = () => {
    if (!allowFreeText) return
    const selected = options.find(o => o.value === value)
    if (!selected || selected.label !== inputValue) {
      onChange(inputValue)
    }
  }

  return (
    <div ref={rootRef} className={`w-full ${className}`}>
      <label htmlFor={inputId} className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          aria-describedby={ariaDescribedById}
          value={inputValue}
          onChange={(e) => { 
            setInputValue(e.target.value); 
            setIsOpen(true);
            if (allowFreeText) onChange(e.target.value)
          }}
          onFocus={() => openList()}
          onClick={() => openList()}
          onKeyDown={onKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          className="w-full h-11 px-3 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={placeholder}
        />

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No results</li>
            )}
            {filtered.map((opt, idx) => {
              const isActive = idx === activeIndex
              const isSelected = opt.value === value
              return (
                <li
                  id={`${listboxId}-opt-${idx}`}
                  key={opt.value}
                  role="option"
                  aria-selected={isActive || isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => { e.preventDefault(); selectIndex(idx) }}
                  className={`px-3 py-2 text-sm cursor-pointer ${isActive ? 'bg-indigo-50' : ''}`}
                >
                  {opt.label}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}


