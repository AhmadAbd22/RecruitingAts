import type { PipelineStage } from '../../types/domain'
import { DataTable, StatusChip, Button } from '../shared'

export type StageCatalogTableProps = {
  stages: PipelineStage[]
  onRename?: (pipelineStageId: string) => void
  onDelete?: (pipelineStageId: string) => void
}

/** Owner: Amina — FR-ATS-003 (API gap for CRUD). */
export function StageCatalogTable({ stages, onRename, onDelete }: StageCatalogTableProps) {
  const sorted = [...stages].sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <DataTable
      rows={sorted}
      rowKey={(s) => s.pipelineStageId}
      emptyMessage="No stages configured."
      columns={[
        { key: 'order', header: 'Order', render: (s) => <span className="stage-order">{s.sortOrder}</span> },
        { key: 'name', header: 'Name', render: (s) => <strong>{s.name}</strong> },
        {
          key: 'type',
          header: 'Type',
          render: (s) =>
            s.isReserved ? (
              <StatusChip status="Reserved" />
            ) : s.terminal ? (
              <StatusChip status="Terminal" tone="warn" />
            ) : (
              <StatusChip status="Working" tone="ok" />
            ),
        },
        {
          key: 'actions',
          header: '',
          render: (s) =>
            s.isReserved ? (
              <span className="stage-locked"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>Locked</span>
            ) : (
              <div className="row">
                <Button onClick={() => onRename?.(s.pipelineStageId)}>Edit</Button>
                <Button variant="danger" onClick={() => onDelete?.(s.pipelineStageId)}>
                  Delete
                </Button>
              </div>
            ),
        },
      ]}
    />
  )
}
