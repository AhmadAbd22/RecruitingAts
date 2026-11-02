import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { createRequisition, getEmployees, getRequisitions, Permissions } from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import { RequisitionForm, RequisitionList } from '../../components/requisitions'
import type { RequisitionFormValues } from '../../components/requisitions'
import { Button, EmptyState, Modal, PageHeader } from '../../components/shared'
import type { EmployeeListItem, RequisitionListItem } from '../../types/domain'
import { managementError } from '../managementHelpers'
import '../management.css'

/** Owner: Amina — compose list + create modal; wire API. */
export function RequisitionsListPage() {
  const navigate = useNavigate()
  const canManage = usePermission(Permissions.RequisitionsManage)
  const canViewComp = usePermission(Permissions.CompensationView)
  const canEditComp = usePermission(Permissions.CompensationEdit)
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(true)
  const [employeesError, setEmployeesError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [requisitions, setRequisitions] = useState<RequisitionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RequisitionFormValues>({
    title: '',
    department: '',
    employmentType: 'FullTime',
    seniority: 'Mid',
    skills: '',
    jobDescription: '',
    hiringManagerEmployeeId: '',
    openings: 1,
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [createPending, setCreatePending] = useState(false)

  useEffect(() => {
    if (!canManage) return
    let cancelled = false
    setEmployeesLoading(true); setEmployeesError('')
    getEmployees().then((items) => { if (!cancelled) setEmployees(items) })
      .catch((error) => { if (!cancelled) setEmployeesError(managementError(error)) })
      .finally(() => { if (!cancelled) setEmployeesLoading(false) })
    return () => { cancelled = true }
  }, [canManage, retryAttempt])

  useEffect(() => {
    let cancelled = false

    async function loadRequisitions() {
      setLoading(true)
      setError(null)

      try {
        const items = await getRequisitions()
        if (!cancelled) setRequisitions(items)
      } catch (cause) {
        if (cancelled) return
        if (axios.isAxiosError<{ message?: string }>(cause)) {
          setError(cause.response?.data?.message ?? cause.message)
        } else if (cause instanceof Error) {
          setError(cause.message)
        } else {
          setError('An unexpected error occurred while loading requisitions.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadRequisitions()
    return () => {
      cancelled = true
    }
  }, [retryAttempt])

  const visible = requisitions.filter((item) =>
    (!status || item.status === status) &&
    `${item.title} ${item.department}`.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="page management-page">
      <PageHeader
        title="Requisitions"
        subtitle="Create a job, get approval, then publish it to start accepting candidates."
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setOpen(true)}>
              New requisition
            </Button>
          ) : null
        }
      />
      <div className="management-toolbar">
        <label className="field">Find a requisition<input type="search" placeholder="Job title or department" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <label className="field">Status<select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['Draft', 'PendingApproval', 'Approved', 'Published', 'OnHold', 'Filled', 'Closed', 'Cancelled'].map((value) => <option key={value} value={value}>{value === 'PendingApproval' ? 'Pending approval' : value === 'OnHold' ? 'On hold' : value}</option>)}
        </select></label>
        {!loading && !error && <span className="management-count">{visible.length} of {requisitions.length} requisitions</span>}
      </div>
      {loading ? (
        <div className="empty-state" role="status">
          Loading requisitions…
        </div>
      ) : error ? (
        <div className="panel">
          <p className="error" role="alert">{error}</p>
          <Button variant="primary" onClick={() => setRetryAttempt((attempt) => attempt + 1)}>
            Retry
          </Button>
        </div>
      ) : requisitions.length === 0 ? (
        <EmptyState
          title="No requisitions in scope"
          message="There are no requisitions available to your account."
        />
      ) : (
        <RequisitionList
          items={visible}
          showBudget={canViewComp || canEditComp}
          onSelect={(id) => navigate(`/requisitions/${id}`)}
        />
      )}
      <Modal
        open={open}
        title="Create requisition"
        onClose={() => {
          if (!createPending) {
            setOpen(false)
            setCreateError(null)
          }
        }}
        footer={null}
      >
        <p className="management-hint">Start with the job details. You become its owner. Budget is added separately by someone with compensation permission.</p>
        {employeesLoading && <p role="status">Loading hiring managers...</p>}
        {!employeesLoading && !employeesError && employees.length === 0 && <p className="error" role="alert">No active employees are available. Ask an administrator to add a hiring manager.</p>}
        {employeesError && <div><p className="error" role="alert">{employeesError}</p><Button onClick={() => setRetryAttempt((value) => value + 1)}>Retry loading employees</Button></div>}
        <RequisitionForm
          employees={employees}
          saving={createPending}
          values={form}
          onChange={setForm}
          submitLabel="Create draft"
          disabled={createPending || employeesLoading || !!employeesError || employees.length === 0}
          error={createError}
          onSubmit={async () => {
            if (createPending) return

            setCreateError(null)
            setCreatePending(true)

            try {
              await createRequisition({
                title: form.title.trim(),
                department: form.department.trim(),
                employmentType: form.employmentType,
                seniority: form.seniority,
                skills: form.skills.trim(),
                jobDescription: form.jobDescription.trim(),
                hiringManagerEmployeeId: form.hiringManagerEmployeeId,
                openings: form.openings,
              })
              setOpen(false)
              setForm({ title: '', department: '', employmentType: 'FullTime', seniority: 'Mid', skills: '', jobDescription: '', hiringManagerEmployeeId: '', openings: 1 })
              setCreateError(null)
              setRetryAttempt((attempt) => attempt + 1)
            } catch (cause) {
              if (axios.isAxiosError<{ message?: string }>(cause)) {
                setCreateError(
                  cause.response?.data?.message ??
                    'Unable to create the requisition. Please review the form and try again.',
                )
              } else if (cause instanceof Error) {
                setCreateError(cause.message)
              } else {
                setCreateError('Unable to create the requisition. Please try again.')
              }
            } finally {
              setCreatePending(false)
            }
          }}
        />
      </Modal>
    </div>
  )
}
