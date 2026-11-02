import { useEffect, useRef, useState } from 'react'
import { api, createApplication, Permissions } from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import type { CandidateListItem, RequisitionListItem } from '../../types/domain'
import { Button, EmptyState } from '../../components/shared'
import { getApiError } from './candidatePageHelpers'
import { PoolModal } from './PoolModal'
import { PoolToast } from './PoolToast'
import { usePoolToast } from './usePoolToast'

export function CandidateApplicationDialog({ candidate, onClose, onAdded }: {
  candidate: CandidateListItem | null
  onClose: () => void
  onAdded: (message: string) => void
}) {
  const canManage = usePermission(Permissions.ApplicationsManage)
  const { toast, notify, dismissToast } = usePoolToast()
  const [requisitions, setRequisitions] = useState<RequisitionListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [source, setSource] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const submitLock = useRef(false)

  useEffect(() => {
    if (!candidate || !canManage) return
    const controller = new AbortController()
    setLoading(true)
    setRequisitions([])
    setSelectedId('')
    setSource('')
    setError('')
    setLoadError('')
    dismissToast()

    async function load() {
      try {
        const { data } = await api.get<RequisitionListItem[]>('/requisitions', { signal: controller.signal })
        if (!controller.signal.aborted) setRequisitions(data.filter((item) => item.status === 'Published'))
      } catch (cause) {
        if (!controller.signal.aborted) setLoadError(getApiError(cause))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [candidate, canManage, retry, dismissToast])

  async function submit() {
    if (!candidate || !selectedId || !canManage || submitLock.current) return
    submitLock.current = true
    setPending(true)
    setError('')
    try {
      await createApplication({
        candidateId: candidate.candidateId,
        requisitionId: selectedId,
        source: source.trim() || null,
      })
      const title = requisitions.find((item) => item.requisitionId === selectedId)?.title ?? 'the requisition'
      onAdded(`${candidate.fullName} added to ${title}.`)
    } catch (cause) {
      const message = getApiError(cause)
      setError(message)
      notify(message, 'error')
    } finally {
      submitLock.current = false
      setPending(false)
    }
  }

  return (
    <PoolModal open={!!candidate && canManage} title="Add to requisition"
      subtitle="Choose a published job for this candidate." busy={pending}
      onClose={() => { if (!submitLock.current) onClose() }}
      footer={<>
        <Button disabled={pending} onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={pending || loading || !!loadError || !selectedId}
          onClick={() => void submit()}>
          {pending && <span className="pool-spinner" aria-hidden="true" />}
          {pending ? 'Adding...' : 'Add to requisition'}
        </Button>
      </>}>
      <PoolToast toast={toast} onDismiss={dismissToast} />
      <div className="stack">
        <div className="pool-notice">Candidate: <strong>{candidate?.fullName}</strong></div>
        {loading ? (
          <p role="status">Loading requisitions...</p>
        ) : loadError ? (
          <div className="stack">
            <p className="pool-notice pool-notice--error" role="alert">{loadError}</p>
            <Button onClick={() => setRetry((value) => value + 1)}>Try again</Button>
          </div>
        ) : requisitions.length === 0 ? (
          <EmptyState title="No published requisitions"
            message="A published requisition that you can access is needed to add an application." />
        ) : (
          <label className="field">
            Published requisition
            <select data-autofocus required value={selectedId} disabled={pending}
              onChange={(event) => { setSelectedId(event.target.value); setError('') }}>
              <option value="">Select a requisition</option>
              {requisitions.map((item) => (
                <option key={item.requisitionId} value={item.requisitionId}>{item.title} — {item.department}</option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Application source (optional)
          <input value={source} disabled={pending} maxLength={100} placeholder="e.g. Referral"
            onChange={(event) => setSource(event.target.value)} />
        </label>
        {error && <p className="pool-notice pool-notice--error" role="alert">{error}</p>}
      </div>
    </PoolModal>
  )
}
