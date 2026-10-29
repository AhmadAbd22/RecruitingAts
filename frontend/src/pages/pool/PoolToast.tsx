import type { PoolToastMessage } from './usePoolToast'

export function PoolToast({
  toast,
  onDismiss,
}: {
  toast: PoolToastMessage | null
  onDismiss: () => void
}) {
  if (!toast) return null

  return (
    <div key={toast.id} className={`pool-toast pool-toast--${toast.tone}`}
      role={toast.tone === 'error' ? 'alert' : 'status'} aria-atomic="true">
      <span className="pool-toast-icon" aria-hidden="true">
        {toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '!' : 'i'}
      </span>
      <div>
        <strong>{toast.tone === 'error' ? 'Please check' : toast.tone === 'success' ? 'Done' : 'Notice'}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" className="pool-icon-button" onClick={onDismiss}
        aria-label="Dismiss notification">×</button>
      <span className="pool-toast-timer" aria-hidden="true" />
    </div>
  )
}
