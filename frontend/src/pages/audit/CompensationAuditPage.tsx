import { useEffect, useState } from 'react'
import { api, Permissions } from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import { Button, DataTable, PageHeader } from '../../components/shared'
import { managementError } from '../managementHelpers'
import '../management.css'

type AuditItem = { id: string; timestamp: string; actor: string; action: string; requisitionTitle: string; details: string | null }

/** Owner: Tayyab */
export function CompensationAuditPage() {
  const canView = usePermission(Permissions.CompensationView)
  const [items, setItems] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (!canView) return
    const controller = new AbortController()
    setLoading(true); setError('')
    api.get<AuditItem[]>('/audit/compensation', { signal: controller.signal })
      .then(({ data }) => setItems(data))
      .catch((error) => { if (!controller.signal.aborted) setError(managementError(error)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [canView, reload])

  if (!canView) return <div className="page management-page"><p className="error" role="alert">You do not have permission to view compensation audit records.</p></div>
  return (
    <div className="page management-page audit-page">
      <PageHeader
        title="Compensation audit"
        subtitle="See who viewed or changed job budgets, including views from the requisitions list."
        actions={<Button disabled={loading} onClick={() => setReload((value) => value + 1)}>Refresh records</Button>}
      />
      <div className="management-notice management-info">Latest 100 records for requisitions you can access. Times are shown in your local time. Budget amounts stay off this page.</div>
      {loading ? <p role="status">Loading audit records...</p> : error ? <div className="panel"><p className="error" role="alert">{error}</p><Button onClick={() => setReload((value) => value + 1)}>Retry</Button></div> :
      <DataTable
        rows={items}
        rowKey={(r) => r.id}
        emptyMessage="No budget activity yet. Opening a job budget or a list containing budgets will create a record."
        columns={[
          { key: 'at', header: 'When', render: (r) => {
            const date = new Date(r.timestamp + (r.timestamp.endsWith('Z') ? '' : 'Z'))
            if (Number.isNaN(date.getTime())) return <span className="muted">Not recorded</span>
            return <time className="audit-time" dateTime={date.toISOString()}><strong>{date.toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong><small>{date.toLocaleTimeString(undefined, { timeStyle: 'short' })}</small></time>
          } },
          { key: 'actor', header: 'Person', render: (r) => <span className="audit-person"><span className="audit-avatar" aria-hidden="true">{r.actor.trim().charAt(0).toUpperCase()}</span>{r.actor}</span> },
          { key: 'job', header: 'Requisition', render: (r) => <strong>{r.requisitionTitle}</strong> },
          { key: 'action', header: 'Activity', render: (r) => <span className={`audit-activity${r.action === 'CompensationViewed' ? '' : ' audit-activity--updated'}`}>{r.action === 'CompensationViewed' ? 'Viewed budget' : 'Updated budget'}</span> },
          { key: 'details', header: 'Details', render: (r) => r.details ?? '-' },
        ]}
      />}
    </div>
  )
}
