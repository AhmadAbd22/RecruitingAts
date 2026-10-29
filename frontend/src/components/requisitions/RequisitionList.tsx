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
      emptyMessage="No requisitions in scope."
      columns={[
        {
          key: 'title',
          header: 'Title',
          render: (r) => <strong>{r.title}</strong>,
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
              ? `${r.budgetMin ?? '—'} – ${r.budgetMax ?? '—'}`
              : 'Hidden',
        },
      ]}
    />
  )
}
