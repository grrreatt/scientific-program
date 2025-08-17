'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Workshop } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { PersonAutocomplete } from '@/components/ui/person-autocomplete'

export default function WorkshopFormPage() {
  const params = useParams()
  const router = useRouter()
  const workshopId = params.id as string
  const isNew = workshopId === 'new'

  const [formData, setFormData] = useState<Partial<Workshop>>({
    topic: '',
    description: '',
    venue: '',
    day_date: ''
  })
  const [convenorId, setConvenorId] = useState<string>('')
  const [coConvenorId, setCoConvenorId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load existing workshop data
  useEffect(() => {
    if (!isNew) {
      const loadWorkshop = async () => {
        setLoading(true)
        const { data } = await supabase
          .from('workshops')
          .select('*')
          .eq('id', workshopId)
          .single()
        
        if (data) {
          setFormData(data)
          setConvenorId(data.convenor_id || '')
          setCoConvenorId(data.co_convenor_id || '')
        }
        setLoading(false)
      }
      loadWorkshop()
    }
  }, [workshopId, isNew])

  // Save workshop
  const saveWorkshop = async () => {
    if (!formData.topic) {
      alert('Workshop topic is required')
      return
    }

    setSaving(true)
    try {
      const workshopData = {
        topic: (formData.topic || '').trim(),
        description: (formData.description || '') || null,
        venue: (formData.venue || '') || null,
        day_date: formData.day_date ? formData.day_date : null,
        convenor_id: convenorId || null,
        co_convenor_id: coConvenorId || null
      }

      if (isNew) {
        const res = await fetch('/api/workshops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workshopData)
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `Failed (${res.status})`)
        }
        const body = await res.json()
        router.push(`/edit-workshops/${body.id}`)
      } else {
        const res = await fetch('/api/workshops', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: workshopId, ...workshopData })
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error || `Failed (${res.status})`)
        }
        alert('Workshop saved successfully!')
      }
    } catch (error: any) {
      console.error('Error saving workshop:', error)
      alert(`Error saving workshop${error?.message ? `: ${error.message}` : ''}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6">Loading workshop...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">
          {isNew ? 'Add New Workshop' : 'Edit Workshop'}
        </h1>
        <Button
          variant="outline"
          onClick={() => router.push('/edit-workshops')}
        >
          Back to Workshops
        </Button>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Workshop Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workshop Topic *
            </label>
            <Input
              value={formData.topic || ''}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g., AI in Healthcare, Surgical Techniques"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the workshop"
              rows={3}
            />
          </div>

          {/* Day and Venue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day
              </label>
              <Input
                type="date"
                value={formData.day_date || ''}
                onChange={(e) => setFormData({ ...formData, day_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue
              </label>
              <Input
                value={formData.venue || ''}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                placeholder="e.g., Main Hall, Room 101"
              />
            </div>
          </div>

          {/* Convenor and Co-convenor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Convenor
              </label>
              <PersonAutocomplete
                value={convenorId}
                onChange={setConvenorId}
                placeholder="Select convenor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Co-convenor
              </label>
              <PersonAutocomplete
                value={coConvenorId}
                onChange={setCoConvenorId}
                placeholder="Select co-convenor"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/edit-workshops')}
            >
              Cancel
            </Button>
            <Button
              onClick={saveWorkshop}
              disabled={saving}
            >
              {saving ? 'Saving...' : (isNew ? 'Create Workshop' : 'Save Changes')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
