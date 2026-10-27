import { Link } from 'react-router-dom'
import { Permissions } from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import { InterviewCard } from '../../components/interviews'
import { ApiGapBanner, Button, EmptyState, PageHeader } from '../../components/shared'

/** Owner: Tayyab */
export function MyInterviewsPage() {
  const canSchedule = usePermission(Permissions.InterviewsSchedule)

  return (
    <div className="page">
      <PageHeader
        title="My interviews"
        subtitle="Feedback independence + status actions."
        actions={
          canSchedule ? (
            <Link to="/interviews/schedule">
              <Button variant="primary">Schedule interview</Button>
            </Link>
          ) : null
        }
      />
      <ApiGapBanner
        contract="Interview APIs"
        note="No /api/interviews controller yet — build UI against planned contracts."
      />
      <EmptyState title="No interviews loaded" message="Wire list endpoint when available." />
      {/* Example composition (hidden until data exists): */}
      {false ? (
        <InterviewCard
          interview={{
            interviewId: 'x',
            applicationId: 'a',
            candidateName: 'Sample',
            requisitionTitle: 'Role',
            scheduledAt: '',
            type: 'Technical',
            mode: 'Video',
            status: 'Scheduled',
            panel: [],
          }}
        />
      ) : null}
    </div>
  )
}
