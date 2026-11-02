import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, Permissions } from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import { Button, PageHeader } from '../../components/shared'
import { getApiError, getResumeDownloadError, getResumeError } from './candidatePageHelpers'
import type { CandidateDetail } from './candidatePageHelpers'
import { CandidateApplicationDialog } from './CandidateApplicationDialog'
import { PoolToast } from './PoolToast'
import { usePoolToast } from './usePoolToast'
import './pool.css'

export function CandidateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const canView = usePermission(Permissions.PoolView)
  const canManage = usePermission(Permissions.CandidatesManage)
  const canManageApplications = usePermission(Permissions.ApplicationsManage)
  const { toast, notify, dismissToast } = usePoolToast()

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null)
  const [applicationCandidate, setApplicationCandidate] = useState<CandidateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [action, setAction] = useState<'download' | 'upload' | null>(null)
  const [uploadVersion, setUploadVersion] = useState(0)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const busy = action !== null
  const activeId = useRef<string | undefined>(id?.toLowerCase())
  const resumeInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const notice = location.state as { poolNotice?: string } | null
    if (typeof notice?.poolNotice === 'string') {
      notify(notice.poolNotice)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate, notify])

  useEffect(() => {
    activeId.current = canView ? id?.toLowerCase() : undefined
    if (!canView || !id) { setLoading(false); return }

    const controller = new AbortController()
    setLoading(true)
    setCandidate(null)
    setApplicationCandidate(null)
    setLoadError('')
    setActionError('')
    setAction(null)

    async function loadCandidate() {
      try {
        const { data } = await api.get<CandidateDetail>(`/candidates/${id}`, {
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setCandidate(data)
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(getApiError(error))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadCandidate()
    return () => { controller.abort(); activeId.current = undefined }
  }, [id, canView, retryAttempt])

  async function downloadResume() {
    if (!candidate || busy || !canView) return
    const targetId = candidate.candidateId.toLowerCase()
    const downloadName = `${candidate.fullName}.pdf`
    setAction('download')
    setActionError('')

    try {
      const response = await api.get<Blob>(`/candidates/${targetId}/resume`, {
        responseType: 'blob',
        validateStatus: () => true,
      })
      const downloadError = await getResumeDownloadError(response)
      if (activeId.current !== targetId) return

      if (downloadError) {
        setActionError(downloadError)
        notify(downloadError, 'error')
        return
      }

      const fileUrl = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = downloadName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000)
      notify('Resume download started.')
    } catch (error) {
      if (activeId.current === targetId) {
        const message = getApiError(error)
        setActionError(message)
        notify(message, 'error')
      }
    } finally {
      if (activeId.current === targetId) setAction(null)
    }
  }

  async function replaceResume(file: File) {
    if (!candidate || busy || !canManage) return
    setActionError('')
    const fileError = getResumeError(file)
    if (fileError) {
      setActionError(fileError)
      notify(fileError, 'error')
      setUploadVersion((value) => value + 1)
      return
    }

    const targetId = candidate.candidateId.toLowerCase()
    const body = new FormData()
    body.append('file', file)
    setAction('upload')

    try {
      const { data } = await api.postForm<CandidateDetail>(
        `/candidates/${targetId}/resume`, body,
      )
      if (activeId.current === targetId) {
        setCandidate(data)
        notify('Resume updated successfully.')
      }
    } catch (error) {
      if (activeId.current === targetId) {
        const message = getApiError(error)
        setActionError(message)
        notify(message, 'error')
      }
    } finally {
      if (activeId.current === targetId) {
        setAction(null)
        setUploadVersion((value) => value + 1)
      }
    }
  }

  const initials = candidate?.fullName.trim().split(/\s+/).slice(0, 2)
    .map((name) => name[0]).join('').toUpperCase()

  return (
    <div className="page pool-page">
      {!applicationCandidate && <PoolToast toast={toast} onDismiss={dismissToast} />}
      <PageHeader title={candidate?.fullName ?? 'Candidate profile'}
        subtitle="Contact information, background and resume."
        actions={<>
          {candidate && canManageApplications && (
            <Button variant="primary" disabled={busy} onClick={() => {
              dismissToast()
              setApplicationCandidate(candidate)
            }}>Add to requisition</Button>
          )}
          <Button disabled={busy} onClick={() => navigate('/pool')}>← Back to talent pool</Button>
        </>} />

      {!canView ? (
        <div className="pool-notice pool-notice--error" role="alert">
          You do not have permission to view candidate profiles.
        </div>
      ) : loading ? (
        <div className="panel pool-loading" role="status">
          <span className="pool-spinner" aria-hidden="true" /> Loading candidate...
        </div>
      ) : loadError ? (
        <div className="panel stack">
          <p className="pool-notice pool-notice--error" role="alert">{loadError}</p>
          <div><Button onClick={() => setRetryAttempt((value) => value + 1)}>Try again</Button></div>
        </div>
      ) : candidate ? (
        <>
          <section className="panel pool-profile-summary" aria-label="Profile summary">
            <span className="pool-avatar" aria-hidden="true">{initials}</span>
            <div>
              <h2>{candidate.fullName}</h2>
              <div className="pool-profile-tags">
                <span className="pool-badge">{candidate.source || 'Source not recorded'}</span>
                <span className={`pool-badge ${candidate.hasResume ? 'pool-badge--ok' : ''}`}>
                  {candidate.hasResume ? 'PDF resume attached' : 'No resume attached'}
                </span>
              </div>
            </div>
          </section>

          <div className="pool-profile-grid">
            <section className="panel">
              <h2 className="pool-section-title">Candidate information</h2>
              <dl className="pool-details">
                <div><dt>Full name</dt><dd>{candidate.fullName}</dd></div>
                <div><dt>Email</dt><dd><a href={`mailto:${candidate.email}`}>{candidate.email}</a></dd></div>
                <div><dt>Phone</dt><dd><a href={`tel:${candidate.phone}`}>{candidate.phone}</a></dd></div>
                <div><dt>Source</dt><dd>{candidate.source || 'Not recorded'}</dd></div>
                <div className="pool-span-full"><dt>Skills</dt><dd>{candidate.skills || 'Not recorded'}</dd></div>
                <div><dt>Consent date</dt><dd>{candidate.consentDate?.slice(0, 10) || 'Not recorded'}</dd></div>
                <div><dt>Created at (UTC)</dt><dd>{candidate.createdAt.slice(0, 19).replace('T', ' ')}</dd></div>
              </dl>
            </section>

            <section className="panel pool-resume" aria-busy={busy}>
              <h2 className="pool-section-title">Resume</h2>
              {candidate.hasResume ? (
                <div className="pool-file">
                  <span className="pool-file-icon" aria-hidden="true">PDF</span>
                  <div><p className="pool-file-name">{candidate.fullName}.pdf</p>
                    <p className="pool-hint">Ready to download</p></div>
                </div>
              ) : <p className="pool-hint">No resume is currently attached.</p>}

              <div className="pool-resume-actions">
                {candidate.hasResume && (
                  <Button variant="primary" disabled={busy} onClick={() => void downloadResume()}>
                    {action === 'download' && <span className="pool-spinner" aria-hidden="true" />}
                    {action === 'download' ? 'Downloading...' : 'Download PDF'}
                  </Button>
                )}
                {canManage && (
                  <>
                    <Button disabled={busy} onClick={() => resumeInput.current?.click()}>
                      {action === 'upload' && <span className="pool-spinner" aria-hidden="true" />}
                      {action === 'upload' ? 'Uploading...' : candidate.hasResume ? 'Replace resume' : 'Upload resume'}
                    </Button>
                    <input key={uploadVersion} ref={resumeInput} type="file" hidden
                      aria-label="Choose a PDF resume" accept=".pdf,application/pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void replaceResume(file)
                      }} />
                  </>
                )}
              </div>
              {canManage && <p className="pool-hint">PDF only, up to 5 MB. A replacement becomes the current resume.</p>}
              {actionError && <p className="pool-notice pool-notice--error" role="alert">{actionError}</p>}
            </section>
          </div>
        </>
      ) : <div className="panel">Candidate not found.</div>}
      <CandidateApplicationDialog candidate={applicationCandidate}
        onClose={() => setApplicationCandidate(null)}
        onAdded={(message) => { setApplicationCandidate(null); notify(message) }} />
    </div>
  )
}
