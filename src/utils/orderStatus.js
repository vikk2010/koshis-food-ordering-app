// Order lifecycle, driven by the admin:
//   pending (waiting for the restaurant) → preparing → out → delivered   (or cancelled)
// UPI orders also carry paymentStatus: 'pending' | 'paid'. The kitchen can only start
// preparing a UPI order after the admin marks the payment as received.

export const STATUS_LABELS = {
  pending: 'Waiting to accept',
  preparing: 'Being prepared',
  out: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const STAGES = ['pending', 'preparing', 'out', 'delivered']

export const orderStatus = (o) => o.status || 'pending'
export const isUpi = (o) => o.payment === 'upi'
export const needsPayment = (o) => isUpi(o) && o.paymentStatus !== 'paid'
export const isOpen = (o) => !['delivered', 'cancelled'].includes(orderStatus(o))

/** Short payment text, e.g. "UPI · Paid", "UPI · Awaiting payment", "Cash on delivery". */
export function paymentText(o) {
  if (isUpi(o)) return `UPI · ${o.paymentStatus === 'paid' ? 'Paid' : 'Awaiting payment'}`
  return 'Cash on delivery'
}

/** Status patch with a timestamp for the new stage. */
const moveTo = (o, status, now) => ({ status, statusTimes: { ...(o.statusTimes || {}), [status]: now } })

/**
 * The next thing the admin should do with an order, as { label, updates }, or null when finished.
 * `updates` is the patch to save on the order.
 */
export function nextAction(o, now = Date.now()) {
  const status = orderStatus(o)
  if (status === 'pending' && needsPayment(o)) {
    return { label: 'Payment received', updates: { paymentStatus: 'paid', paidAt: now }, kind: 'payment' }
  }
  if (status === 'pending') return { label: 'Start preparing', updates: moveTo(o, 'preparing', now) }
  if (status === 'preparing') return { label: 'Out for delivery', updates: moveTo(o, 'out', now) }
  if (status === 'out') {
    const cash = isUpi(o) ? {} : { paymentStatus: 'paid', paidAt: now } // cash collected at the door
    return { label: 'Mark delivered', updates: { ...moveTo(o, 'delivered', now), ...cash } }
  }
  return null
}

/** Cancel patch. reason: 'too_far' (outside the delivery area) or 'restaurant' (any other reason). */
export const cancelUpdates = (o, reason = 'restaurant', now = Date.now()) => ({ ...moveTo(o, 'cancelled', now), cancelReason: reason })

/** True when the order's address is further than the delivery area (current setting, else the one at order time). */
export const isTooFar = (o, radiusKm) => o.distanceKm != null && o.distanceKm > (radiusKm ?? o.serviceRadiusKm ?? 20)
