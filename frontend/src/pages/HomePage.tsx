import { Link } from 'react-router-dom'
import { Permissions } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { usePermissions } from '../auth/usePermission'
import './management.css'

/** Owner: Tayyab */
export function HomePage() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const links = [
    { title: 'Requisitions', to: '/requisitions', icon: 'M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 7h16v13H4zM4 12h16M10 12v3h4v-3', description: 'Manage job openings, approvals and the people responsible for hiring.', visible: true },
    { title: 'Talent pool', to: '/pool', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0', description: 'Find candidate profiles, check duplicates and attach a PDF resume.', visible: can(Permissions.PoolView) || can(Permissions.CandidatesManage) || can(Permissions.ApplicationsManage) },
    { title: 'Application pipeline', to: '/pipeline', icon: 'M3 4h5v16H3zM10 4h5v11h-5zM17 4h4v7h-4z', description: 'Follow each candidate through the hiring stages and record the next step.', visible: can(Permissions.ApplicationsManage) },
    { title: 'My interviews', to: '/interviews', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M8 15h3M8 18h6', description: 'See assigned interviews and submit your feedback before reading others.', visible: can(Permissions.InterviewsFeedbackAdd) || can(Permissions.InterviewsSchedule) },
    { title: 'Pipeline stages', to: '/stages', icon: 'M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1', description: 'Set the working stages your team uses to review applications.', visible: can(Permissions.StagesManage) },
    { title: 'Compensation audit', to: '/audit', icon: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7zM8 12l3 3 5-6', description: 'Review who accessed or changed confidential job budgets.', visible: can(Permissions.CompensationView) },
  ]

  return (
    <div className="page management-page">
      <header className="workspace-header">
        <span className="workspace-heading-note">Your recruiting workspace</span>
        <h1>Welcome, {user?.fullName ?? 'team member'}</h1>
        <p>From a new job opening to the final decision, keep your team's hiring work in one place.</p>
      </header>
      <div className="management-links" aria-label="Recruiting modules">
        {links.filter((link) => link.visible).map((link) => <Link className="management-link" to={link.to} key={link.to}>
          <span className="workspace-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={link.icon} /></svg></span>
          <strong>{link.title}</strong><p>{link.description}</p>
          <span className="workspace-card-action">Open<span className="workspace-action-name"> {link.title.toLowerCase()}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></span>
        </Link>)}
      </div>
      <section className="panel">
        <h2>How the hiring process fits together</h2>
        <ol className="management-steps"><li>Publish a job</li><li>Add candidates to the job</li><li>Review the pipeline</li><li>Interview and record feedback</li><li>Record the final decision</li></ol>
        <p className="muted management-hint">Your permissions and each job's team determine what you can view and change.</p>
      </section>
    </div>
  )
}
