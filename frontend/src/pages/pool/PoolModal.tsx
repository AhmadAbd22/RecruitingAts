import { useEffect, useId, useRef, type ReactNode } from 'react'

export function PoolModal({ open, title, subtitle, onClose, busy = false, children, footer }: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  busy?: boolean
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    const preventNativeClose = (event: Event) => event.preventDefault()
    dialog.addEventListener('cancel', preventNativeClose)
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()

    return () => {
      dialog.removeEventListener('cancel', preventNativeClose)
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <dialog ref={ref} className="pool-dialog" aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (busy && event.key === 'Escape') event.preventDefault()
      }}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
      }}>
      <header className="pool-dialog-head">
        <div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button type="button" className="pool-icon-button" aria-label="Close dialog"
          disabled={busy} onClick={onClose}>×</button>
      </header>
      <div className="pool-dialog-body">{children}</div>
      {footer && <footer className="pool-dialog-foot">{footer}</footer>}
    </dialog>
  )
}
