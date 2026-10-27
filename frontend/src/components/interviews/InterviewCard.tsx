import type { InterviewListItem } from '../../types/domain'
import { StatusChip, Button } from '../shared'

export type InterviewCardProps = {
  interview: InterviewListItem
  onSubmitFeedback?: (interviewId: string) => void
  onMarkCompleted?: (interviewId: string) => void
  onMarkNoShow?: (interviewId: string) => void
  canSubmitFeedback?: boolean
  canChangeStatus?: boolean
}

/** Owner: Tayyab / Abdul-Manan */
export function InterviewCard({
  interview,
  onSubmitFeedback,
  onMarkCompleted,
  onMarkNoShow,
  canSubmitFeedback,
  canChangeStatus,
}: InterviewCardProps) {
  return (
    <article className="panel">
      <div className="row between">
        <div>
          <h2>{interview.candidateName}</h2>
          <p className="muted">
            {interview.requisitionTitle} · {interview.type} · {interview.mode} ·{' '}
            {interview.scheduledAt}
          </p>
        </div>
        <StatusChip status={interview.status} />
      </div>
      <p className="muted">
        Panel:{' '}
        {interview.panel.map((p) => `${p.name}${p.isLead ? ' (lead)' : ''}`).join(', ')}
      </p>
      <div className="row wrap">
        {canChangeStatus && interview.status === 'Scheduled' ? (
          <>
            <Button onClick={() => onMarkCompleted?.(interview.interviewId)}>
              Mark completed
            </Button>
            <Button variant="warn" onClick={() => onMarkNoShow?.(interview.interviewId)}>
              No-show
            </Button>
          </>
        ) : null}
        {canSubmitFeedback ? (
          <Button variant="primary" onClick={() => onSubmitFeedback?.(interview.interviewId)}>
            Submit feedback
          </Button>
        ) : null}
      </div>
    </article>
  )
}
