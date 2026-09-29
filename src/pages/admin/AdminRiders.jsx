import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminOrders } from '../../context/AdminOrdersContext.jsx'
import {
  RIDER_STATUS, cashInHand, deleteRider, deliveredBy, inviteRider, removeInvite, setRiderStatus, settleCash,
} from '../../services/riderStore.js'
import { formatPrice } from '../../utils/bill.js'
import { formatDate, startOfDay } from '../../utils/orders.js'
import Icon from '../../components/Icon.jsx'

const EMPTY = { name: '', email: '', phone: '', bikeNumber: '' }

// Admin → Riders: add, approve, disable and delete delivery partners; see their deliveries and cash.
export default function AdminRiders() {
  const { riders, invites, orders, ridersError } = useAdminOrders()
  const [form, setForm] = useState(EMPTY)
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const pending = riders.filter((r) => r.status === 'pending')
  const active = riders.filter((r) => r.status === 'approved')
  const disabled = riders.filter((r) => r.status === 'disabled')
  const joined = new Set(riders.map((r) => r.email?.toLowerCase()))
  const waitingInvites = invites.filter((i) => !joined.has(i.email))
  const signupLink = `${window.location.origin}/rider`

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const add = async (e) => {
    e.preventDefault()
    const phone = form.phone.replace(/\D/g, '').slice(-10)
    if (form.name.trim().length < 2) return setFormError('Enter the rider’s name')
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFormError('Enter the Google (Gmail) address they will sign in with')
    if (!/^[6-9]\d{9}$/.test(phone)) return setFormError('Enter a valid 10-digit mobile number')
    if (!form.bikeNumber.trim()) return setFormError('Enter the bike number')
    if (riders.some((r) => r.email?.toLowerCase() === form.email.trim().toLowerCase())) return setFormError('This rider has already signed up — see the list below.')
    setBusy(true)
    setFormError('')
    try {
      await inviteRider({ ...form, phone })
      setSaved(`${form.name.trim()} added. Ask them to open ${signupLink} and sign in with ${form.email.trim()}.`)
      setForm(EMPTY)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(signupLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <section className="admin-settings riders-page">
      <div className="page-head">
        <div>
          <h1>Delivery partners</h1>
          <p className="muted small" style={{ margin: 0 }}>
            {active.length} active{pending.length ? ` · ${pending.length} waiting for approval` : ''}{disabled.length ? ` · ${disabled.length} disabled` : ''}
          </p>
        </div>
      </div>

      {ridersError && <p className="error admin-banner">{ridersError}</p>}

      <div className="card rider-link-card">
        <div>
          <strong>Rider sign-up link</strong>
          <p className="muted small" style={{ margin: 0 }}>
            Riders open this on their phone, sign in with Google and fill in their details. You approve them here.
          </p>
        </div>
        <div className="rider-link">
          <code>{signupLink}</code>
          <button type="button" className="btn small secondary" onClick={copyLink}>{copied ? 'Copied ✓' : 'Copy'}</button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card">
          <h2>Waiting for approval <span className="tab-count hot">{pending.length}</span></h2>
          <div className="rider-cards">
            {pending.map((r) => <PendingRider key={r.uid} rider={r} />)}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Active riders</h2>
        {active.length === 0 ? (
          <p className="muted small">No active riders yet. Share the sign-up link or add one below.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table riders-table">
              <thead>
                <tr><th>Rider</th><th>Bike</th><th className="num">Today</th><th className="num">Total</th><th>On a delivery</th><th className="num">Cash with rider</th><th /></tr>
              </thead>
              <tbody>
                {active.map((r) => <RiderRow key={r.uid} rider={r} orders={orders} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form className="card form add-rider" onSubmit={add}>
        <h2>Add a rider</h2>
        <p className="muted small" style={{ margin: 0 }}>
          They’re approved automatically when they sign in at <strong>/rider</strong> with this Google account.
        </p>
        <div className="form-row">
          <label>Name<input value={form.name} onChange={set('name')} placeholder="Ravi Kumar" /></label>
          <label>Gmail address<input type="email" value={form.email} onChange={set('email')} placeholder="ravi@gmail.com" /></label>
        </div>
        <div className="form-row">
          <label>
            Mobile
            <div className="phone-input"><span>+91</span><input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} placeholder="98765 43210" /></div>
          </label>
          <label>Bike number<input value={form.bikeNumber} onChange={(e) => setForm((f) => ({ ...f, bikeNumber: e.target.value.toUpperCase() }))} placeholder="JH05AB1234" /></label>
        </div>
        {formError && <p className="error">{formError}</p>}
        {saved && <p className="saved-note">{saved}</p>}
        <button type="submit" className="btn" disabled={busy}><Icon name="plus" size={16} /> {busy ? 'Adding…' : 'Add rider'}</button>
      </form>

      {waitingInvites.length > 0 && (
        <div className="card">
          <h2>Added, not signed in yet</h2>
          <div className="rider-cards">
            {waitingInvites.map((i) => (
              <div key={i.email} className="rider-card">
                <div>
                  <strong>{i.name}</strong>
                  <span className="muted small">{i.email} · +91 {i.phone} · {i.bikeNumber}</span>
                  <span className="muted small">Added {formatDate(i.invitedAt)}</span>
                </div>
                <ConfirmButton label="Remove" confirm={`Remove ${i.name}?`} onConfirm={() => removeInvite(i.email)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {disabled.length > 0 && (
        <div className="card">
          <h2>Disabled</h2>
          <div className="rider-cards">
            {disabled.map((r) => (
              <div key={r.uid} className="rider-card off">
                <div>
                  <strong>{r.name}</strong>
                  <span className="muted small">{r.email} · +91 {r.phone} · {r.bikeNumber}</span>
                  <span className="muted small">{deliveredBy(orders, r.uid).length} deliveries</span>
                </div>
                <div className="rider-card-actions">
                  <ActionButton label="Enable" onClick={() => setRiderStatus(r.uid, 'approved')} />
                  <ConfirmButton label="Delete" danger confirm={`Delete ${r.name} for good?`} onConfirm={() => deleteRider(r.uid)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function PendingRider({ rider }) {
  return (
    <div className="rider-card pending">
      <div>
        <strong>{rider.name}</strong>
        <span className="muted small">{rider.email}</span>
        <span className="small">+91 {rider.phone} · <strong>{rider.bikeNumber}</strong></span>
        <span className="muted small">Signed up {formatDate(rider.createdAt)} · {RIDER_STATUS.pending}</span>
      </div>
      <div className="rider-card-actions">
        <a className="btn small secondary" href={`tel:+91${rider.phone}`}><Icon name="phone" size={14} /> Call</a>
        <ActionButton label="Approve" primary onClick={() => setRiderStatus(rider.uid, 'approved')} />
        <ConfirmButton label="Reject" danger confirm={`Reject ${rider.name}? Their sign-up is deleted.`} onConfirm={() => deleteRider(rider.uid)} />
      </div>
    </div>
  )
}

function RiderRow({ rider, orders }) {
  const done = deliveredBy(orders, rider.uid)
  const today = done.filter((o) => (o.statusTimes?.delivered ?? 0) >= startOfDay(Date.now()))
  const current = orders.find((o) => o.riderUid === rider.uid && ['pending', 'preparing', 'out'].includes(o.status))
  const cash = cashInHand(orders, rider.uid)
  const cashTotal = cash.reduce((s, o) => s + o.collection.amount, 0)
  return (
    <tr>
      <td>
        <strong>{rider.name}</strong>
        <div className="muted small">+91 {rider.phone} · {rider.email}</div>
      </td>
      <td className="nowrap">{rider.bikeNumber}</td>
      <td className="num">{today.length}</td>
      <td className="num">{done.length}</td>
      <td className="small">
        {current ? <Link to={`/admin/orders/${current.id}`}>#{current.number} · {current.status === 'out' ? 'on the way' : current.status === 'pending' ? 'assigned' : 'to pick up'}</Link> : <span className="muted">Free</span>}
      </td>
      <td className="num nowrap">
        {cashTotal ? (
          <div className="cash-cell">
            <strong className="accent">{formatPrice(cashTotal)}</strong>
            <ConfirmButton label="Received" confirm={`Got ${formatPrice(cashTotal)} from ${rider.name.split(' ')[0]}?`} onConfirm={() => settleCash(cash)} />
          </div>
        ) : <span className="muted">—</span>}
      </td>
      <td className="nowrap rider-row-actions">
        <a className="btn small secondary" href={`tel:+91${rider.phone}`} aria-label={`Call ${rider.name}`}><Icon name="phone" size={14} /></a>
        <ConfirmButton label="Disable" confirm={`Disable ${rider.name.split(' ')[0]}? They stop getting orders.`} onConfirm={() => setRiderStatus(rider.uid, 'disabled')} />
        <ConfirmButton label="Delete" danger confirm={`Delete ${rider.name} for good? Their past deliveries stay on the orders.`} onConfirm={() => deleteRider(rider.uid)} />
      </td>
    </tr>
  )
}

function ActionButton({ label, onClick, primary = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <>
      <button
        type="button"
        className={`btn small ${primary ? '' : 'secondary'}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try { await onClick() } catch (err) { setError(err.message) } finally { setBusy(false) }
        }}
      >
        {busy ? 'Saving…' : label}
      </button>
      {error && <span className="error small">{error}</span>}
    </>
  )
}

/** Small button that asks "Are you sure?" inline before doing something. */
function ConfirmButton({ label, confirm, onConfirm, danger = false }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!asking) {
    return (
      <button type="button" className={`btn small ${danger ? 'danger' : 'secondary'}`} onClick={() => setAsking(true)}>{label}</button>
    )
  }
  return (
    <span className="inline-confirm">
      <span className="small">{confirm}</span>
      <button
        type="button"
        className={`btn small ${danger ? 'danger' : ''}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try { await onConfirm(); setAsking(false) } catch (err) { setError(err.message) } finally { setBusy(false) }
        }}
      >
        {busy ? '…' : 'Yes'}
      </button>
      <button type="button" className="btn small secondary" onClick={() => setAsking(false)}>No</button>
      {error && <span className="error small">{error}</span>}
    </span>
  )
}
