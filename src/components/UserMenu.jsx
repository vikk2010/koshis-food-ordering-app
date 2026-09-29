import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import { formatPhone } from '../utils/orders.js'
import { isOpen } from '../utils/orderStatus.js'
import Icon from './Icon.jsx'

/** The signed-in customer's name, phone and email (name falls back to the one on their address / last order). */
export function useProfile() {
  const { user, addresses } = useUser()
  const { orders } = useOrders()
  if (!user) return null
  const name = (user.name || addresses.at(-1)?.name || orders.at(-1)?.customerName || '').trim()
  return {
    name,
    phone: formatPhone(user.phone),
    email: user.email || '',
    initial: name ? name[0].toUpperCase() : '',
  }
}

/** Round avatar (initial, or a person icon when we don't know the name yet). */
export function Avatar({ profile, size = 36 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {profile.initial || <Icon name="user" size={size * 0.5} />}
    </span>
  )
}

// Header profile button + dropdown: name, mobile number, order history, logout.
export default function UserMenu() {
  const { logoutUser } = useUser()
  const { orders } = useOrders()
  const profile = useProfile()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const { pathname } = useLocation()

  // Close when the page changes, on a click outside, or on Escape.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!profile) return null
  const active = [...orders].reverse().find(isOpen)
  const firstName = profile.name.split(/\s+/)[0]

  return (
    <div className="user-menu-wrap" ref={box}>
      <button
        type="button"
        className={`user-btn ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Your account"
      >
        <Avatar profile={profile} size={34} />
        <span className="user-btn-name">{firstName || 'Account'}</span>
        <Icon name="chevron" size={16} className="user-btn-caret" />
      </button>

      {open && (
        <div className="user-menu" role="menu">
          <div className="user-menu-head">
            <Avatar profile={profile} size={48} />
            <div>
              <strong>{profile.name || 'Your account'}</strong>
              <span className="muted small">{profile.phone}</span>
              {profile.email && <span className="muted small clip">{profile.email}</span>}
            </div>
          </div>
          {active && (
            <Link to={`/orders/${active.id}`} className="user-menu-live" role="menuitem">
              <span className="pulse-dot" aria-hidden="true" />
              <span>
                <strong>Track order #{active.number}</strong>
                <span className="small">In progress</span>
              </span>
              <Icon name="arrow" size={16} />
            </Link>
          )}
          <Link to="/account" className="user-menu-item" role="menuitem">
            <Icon name="user" size={18} /> My profile
          </Link>
          <Link to="/account#orders" className="user-menu-item" role="menuitem">
            <Icon name="receipt" size={18} /> Order history
            {orders.length > 0 && <span className="count-pill">{orders.length}</span>}
          </Link>
          <button type="button" className="user-menu-item danger" role="menuitem" onClick={logoutUser}>
            <Icon name="logout" size={18} /> Log out
          </button>
        </div>
      )}
    </div>
  )
}
