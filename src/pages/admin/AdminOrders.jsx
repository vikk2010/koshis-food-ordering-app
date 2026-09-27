import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminOrders } from '../../context/AdminOrdersContext.jsx'
import { ordersAreShared } from '../../services/orderStore.js'
import { formatPrice } from '../../utils/bill.js'
import { paymentLabel } from '../../utils/delivery.js'
import {
  customerName, formatClock, formatDate, formatPhone, itemCount, itemsSummary, startOfDay, timeAgo,
} from '../../utils/orders.js'

const RANGES = [
  { key: 'today', label: 'Today', from: (now) => startOfDay(now), to: () => Infinity },
  { key: 'yesterday', label: 'Yesterday', from: (now) => startOfDay(now, -1), to: (now) => startOfDay(now) },
  { key: 'week', label: 'Last 7 days', from: (now) => startOfDay(now, -6), to: () => Infinity },
  { key: 'all', label: 'All', from: () => 0, to: () => Infinity },
]

// "Orders" admin screen: every order with who placed it and when, live.
export default function AdminOrders() {
  const {
    orders, loading, error, isNew, newCount, markAllSeen,
    permission, enableNotifications, sound, toggleSound, sendTest,
  } = useAdminOrders()
  const navigate = useNavigate()
  const [range, setRange] = useState('today')
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => Date.now())

  // Keep "5 min ago" labels fresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const r = RANGES.find((x) => x.key === range)
  const q = query.trim().toLowerCase().replace(/\s/g, '')
  const visible = orders.filter((o) => {
    if (o.placedAt < r.from(now) || o.placedAt >= r.to(now)) return false
    if (!q) return true
    return [o.number, o.phone, customerName(o)].some((v) => v?.toLowerCase().replace(/\s/g, '').includes(q))
  })
  const todays = orders.filter((o) => o.placedAt >= startOfDay(now))
  const todayRevenue = todays.reduce((sum, o) => sum + o.bill.grandTotal, 0)
  const scheduledUpcoming = orders.filter((o) => o.scheduledFor && o.scheduledFor > now).length

  return (
    <section className="admin-settings">
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p className="muted small" style={{ margin: 0 }}>
            New orders appear here instantly{ordersAreShared ? '' : ' (demo mode: only orders placed in this browser)'}.
          </p>
        </div>
        {newCount > 0 && (
          <button className="btn secondary" onClick={markAllSeen}>Mark {newCount} as seen</button>
        )}
      </div>

      <NotificationCard
        permission={permission}
        onEnable={enableNotifications}
        sound={sound}
        onToggleSound={toggleSound}
        onTest={sendTest}
      />

      <div className="stat-row">
        <div className="card stat"><span className="eyebrow">Orders today</span><strong>{todays.length}</strong></div>
        <div className="card stat"><span className="eyebrow">Revenue today</span><strong>{formatPrice(Math.round(todayRevenue))}</strong></div>
        <div className="card stat"><span className="eyebrow">New (unseen)</span><strong className={newCount ? 'accent' : ''}>{newCount}</strong></div>
        <div className="card stat"><span className="eyebrow">Upcoming scheduled</span><strong>{scheduledUpcoming}</strong></div>
      </div>

      <div className="orders-toolbar">
        <div className="tabs" role="tablist">
          {RANGES.map((x) => (
            <button key={x.key} role="tab" aria-selected={range === x.key} className={`tab ${range === x.key ? 'active' : ''}`} onClick={() => setRange(x.key)}>
              {x.label}
            </button>
          ))}
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search order #, phone or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search orders"
        />
      </div>

      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table className="admin-table orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date & time</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Delivery</th>
              <th>Payment</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => {
              const fresh = isNew(o)
              return (
                <tr
                  key={o.id}
                  className={`clickable ${fresh ? 'is-new' : ''}`}
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                >
                  <td className="nowrap">
                    <Link to={`/admin/orders/${o.id}`} onClick={(e) => e.stopPropagation()}><strong>#{o.number}</strong></Link>
                    {fresh && <span className="new-badge">NEW</span>}
                  </td>
                  <td className="nowrap">
                    <div>{formatDate(o.placedAt)}</div>
                    <div className="muted small">{formatClock(o.placedAt)}{timeAgo(o.placedAt, now) && ` · ${timeAgo(o.placedAt, now)}`}</div>
                  </td>
                  <td>
                    <strong>{customerName(o) || '—'}</strong>
                    <div className="muted small nowrap">{formatPhone(o.phone)}</div>
                  </td>
                  <td>
                    <div className="clamp small">{itemsSummary(o)}</div>
                    <div className="muted small">{itemCount(o)} item{itemCount(o) > 1 ? 's' : ''}</div>
                  </td>
                  <td className="nowrap small">
                    {o.scheduledFor ? <span className="sched-chip">Scheduled · {formatClock(o.scheduledFor)}</span> : 'Now'}
                  </td>
                  <td className="nowrap small">{paymentLabel(o.payment)}</td>
                  <td className="num nowrap"><strong>{formatPrice(o.bill.grandTotal)}</strong></td>
                </tr>
              )
            })}
            {!loading && visible.length === 0 && (
              <tr><td colSpan="7" className="empty">No orders {query ? 'match your search' : r.key === 'all' ? 'yet' : `for ${r.label.toLowerCase()}`}.</td></tr>
            )}
            {loading && <tr><td colSpan="7" className="empty">Loading orders…</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function NotificationCard({ permission, onEnable, sound, onToggleSound, onTest }) {
  return (
    <div className={`card notify-card ${permission === 'granted' ? 'on' : ''}`}>
      <div>
        <strong>
          {permission === 'granted' ? 'Desktop notifications are on' : 'Get a desktop notification for every new order'}
        </strong>
        <p className="muted small">
          {permission === 'granted' && 'Keep this admin panel open in a browser tab (it can be in the background).'}
          {permission === 'default' && 'Your browser will ask for permission.'}
          {permission === 'denied' && 'Notifications are blocked for this site. Click the lock icon next to the address bar → Notifications → Allow, then reload.'}
          {permission === 'unsupported' && 'This browser does not support desktop notifications. Use Chrome, Edge or Firefox on your computer.'}
        </p>
      </div>
      <div className="notify-actions">
        <label className="switch compact label-first">
          <span className="switch-text">Sound</span>
          <input type="checkbox" checked={sound} onChange={onToggleSound} />
          <span className="switch-track" aria-hidden="true" />
        </label>
        {permission === 'default' && <button className="btn" onClick={onEnable}>Enable notifications</button>}
        <button className="btn secondary" onClick={onTest}>Send test</button>
      </div>
    </div>
  )
}
