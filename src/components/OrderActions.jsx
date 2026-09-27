import { useState } from 'react'
import { updateOrder } from '../services/orderStore.js'
import { formatPrice } from '../utils/bill.js'
import { STATUS_LABELS, cancelUpdates, isOpen, needsPayment, nextAction, orderStatus, paymentText } from '../utils/orderStatus.js'

/** Coloured chip with the order's current status. */
export function StatusBadge({ order }) {
  const status = orderStatus(order)
  const label = status === 'pending' && needsPayment(order) ? 'Awaiting payment' : STATUS_LABELS[status]
  return <span className={`order-status s-${status}`}>{label}</span>
}

/** Payment chip: "UPI · Paid", "UPI · Awaiting payment", "Cash on delivery". */
export function PaymentBadge({ order }) {
  return <span className={`pay-chip ${needsPayment(order) ? 'warn' : ''}`}>{paymentText(order)}</span>
}

/**
 * Admin buttons that move an order to its next step. `compact` = the one-button version used in
 * the orders table; the full version (order page) adds guidance and a cancel option.
 */
export default function OrderActions({ order, compact = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const action = nextAction(order)

  const run = async (updates, e) => {
    e?.stopPropagation()
    setBusy(true)
    setError('')
    try {
      await updateOrder(order.id, updates)
      setConfirmCancel(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    if (!action) return null
    return (
      <span className="order-actions compact" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`btn small ${action.kind === 'payment' ? 'pay' : ''}`}
          disabled={busy}
          onClick={(e) => run(action.updates, e)}
          title={action.kind === 'payment' ? `Confirm you received ${formatPrice(order.bill.grandTotal)} by UPI` : undefined}
        >
          {busy ? 'Saving…' : action.label}
        </button>
        {error && <span className="error small">{error}</span>}
      </span>
    )
  }

  const status = orderStatus(order)
  return (
    <div className="order-actions">
      {action?.kind === 'payment' && (
        <p className="small" style={{ margin: 0 }}>
          Check your UPI app for <strong>{formatPrice(order.bill.grandTotal)}</strong>
          {order.upi?.id && <> to <code>{order.upi.id}</code></>} with the note <strong>Order {order.number}</strong>.
          Once it has arrived, confirm it here to start preparing.
        </p>
      )}
      {status === 'pending' && !needsPayment(order) && (
        <p className="small" style={{ margin: 0 }}>
          {order.payment === 'upi' ? 'Payment received. ' : 'Cash on delivery. '}The customer is waiting for you to accept.
        </p>
      )}
      {action && (
        <button type="button" className={`btn ${action.kind === 'payment' ? 'pay' : ''}`} disabled={busy} onClick={(e) => run(action.updates, e)}>
          {busy ? 'Saving…' : action.label}
        </button>
      )}
      {isOpen(order) && (
        confirmCancel ? (
          <div className="cancel-confirm">
            <span className="small">Cancel this order?</span>
            <button type="button" className="btn small danger" disabled={busy} onClick={(e) => run(cancelUpdates(order), e)}>Yes, cancel</button>
            <button type="button" className="btn small secondary" onClick={() => setConfirmCancel(false)}>Keep</button>
          </div>
        ) : (
          <button type="button" className="link-btn small danger-link" onClick={() => setConfirmCancel(true)}>Cancel order</button>
        )
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  )
}
