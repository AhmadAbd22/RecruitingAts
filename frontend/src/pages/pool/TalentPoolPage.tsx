import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  createApplication,
  getRequisitions,
  Permissions,
  searchApplicationCandidates,
  searchCandidates,
} from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import { CandidateForm, CandidateList, DuplicateWarning } from '../../components/candidates'
import type { CandidateFormValues } from '../../components/candidates'
import { Button, EmptyState, Modal, PageHeader, SearchField } from '../../components/shared'
import type { CandidateListItem, RequisitionListItem } from '../../types/domain'

/** Owner: Ibtesam */
export function TalentPoolPage() {
  const navigate = useNavigate()
  const canManage = usePermission(Permissions.CandidatesManage)
  const canViewPool = usePermission(Permissions.PoolView)
  const canManageApplications = usePermission(Permissions.ApplicationsManage)
  const canSearchCandidates = canViewPool || canManageApplications
  const usesScopedCandidateSearch = !canViewPool && canManageApplications
  const [q, setQ] = useState('')
  const [candidates, setCandidates] = useState<CandidateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchForbidden, setSearchForbidden] = useState(false)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [open, setOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateListItem | null>(null)
  const [requisitions, setRequisitions] = useState<RequisitionListItem[]>([])
  const [requisitionsLoading, setRequisitionsLoading] = useState(false)
  const [requisitionsError, setRequisitionsError] = useState<string | null>(null)
  const [requisitionsRetry, setRequisitionsRetry] = useState(0)
  const [selectedRequisitionId, setSelectedRequisitionId] = useState('')
  const [applicationSource, setApplicationSource] = useState('')
  const [applicationError, setApplicationError] = useState<string | null>(null)
  const [applicationPending, setApplicationPending] = useState(false)
  const [applicationSuccess, setApplicationSuccess] = useState<string | null>(null)
  const applicationSubmitLock = useRef(false)
  const [form, setForm] = useState<CandidateFormValues>({
    fullName: '',
    email: '',
    phone: '',
    skills: '',
    source: 'Referral',
  })

  useEffect(() => {
    let cancelled = false

    if (!canSearchCandidates) {
      setCandidates([])
      setLoading(false)
      setError("You don't have permission to access candidates.")
      setSearchForbidden(true)
      return
    }

    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      setSearchForbidden(false)

      try {
        const results = canViewPool
          ? await searchCandidates(q.trim())
          : await searchApplicationCandidates(q.trim())
        if (!cancelled) setCandidates(results)
      } catch (cause) {
        if (cancelled) return
        const forbidden = axios.isAxiosError(cause) && cause.response?.status === 403
        setSearchForbidden(forbidden)
        setError(
          usesScopedCandidateSearch
            ? forbidden
              ? "You don't have permission to search candidates for applications. Please contact your administrator if you believe you should have access."
              : 'We couldn’t load candidates for your accessible requisitions. Please try again.'
            : forbidden
              ? "You don't have permission to access the talent pool. Please contact your administrator if you believe you should have access."
              : 'We couldn’t load candidates. Please try again.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [canSearchCandidates, canViewPool, q, retryAttempt, usesScopedCandidateSearch])

  useEffect(() => {
    if (!selectedCandidate) return

    let cancelled = false
    async function loadRequisitions() {
      setRequisitionsLoading(true)
      setRequisitionsError(null)

      try {
        const results = await getRequisitions()
        if (!cancelled) setRequisitions(results)
      } catch (cause) {
        if (cancelled) return
        if (axios.isAxiosError<{ message?: string }>(cause)) {
          setRequisitionsError(cause.response?.data?.message ?? cause.message)
        } else if (cause instanceof Error) {
          setRequisitionsError(cause.message)
        } else {
          setRequisitionsError('An unexpected error occurred while loading requisitions.')
        }
      } finally {
        if (!cancelled) setRequisitionsLoading(false)
      }
    }

    void loadRequisitions()
    return () => {
      cancelled = true
    }
  }, [selectedCandidate, requisitionsRetry])

  function closeApplicationDialog() {
    if (applicationSubmitLock.current) return
    setSelectedCandidate(null)
    setRequisitions([])
    setRequisitionsError(null)
    setSelectedRequisitionId('')
    setApplicationSource('')
    setApplicationError(null)
  }

  async function submitApplication() {
    if (!selectedCandidate || !selectedRequisitionId || applicationSubmitLock.current) return

    applicationSubmitLock.current = true
    setApplicationPending(true)
    setApplicationError(null)

    try {
      const requisition = requisitions.find(
        (item) => item.requisitionId === selectedRequisitionId,
      )
      await createApplication({
        candidateId: selectedCandidate.candidateId,
        requisitionId: selectedRequisitionId,
        source: applicationSource.trim() || null,
      })
      setApplicationSuccess(
        `${selectedCandidate.fullName} added to ${requisition?.title ?? 'the requisition'}.`,
      )
      setSelectedCandidate(null)
      setRequisitions([])
      setSelectedRequisitionId('')
      setApplicationSource('')
      setApplicationError(null)
    } catch (cause) {
      if (axios.isAxiosError<{ message?: string }>(cause)) {
        setApplicationError(
          cause.response?.data?.message ?? cause.message ?? 'Unable to add this application.',
        )
      } else if (cause instanceof Error) {
        setApplicationError(cause.message)
      } else {
        setApplicationError('An unexpected error occurred while creating the application.')
      }
    } finally {
      applicationSubmitLock.current = false
      setApplicationPending(false)
    }
  }

  const publishedRequisitions = requisitions.filter((requisition) => requisition.status === 'Published')

  return (
    <div className="page">
      <PageHeader
        title="Talent pool"
        subtitle={
          usesScopedCandidateSearch
            ? 'Search candidates linked to requisitions you can access.'
            : 'Search and browse candidate profiles.'
        }
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setOpen(true)}>
              Add candidate
            </Button>
          ) : null
        }
      />
      <SearchField value={q} onChange={setQ} placeholder="Search name, email, or phone…" />
      {applicationSuccess ? (
        <div className="panel" role="status">
          {applicationSuccess}
        </div>
      ) : null}
      {loading ? (
        <div className="empty-state" role="status">
          Loading candidates…
        </div>
      ) : error ? (
        <div className="panel">
          <p className="error" role="alert">{error}</p>
          {!searchForbidden ? (
            <Button variant="primary" onClick={() => setRetryAttempt((attempt) => attempt + 1)}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : candidates.length === 0 ? (
        <EmptyState
          title={
            q.trim()
              ? 'No matching candidates'
              : usesScopedCandidateSearch
                ? 'No candidates in your requisition scope'
                : 'No candidates yet'
          }
          message={
            q.trim()
              ? 'Try a different name, email, or phone number.'
              : usesScopedCandidateSearch
                ? 'No candidates linked to requisitions you can access were found.'
                : 'No candidates are currently available in the talent pool.'
          }
        />
      ) : (
        <CandidateList
          items={candidates}
          onSelect={canViewPool ? (id) => navigate(`/pool/${id}`) : undefined}
          onAddToRequisition={
            canManageApplications
              ? (candidate) => {
                  setApplicationSuccess(null)
                  setSelectedCandidate(candidate)
                  setRequisitions([])
                  setSelectedRequisitionId('')
                  setApplicationSource('')
                  setApplicationError(null)
                }
              : undefined
          }
        />
      )}
      <Modal open={open} title="Add candidate" onClose={() => setOpen(false)}>
        <DuplicateWarning matches={[]} />
        <CandidateForm values={form} onChange={setForm} onSubmit={() => setOpen(false)} />
      </Modal>
      <Modal
        open={!!selectedCandidate}
        title="Add to requisition"
        onClose={closeApplicationDialog}
        footer={
          <>
            <Button onClick={closeApplicationDialog} disabled={applicationPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void submitApplication()}
              disabled={
                applicationPending ||
                !selectedRequisitionId ||
                requisitionsLoading ||
                !!requisitionsError ||
                publishedRequisitions.length === 0
              }
            >
              {applicationPending ? 'Adding…' : 'Add to requisition'}
            </Button>
          </>
        }
      >
        {selectedCandidate ? (
          <div className="stack">
            <p>
              Add <strong>{selectedCandidate.fullName}</strong> to a published requisition.
            </p>
            {requisitionsLoading ? (
              <div className="empty-state" role="status">Loading requisitions…</div>
            ) : requisitionsError ? (
              <div className="panel">
                <p className="error" role="alert">{requisitionsError}</p>
                <Button
                  variant="primary"
                  onClick={() => setRequisitionsRetry((attempt) => attempt + 1)}
                  disabled={requisitionsLoading}
                >
                  Retry
                </Button>
              </div>
            ) : requisitions.length === 0 ? (
              <EmptyState
                title="No accessible requisitions"
                message="The requisitions API returned no requisitions available to your account."
              />
            ) : publishedRequisitions.length === 0 ? (
              <EmptyState
                title="No published requisitions"
                message="You have accessible requisitions, but none are currently published. Only published requisitions can receive applications."
              />
            ) : (
              <>
                <p className="muted">
                  {publishedRequisitions.length} published requisition
                  {publishedRequisitions.length === 1 ? '' : 's'} available.
                </p>
                <label className="field">
                  Published requisition
                  <select
                    value={selectedRequisitionId}
                    onChange={(event) => {
                      setSelectedRequisitionId(event.target.value)
                      setApplicationError(null)
                    }}
                    disabled={applicationPending}
                    required
                  >
                    <option value="">Select a requisition</option>
                    {publishedRequisitions.map((requisition) => (
                      <option key={requisition.requisitionId} value={requisition.requisitionId}>
                        {requisition.title} — {requisition.department}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="field">
              Application source (optional)
              <input
                value={applicationSource}
                onChange={(event) => setApplicationSource(event.target.value)}
                disabled={applicationPending}
              />
            </label>
            {applicationError ? <p className="error" role="alert">{applicationError}</p> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
