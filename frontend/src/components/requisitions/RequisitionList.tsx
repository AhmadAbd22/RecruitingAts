import type { RequisitionListItem } from '../../types/domain'
import { DataTable } from '../shared'
import { StatusChip } from '../shared'

export type RequisitionListProps = {
  items: RequisitionListItem[]
  showBudget?: boolean
  onSelect?: (requisitionId: string) => void
}

/** Owner: Amina */
export function RequisitionList({ items, showBudget = false, onSelect }: RequisitionListProps) {
  return (
    <DataTable
      rows={items}
      rowKey={(r) => r.requisitionId}
      onRowClick={onSelect ? (r) => onSelect(r.requisitionId) : undefined}
      emptyMessage="No requisitions match your filters. Try another title or status."
      columns={[
        {
          key: 'title',
          header: 'Title',
          render: (r) => onSelect ? <button className="management-title-link" onClick={(event) => {
            event.stopPropagation(); onSelect(r.requisitionId)
          }}>{r.title}</button> : <strong>{r.title}</strong>,
        },
        { key: 'department', header: 'Dept', render: (r) => r.department },
        {
          key: 'status',
          header: 'Status',
          render: (r) => <StatusChip status={r.status} />,
        },
        { key: 'openings', header: 'Openings', render: (r) => r.openings },
        {
          key: 'budget',
          header: 'Budget',
          render: (r) =>
            showBudget
              ? r.budgetMin == null && r.budgetMax == null ? 'Not set' : `${r.budgetMin?.toLocaleString() ?? 'Not set'} - ${r.budgetMax?.toLocaleString() ?? 'Not set'}`
              : 'Hidden',
        },
      ]}
    />
  )
}
