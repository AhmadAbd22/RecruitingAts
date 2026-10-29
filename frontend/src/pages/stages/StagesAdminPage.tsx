import { useState } from 'react'
import { StageCatalogTable, StageForm } from '../../components/stages'
import type { StageFormValues } from '../../components/stages'
import { ApiGapBanner, Button, Modal, PageHeader } from '../../components/shared'

/** Owner: Amina */
export function StagesAdminPage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<StageFormValues>({ name: '', sortOrder: 6 })

  return (
    <div className="page">
      <PageHeader
        title="Pipeline stages"
        subtitle="Reserved stages locked; working stages admin-managed."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            Add working stage
          </Button>
        }
      />
      <ApiGapBanner
        contract="Pipeline stages CRUD"
        note="No /api/pipeline-stages controller yet."
      />
      <StageCatalogTable stages={[]} />
      <Modal open={open} title="Add working stage" onClose={() => setOpen(false)}>
        <StageForm
          values={form}
          onChange={setForm}
          onSubmit={() => setOpen(false)}
        />
      </Modal>
    </div>
  )
}
