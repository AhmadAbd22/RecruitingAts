import { Button } from '../shared'

export type InterviewStatusActionsProps = {
  interviewId: string
  status: string
  disabled?: boolean
  onCompleted?: (interviewId: string) => void | Promise<void>
  onNoShow?: (interviewId: string) => void | Promise<void>
}

/** Owner: Abdul-Manan — FR-INT-009 Completed / No-show. */
export function InterviewStatusActions({
  interviewId,
  status,
  disabled = false,
  onCompleted,
  onNoShow,
}: InterviewStatusActionsProps) {
  if (status !== 'Scheduled') return null
  return (
    <div className="row">
      <Button disabled={disabled} onClick={() => void onCompleted?.(interviewId)}>
        Completed
      </Button>
      <Button variant="warn" disabled={disabled} onClick={() => void onNoShow?.(interviewId)}>
        No-show
      </Button>
    </div>
  )
}
