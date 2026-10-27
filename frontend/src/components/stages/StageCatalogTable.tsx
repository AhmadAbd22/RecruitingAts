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
        { key: 'order', header: 'Order', render: (s) => s.sortOrder },
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
              <span className="muted">Locked</span>
            ) : (
              <div className="row">
                <Button onClick={() => onRename?.(s.pipelineStageId)}>Rename</Button>
                <Button variant="warn" onClick={() => onDelete?.(s.pipelineStageId)}>
                  Delete
                </Button>
              </div>
            ),
        },
      ]}
    />
  )
}
