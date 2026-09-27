import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Guards admin routes and renders the admin section menu above them.
export default function ProtectedRoute() {
  const { isAdmin, logout } = useAuth()
  if (!isAdmin) return <Navigate to="/admin/login" replace />

  return (
    <>
      <div className="admin-nav">
        <nav className="tabs">
          <NavLink to="/admin" end className="tab">Dishes</NavLink>
          <NavLink to="/admin/sections" className="tab">Menu Sections</NavLink>
          <NavLink to="/admin/restaurant" className="tab">Restaurant Details</NavLink>
          <NavLink to="/admin/settings" className="tab">Charges & Coupons</NavLink>
        </nav>
        <button className="btn small secondary" onClick={logout}>Admin logout</button>
      </div>
      <Outlet />
    </>
  )
}
