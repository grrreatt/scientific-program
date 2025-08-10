'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { RealtimeStatus } from '@/components/ui/realtime-status'

type Speaker = { id: string; name: string; email: string | null }

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editing, setEditing] = useState<{ id: string; field: 'name' | 'email'; value: string } | null>(null)
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('speakers')
        .select('id,name,email')
        .order('name', { ascending: true })
      if (error) throw error
      setSpeakers(data || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load speakers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return speakers
    return speakers.filter(s => (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q))
  }, [speakers, searchQuery])

  const beginEdit = (id: string, field: 'name' | 'email', current: string | null) => {
    setEditing({ id, field, value: current || '' })
  }

  const saveEdit = async () => {
    if (!editing) return
    const { id, field, value } = editing
    try {
      if (field === 'email' && value) {
        // prevent duplicate emails
        const { data: existing, error: exErr } = await supabase
          .from('speakers')
          .select('id')
          .eq('email', value)
        if (exErr) throw exErr
        if ((existing || []).some(r => r.id !== id)) {
          alert('Duplicate email detected. Each email must be unique.')
          return
        }
      }
      const updates: any = { [field]: value || null }
      const { error } = await supabase.from('speakers').update(updates).eq('id', id)
      if (error) throw error
      setEditing(null)
      await load()
    } catch (e: any) {
      alert(e.message || 'Failed to save')
    }
  }

  const parseCsv = (text: string) => {
    const rows = text.trim().split(/\r?\n/)
    if (rows.length === 0) return []
    const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name')
    const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email')
    if (nameIdx === -1) throw new Error('CSV must include a name column')
    const out: { name: string; email: string | null }[] = []
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue
      const cols = rows[i].split(',').map(c => c.trim().replace(/"/g, ''))
      const name = cols[nameIdx] || ''
      const email = emailIdx !== -1 ? (cols[emailIdx] || '') : ''
      if (!name) continue
      out.push({ name, email: email || null })
    }
    return out
  }

  const importCsv = async () => {
    if (!csvText.trim()) return
    setImporting(true)
    try {
      const parsed = parseCsv(csvText)
      if (parsed.length === 0) throw new Error('No valid rows found')
      // dedupe by email among parsed
      const seen = new Set<string>()
      const deduped = parsed.filter(r => {
        const key = (r.email || '').toLowerCase()
        if (!key) return true
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      // prevent duplicates vs DB
      const emails = deduped.map(r => r.email).filter(Boolean) as string[]
      if (emails.length > 0) {
        const { data: existing, error } = await supabase
          .from('speakers')
          .select('email')
          .in('email', emails)
        if (error) throw error
        const existingSet = new Set((existing || []).map(e => (e.email || '').toLowerCase()))
        const toInsert = deduped.filter(r => !r.email || !existingSet.has((r.email || '').toLowerCase()))
        if (toInsert.length > 0) {
          const { error: insErr } = await supabase.from('speakers').insert(toInsert)
          if (insErr) throw insErr
        }
      } else {
        // insert all (name-only rows)
        const { error: insErr } = await supabase.from('speakers').insert(deduped)
        if (insErr) throw insErr
      }
      setCsvText('')
      await load()
      alert('Import complete')
    } catch (e: any) {
      alert(e.message || 'Failed to import CSV')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">Loading speakers…</div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Speakers</h1>
            <RealtimeStatus />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or email…"
              className="px-3 py-1.5 border rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="bg-white rounded-lg shadow border">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="text-sm text-gray-700">{speakers.length} total</div>
            <div className="flex items-center gap-2">
              <button
                onClick={importCsv}
                disabled={importing || !csvText.trim()}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded disabled:opacity-50"
              >
                {importing ? 'Importing…' : 'Import CSV'}
              </button>
            </div>
          </div>

          <div className="p-3 border-b">
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={4}
              className="w-full border rounded p-2 text-sm"
              placeholder={'Paste CSV with columns: name,email\n"Alice","alice@example.com"'}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">
                      {editing?.id === s.id && editing.field === 'name' ? (
                        <input
                          autoFocus
                          value={editing.value}
                          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                          onBlur={saveEdit}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null) }}
                          className="border rounded px-2 py-1 w-full"
                        />
                      ) : (
                        <button className="text-left w-full" onClick={() => beginEdit(s.id, 'name', s.name)}>
                          {s.name || '—'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {editing?.id === s.id && editing.field === 'email' ? (
                        <input
                          autoFocus
                          value={editing.value}
                          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                          onBlur={saveEdit}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null) }}
                          className="border rounded px-2 py-1 w-full"
                        />
                      ) : (
                        <button className="text-left w-full" onClick={() => beginEdit(s.id, 'email', s.email)}>
                          {s.email || '—'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}


