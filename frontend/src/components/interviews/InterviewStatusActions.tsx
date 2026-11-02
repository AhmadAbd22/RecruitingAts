import { Button } from '../shared'

export type InterviewStatusActionsProps = {
  interviewId: string
  status: string
  onCompleted?: (interviewId: string) => void
  onNoShow?: (interviewId: string) => void
}

/** Owner: Abdul-Manan — FR-INT-009 (API gap). */
export function InterviewStatusActions({
  interviewId,
  status,
  onCompleted,
  onNoShow,
}: InterviewStatusActionsProps) {
  if (status !== 'Scheduled') return null
  return (
    <div className="row">
      <Button onClick={() => onCompleted?.(interviewId)}>Completed</Button>
      <Button variant="warn" onClick={() => onNoShow?.(interviewId)}>
        No-show
      </Button>
    </div>
  )
}
