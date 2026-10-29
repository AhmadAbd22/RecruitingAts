import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import {
  api,
  Permissions,
} from '../../api/client'

import { usePermission } from '../../auth/usePermission'

import type { CandidateFormValues } from '../../components/candidates'
import type {
  CandidateListItem,
} from '../../types/domain'

import {
  Button,
  EmptyState,
  DataTable,
  PageHeader,
} from '../../components/shared'

import {
  getApiError,
  getDuplicateMessage,
  getMatchedContactFields,
  getResumeError,
  normalizeCandidatePhone,
  phoneCountries,
} from './candidatePageHelpers'

import type {
  ApiFailure,
  CandidateDetail,
  DuplicateResult,
} from './candidatePageHelpers'

import { CandidateApplicationDialog } from './CandidateApplicationDialog'
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
  const [candidateSaveNotice, setCandidateSaveNotice] = useState('')
  const createSubmitLock = useRef(false)

  const [duplicateResult, setDuplicateResult] = useState<DuplicateResult | null>(null)
  const matches = duplicateResult?.matches ?? []
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [pendingAction, setPendingAction] = useState<'duplicates' | 'create' | 'upload' | null>(null)
  const busy = pendingAction !== null

  // Add to requisition state
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateListItem | null>(null)

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
    setCandidateSaveNotice('')
    setDuplicateResult(null)
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
    setDuplicateResult(null)
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
    setDuplicateResult(null)

    try {
      const response = await api.get<DuplicateResult>('/candidates/duplicates', {
        params: {
          Email: form.email.trim() || undefined,
          Phone: phone || '',
        },
      })

      setDuplicateResult(response.data)

      const message = response.data.isHardDuplicate
        ? `${getDuplicateMessage(response.data)} Use their existing profile.`
        : response.data.isDuplicate
          ? `${getDuplicateMessage(response.data)} Review the matches, then use an existing candidate or save a separate profile.`
          : 'No matching candidates were found. Creation will check again.'
      setFormMessage(message)
      notify(message, response.data.isDuplicate ? 'info' : 'success')
    } catch (cause) {
      showFormError(getApiError(cause))
    } finally {
      setPendingAction(null)
    }
  }

  async function createCandidate(confirmDuplicate = false) {
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
    setDuplicateResult(null)
    let created = candidateAwaitingResume
    let successMessage = candidateSaveNotice || 'Candidate created successfully.'

    try {
      if (!created) {
        successMessage = confirmDuplicate && duplicateResult
          ? `Candidate saved with matching ${getMatchedContactFields(duplicateResult)}.`
          : 'Candidate created successfully.'
        const { data } = await api.post<CandidateDetail>('/candidates', {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone,
          skills: form.skills.trim() || null,
          source: form.source.trim(),
          consentDate: consentDate || null,
        }, { params: { confirmDuplicate } })
        created = data
        setCandidateAwaitingResume(data)
        setCandidateSaveNotice(successMessage)
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
      setCandidateSaveNotice('')
      setDuplicateResult(null)
      setFormError('')
      setFormMessage('')

      if (canViewPool) {
        navigate(`/pool/${created.candidateId}`, { state: { poolNotice: successMessage } })
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
          `${successMessage} Choose a published requisition to add ${created.fullName}.`,
        )
        return
      }

      notify(successMessage)
    } catch (cause) {
      if (created) {
        showFormError(`Candidate saved, but the resume upload failed. ${getApiError(cause)} Select Retry resume upload to attach it to the same candidate.`)
        return
      }
      if (axios.isAxiosError<ApiFailure>(cause)) {
        setDuplicateResult(cause.response?.data?.duplicate ?? null)
      }

      showFormError(getApiError(cause))
    } finally {
      createSubmitLock.current = false
      setPendingAction(null)
    }
  }

  function openApplicationDialog(candidate: CandidateListItem) {
    dismissToast()
    setSelectedCandidate(candidate)
  }

  function handleUseExistingCandidate(candidate: CandidateListItem) {
    if (busy) return
    setOpen(false)
    setConfirmOpen(false)
    dismissToast()
    if (canViewPool) navigate(`/pool/${candidate.candidateId}`)
    else if (canManageApplications) openApplicationDialog(candidate)
  }

  function candidateTable(items: CandidateListItem[], allowApplications = false, useExisting = false) {
    return (
      <DataTable rows={items} rowKey={(candidate) => candidate.candidateId}
        onRowClick={canViewPool && !busy ? (candidate) => navigate(`/pool/${candidate.candidateId}`) : undefined}
        columns={[
          { key: 'name', header: 'Candidate', render: (candidate) => (
            <div className="pool-name">
              <span className="pool-avatar" aria-hidden="true">
                {candidate.fullName.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join('').toUpperCase()}
              </span>
              {canViewPool ? (
                <Link className="pool-profile-link" to={`/pool/${candidate.candidateId}`}
                  onClick={(event) => { event.stopPropagation(); if (busy) event.preventDefault() }}>{candidate.fullName}</Link>
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
          ...(useExisting && (canViewPool || canManageApplications) ? [{
            key: 'existing', header: 'Action', render: (candidate: CandidateListItem) => (
              <Button disabled={busy} onClick={(event) => {
                event.stopPropagation()
                handleUseExistingCandidate(candidate)
              }}>Use existing</Button>
            ),
          }] : []),
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
            {duplicateResult?.canCreateAnyway && !candidateAwaitingResume ? (
              <Button variant="primary" disabled={busy} onClick={() => setConfirmOpen(true)}>
                Save with duplicate
              </Button>
            ) : (
              <Button variant="primary" type="submit" form="pool-candidate-form"
                disabled={busy || !!duplicateResult?.isHardDuplicate}>
                {(pendingAction === 'create' || pendingAction === 'upload') && <span className="pool-spinner" aria-hidden="true" />}
                {pendingAction === 'create' ? 'Saving...' : pendingAction === 'upload' ? 'Uploading PDF...'
                  : candidateAwaitingResume ? 'Retry resume upload' : 'Save candidate'}
              </Button>
            )}
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
                  setDuplicateResult(null)
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
              {candidateTable(matches, false, true)}
            </section>
          )}
        </div>
      </PoolModal>

      <PoolModal open={confirmOpen} title="Save with duplicate?"
        subtitle="Review the matching candidates before continuing."
        onClose={() => setConfirmOpen(false)}
        footer={<>
          <Button onClick={() => setConfirmOpen(false)}>Go back</Button>
          <Button variant="primary" onClick={() => {
            setConfirmOpen(false)
            void createCandidate(true)
          }}>Confirm save</Button>
        </>}>
        <p>{duplicateResult && getDuplicateMessage(duplicateResult)}</p>
        <p>Do you want to save <strong>{form.fullName || 'this person'}</strong> as a separate candidate?</p>
        <p className="pool-hint">If this is the same person, go back and choose Use existing.</p>
      </PoolModal>

      <CandidateApplicationDialog candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        onAdded={(message) => { setSelectedCandidate(null); notify(message) }} />
    </div>
  )
}
