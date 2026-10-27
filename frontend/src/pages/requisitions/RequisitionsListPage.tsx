import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Permissions } from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import { RequisitionForm, RequisitionList } from '../../components/requisitions'
import type { RequisitionFormValues } from '../../components/requisitions'
import { Button, Modal, PageHeader } from '../../components/shared'

/** Owner: Amina — compose list + create modal; wire API. */
export function RequisitionsListPage() {
  const navigate = useNavigate()
  const canManage = usePermission(Permissions.RequisitionsManage)
  const canViewComp = usePermission(Permissions.CompensationView)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RequisitionFormValues>({
    title: '',
    department: '',
    employmentType: 'FullTime',
    seniority: 'Mid',
    skills: '',
    jobDescription: '',
    openings: 1,
  })

  return (
    <div className="page">
      <PageHeader
        title="Requisitions"
        subtitle="Scoped list. Plug in GET /api/requisitions."
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setOpen(true)}>
              New requisition
            </Button>
          ) : null
        }
      />
      <RequisitionList
        items={[]}
        showBudget={canViewComp}
        onSelect={(id) => navigate(`/requisitions/${id}`)}
      />
      <Modal
        open={open}
        title="Create requisition"
        onClose={() => setOpen(false)}
        footer={null}
      >
        <RequisitionForm
          values={form}
          onChange={setForm}
          submitLabel="Create draft"
          onSubmit={() => {
            // TODO: POST then navigate
            setOpen(false)
          }}
        />
      </Modal>
    </div>
  )
}
