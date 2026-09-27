import { DAYS } from '../data/defaultRestaurant.js'

// JS getDay(): 0 = Sunday. Our DAYS list starts on Monday.
const dayKey = (date) => DAYS[(date.getDay() + 6) % 7].key
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function formatHour(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return m ? `${h12}:${String(m).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`
}

export function hoursLabel(day) {
  return day.open ? `${formatHour(day.from)} – ${formatHour(day.to)}` : 'Closed'
}

/** True if `date` falls inside that day's hours (including a late-night spill-over from yesterday). */
export function withinHours(hours, date) {
  const mins = date.getHours() * 60 + date.getMinutes()
  const today = hours[dayKey(date)]
  if (today?.open) {
    const from = toMin(today.from)
    const to = toMin(today.to)
    if (to > from ? mins >= from && mins < to : mins >= from) return true
  }
  const y = new Date(date)
  y.setDate(y.getDate() - 1)
  const yest = hours[dayKey(y)]
  if (yest?.open) {
    const from = toMin(yest.from)
    const to = toMin(yest.to)
    if (to <= from && mins < to) return true
  }
  return false
}

/** Next opening time as a label like "today at 11 AM" or "Monday at 11 AM", or '' if never. */
function nextOpening(hours, date) {
  const nowMin = date.getHours() * 60 + date.getMinutes()
  for (let i = 0; i < 8; i++) {
    const d = new Date(date)
    d.setDate(d.getDate() + i)
    const h = hours[dayKey(d)]
    if (!h?.open || (i === 0 && toMin(h.from) <= nowMin)) continue
    const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAYS[(d.getDay() + 6) % 7].label
    return `${when} at ${formatHour(h.from)}`
  }
  return ''
}

/**
 * { open, reason, message } for the storefront.
 * reason: 'paused' (admin turned ordering off) | 'hours' (outside opening hours) | ''.
 */
export function openStatus(restaurant, date = new Date()) {
  if (!restaurant.acceptingOrders) {
    return { open: false, reason: 'paused', message: 'We are not taking orders right now. Please check back soon.' }
  }
  if (withinHours(restaurant.hours, date)) return { open: true, reason: '', message: '' }
  const next = nextOpening(restaurant.hours, date)
  return {
    open: false,
    reason: 'hours',
    message: next ? `We're closed right now. We open ${next}.` : "We're closed right now.",
  }
}

export { dayKey }
