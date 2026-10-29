import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

import {
  api,
  createApplication,
  getRequisitions,
  Permissions,
  searchApplicationCandidates,
  searchCandidates,
} from '../../api/client'

import { usePermission } from '../../auth/usePermission'

import { CandidateForm, CandidateList } from '../../components/candidates'

import type { CandidateFormValues } from '../../components/candidates'
import type {
  CandidateListItem,
  RequisitionListItem,
} from '../../types/domain'

import {
  Button,
  EmptyState,
  Modal,
  PageHeader,
  SearchField,
} from '../../components/shared'

import {
  getApiError,
  getResumeError,
  phoneCountries,
} from './candidatePageHelpers'

import type {
  ApiFailure,
  CandidateDetail,
  DuplicateResult,
} from './candidatePageHelpers'

const emptyForm: CandidateFormValues = {
  fullName: '',
  email: '',
  phone: '',
  skills: '',
  source: 'Referral',
}

/** Owner: Ibtesam */
export function TalentPoolPage() {
  const navigate = useNavigate()

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

  const [matches, setMatches] = useState<CandidateListItem[]>([])
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [pageMessage, setPageMessage] = useState('')
  const [busy, setBusy] = useState(false)

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
  const [applicationSuccess, setApplicationSuccess] = useState<string | null>(null)

  const applicationSubmitLock = useRef(false)

  // Permission-aware candidate search (single effect)
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
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
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
    setForm(emptyForm)
    setPhoneCountry('')
    setConsentDate('')
    setResumeFile(null)
    setMatches([])
    setFormError('')
    setFormMessage('')
    setPageMessage('')
    setOpen(true)
  }

  function closeCreateForm() {
    if (!busy) {
      setOpen(false)
    }
  }

  function updateForm(values: CandidateFormValues) {
    setForm(values)
    setMatches([])
    setFormError('')
    setFormMessage('')
  }

  async function checkDuplicates() {
    if (busy || !canManage) {
      return
    }

    if (!form.email.trim() && !form.phone.trim()) {
      setFormError('Enter an email address or phone number first.')
      return
    }

    setBusy(true)
    setFormError('')
    setFormMessage('')
    setMatches([])

    try {
      const response = await api.get<DuplicateResult>('/candidates/duplicates', {
        params: {
          Email: form.email.trim() || undefined,
          Phone: form.phone.trim() || undefined,
          PhoneCountry: phoneCountry || undefined,
        },
      })

      setMatches(response.data.matches)

      setFormMessage(
        response.data.isDuplicate
          ? 'Existing candidates were found. Check the matches below.'
          : 'No matching candidates were found. Creation will check again.',
      )
    } catch (cause) {
      setFormError(getApiError(cause))
    } finally {
      setBusy(false)
    }
  }

  async function createCandidate() {
    if (busy || !canManage) {
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
      setFormError('Full name, email, phone and source are required.')
      return
    }

    if (!resumeFile) {
      setFormError('Please select the required PDF resume.')
      return
    }

    const fileError = getResumeError(resumeFile)

    if (fileError) {
      setFormError(fileError)
      return
    }

    const digits = form.phone.trim().replace(/\D/g, '')
    const callingCode = phoneCountries.find((c) => c.code === phoneCountry)?.callingCode
    const phoneValue =
      callingCode && digits
        ? `+${callingCode}${digits.replace(new RegExp(`^${callingCode}`), '')}`
        : form.phone.trim()
    const body = new FormData()

    body.append('FullName', form.fullName.trim())
    body.append('Email', form.email.trim())
    body.append('Phone', phoneValue)
    body.append('Skills', form.skills.trim())
    body.append('Source', form.source.trim())
    body.append('PhoneCountry', phoneCountry)
    if (consentDate) {
      body.append('ConsentDate', consentDate)
    }
    body.append('file', resumeFile)

    setBusy(true)
    setMatches([])

    try {
      const createResponse = await api.post<CandidateDetail>(
        '/candidates',
        body,
        { params: { confirmDuplicate: matches.length > 0 } },
      )

      const created = createResponse.data

      setOpen(false)
      setForm(emptyForm)
      setPhoneCountry('')
      setConsentDate('')
      setResumeFile(null)
      setMatches([])
      setFormError('')
      setFormMessage('')

      if (canViewPool) {
        navigate(`/pool/${created.candidateId}`)
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
        setPageMessage(
          `${created.fullName} created. Choose a published requisition to add them.`,
        )
        return
      }

      setPageMessage('Candidate created successfully.')
    } catch (cause) {
      if (axios.isAxiosError<ApiFailure>(cause)) {
        setMatches(cause.response?.data?.duplicate?.matches ?? [])
      }

      setFormError(getApiError(cause))
    } finally {
      setBusy(false)
    }
  }

  // Add to requisition handlers
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

  const publishedRequisitions = requisitions.filter(
    (requisition) => requisition.status === 'Published',
  )

  return (
    <div className="page">
      <PageHeader
        title="Talent pool"
        subtitle={
          usesScopedCandidateSearch
            ? 'Search candidates linked to requisitions you can access.'
            : 'Search and manage candidate profiles.'
        }
        actions={
          <>
            {canSearchCandidates && (
              <Button
                disabled={loading}
                onClick={() => setRetryAttempt((attempt) => attempt + 1)}
              >
                Refresh
              </Button>
            )}

            {canManage && (
              <Button variant="primary" onClick={openCreateForm}>
                Add candidate
              </Button>
            )}
          </>
        }
      />

      <SearchField
        value={q}
        onChange={setQ}
        placeholder="Search name, email, or phone…"
      />

      {pageMessage && <p role="status">{pageMessage}</p>}

      {applicationSuccess && (
        <div className="panel" role="status">
          {applicationSuccess}
        </div>
      )}

      {loading ? (
        <div className="empty-state" role="status">
          Loading candidates…
        </div>
      ) : error ? (
        <div className="panel">
          <p className="error" role="alert">{error}</p>
          {!searchForbidden && (
            <Button
              variant="primary"
              onClick={() => setRetryAttempt((attempt) => attempt + 1)}
            >
              Retry
            </Button>
          )}
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
          onSelect={
            canViewPool
              ? (candidateId) => navigate(`/pool/${candidateId}`)
              : undefined
          }
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

      <Modal open={open} title="Add candidate" onClose={closeCreateForm}>
        {formError && (
          <p className="error" role="alert">
            {formError}
          </p>
        )}

        {formMessage && <p role="status">{formMessage}</p>}

        {matches.length > 0 && (
          <section className="panel">
            <h3>Existing candidates</h3>
            <p>
              Review these records before adding another candidate.
              {canViewPool && ' Select a row to open the existing profile.'}
            </p>

            <CandidateList
              items={matches}
              onSelect={
                canViewPool
                  ? (candidateId) => navigate(`/pool/${candidateId}`)
                  : undefined
              }
            />
          </section>
        )}

        <fieldset
          disabled={busy}
          className="stack"
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <label className="field">
            Country for a local phone number
            <select
              value={phoneCountry}
              onChange={(event) => {
                setPhoneCountry(event.target.value)
                setMatches([])
                setFormError('')
                setFormMessage('')
              }}
            >
              <option value="">Choose a country</option>
              {phoneCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Consent date — optional
            <input
              type="date"
              value={consentDate}
              onChange={(event) => setConsentDate(event.target.value)}
            />
          </label>

          <label className="field">
            Resume — PDF required, maximum 5 MB
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) =>
                setResumeFile(event.target.files?.[0] ?? null)
              }
            />
          </label>

          <CandidateForm
            values={form}
            onChange={updateForm}
            onCheckDuplicates={() => void checkDuplicates()}
            onSubmit={() => void createCandidate()}
          />
        </fieldset>

        {busy && <p role="status">Please wait...</p>}
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