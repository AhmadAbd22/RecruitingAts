import { Navigate } from 'react-router-dom'
import { usePermissions } from './usePermission'

type RequirePermissionProps = {
  anyOf: string[]
  children: React.ReactNode
}

/** Redirect home when the signed-in user lacks every listed permission. */
export function RequirePermission({ anyOf, children }: RequirePermissionProps) {
  const { can } = usePermissions()
  if (!anyOf.some((permission) => can(permission))) {
    return <Navigate to="/" replace />
  }
  return children
}
