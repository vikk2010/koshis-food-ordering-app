import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminOrders } from '../context/AdminOrdersContext.jsx'
import { OPEN_JOB_WARN_MIN, assignRider, sendToRiders, unassignRider } from '../services/riderStore.js'
import { formatPrice } from '../utils/bill.js'
import { formatClock } from '../utils/orders.js'
import { orderStatus } from '../utils/orderStatus.js'
import Icon from './Icon.jsx'

// Admin order page: who is delivering this order, and controls to assign / remove / re-offer it.
export default function DeliveryPanel({ order }) {
  const { riders, jobFor, orders } = useAdminOrders()
  const [now, setNow] = useState(() => Date.now())
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const status = orderStatus(order)
  const job = jobFor(order.id)
  const approved = riders.filter((r) => r.status === 'approved')
  const rider = order.rider
  const open = ['preparing', 'out'].includes(status)
  const canAssign = open || status === 'pending' // the admin can pick (or change) the rider until it's delivered

  // "Ravi · JH01CD5678 — free" / "— on #KC-75590" so the admin can pick someone who isn't busy.
  const busyWith = (uid) => orders.find((o) => o.id !== order.id && o.riderUid === uid && ['pending', 'preparing', 'out'].includes(o.status))
  const choices = approved.filter((r) => r.uid !== rider?.uid)
  const assignRow = canAssign && (choices.length ? (
    <div className="assign-row">
      <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={rider ? 'Change the rider' : 'Choose a rider'}>
        <option value="">{rider ? 'Change rider…' : 'Assign a rider…'}</option>
        {choices.map((r) => {
          const other = busyWith(r.uid)
          return <option key={r.uid} value={r.uid}>{r.name} · {r.bikeNumber} — {other ? `busy with #${other.number}` : 'free'}</option>
        })}
      </select>
      <button type="button" className="btn small" disabled={!pick || busy} onClick={() => run(() => assignRider(order, approved.find((r) => r.uid === pick)))}>
        {busy ? 'Saving…' : rider ? 'Change' : 'Assign'}
      </button>
    </div>
  ) : !rider && (
    <p className="muted small">No approved riders yet. <Link to="/admin/riders">Add or approve riders</Link>, or deliver it yourself using the buttons above.</p>
  ))

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      setConfirmRemove(false)
      setPick('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const collection = order.collection && (
    <p className={`delivery-collection ${order.collection.method === 'cash' && !order.cashSettled ? 'owed' : ''}`}>
      {order.collection.method === 'cash' ? 'Cash' : 'UPI'} {formatPrice(order.collection.amount)} collected at {formatClock(order.collection.at)}
      {order.collection.method === 'cash' && (order.cashSettled ? ' · handed over ✓' : ' · rider still has this cash')}
    </p>
  )

  let body
  if (rider) {
    body = (
      <>
        <div className="rider-row">
          <span className="rider-avatar sm">{rider.name?.[0]?.toUpperCase()}</span>
          <div>
            <strong>{rider.name}</strong>
            <span className="muted small">{rider.bikeNumber} · +91 {rider.phone}</span>
          </div>
          <a className="btn small secondary" href={`tel:+91${rider.phone}`}><Icon name="phone" size={14} /> Call</a>
        </div>
        <ul className="delivery-steps small">
          <li className="done">{job?.assignedBy === 'admin' ? 'Assigned by you' : 'Accepted'} {order.riderAcceptedAt ? formatClock(order.riderAcceptedAt) : ''}</li>
          {status === 'pending' && <li>Waiting for you to accept the order — the rider can see it</li>}
          <li className={order.statusTimes?.out ? 'done' : ''}>Picked up {order.statusTimes?.out ? formatClock(order.statusTimes.out) : '— not yet'}</li>
          <li className={order.statusTimes?.delivered ? 'done' : ''}>Delivered {order.statusTimes?.delivered ? formatClock(order.statusTimes.delivered) : '— not yet'}</li>
        </ul>
        {collection}
        {assignRow}
        {canAssign && (confirmRemove ? (
          <div className="cancel-confirm">
            <span className="small">
              Take the order away from {rider.name.split(' ')[0]}{status === 'pending' ? '?' : ' and offer it to all riders again?'}
            </span>
            <button type="button" className="btn small danger" disabled={busy} onClick={() => run(() => unassignRider(order))}>Yes, remove</button>
            <button type="button" className="btn small secondary" onClick={() => setConfirmRemove(false)}>Keep</button>
          </div>
        ) : (
          <button type="button" className="link-btn small danger-link" onClick={() => setConfirmRemove(true)}>Remove rider</button>
        ))}
      </>
    )
  } else if (status === 'pending') {
    body = (
      <>
        <p className="muted small">Riders are offered this order as soon as you start preparing it — or pick one now.</p>
        {assignRow}
      </>
    )
  } else if (!open) {
    body = <p className="muted small">{status === 'delivered' ? 'Delivered without a rider from the app.' : 'No rider was assigned.'}</p>
  } else {
    const waitMin = job?.status === 'open' ? Math.floor((now - job.openedAt) / 60000) : 0
    body = (
      <>
        {job?.status === 'open' ? (
          <p className={`finding-rider ${waitMin >= OPEN_JOB_WARN_MIN ? 'late' : ''}`}>
            <span className="pulse-dot" aria-hidden="true" />
            Offered to {approved.length} rider{approved.length === 1 ? '' : 's'} · waiting {waitMin < 1 ? 'less than a minute' : `${waitMin} min`}
          </p>
        ) : (
          <div className="finding-rider none">
            <span>Not offered to riders yet.</span>
            <button type="button" className="btn small" disabled={busy || !approved.length} onClick={() => run(() => sendToRiders(order))}>Send to riders</button>
          </div>
        )}
        {assignRow}
      </>
    )
  }

  return (
    <div className="card summary-card delivery-panel no-print">
      <h2><Icon name="bike" size={20} /> Delivery</h2>
      {body}
      {error && <p className="error small">{error}</p>}
    </div>
  )
}
