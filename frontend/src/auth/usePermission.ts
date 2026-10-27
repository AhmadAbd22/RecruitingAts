import { hasPermission } from '../api/client'
import { useAuth } from './AuthContext'

export function usePermission(permission: string) {
  const { user } = useAuth()
  return hasPermission(user, permission)
}

export function usePermissions() {
  const { user } = useAuth()
  return {
    user,
    can: (permission: string) => hasPermission(user, permission),
  }
}
