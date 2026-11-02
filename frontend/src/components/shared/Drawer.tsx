import type { ReactNode } from 'react'
import { Button } from './Button'

export type DrawerProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/** Right drawer shell — used by stage move / detail panels. */
export function Drawer({ open, title, subtitle, onClose, children, footer }: DrawerProps) {
  if (!open) return null
  return (
    <>
      <div className="drawer-backdrop" role="presentation" onClick={onClose} />
      <aside className="drawer-panel" aria-label={title}>
        <div className="drawer-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p className="mono muted">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" aria-label="Close" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer ? <div className="drawer-foot">{footer}</div> : null}
      </aside>
    </>
  )
}
