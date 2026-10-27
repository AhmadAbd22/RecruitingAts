import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Permissions } from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import { CandidateForm, CandidateList, DuplicateWarning } from '../../components/candidates'
import type { CandidateFormValues } from '../../components/candidates'
import { Button, Modal, PageHeader, SearchField } from '../../components/shared'

/** Owner: Ibtesam */
export function TalentPoolPage() {
  const navigate = useNavigate()
  const canManage = usePermission(Permissions.CandidatesManage)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CandidateFormValues>({
    fullName: '',
    email: '',
    phone: '',
    skills: '',
    source: 'Referral',
  })

  return (
    <div className="page">
      <PageHeader
        title="Talent pool"
        subtitle="GET /api/candidates?q="
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setOpen(true)}>
              Add candidate
            </Button>
          ) : null
        }
      />
      <SearchField value={q} onChange={setQ} placeholder="Name, email, phone, skills…" />
      {/* TODO: debounce search + fetch */}
      <CandidateList items={[]} onSelect={(id) => navigate(`/pool/${id}`)} />
      <Modal open={open} title="Add candidate" onClose={() => setOpen(false)}>
        <DuplicateWarning matches={[]} />
        <CandidateForm values={form} onChange={setForm} onSubmit={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
