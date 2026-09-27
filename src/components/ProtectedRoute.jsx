import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { AdminOrdersProvider, useAdminOrders } from '../context/AdminOrdersContext.jsx'

// Guards admin routes, keeps the live order feed running and renders the admin section menu.
export default function ProtectedRoute() {
  const { isAdmin, ready } = useAuth()
  if (!ready) return <p className="empty">Loading…</p>
  if (!isAdmin) return <Navigate to="/admin/login" replace />

  return (
    <AdminOrdersProvider>
      <AdminNav />
      <Outlet />
    </AdminOrdersProvider>
  )
}

function AdminNav() {
  const { logout, adminEmail } = useAuth()
  const { newCount } = useAdminOrders()
  return (
    <div className="admin-nav no-print">
      <nav className="tabs">
        <NavLink to="/admin/orders" className="tab">
          Orders{newCount > 0 && <span className="badge">{newCount}</span>}
        </NavLink>
        <NavLink to="/admin" end className="tab">Dishes</NavLink>
        <NavLink to="/admin/sections" className="tab">Menu Sections</NavLink>
        <NavLink to="/admin/restaurant" className="tab">Restaurant Details</NavLink>
        <NavLink to="/admin/settings" className="tab">Charges & Coupons</NavLink>
      </nav>
      <div className="admin-user">
        {adminEmail && <span className="muted small">{adminEmail}</span>}
        <button className="btn small secondary" onClick={logout}>Admin logout</button>
      </div>
    </div>
  )
}
