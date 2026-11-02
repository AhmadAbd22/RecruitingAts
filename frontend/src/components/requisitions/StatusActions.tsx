import { Button } from '../shared'

export type StatusActionsProps = {
  status: string
  canManage?: boolean
  canApprove?: boolean
  onSubmit?: () => void
  submitPending?: boolean
  onApprove?: () => void
  approvePending?: boolean
  onReject?: () => void
  rejectPending?: boolean
  onPublish?: () => void
  publishPending?: boolean
  onHold?: () => void
  holdPending?: boolean
  onClose?: () => void
  closePending?: boolean
  onCancel?: () => void
  cancelPending?: boolean
  onFill?: () => void
  fillPending?: boolean
  onRepublish?: () => void
}

/** Owner: Amina — requisition workflow buttons by status. */
export function StatusActions({
  status,
  canManage,
  canApprove,
  onSubmit,
  submitPending = false,
  onApprove,
  approvePending = false,
  onReject,
  rejectPending = false,
  onPublish,
  publishPending = false,
  onHold,
  holdPending = false,
  onClose,
  closePending = false,
  onCancel,
  cancelPending = false,
  onFill,
  fillPending = false,
  onRepublish,
}: StatusActionsProps) {
  return (
    <div className="row wrap">
      {canManage && status === 'Draft' ? (
        <Button variant="ghost" onClick={onSubmit} disabled={submitPending}>
          {submitPending ? 'Submitting…' : 'Submit for approval'}
        </Button>
      ) : null}
      {canApprove && status === 'PendingApproval' ? (
        <>
          <Button variant="primary" onClick={onApprove} disabled={approvePending}>
            {approvePending ? 'Approving…' : 'Approve'}
          </Button>
          <Button variant="warn" onClick={onReject} disabled={rejectPending}>
            {rejectPending ? 'Rejecting…' : 'Reject'}
          </Button>
        </>
      ) : null}
      {canManage && status === 'Approved' ? (
        <Button variant="primary" onClick={onPublish} disabled={publishPending}>
          {publishPending ? 'Publishing…' : 'Publish'}
        </Button>
      ) : null}
      {canManage && status === 'Published' ? (
        <>
          <Button onClick={onHold} disabled={holdPending}>
            {holdPending ? 'Holding…' : 'Hold'}
          </Button>
          <Button onClick={onClose} disabled={closePending}>
            {closePending ? 'Closing…' : 'Close'}
          </Button>
          <Button onClick={onCancel} disabled={cancelPending}>
            {cancelPending ? 'Cancelling…' : 'Cancel'}
          </Button>
          <Button variant="primary" onClick={onFill} disabled={fillPending}>
            {fillPending ? 'Filling…' : 'Mark filled'}
          </Button>
        </>
      ) : null}
      {canManage && status === 'OnHold' ? (
        <>
          <Button variant="primary" onClick={onRepublish}>
            Back to published
          </Button>
          <Button onClick={onHold} disabled={holdPending}>
            {holdPending ? 'Holding…' : 'Hold'}
          </Button>
          <Button onClick={onClose} disabled={closePending}>
            {closePending ? 'Closing…' : 'Close'}
          </Button>
          <Button onClick={onCancel} disabled={cancelPending}>
            {cancelPending ? 'Cancelling…' : 'Cancel'}
          </Button>
          <Button onClick={onFill} disabled={fillPending}>
            {fillPending ? 'Filling…' : 'Mark filled'}
          </Button>
        </>
      ) : null}
      {/* TODO: wire status endpoints */}
    </div>
  )
}
