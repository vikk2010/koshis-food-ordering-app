import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { AdminOrdersProvider, useAdminOrders } from '../context/AdminOrdersContext.jsx'
import { initializeCatalog } from '../services/catalogStore.js'
import Icon from './Icon.jsx'

// Guards admin routes, keeps the live order feed running and renders the admin section menu.
export default function ProtectedRoute() {
  const { isAdmin, ready } = useAuth()
  if (!ready) return <p className="empty">Loading…</p>
  if (!isAdmin) return <Navigate to="/admin/login" replace />
  return <AdminArea />
}

function AdminArea() {
  // First admin visit after moving to Firebase: upload the menu and restaurant details once.
  const [setup, setSetup] = useState({ done: false, uploaded: false, error: '' })
  useEffect(() => {
    let active = true
    initializeCatalog()
      .then((uploaded) => active && setSetup({ done: true, uploaded, error: '' }))
      .catch((err) => {
        console.error(err)
        if (active) {
          setSetup({
            done: true,
            uploaded: false,
            error: err.code === 'permission-denied'
              ? 'Firebase refused to save the menu. Publish the latest firestore.rules (see README), then reload.'
              : 'Could not reach Firebase to set up the menu. Check your connection and reload.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [])

  if (!setup.done) return <p className="empty">Setting up the admin panel…</p>

  return (
    <AdminOrdersProvider>
      <AdminNav />
      {setup.error && <p className="error admin-banner">{setup.error}</p>}
      {setup.uploaded && (
        <p className="admin-banner saved">
          Your menu, restaurant details, charges and coupons are now stored in Firebase — every customer sees the
          same data. Please check Restaurant Details once.
        </p>
      )}
      <Outlet />
    </AdminOrdersProvider>
  )
}

function AdminNav() {
  const { logout, adminEmail } = useAuth()
  const { newCount } = useAdminOrders()
  return (
    <div className="admin-nav no-print">
      {/* Day-to-day: orders, reports, charges */}
      <div className="admin-nav-top">
        <nav className="admin-primary" aria-label="Admin">
          <NavLink to="/admin/orders" className="admin-primary-link">
            <Icon name="receipt" size={20} />
            <span>Orders</span>
            {newCount > 0 && <span className="badge">{newCount}</span>}
          </NavLink>
          <NavLink to="/admin/reports" className="admin-primary-link">
            <Icon name="chart" size={20} />
            <span>Reports</span>
          </NavLink>
          <NavLink to="/admin/settings" className="admin-primary-link">
            <Icon name="settings" size={20} />
            <span>Charges & Coupons</span>
          </NavLink>
        </nav>
        <div className="admin-user">
          {adminEmail && <span className="muted small">{adminEmail}</span>}
          <button className="btn small secondary" onClick={logout}>Admin logout</button>
        </div>
      </div>
      {/* Setup: menu and restaurant */}
      <nav className="tabs admin-secondary" aria-label="Menu and restaurant">
        <NavLink to="/admin" end className="tab"><Icon name="utensils" size={16} /> Dishes</NavLink>
        <NavLink to="/admin/sections" className="tab"><Icon name="list" size={16} /> Menu Sections</NavLink>
        <NavLink to="/admin/restaurant" className="tab"><Icon name="store" size={16} /> Restaurant Details</NavLink>
      </nav>
    </div>
  )
}
