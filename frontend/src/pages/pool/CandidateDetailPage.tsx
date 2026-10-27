import { useParams } from 'react-router-dom'
import { Permissions } from '../../api/client'
import { usePermission } from '../../auth/usePermission'
import { ResumePanel } from '../../components/candidates'
import { EmptyState, PageHeader } from '../../components/shared'

/** Owner: Ibtesam / Tayyab */
export function CandidateDetailPage() {
  const { id } = useParams()
  const canManage = usePermission(Permissions.CandidatesManage)

  return (
    <div className="page">
      <PageHeader title="Candidate" subtitle={id} />
      <EmptyState title="Wire profile" message="GET /api/candidates/{id}" />
      <ResumePanel hasResume={false} canManage={canManage} />
      {/* TODO: applications in scope list + add to requisition */}
    </div>
  )
}
