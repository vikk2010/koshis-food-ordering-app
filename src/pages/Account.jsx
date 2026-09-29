import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import { Avatar, useProfile } from '../components/UserMenu.jsx'
import Icon from '../components/Icon.jsx'
import { formatPrice } from '../utils/bill.js'
import { formatAddress } from '../utils/address.js'
import { formatDateTime, itemCount, itemsSummary } from '../utils/orders.js'
import { isOpen, needsPayment, orderStatus, paymentText } from '../utils/orderStatus.js'

// Customer-facing wording for each order status.
const LABELS = {
  pending: 'Waiting for restaurant',
  preparing: 'Being prepared',
  out: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'active', label: 'Active', test: isOpen },
  { key: 'delivered', label: 'Delivered', test: (o) => orderStatus(o) === 'delivered' },
  { key: 'cancelled', label: 'Cancelled', test: (o) => orderStatus(o) === 'cancelled' },
]

// "My account": profile (name, mobile number, email), order history and saved addresses.
export default function Account() {
  const { logoutUser, addresses, deleteAddress } = useUser()
  const { orders, loading } = useOrders()
  const profile = useProfile()
  const { hash } = useLocation()
  const [filter, setFilter] = useState('all')

  // Links like /account#orders jump to that section.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, loading])

  const newestFirst = [...orders].reverse()
  const f = FILTERS.find((x) => x.key === filter)
  const shown = newestFirst.filter(f.test)
  const delivered = orders.filter((o) => orderStatus(o) === 'delivered').length
  const active = orders.filter(isOpen).length

  return (
    <section className="account">
      <div>
        <p className="crumbs"><Link to="/">Menu</Link>  /  My account</p>
        <h1>My account</h1>
      </div>

      <div className="account-grid">
        <aside className="account-side">
          <div className="card profile-card">
            <Avatar profile={profile} size={72} />
            <h2>{profile.name || 'Hello there!'}</h2>
            <ul className="profile-lines">
              <li><Icon name="phone" size={16} /> {profile.phone}</li>
              {profile.email && <li><Icon name="mail" size={16} /> <span className="clip">{profile.email}</span></li>}
            </ul>
            <div className="profile-stats">
              <div><strong>{orders.length}</strong><span className="muted small">Orders</span></div>
              <div><strong>{active ? active : delivered}</strong><span className="muted small">{active ? 'In progress' : 'Delivered'}</span></div>
            </div>
            <button type="button" className="btn secondary" onClick={logoutUser}>
              <Icon name="logout" size={16} /> Log out
            </button>
          </div>

          <SavedAddresses id="addresses" addresses={addresses} onDelete={deleteAddress} />
        </aside>

        <div className="card account-orders" id="orders">
          <div className="account-orders-head">
            <h2>Order history</h2>
            {orders.length > 0 && (
              <div className="tabs" role="tablist">
                {FILTERS.map((x) => (
                  <button key={x.key} role="tab" aria-selected={filter === x.key} className={`tab ${filter === x.key ? 'active' : ''}`} onClick={() => setFilter(x.key)}>
                    {x.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading && orders.length === 0 ? (
            <p className="empty">Loading your orders…</p>
          ) : orders.length === 0 ? (
            <div className="empty-orders">
              <Icon name="receipt" size={40} />
              <strong>No orders yet</strong>
              <p className="muted small">Your orders will show up here.</p>
              <Link className="btn" to="/">Browse the menu</Link>
            </div>
          ) : shown.length === 0 ? (
            <p className="empty">No {f.label.toLowerCase()} orders.</p>
          ) : (
            <ul className="history">
              {shown.map((o) => {
                const status = orderStatus(o)
                return (
                  <li key={o.id}>
                    <Link to={`/orders/${o.id}`} className="history-item">
                      <div className="history-top">
                        <strong>#{o.number}</strong>
                        <span className={`order-status s-${status}`}>
                          {status === 'pending' && needsPayment(o) ? 'Awaiting payment' : LABELS[status]}
                        </span>
                      </div>
                      <span className="muted small">{formatDateTime(o.placedAt)}</span>
                      <p className="history-items clamp-2">{itemsSummary(o)}</p>
                      <div className="history-bottom">
                        <span className="muted small">
                          {itemCount(o)} item{itemCount(o) > 1 ? 's' : ''} · {paymentText(o)}
                        </span>
                        <span className="history-total">
                          {formatPrice(o.bill.grandTotal)}
                          <span className="history-cta">{isOpen(o) ? 'Track' : 'Details'} <Icon name="arrow" size={14} /></span>
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <SavedAddresses className="account-addresses" addresses={addresses} onDelete={deleteAddress} />
      </div>
    </section>
  )
}

function SavedAddresses({ id, className = '', addresses, onDelete }) {
  return (
    <div className={`card ${className}`} id={id}>
      <h2>Saved addresses</h2>
      {addresses.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>You'll be able to save an address at checkout.</p>
      ) : (
        <ul className="saved-addresses">
          {addresses.map((a) => (
            <li key={a.id}>
              <Icon name="pin" size={18} />
              <div>
                <strong>{a.label}{a.name && ` · ${a.name}`}</strong>
                <span className="muted small">{formatAddress(a)}</span>
              </div>
              <button type="button" className="link-btn small danger-link" onClick={() => onDelete(a.id)} aria-label={`Remove ${a.label} address`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
