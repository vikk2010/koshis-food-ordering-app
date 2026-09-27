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

export const PAYMENT_METHODS = [
  { key: 'upi', label: 'UPI', hint: 'GPay, PhonePe, Paytm or any UPI app' },
  { key: 'card', label: 'Credit / Debit card', hint: 'Visa, Mastercard, RuPay' },
  { key: 'cod', label: 'Cash on delivery', hint: 'Pay the rider in cash or UPI at your door' },
]

export const paymentLabel = (key) => PAYMENT_METHODS.find((m) => m.key === key)?.label ?? 'Cash on delivery'

/**
 * Simulated order progress, based on the clock, until a backend sends real status updates.
 * Cooking starts right away (or `eta` minutes before a scheduled slot), the rider leaves at 60%
 * of the delivery time and the order is delivered at the promised time.
 */
export function orderProgress(order, now = Date.now()) {
  const total = order.eta * MIN
  const deliverAt = order.scheduledFor ?? order.placedAt + total
  const startAt = deliverAt - total
  const times = {
    placed: order.placedAt,
    preparing: Math.max(order.placedAt, startAt) + MIN,
    out: startAt + total * 0.6,
    delivered: deliverAt,
  }
  const stage = now >= times.delivered ? 3 : now >= times.out ? 2 : now >= times.preparing ? 1 : 0
  return { stage, times, deliverAt, minutesLeft: Math.max(0, Math.ceil((deliverAt - now) / MIN)) }
}
