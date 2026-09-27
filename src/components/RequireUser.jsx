import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'

export default function RequireUser() {
  const { user } = useUser()
  const { pathname } = useLocation()
  return user ? <Outlet /> : <Navigate to={`/login?redirect=${encodeURIComponent(pathname)}`} replace />
}
