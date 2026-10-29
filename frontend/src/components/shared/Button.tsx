import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'warn'
  children: ReactNode
}

/** Shared plug-in — everyone uses this for actions. */
export function Button({
  variant = 'ghost',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`btn btn-${variant} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
