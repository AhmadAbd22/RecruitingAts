import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

/** Owner: Tayyab — redirect unauthenticated users to login. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        Checking session…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
