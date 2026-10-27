import { ApiGapBanner, DataTable, PageHeader } from '../../components/shared'

/** Owner: Tayyab */
export function CompensationAuditPage() {
  return (
    <div className="page">
      <PageHeader
        title="Compensation audit"
        subtitle="Views of budget fields should appear here."
      />
      <ApiGapBanner
        contract="GET compensation audit list"
        note="Backend may log views; list endpoint not confirmed."
      />
      <DataTable
        rows={[] as { id: string; at: string; actor: string; entity: string }[]}
        rowKey={(r) => r.id}
        emptyMessage="No audit rows loaded."
        columns={[
          { key: 'at', header: 'When', render: (r) => r.at },
          { key: 'actor', header: 'Actor', render: (r) => r.actor },
          { key: 'entity', header: 'Entity', render: (r) => r.entity },
        ]}
      />
    </div>
  )
}
