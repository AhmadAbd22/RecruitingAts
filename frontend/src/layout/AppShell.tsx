import { Outlet } from 'react-router-dom'
import { Permissions } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { usePermissions } from '../auth/usePermission'
import { NavItem } from './NavItem'

type NavDef = {
  to: string
  label: string
  end?: boolean
  show: boolean
}

/** Owner: Tayyab — left rail + outlet; permission-gated nav (mockup parity). */
export function AppShell() {
  const { user, logout } = useAuth()
  const { can } = usePermissions()

  const links: NavDef[] = [
    { to: '/', label: 'Home', end: true, show: true },
    {
      to: '/requisitions',
      label: 'Requisitions',
      show: can(Permissions.RequisitionsManage) || can(Permissions.RequisitionsViewAll),
    },
    {
      to: '/pool',
      label: 'Talent pool',
      show:
        can(Permissions.PoolView) ||
        can(Permissions.CandidatesManage) ||
        can(Permissions.ApplicationsManage),
    },
    {
      to: '/pipeline',
      label: 'Pipeline',
      show: can(Permissions.ApplicationsManage),
    },
    {
      to: '/interviews',
      label: 'My interviews',
      show: can(Permissions.InterviewsFeedbackAdd) || can(Permissions.InterviewsSchedule),
    },
    {
      to: '/stages',
      label: 'Stages',
      show: can(Permissions.StagesManage),
    },
    {
      to: '/audit',
      label: 'Comp audit',
      show: can(Permissions.CompensationView),
    },
  ]

  return (
    <div className="app-shell">
      <aside className="app-nav" aria-label="Primary">
        <div className="brand">
          Recruiting ATS
          <small>Talent operations</small>
        </div>
        <nav className="nav-list">
          {links
            .filter((l) => l.show)
            .map((l) => (
              <NavItem key={l.to} to={l.to} label={l.label} end={l.end} />
            ))}
        </nav>
        <div className="nav-foot">
          <strong>{user?.fullName}</strong>
          <span>{user?.roles.join(', ') || 'No roles'}</span>
          <button type="button" className="btn btn-ghost nav-logout" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  )
}
