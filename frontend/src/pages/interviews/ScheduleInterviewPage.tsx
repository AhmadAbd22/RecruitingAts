import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, Permissions } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { usePermission } from '../../auth/usePermission'
import { PanelPicker } from '../../components/interviews'
import type { PanelCandidate } from '../../components/interviews'
import { Button, EmptyState, PageHeader } from '../../components/shared'
import type { ApplicationPipelineItemDto, TeamMember } from '../../types/domain'
import { getInterviewError } from './interviewHelpers'
import './interviews.css'

export function ScheduleInterviewPage() {
  const { user } = useAuth()
  const canSchedule = usePermission(Permissions.InterviewsSchedule)

  const [applications, setApplications] = useState<ApplicationPipelineItemDto[]>([])
  const [applicationId, setApplicationId] = useState('')
  const [members, setMembers] = useState<PanelCandidate[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [lead, setLead] = useState<string | null>(null)
  const [loadedFor, setLoadedFor] = useState('')

  const [interviewType, setInterviewType] = useState('Technical')
  const [mode, setMode] = useState('Video')
  const [when, setWhen] = useState('')
  const [loading, setLoading] = useState(true)
  const [panelLoading, setPanelLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const noticeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error || message) noticeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [error, message])

  const application = applications.find((item) => item.applicationId === applicationId)
  const requisitionId = application?.requisitionId
  const teamReady = applicationId !== '' && loadedFor === applicationId

  useEffect(() => {
    const controller = new AbortController()
    setApplications([])
    setApplicationId('')
    setError('')
    setMessage('')

    if (!canSchedule) {
      setLoading(false)
      return
    }

    setLoading(true)

    async function loadApplications() {
      try {
        const { data } = await api.get<ApplicationPipelineItemDto[]>(
          '/applications/pipeline',
          { signal: controller.signal },
        )
        if (!controller.signal.aborted) setApplications(data)
      } catch (error) {
        if (!controller.signal.aborted) setError(getInterviewError(error))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadApplications()
    return () => controller.abort()
  }, [canSchedule, user?.id])

  useEffect(() => {
    const controller = new AbortController()
    setMembers([])
    setSelected([])
    setLead(null)
    setLoadedFor('')
    setPanelLoading(false)

    if (!requisitionId || !applicationId) return

    setPanelLoading(true)

    async function loadPanel() {
      try {
        const { data } = await api.get<{ team: TeamMember[] }>(
          '/requisitions/' + requisitionId,
          { signal: controller.signal },
        )

        const eligible = data.team
          .filter((member) =>
            member.teamRole === 'TechnicalInterviewer' ||
            member.teamRole === 'FinalInterviewer',
          )
          .map((member) => ({
            employeeId: member.employeeId,
            name: member.employeeName,
            teamRole: member.teamRole === 'TechnicalInterviewer' ? 'Technical interviewer' : 'Final interviewer',
          }))

        if (!controller.signal.aborted) {
          setMembers(eligible)
          setLoadedFor(applicationId)
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(getInterviewError(error))
      } finally {
        if (!controller.signal.aborted) setPanelLoading(false)
      }
    }

    void loadPanel()
    return () => controller.abort()
  }, [applicationId, requisitionId])

  function toggleMember(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((employeeId) => employeeId !== id)
        : [...current, id],
    )
    if (lead === id) setLead(null)
  }

  async function scheduleInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setError('')
    setMessage('')
    const scheduledDate = new Date(when)

    if (!application || !teamReady || selected.length === 0) {
      setError('Select an application and at least one panel member.')
      return
    }

    if (!when || Number.isNaN(scheduledDate.getTime())) {
      setError('Select a valid date and time.')
      return
    }

    if (lead && !selected.includes(lead)) {
      setError('The lead must be a selected panel member.')
      return
    }

    setSaving(true)
    try {
      await api.post('/interviews', {
        applicationId,
        interviewType,
        mode,
        scheduledAt: scheduledDate.toISOString(),
        panelEmployeeIds: selected,
        leadEmployeeId: lead,
      })

      setApplicationId('')
      setWhen('')
      setMessage('Interview scheduled. Assigned panel members can find it in My interviews.')
    } catch (error) {
      setError(getInterviewError(error))
    } finally {
      setSaving(false)
    }
  }

  if (!canSchedule) {
    return (
      <div className="page interviews-page">
        <PageHeader title="Schedule interview" />
        <div className="interview-notice interview-notice--error" role="alert">
          <strong>Scheduling is not available for this account</strong>
          <p>You do not have permission to schedule interviews.</p>
        </div>
        <Link className="btn btn-ghost interview-back-link" to="/interviews">Back to my interviews</Link>
      </div>
    )
  }

  return (
    <div className="page interviews-page">
      <PageHeader
        title="Schedule interview"
        subtitle="Choose the candidate, set the details and select the interview panel."
        actions={<Link className="btn btn-ghost" to="/interviews">Back to my interviews</Link>}
      />

      {(error || message) && <div ref={noticeRef}>
        {error && <div className="interview-notice interview-notice--error" role="alert"><strong>Please check the interview details</strong><p>{error}</p></div>}
        {message && <div className="interview-notice interview-notice--success" role="status"><strong>Interview scheduled successfully</strong><p>{message}</p></div>}
      </div>}

      {loading ? <div className="interview-loading interview-loading-panel" role="status"><span className="interview-spinner" aria-hidden="true" />Loading applications...</div> : error && applications.length === 0 ? null : applications.length === 0 ? (
        <EmptyState
          title="No applications available"
          message="An application must exist within your access scope before scheduling."
        />
      ) : (
        <form className="interview-schedule-layout" onSubmit={scheduleInterview}>
          <fieldset disabled={saving} className="interview-fieldset interview-form-panel">
            <legend className="interview-sr-only">Interview schedule</legend>
            <section className="interview-form-section" aria-labelledby="interview-candidate-title">
              <div className="interview-section-heading">
                <span className="interview-step" aria-hidden="true">1</span>
                <div><h2 id="interview-candidate-title">Candidate and job</h2><p>Choose the application this interview belongs to.</p></div>
              </div>
              <label className="field">
                <span>Application <span className="interview-required" aria-hidden="true">*</span></span>
                <select required value={applicationId} onChange={(event) => {
                  setApplicationId(event.target.value)
                  setError('')
                  setMessage('')
                }}>
                  <option value="">Select a candidate and job</option>
                  {applications.map((item) => (
                    <option key={item.applicationId} value={item.applicationId}>
                      {item.candidateName} - {item.requisitionTitle}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="interview-form-section" aria-labelledby="interview-details-title">
              <div className="interview-section-heading">
                <span className="interview-step" aria-hidden="true">2</span>
                <div><h2 id="interview-details-title">Interview details</h2><p>Set the format and when the interview will take place.</p></div>
              </div>
              <div className="interview-fields-grid">
                <label className="field">
                  Interview type
                  <select value={interviewType} onChange={(event) => setInterviewType(event.target.value)}>
                    <option>Technical</option>
                    <option>Panel</option>
                    <option>Final</option>
                  </select>
                </label>
                <label className="field">
                  Meeting mode
                  <select value={mode} onChange={(event) => setMode(event.target.value)}>
                    <option>Video</option>
                    <option>Onsite</option>
                    <option>Phone</option>
                  </select>
                </label>
                <label className="field interview-full-width">
                  <span>Date and time (your local time) <span className="interview-required" aria-hidden="true">*</span></span>
                  <input required type="datetime-local" value={when}
                    onChange={(event) => setWhen(event.target.value)} />
                </label>
              </div>
            </section>

            <section className="interview-form-section" aria-labelledby="interview-panel-title">
              <div className="interview-section-heading">
                <span className="interview-step" aria-hidden="true">3</span>
                <div><h2 id="interview-panel-title">Interview panel</h2><p>Select at least one interviewer. You can choose one optional lead.</p></div>
              </div>
              {panelLoading ? <p className="interview-loading" role="status"><span className="interview-spinner" aria-hidden="true" />Loading interviewer team...</p> : teamReady ? (
                members.length === 0 ? (
                  <EmptyState title="No interviewers on this team" message="Ask the requisition owner to add a technical or final interviewer to the team." />
                ) : (
                  <div className="interview-panel-picker">
                    <div className="interview-panel-heading"><strong>Available interviewers</strong><span className="interview-count">{selected.length} selected</span></div>
                    <PanelPicker members={members} selectedEmployeeIds={selected}
                      leadEmployeeId={lead} onToggleMember={toggleMember} onLeadChange={setLead} />
                  </div>
                )
              ) : <div className="interview-panel-placeholder"><strong>Choose a candidate and job first</strong><p>Available interviewers from that job's team will appear here.</p></div>}
              {lead && <Button className="interview-clear-lead" onClick={() => setLead(null)}>Clear lead</Button>}
            </section>

            <div className="interview-form-footer">
              <p className="interview-hint">Assigned panel members will see the interview in My interviews.</p>
              <Button type="submit" variant="primary"
                disabled={saving || panelLoading || !teamReady || selected.length === 0}>
                {saving && <span className="interview-spinner" aria-hidden="true" />}
                {saving ? 'Scheduling...' : 'Schedule interview'}
              </Button>
            </div>
          </fieldset>

          <aside className="interview-summary" aria-label="Interview summary">
            <span className="interview-eyebrow">At a glance</span>
            <h2>Interview summary</h2>
            <p className="interview-hint">Your selections appear here as you fill in the form.</p>
            <dl>
              <div><dt>Candidate</dt><dd>{application?.candidateName || 'No candidate selected'}</dd></div>
              <div><dt>Job opening</dt><dd>{application?.requisitionTitle || 'No job selected'}</dd></div>
              <div><dt>Format</dt><dd>{interviewType} / {mode}</dd></div>
              <div><dt>Date and time (local)</dt><dd>{when ? new Date(when).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Choose a date and time'}</dd></div>
              <div><dt>Panel</dt><dd>{selected.length ? `${selected.length} interviewer${selected.length === 1 ? '' : 's'} selected` : 'No interviewers selected'}</dd></div>
              <div><dt>Lead interviewer</dt><dd>{members.find((member) => member.employeeId === lead)?.name || 'Not selected (optional)'}</dd></div>
            </dl>
          </aside>
        </form>
      )}
    </div>
  )
}
