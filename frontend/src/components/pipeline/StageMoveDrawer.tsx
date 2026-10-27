import { Drawer, Button } from '../shared'
import type { PipelineStage } from '../../types/domain'

export type StageMoveDrawerProps = {
  open: boolean
  applicationId?: string | null
  candidateName?: string
  currentStageId?: string
  stages: PipelineStage[]
  dispositionReason: string
  onDispositionReasonChange: (value: string) => void
  onStageChange: (stageId: string) => void
  selectedStageId: string
  onClose: () => void
  onConfirm: () => void
  needsDisposition?: boolean
  error?: string | null
}

/** Owner: Abdul-Manan — FR-APP-005 / FR-APP-006 */
export function StageMoveDrawer({
  open,
  applicationId,
  candidateName = 'Candidate',
  stages,
  dispositionReason,
  onDispositionReasonChange,
  onStageChange,
  selectedStageId,
  onClose,
  onConfirm,
  needsDisposition,
  error,
}: StageMoveDrawerProps) {
  return (
    <Drawer
      open={open}
      title={candidateName}
      subtitle={applicationId ?? undefined}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}>
            Update stage
          </Button>
        </>
      }
    >
      <label className="field">
        Target stage
        <select value={selectedStageId} onChange={(e) => onStageChange(e.target.value)}>
          {stages.map((s) => (
            <option key={s.pipelineStageId} value={s.pipelineStageId}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {needsDisposition ? (
        <label className="field">
          Disposition reason
          <textarea
            value={dispositionReason}
            placeholder="Required for Disqualified or NFA"
            onChange={(e) => onDispositionReasonChange(e.target.value)}
          />
        </label>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {/* TODO: PATCH /api/applications/{id}/stage */}
    </Drawer>
  )
}
