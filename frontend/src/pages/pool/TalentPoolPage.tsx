import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import {
  api,
  createApplication,
  getRequisitions,
  Permissions,
} from '../../api/client'

import { usePermission } from '../../auth/usePermission'

import type { CandidateFormValues } from '../../components/candidates'
import type {
  CandidateListItem,
  RequisitionListItem,
} from '../../types/domain'

import {
  Button,
  EmptyState,
  DataTable,
  PageHeader,
} from '../../components/shared'

import {
  getApiError,
  getResumeError,
  normalizeCandidatePhone,
  phoneCountries,
} from './candidatePageHelpers'

import type {
  ApiFailure,
  CandidateDetail,
  DuplicateResult,
} from './candidatePageHelpers'

import { PoolModal } from './PoolModal'
import { PoolToast } from './PoolToast'
import { usePoolToast } from './usePoolToast'
import './pool.css'

const emptyForm: CandidateFormValues = {
  fullName: '',
  email: '',
  phone: '',
  skills: '',
  source: 'Referral',
}

export function TalentPoolPage() {
  const navigate = useNavigate()
  const { toast, notify, dismissToast } = usePoolToast()

  const canManage = usePermission(Permissions.CandidatesManage)
  const canViewPool = usePermission(Permissions.PoolView)
  const canManageApplications = usePermission(Permissions.ApplicationsManage)

  const canSearchCandidates = canViewPool || canManageApplications
  const usesScopedCandidateSearch = !canViewPool && canManageApplications

  // Candidate search state
  const [q, setQ] = useState('')
  const [candidates, setCandidates] = useState<CandidateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchForbidden, setSearchForbidden] = useState(false)
  const [retryAttempt, setRetryAttempt] = useState(0)

  // Add candidate state
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CandidateFormValues>(emptyForm)
  const [phoneCountry, setPhoneCountry] = useState('')
  const [consentDate, setConsentDate] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [candidateAwaitingResume, setCandidateAwaitingResume] = useState<CandidateDetail | null>(null)
  const createSubmitLock = useRef(false)

  const [matches, setMatches] = useState<CandidateListItem[]>([])
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [pendingAction, setPendingAction] = useState<'duplicates' | 'create' | 'upload' | null>(null)
  const busy = pendingAction !== null

  // Add to requisition state
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateListItem | null>(null)
  const [requisitions, setRequisitions] = useState<RequisitionListItem[]>([])
  const [requisitionsLoading, setRequisitionsLoading] = useState(false)
  const [requisitionsError, setRequisitionsError] = useState<string | null>(null)
  const [requisitionsRetry, setRequisitionsRetry] = useState(0)
  const [selectedRequisitionId, setSelectedRequisitionId] = useState('')
  const [applicationSource, setApplicationSource] = useState('')
  const [applicationError, setApplicationError] = useState<string | null>(null)
  const [applicationPending, setApplicationPending] = useState(false)

  const applicationSubmitLock = useRef(false)

  // Permission-aware candidate search (single effect)
  useEffect(() => {
    const controller = new AbortController()

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
        const { data } = await api.get<CandidateListItem[]>(
          canViewPool ? '/candidates' : '/applications/candidates',
          { params: { q: q.trim() }, signal: controller.signal },
        )
        if (!controller.signal.aborted) setCandidates(data)
      } catch (cause) {
        if (controller.signal.aborted) return
        const forbidden =
          axios.isAxiosError(cause) && cause.response?.status === 403
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
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [canSearchCandidates, canViewPool, q, retryAttempt, usesScopedCandidateSearch])

  // Requisition loading for the Add to requisition modal
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

  // Add candidate handlers
  function openCreateForm() {
    dismissToast()
    if (candidateAwaitingResume) {
      setOpen(true)
      return
    }
    setForm(emptyForm)
    setPhoneCountry('')
    setConsentDate('')
    setResumeFile(null)
    setCandidateAwaitingResume(null)
    setMatches([])
    setFormError('')
    setFormMessage('')
    setOpen(true)
  }

  function closeCreateForm() {
    if (!busy) {
      setOpen(false)
      dismissToast()
    }
  }

  function updateForm(values: CandidateFormValues) {
    setForm(values)
    setMatches([])
    setFormError('')
    setFormMessage('')
  }

  function showFormError(message: string) {
    setFormError(message)
    notify(message, 'error')
  }

  async function checkDuplicates() {
    if (busy || candidateAwaitingResume || !canManage) {
      return
    }

    if (!form.email.trim() && !form.phone.trim()) {
      showFormError('Enter an email address or phone number first.')
      return
    }

    const phone = form.phone.trim() ? normalizeCandidatePhone(form.phone, phoneCountry) : null
    if (form.phone.trim() && !phone) {
      showFormError('Enter a valid international phone number, or select the country for a local number.')
      return
    }

    setPendingAction('duplicates')
    setFormError('')
    setFormMessage('')
    setMatches([])

    try {
      const response = await api.get<DuplicateResult>('/candidates/duplicates', {
        params: {
          Email: form.email.trim() || undefined,
          Phone: phone || '',
        },
      })

      setMatches(response.data.matches)

      const message = response.data.isDuplicate
        ? 'Existing candidates were found. Check the matches below.'
        : 'No matching candidates were found. Creation will check again.'
      setFormMessage(message)
      notify(message, response.data.isDuplicate ? 'info' : 'success')
    } catch (cause) {
      showFormError(getApiError(cause))
    } finally {
      setPendingAction(null)
    }
  }

  async function createCandidate() {
    if (busy || createSubmitLock.current || !canManage) {
      return
    }

    setFormError('')
    setFormMessage('')

    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.source.trim()
    ) {
      showFormError('Full name, email, phone and source are required.')
      return
    }

    if (!resumeFile) {
      showFormError('Please select the required PDF resume.')
      return
    }

    const fileError = getResumeError(resumeFile)

    if (fileError) {
      showFormError(fileError)
      return
    }

    const phone = normalizeCandidatePhone(form.phone, phoneCountry)
    if (!phone) {
      showFormError('Enter a valid international phone number, or select the country for a local number.')
      return
    }

    createSubmitLock.current = true
    setPendingAction('create')
    setMatches([])
    let created = candidateAwaitingResume

    try {
      if (!created) {
        const { data } = await api.post<CandidateDetail>('/candidates', {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone,
          skills: form.skills.trim() || null,
          source: form.source.trim(),
          consentDate: consentDate || null,
        })
        created = data
        setCandidateAwaitingResume(data)
      }

      // Retry only this step if JSON creation succeeded but the upload failed.
      setPendingAction('upload')
      const body = new FormData()
      body.append('file', resumeFile)
      const { data: uploaded } = await api.post<CandidateDetail>(
        `/candidates/${created.candidateId}/resume`, body,
      )
      created = uploaded

      setOpen(false)
      setForm(emptyForm)
      setPhoneCountry('')
      setConsentDate('')
      setResumeFile(null)
      setCandidateAwaitingResume(null)
      setMatches([])
      setFormError('')
      setFormMessage('')

      if (canViewPool) {
        navigate(`/pool/${created.candidateId}`, { state: { poolNotice: 'Candidate created successfully.' } })
        return
      }

      // HM / ApplicationsManage without PoolView: scoped search won't return a
      // brand-new candidate yet. Open Add to requisition with the create response.
      if (canManageApplications) {
        setSelectedCandidate({
          candidateId: created.candidateId,
          fullName: created.fullName,
          email: created.email,
          phone: created.phone,
          source: created.source,
          hasResume: created.hasResume,
        })
        notify(
          `${created.fullName} created. Choose a published requisition to add them.`,
        )
        return
      }

      notify('Candidate created successfully.')
    } catch (cause) {
      if (created) {
        showFormError(`Candidate saved, but the resume upload failed. ${getApiError(cause)} Select Retry resume upload to attach it to the same candidate.`)
        return
      }
      if (axios.isAxiosError<ApiFailure>(cause)) {
        setMatches(cause.response?.data?.duplicate?.matches ?? [])
      }

      showFormError(getApiError(cause))
    } finally {
      createSubmitLock.current = false
      setPendingAction(null)
    }
  }

  // Add to requisition handlers
  function closeApplicationDialog() {
    if (applicationSubmitLock.current) return
    dismissToast()
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
      notify(
        `${selectedCandidate.fullName} added to ${requisition?.title ?? 'the requisition'}.`,
      )
      setSelectedCandidate(null)
      setRequisitions([])
      setSelectedRequisitionId('')
      setApplicationSource('')
      setApplicationError(null)
    } catch (cause) {
      const message = getApiError(cause)
      setApplicationError(message)
      notify(message, 'error')
    } finally {
      applicationSubmitLock.current = false
      setApplicationPending(false)
    }
  }

  const publishedRequisitions = requisitions.filter(
    (requisition) => requisition.status === 'Published',
  )

  function openApplicationDialog(candidate: CandidateListItem) {
    dismissToast()
    setSelectedCandidate(candidate)
    setRequisitions([])
    setSelectedRequisitionId('')
    setApplicationSource('')
    setApplicationError(null)
  }

  function candidateTable(items: CandidateListItem[], allowApplications = false) {
    return (
      <DataTable rows={items} rowKey={(candidate) => candidate.candidateId}
        onRowClick={canViewPool ? (candidate) => navigate(`/pool/${candidate.candidateId}`) : undefined}
        columns={[
          { key: 'name', header: 'Candidate', render: (candidate) => (
            <div className="pool-name">
              <span className="pool-avatar" aria-hidden="true">
                {candidate.fullName.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join('').toUpperCase()}
              </span>
              {canViewPool ? (
                <Link className="pool-profile-link" to={`/pool/${candidate.candidateId}`}
                  onClick={(event) => event.stopPropagation()}>{candidate.fullName}</Link>
              ) : <strong>{candidate.fullName}</strong>}
            </div>
          ) },
          { key: 'email', header: 'Email', render: (candidate) => candidate.email },
          { key: 'phone', header: 'Phone', render: (candidate) => <span className="mono">{candidate.phone}</span> },
          { key: 'source', header: 'Source', render: (candidate) => (
            <span className="pool-badge">{candidate.source || 'Not recorded'}</span>
          ) },
          { key: 'resume', header: 'Resume', render: (candidate) => candidate.hasResume
            ? <span className="pool-badge pool-badge--ok">PDF attached</span>
            : <span className="pool-hint">Not attached</span> },
          ...(allowApplications && canManageApplications ? [{
            key: 'application', header: 'Application', render: (candidate: CandidateListItem) => (
              <Button onClick={(event) => { event.stopPropagation(); openApplicationDialog(candidate) }}>
                Add to requisition
              </Button>
            ),
          }] : []),
        ]} />
    )
  }

  return (
    <div className="page pool-page">
      {!open && !selectedCandidate && <PoolToast toast={toast} onDismiss={dismissToast} />}
      <PageHeader title="Talent pool"
        subtitle={usesScopedCandidateSearch
          ? 'Candidates linked to requisitions you can access.'
          : 'Find the right person. Keep their details in one place.'}
        actions={
          <>
            {canSearchCandidates && (
              <Button disabled={loading} onClick={() => setRetryAttempt((attempt) => attempt + 1)}>
                {loading && <span className="pool-spinner" aria-hidden="true" />}
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            )}
            {canManage && <Button variant="primary" onClick={openCreateForm}>+ Add candidate</Button>}
          </>
        } />

      {canSearchCandidates && (
        <section className="panel pool-toolbar" aria-label="Candidate search">
          <div className="pool-search">
            <svg className="pool-search-icon" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" />
            </svg>
            <input className="pool-search-input" type="search" aria-label="Search candidates"
              placeholder="Search by name, email or phone" value={q}
              onChange={(event) => setQ(event.target.value)} />
            {q && <button className="pool-icon-button pool-search-clear" type="button"
              aria-label="Clear search" onClick={() => setQ('')}>×</button>}
          </div>
        </section>
      )}

      <div className="pool-results-head">
        <h2>Candidates</h2>
        {!loading && !error && <p aria-live="polite">
          {candidates.length} {candidates.length === 1 ? 'candidate' : 'candidates'} shown
          {candidates.length === 100 && ' · Refine your search for more specific results'}
        </p>}
      </div>

      <section aria-label="Candidate results" aria-busy={loading}>
        {loading ? (
          <div className="panel pool-loading" role="status">
            <span className="pool-spinner" aria-hidden="true" /> Searching candidates...
          </div>
        ) : error ? (
          <div className="panel stack">
            <p className="pool-notice pool-notice--error" role="alert">{error}</p>
            {!searchForbidden && <div><Button onClick={() => setRetryAttempt((attempt) => attempt + 1)}>Try again</Button></div>}
          </div>
        ) : candidates.length === 0 ? (
          <div className="stack">
            <EmptyState
              title={q.trim() ? 'No matching candidates' : usesScopedCandidateSearch
                ? 'No candidates in your requisition scope' : 'Your talent pool is ready'}
              message={q.trim() ? 'Try another name, email or phone number.'
                : usesScopedCandidateSearch ? 'Candidates appear here after being linked to a requisition you can access.'
                  : 'Add your first candidate with their contact details and PDF resume.'} />
            {q.trim() && <div><Button onClick={() => setQ('')}>Clear search</Button></div>}
          </div>
        ) : candidateTable(candidates, true)}
      </section>

      <PoolModal open={open} title="Add candidate" subtitle="Start with their details, then attach a PDF resume."
        busy={busy} onClose={closeCreateForm}
        footer={
          <>
            <Button disabled={busy} onClick={closeCreateForm}>Cancel</Button>
            <Button disabled={busy || !!candidateAwaitingResume} onClick={() => void checkDuplicates()}>
              {pendingAction === 'duplicates' && <span className="pool-spinner" aria-hidden="true" />}
              {pendingAction === 'duplicates' ? 'Checking...' : 'Check duplicates'}
            </Button>
            <Button variant="primary" type="submit" form="pool-candidate-form" disabled={busy}>
              {(pendingAction === 'create' || pendingAction === 'upload') && <span className="pool-spinner" aria-hidden="true" />}
              {pendingAction === 'create' ? 'Saving...' : pendingAction === 'upload' ? 'Uploading PDF...'
                : candidateAwaitingResume ? 'Retry resume upload' : 'Save candidate'}
            </Button>
          </>
        }>
        <PoolToast toast={toast} onDismiss={dismissToast} />
        <div className="stack">
          {formError && <div className="pool-notice pool-notice--error" role="alert">{formError}</div>}
          {formMessage && <div className={`pool-notice ${matches.length ? '' : 'pool-notice--success'}`}>{formMessage}</div>}
          <form id="pool-candidate-form" className="stack" noValidate onSubmit={(event) => {
            event.preventDefault()
            const email = event.currentTarget.elements.namedItem('email')
            if (email instanceof HTMLInputElement && email.validity.typeMismatch) {
              showFormError('Enter a valid email address.')
              email.focus()
              return
            }
            void createCandidate()
          }}>
            <fieldset disabled={busy || !!candidateAwaitingResume} className="pool-fieldset pool-form-grid">
              <label className="field">
                <span>Full name <span className="pool-required" aria-hidden="true">*</span></span>
                <input data-autofocus required autoComplete="name" maxLength={200}
                  placeholder="e.g. Ali Ahmed" value={form.fullName}
                  onChange={(event) => updateForm({ ...form, fullName: event.target.value })} />
              </label>
              <label className="field">
                <span>Email <span className="pool-required" aria-hidden="true">*</span></span>
                <input required name="email" type="email" autoComplete="email" maxLength={256}
                  placeholder="name@example.com" value={form.email}
                  onChange={(event) => updateForm({ ...form, email: event.target.value })} />
              </label>
              <label className="field">
                Country for a local phone number
                <select value={phoneCountry} onChange={(event) => {
                  setPhoneCountry(event.target.value)
                  setMatches([])
                  setFormError('')
                  setFormMessage('')
                }}>
                  <option value="">Choose a country</option>
                  {phoneCountries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name} (+{country.callingCode})</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Phone <span className="pool-required" aria-hidden="true">*</span></span>
                <input required type="tel" autoComplete="tel" maxLength={32}
                  placeholder="Phone number" value={form.phone}
                  onChange={(event) => updateForm({ ...form, phone: event.target.value })} />
              </label>
              <label className="field pool-span-full">
                Skills
                <textarea maxLength={1000} placeholder="e.g. C#, ASP.NET Core, SQL Server"
                  value={form.skills} onChange={(event) => updateForm({ ...form, skills: event.target.value })} />
              </label>
              <label className="field">
                <span>Source <span className="pool-required" aria-hidden="true">*</span></span>
                <select required value={form.source}
                  onChange={(event) => updateForm({ ...form, source: event.target.value })}>
                  <option>Referral</option><option>LinkedIn</option><option>Career site</option><option>Agency</option>
                </select>
              </label>
              <label className="field">
                Consent date (optional)
                <input type="date" value={consentDate} onChange={(event) => setConsentDate(event.target.value)} />
              </label>
            </fieldset>
              <label className="field pool-span-full pool-upload">
                <span>PDF resume <span className="pool-required" aria-hidden="true">*</span></span>
                <input type="file" required disabled={busy} accept=".pdf,application/pdf" onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  const fileError = file ? getResumeError(file) : ''
                  setResumeFile(fileError ? null : file)
                  if (fileError) { showFormError(fileError); event.target.value = '' }
                  else setFormError('')
                }} />
                <span className="pool-hint">{resumeFile
                  ? `${resumeFile.name} · ${(resumeFile.size / (1024 * 1024)).toFixed(2)} MB`
                  : 'Choose a PDF up to 5 MB.'}</span>
              </label>
          </form>
          {matches.length > 0 && (
            <section className="pool-matches" aria-label="Possible duplicate candidates">
              <h3>Existing candidates</h3>
              <p>Check these records before creating a new candidate.</p>
              {candidateTable(matches)}
            </section>
          )}
        </div>
      </PoolModal>

      <PoolModal open={!!selectedCandidate} title="Add to requisition"
        subtitle="Choose a published job for this candidate."
        busy={applicationPending} onClose={closeApplicationDialog}
        footer={
          <>
            <Button onClick={closeApplicationDialog} disabled={applicationPending}>Cancel</Button>
            <Button variant="primary" onClick={() => void submitApplication()}
              disabled={applicationPending || !selectedRequisitionId || requisitionsLoading ||
                !!requisitionsError || publishedRequisitions.length === 0}>
              {applicationPending && <span className="pool-spinner" aria-hidden="true" />}
              {applicationPending ? 'Adding...' : 'Add to requisition'}
            </Button>
          </>
        }>
        <PoolToast toast={toast} onDismiss={dismissToast} />
        {selectedCandidate && (
          <div className="stack">
            <div className="pool-notice">Candidate: <strong>{selectedCandidate.fullName}</strong></div>
            {requisitionsLoading ? (
              <div className="pool-loading" role="status"><span className="pool-spinner" aria-hidden="true" /> Loading requisitions...</div>
            ) : requisitionsError ? (
              <div className="stack">
                <p className="pool-notice pool-notice--error" role="alert">{requisitionsError}</p>
                <div><Button onClick={() => setRequisitionsRetry((attempt) => attempt + 1)}>Try again</Button></div>
              </div>
            ) : publishedRequisitions.length === 0 ? (
              <EmptyState title="No published requisitions"
                message="A published requisition that you can access is needed to add an application." />
            ) : (
              <label className="field">
                Published requisition
                <select data-autofocus value={selectedRequisitionId} required disabled={applicationPending}
                  onChange={(event) => { setSelectedRequisitionId(event.target.value); setApplicationError(null) }}>
                  <option value="">Select a requisition</option>
                  {publishedRequisitions.map((requisition) => (
                    <option key={requisition.requisitionId} value={requisition.requisitionId}>
                      {requisition.title} — {requisition.department}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              Application source (optional)
              <input value={applicationSource} disabled={applicationPending} maxLength={100}
                placeholder="e.g. Referral"
                onChange={(event) => setApplicationSource(event.target.value)} />
            </label>
            {applicationError && <p className="pool-notice pool-notice--error" role="alert">{applicationError}</p>}
          </div>
        )}
      </PoolModal>
    </div>
  )
}
