import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, Permissions } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { usePermission } from '../../auth/usePermission'
import { PanelPicker } from '../../components/interviews'
import type { PanelCandidate } from '../../components/interviews'
import { Button, EmptyState, PageHeader } from '../../components/shared'
import type { ApplicationPipelineItemDto, TeamMember } from '../../types/domain'
import { getInterviewError } from './interviewHelpers'

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
            teamRole: member.teamRole,
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
      <div className="page">
        <PageHeader title="Schedule interview" />
        <p className="error" role="alert">You do not have permission to schedule interviews.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Schedule interview"
        subtitle="Choose an application and its interviewer team."
        actions={<Link className="btn btn-ghost" to="/interviews">My interviews</Link>}
      />

      {error && <p className="error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {loading ? <p role="status">Loading applications...</p> : applications.length === 0 ? (
        <EmptyState
          title="No applications available"
          message="An application must exist within your access scope before scheduling."
        />
      ) : (
        <form className="panel stack" onSubmit={scheduleInterview}>
          <fieldset disabled={saving} className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <label className="field">
              Application
              <select required value={applicationId} onChange={(event) => {
                setApplicationId(event.target.value)
                setError('')
                setMessage('')
              }}>
                <option value="">Select an application</option>
                {applications.map((item) => (
                  <option key={item.applicationId} value={item.applicationId}>
                    {item.candidateName} - {item.requisitionTitle}
                  </option>
                ))}
              </select>
            </label>

            <div className="row wrap">
              <label className="field grow">
                Type
                <select value={interviewType} onChange={(event) => setInterviewType(event.target.value)}>
                  <option>Technical</option>
                  <option>Panel</option>
                  <option>Final</option>
                </select>
              </label>
              <label className="field grow">
                Mode
                <select value={mode} onChange={(event) => setMode(event.target.value)}>
                  <option>Video</option>
                  <option>Onsite</option>
                  <option>Phone</option>
                </select>
              </label>
            </div>

            <label className="field">
              Date and time (your local time)
              <input required type="datetime-local" value={when}
                onChange={(event) => setWhen(event.target.value)} />
            </label>

            <h3>Panel</h3>
            <p className="muted">Select at least one interviewer. A lead is optional.</p>

            {panelLoading ? <p role="status">Loading interviewer team...</p> : teamReady ? (
              <PanelPicker members={members} selectedEmployeeIds={selected}
                leadEmployeeId={lead} onToggleMember={toggleMember} onLeadChange={setLead} />
            ) : <p className="muted">Select an application to load its interviewer team.</p>}

            {lead && <Button onClick={() => setLead(null)}>Clear lead</Button>}

            <Button type="submit" variant="primary"
              disabled={saving || panelLoading || !teamReady || selected.length === 0}>
              {saving ? 'Scheduling...' : 'Schedule interview'}
            </Button>
          </fieldset>
        </form>
      )}
    </div>
  )
}