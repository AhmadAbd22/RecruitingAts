import { Drawer, Button } from '../shared'

export type StageMoveOption = {
  pipelineStageId: string
  name: string
}

export type StageMoveDrawerProps = {
  open: boolean
  candidateName?: string
  candidateEmail?: string
  currentStageId?: string
  currentStageIsTerminal?: boolean
  stages: StageMoveOption[]
  dispositionReason: string
  onDispositionReasonChange: (value: string) => void
  onStageChange: (stageId: string) => void
  selectedStageId: string
  onClose: () => void
  onConfirm: () => void
  needsDisposition?: boolean
  error?: string | null
  isSubmitting?: boolean
  canSubmitStage?: boolean
  stagesLoading?: boolean
  stagesError?: string | null
  onRetryStages?: () => void
}

/** Owner: Abdul-Manan — FR-APP-005 / FR-APP-006 */
export function StageMoveDrawer({
  open,
  candidateName = 'Candidate',
  candidateEmail,
  currentStageIsTerminal = false,
  stages,
  dispositionReason,
  onDispositionReasonChange,
  onStageChange,
  selectedStageId,
  onClose,
  onConfirm,
  needsDisposition,
  error,
  isSubmitting = false,
  canSubmitStage = true,
  stagesLoading = false,
  stagesError,
  onRetryStages,
}: StageMoveDrawerProps) {
  return (
    <Drawer
      open={open}
      title={candidateName}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isSubmitting || !canSubmitStage || currentStageIsTerminal}
          >
            {isSubmitting
              ? 'Updating…'
              : stagesLoading
                ? 'Loading stages…'
                : 'Update stage'}
          </Button>
        </>
      }
    >
      <div className="field">
        <span className="muted">{candidateEmail?.trim() || 'Email unavailable'}</span>
      </div>
      {stagesLoading ? (
        <div className="empty-state" role="status">Loading active stages…</div>
      ) : stagesError ? (
        <div className="panel">
          <p className="error" role="alert">{stagesError}</p>
          {onRetryStages ? (
            <Button variant="primary" onClick={onRetryStages}>
              Retry stage catalog
            </Button>
          ) : null}
        </div>
      ) : stages.length === 0 ? (
        <div className="empty-state" role="status">
          <strong>No active stages</strong>
          <p>There are no active pipeline stages available to select.</p>
        </div>
      ) : currentStageIsTerminal ? (
        <div className="empty-state" role="status">
          <strong>Stage changes unavailable</strong>
          <p>Applications in Hired, Disqualified, or NFA cannot be moved using this action.</p>
        </div>
      ) : (
        <>
          <label className="field">
            Target stage
            <select
              value={selectedStageId}
              onChange={(e) => onStageChange(e.target.value)}
              disabled={isSubmitting || !canSubmitStage}
            >
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
                disabled={isSubmitting}
              />
            </label>
          ) : null}
        </>
      )}
      {error ? <p className="error">{error}</p> : null}
    </Drawer>
  )
}
