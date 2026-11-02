import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  api,
  getPipeline,
  getRequisitions,
  Permissions,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { usePermissions } from '../auth/usePermission'
import { EmptyState, PageHeader } from '../components/shared'

type CountState = number | null

type ActionLink = {
  to: string
  label: string
  primary?: boolean
  show: boolean
}

/** Owner: Tayyab — role-aware work snapshot (mockup home parity). */
export function HomePage() {
  const { user } = useAuth()
  const { can } = usePermissions()

  const canRequisitions =
    can(Permissions.RequisitionsManage) || can(Permissions.RequisitionsViewAll)
  const canPipeline = can(Permissions.ApplicationsManage)
  const canInterviews =
    can(Permissions.InterviewsFeedbackAdd) || can(Permissions.InterviewsSchedule)
  const canPool =
    can(Permissions.PoolView) ||
    can(Permissions.CandidatesManage) ||
    can(Permissions.ApplicationsManage)
  const canStages = can(Permissions.StagesManage)

  const [pendingApprovals, setPendingApprovals] = useState<CountState>(null)
  const [scopedApplications, setScopedApplications] = useState<CountState>(null)
  const [myInterviews, setMyInterviews] = useState<CountState>(null)
  const [loadingCounts, setLoadingCounts] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadCounts() {
      setLoadingCounts(true)
      setPendingApprovals(null)
      setScopedApplications(null)
      setMyInterviews(null)

      const tasks: Promise<void>[] = []

      if (canRequisitions) {
        tasks.push(
          getRequisitions()
            .then((items) => {
              if (!cancelled) {
                setPendingApprovals(
                  items.filter((item) => item.status === 'PendingApproval').length,
                )
              }
            })
            .catch(() => {
              if (!cancelled) setPendingApprovals(null)
            }),
        )
      }

      if (canPipeline) {
        tasks.push(
          getPipeline()
            .then((items) => {
              if (!cancelled) setScopedApplications(items.length)
            })
            .catch(() => {
              if (!cancelled) setScopedApplications(null)
            }),
        )
      }

      if (canInterviews) {
        tasks.push(
          api
            .get<unknown[]>('/interviews/my')
            .then(({ data }) => {
              if (!cancelled) setMyInterviews(data.length)
            })
            .catch(() => {
              if (!cancelled) setMyInterviews(null)
            }),
        )
      }

      await Promise.all(tasks)
      if (!cancelled) setLoadingCounts(false)
    }

    void loadCounts()
    return () => {
      cancelled = true
    }
  }, [canRequisitions, canPipeline, canInterviews])

  const actions: ActionLink[] = [
    { to: '/requisitions', label: 'Requisitions', show: canRequisitions },
    { to: '/pool', label: 'Talent pool', show: canPool },
    { to: '/pipeline', label: 'Open pipeline', primary: true, show: canPipeline },
    { to: '/interviews', label: 'My interviews', show: canInterviews },
    { to: '/stages', label: 'Stages', show: canStages },
  ]
  const visibleActions = actions.filter((action) => action.show)

  const interviewerOnly = !canPipeline && canInterviews
  const primaryRole = user?.roles?.[0]
  const stats = [
    canRequisitions
      ? {
          key: 'pending',
          label: 'Pending approvals',
          value: formatCount(pendingApprovals, loadingCounts),
        }
      : null,
    canPipeline
      ? {
          key: 'apps',
          label: 'Scoped applications',
          value: formatCount(scopedApplications, loadingCounts),
        }
      : null,
    canInterviews
      ? {
          key: 'interviews',
          label: 'My interviews',
          value: formatCount(myInterviews, loadingCounts),
        }
      : null,
  ].filter((stat): stat is { key: string; label: string; value: string } => stat !== null)

  return (
    <div className="page home-page">
      <PageHeader
        title={`Welcome, ${user?.fullName ?? 'there'}`}
        subtitle="Your scoped work at a glance. Use the left rail anytime."
        actions={
          primaryRole ? <span className="chip chip-ok">{primaryRole}</span> : null
        }
      />

      {interviewerOnly ? (
        <p className="home-hint">
          Interviewer access: requisitions and pipeline stay hidden. Open My interviews to submit
          feedback.
        </p>
      ) : null}

      {stats.length > 0 ? (
        <div className={`grid-3 home-stats${stats.length === 1 ? ' home-stats--single' : ''}`}>
          {stats.map((stat) => (
            <div className="stat" key={stat.key}>
              <div className="label">{stat.label}</div>
              <div className="value">{stat.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {visibleActions.length === 0 ? (
        <EmptyState
          title="No areas available"
          message="This account has no recruiting permissions yet. Ask an admin to assign a role."
        />
      ) : (
        <section className="panel">
          <h2>Next actions</h2>
          <div className="row wrap">
            {visibleActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={`btn${action.primary ? ' btn-primary' : ''}`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function formatCount(value: CountState, loading: boolean): string {
  if (loading && value === null) return '…'
  if (value === null) return '—'
  return String(value)
}
