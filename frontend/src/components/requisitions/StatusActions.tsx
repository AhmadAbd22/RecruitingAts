import { Button } from '../shared'

export type StatusActionsProps = {
  status: string
  canManage?: boolean
  canApprove?: boolean
  onSubmit?: () => void
  onApprove?: () => void
  onReject?: () => void
  onPublish?: () => void
  onHold?: () => void
  onClose?: () => void
  onCancel?: () => void
  onFill?: () => void
  onRepublish?: () => void
}

/** Owner: Amina — requisition workflow buttons by status. */
export function StatusActions({
  status,
  canManage,
  canApprove,
  onSubmit,
  onApprove,
  onReject,
  onPublish,
  onHold,
  onClose,
  onCancel,
  onFill,
  onRepublish,
}: StatusActionsProps) {
  return (
    <div className="row wrap">
      {canManage && status === 'Draft' ? (
        <Button variant="ghost" onClick={onSubmit}>
          Submit for approval
        </Button>
      ) : null}
      {canApprove && status === 'PendingApproval' ? (
        <>
          <Button variant="primary" onClick={onApprove}>
            Approve
          </Button>
          <Button variant="warn" onClick={onReject}>
            Reject
          </Button>
        </>
      ) : null}
      {canManage && status === 'Approved' ? (
        <Button variant="primary" onClick={onPublish}>
          Publish
        </Button>
      ) : null}
      {canManage && status === 'Published' ? (
        <>
          <Button onClick={onHold}>Hold</Button>
          <Button onClick={onClose}>Close</Button>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={onFill}>
            Mark filled
          </Button>
        </>
      ) : null}
      {canManage && status === 'OnHold' ? (
        <>
          <Button variant="primary" onClick={onRepublish}>
            Back to published
          </Button>
          <Button onClick={onClose}>Close</Button>
          <Button onClick={onCancel}>Cancel</Button>
          <Button onClick={onFill}>Mark filled</Button>
        </>
      ) : null}
      {/* TODO: wire status endpoints */}
    </div>
  )
}
