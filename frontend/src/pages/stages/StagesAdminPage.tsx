import { useEffect, useState } from 'react'
import { api, Permissions } from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import { StageCatalogTable, StageForm } from '../../components/stages'
import type { StageFormValues } from '../../components/stages'
import { Button, Modal, PageHeader } from '../../components/shared'
import type { PipelineStage } from '../../types/domain'
import { managementError } from '../managementHelpers'
import '../management.css'

/** Owner: Amina */
export function StagesAdminPage() {
  const canManage = usePermission(Permissions.StagesManage)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reload, setReload] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PipelineStage | null>(null)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState<StageFormValues>({ name: '', sortOrder: 6 })

  useEffect(() => {
    if (!canManage) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.get<PipelineStage[]>('/admin/stages', { signal: controller.signal })
      .then(({ data }) => setStages(data))
      .catch((error) => { if (!controller.signal.aborted) setError(managementError(error)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [canManage, reload])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])

  async function saveStage() {
    if (pending) return
    setPending(true)
    setFormError('')
    try {
      const request = { name: form.name.trim(), sortOrder: form.sortOrder }
      if (editing) await api.put(`/admin/stages/${editing}`, request)
      else await api.post('/admin/stages', request)
      setOpen(false)
      setMessage(editing ? 'Working stage updated.' : 'Working stage added.')
      setReload((value) => value + 1)
    } catch (error) { setFormError(managementError(error)) }
    finally { setPending(false) }
  }

  if (!canManage) return <div className="page management-page"><p className="error" role="alert">Only stage administrators can manage pipeline stages.</p></div>

  return (
    <div className="page management-page">
      <PageHeader
        title="Pipeline stages"
        subtitle="Choose the steps candidates move through between Applied and the final outcome."
        actions={
          <Button variant="primary" onClick={() => {
            setEditing(null); setForm({ name: '', sortOrder: 5 }); setFormError(''); setOpen(true)
          }}>
            Add working stage
          </Button>
        }
      />
      <div className="management-notice management-info">Applied, Hired, Disqualified and NFA are reserved. You can edit working stages. A stage with applications must be emptied before deletion.</div>
      {message && <p className="management-notice management-success" role="status">{message}</p>}
      {loading ? <p role="status">Loading stages...</p> : error ? <div className="panel"><p className="error" role="alert">{error}</p><Button onClick={() => setReload((value) => value + 1)}>Retry</Button></div> :
        <StageCatalogTable stages={stages} onRename={(id) => {
          const stage = stages.find((item) => item.pipelineStageId === id)
          if (!stage) return
          setEditing(id); setForm({ name: stage.name, sortOrder: stage.sortOrder }); setFormError(''); setOpen(true)
        }} onDelete={(id) => { setFormError(''); setDeleting(stages.find((item) => item.pipelineStageId === id) ?? null) }} />}
      <Modal open={open} title={editing ? 'Edit working stage' : 'Add working stage'} onClose={() => { if (!pending) setOpen(false) }}>
        {formError && <p className="error" role="alert">{formError}</p>}
        <StageForm
          values={form}
          onChange={setForm}
          disabled={pending}
          submitLabel={pending ? 'Saving...' : 'Save stage'}
          onSubmit={() => void saveStage()}
        />
      </Modal>
      <Modal open={!!deleting} title="Delete working stage?" onClose={() => { if (!pending) setDeleting(null) }}>
        <p>Remove <strong>{deleting?.name}</strong> from the pipeline? Stages containing applications cannot be deleted.</p>
        {formError && <p className="error" role="alert">{formError}</p>}
        <div className="row end">
          <Button disabled={pending} onClick={() => setDeleting(null)}>Keep stage</Button>
          <Button variant="danger" disabled={pending} onClick={async () => {
            if (!deleting || pending) return
            setPending(true); setFormError('')
            try {
              await api.delete(`/admin/stages/${deleting.pipelineStageId}`)
              setDeleting(null); setMessage('Working stage deleted.'); setReload((value) => value + 1)
            } catch (error) { setFormError(managementError(error)) }
            finally { setPending(false) }
          }}>{pending ? 'Deleting...' : 'Delete stage'}</Button>
        </div>
      </Modal>
    </div>
  )
}
