import { useState } from 'react'
import { applyOrderUpdate } from '../services/riderStore.js'
import { formatPrice } from '../utils/bill.js'
import { customerName, formatClock } from '../utils/orders.js'
import { STATUS_LABELS, cancelUpdates, isOpen, isTooFar, isUpi, needsPayment, nextAction, orderStatus, paymentText } from '../utils/orderStatus.js'
import { useRestaurant } from '../context/RestaurantContext.jsx'

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
  const [confirmCancel, setConfirmCancel] = useState(false) // false | 'restaurant' | 'too_far'
  const { restaurant } = useRestaurant()
  const action = nextAction(order)
  const status = orderStatus(order)
  // Too-far orders can be cancelled at any stage — even if one was moved along by mistake.
  const tooFar = status !== 'cancelled' && isTooFar(order, restaurant.serviceRadiusKm)

  const run = async (updates, e) => {
    e?.stopPropagation()
    setBusy(true)
    setError('')
    try {
      // Also offers the order to riders when cooking starts, and withdraws the offer on cancel.
      await applyOrderUpdate(order, updates)
      setConfirmCancel(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    // Outside the delivery area: offer the cancel here instead of moving the order along.
    if (tooFar) {
      return (
        <span className="order-actions compact" onClick={(e) => e.stopPropagation()}>
          {confirmCancel === 'too_far' ? (
            <span className="compact-confirm">
              <span className="small">Cancel as too far?</span>
              <button type="button" className="btn small danger" disabled={busy} onClick={(e) => run(cancelUpdates(order, 'too_far'), e)}>
                {busy ? 'Saving…' : 'Yes'}
              </button>
              <button type="button" className="btn small secondary" disabled={busy} onClick={() => setConfirmCancel(false)}>No</button>
            </span>
          ) : (
            <button type="button" className="btn small danger" onClick={() => setConfirmCancel('too_far')}
              title={`${order.distanceKm} km away — outside your ${restaurant.serviceRadiusKm} km delivery area`}>
              Cancel — too far
            </button>
          )}
          {error && <span className="error small">{error}</span>}
        </span>
      )
    }
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

  return (
    <div className="order-actions">
      {tooFar && (
        <div className="too-far">
          <strong>📍 {order.distanceKm} km away — outside your {restaurant.serviceRadiusKm} km delivery area</strong>
          <span className="small">
            {status === 'delivered' ? 'This order was marked delivered, but it is outside your area. ' : ''}
            You can cancel it — the customer will see that their address is too far to deliver to
            {isUpi(order) && order.paymentStatus === 'paid' ? ' and that their payment will be refunded' : ''}. To accept
            orders from this far, increase the delivery area in Restaurant Details.
          </span>
          {confirmCancel === 'too_far' ? (
            <div className="cancel-confirm">
              <span className="small">Cancel as too far to deliver?</span>
              <button type="button" className="btn small danger" disabled={busy} onClick={(e) => run(cancelUpdates(order, 'too_far'), e)}>Yes, cancel</button>
              <button type="button" className="btn small secondary" onClick={() => setConfirmCancel(false)}>Keep</button>
            </div>
          ) : (
            <button type="button" className="btn small danger" onClick={() => setConfirmCancel('too_far')}>Cancel — too far to deliver</button>
          )}
        </div>
      )}
      {action?.kind === 'payment' && (
        <p className="small" style={{ margin: 0 }}>
          Check your UPI app for a payment of <strong>{formatPrice(order.bill.grandTotal)}</strong>
          {order.upi?.id && <> to <code>{order.upi.id}</code></>} from <strong>{customerName(order) || 'the customer'}</strong>,
          made after {formatClock(order.placedAt)}. Once it has arrived, confirm it here to start preparing.
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
        confirmCancel === 'restaurant' ? (
          <div className="cancel-confirm">
            <span className="small">Cancel this order?</span>
            <button type="button" className="btn small danger" disabled={busy} onClick={(e) => run(cancelUpdates(order, 'restaurant'), e)}>Yes, cancel</button>
            <button type="button" className="btn small secondary" onClick={() => setConfirmCancel(false)}>Keep</button>
          </div>
        ) : (
          <button type="button" className="link-btn small danger-link" onClick={() => setConfirmCancel('restaurant')}>
            {tooFar ? 'Cancel for another reason' : 'Cancel order'}
          </button>
        )
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  )
}
