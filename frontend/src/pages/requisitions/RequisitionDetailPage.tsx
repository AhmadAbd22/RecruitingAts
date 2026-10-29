import { useParams } from 'react-router-dom'
import { Permissions } from '../../api/client'
import { usePermissions } from '../../auth/usePermission'
import {
  BudgetPanel,
  StatusActions,
  TeamPanel,
} from '../../components/requisitions'
import { EmptyState, PageHeader, StatusChip } from '../../components/shared'

/** Owner: Amina (+ team panel: Abdul-Manan) */
export function RequisitionDetailPage() {
  const { id } = useParams()
  const { can } = usePermissions()

  // TODO: load requisition by id
  const status = 'Draft'

  return (
    <div className="page">
      <PageHeader
        title="Requisition detail"
        subtitle={id}
        actions={<StatusChip status={status} />}
      />
      <EmptyState
        title="Wire data"
        message="Load GET /api/requisitions/{id} then pass props into the panels below."
      />
      <div className="grid-2">
        <section className="panel">
          <h2>Workflow</h2>
          <StatusActions
            status={status}
            canManage={can(Permissions.RequisitionsManage)}
            canApprove={can(Permissions.RequisitionsApprove)}
          />
        </section>
        <BudgetPanel
          canView={can(Permissions.CompensationView)}
          canEdit={can(Permissions.CompensationEdit)}
        />
      </div>
      <TeamPanel members={[]} canManage={can(Permissions.RequisitionsManage)} />
    </div>
  )
}
