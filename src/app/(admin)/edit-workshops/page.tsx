'use client'

import EditSessionsPage from '@/app/(admin)/edit-sessions/page'

export default function EditWorkshopsPage() {
  // Reuse the same editor UI for now. Workshops can be created via the existing
  // dedicated pages in `(admin)/workshops`, but this route mirrors edit-sessions
  // for convenience and future refinement. Subtalks per-workshop use the same
  // sub_session UI which now supports chairperson and experts at the row level.
  return <EditSessionsPage />
}


