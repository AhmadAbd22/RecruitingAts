import { Link } from 'react-router-dom'
import { Permissions } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { usePermissions } from '../auth/usePermission'
import { PageHeader } from '../components/shared'

/** Owner: Tayyab */
export function HomePage() {
  const { user } = useAuth()
  const { can } = usePermissions()

  return (
    <div className="page">
      <PageHeader
        title="Home"
        subtitle={`Signed in as ${user?.fullName ?? '…'}. Compose screens from plug-in components.`}
      />
      <p className="muted">Reference mockup: <code>ui-mockups/demo</code></p>
      <ul className="plain-list">
        {can(Permissions.RequisitionsManage) || can(Permissions.RequisitionsViewAll) ? (
          <li>
            <Link to="/requisitions">Requisitions</Link>
          </li>
        ) : null}
        {can(Permissions.PoolView) ||
        can(Permissions.CandidatesManage) ||
        can(Permissions.ApplicationsManage) ? (
          <li>
            <Link to="/pool">Talent pool</Link>
          </li>
        ) : null}
        {can(Permissions.ApplicationsManage) ? (
          <li>
            <Link to="/pipeline">Pipeline</Link>
          </li>
        ) : null}
        {can(Permissions.InterviewsFeedbackAdd) || can(Permissions.InterviewsSchedule) ? (
          <li>
            <Link to="/interviews">My interviews</Link>
          </li>
        ) : null}
      </ul>
      {/* TODO: optional dashboard stats */}
    </div>
  )
}
