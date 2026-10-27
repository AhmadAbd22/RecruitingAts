import type { CandidateListItem } from '../../types/domain'
import { DataTable, StatusChip } from '../shared'

export type CandidateListProps = {
  items: CandidateListItem[]
  onSelect?: (candidateId: string) => void
}

/** Owner: Ibtesam */
export function CandidateList({ items, onSelect }: CandidateListProps) {
  return (
    <DataTable
      rows={items}
      rowKey={(c) => c.candidateId}
      onRowClick={onSelect ? (c) => onSelect(c.candidateId) : undefined}
      emptyMessage="No candidates match."
      columns={[
        { key: 'name', header: 'Name', render: (c) => <strong>{c.fullName}</strong> },
        { key: 'email', header: 'Email', render: (c) => c.email },
        { key: 'phone', header: 'Phone', render: (c) => <span className="mono">{c.phone}</span> },
        { key: 'source', header: 'Source', render: (c) => c.source || '—' },
        {
          key: 'resume',
          header: 'Resume',
          render: (c) => (c.hasResume ? <StatusChip status="PDF" tone="ok" /> : '—'),
        },
      ]}
    />
  )
}
