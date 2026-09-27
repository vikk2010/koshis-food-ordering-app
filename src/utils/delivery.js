const MIN = 60 * 1000

export function formatTime(ms) {
  return new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/** Next `count` half-hour delivery slots, starting at least `leadMin` minutes from now. */
export function deliverySlots(leadMin = 60, count = 8, now = Date.now()) {
  const step = 30 * MIN
  const first = Math.ceil((now + leadMin * MIN) / step) * step
  return Array.from({ length: count }, (_, i) => first + i * step)
}

// Payment happens outside the app: the customer scans the restaurant's UPI QR code (shown after
// placing the order) or pays cash at the door. The admin confirms UPI payments by hand.
export const PAYMENT_METHODS = [
  { key: 'upi', label: 'Pay by UPI QR code', hint: 'Scan with GPay, PhonePe, Paytm or any UPI app after placing the order' },
  { key: 'cod', label: 'Cash on delivery', hint: 'Pay the rider in cash when your food arrives' },
]

export const paymentLabel = (key) => PAYMENT_METHODS.find((m) => m.key === key)?.label ?? 'Cash on delivery'

/**
 * Delivery estimate from the kitchen's real status: the clock starts when the restaurant starts
 * preparing (or it's the scheduled slot). Returns null until the order is accepted.
 */
export function deliveryEstimate(order, now = Date.now()) {
  const started = order.statusTimes?.preparing
  if (!started && !order.scheduledFor) return null
  const deliverAt = order.scheduledFor ?? started + order.eta * MIN
  return { deliverAt, minutesLeft: Math.max(0, Math.ceil((deliverAt - now) / MIN)) }
}
