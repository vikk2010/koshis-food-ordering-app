import { formatPrice } from './bill.js'

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

export const formatDate = (ms) => dateFmt.format(ms)
export const formatClock = (ms) => timeFmt.format(ms)
export const formatDateTime = (ms) => `${dateFmt.format(ms)}, ${timeFmt.format(ms)}`

/** "just now", "5 min ago", "3 h ago", or '' for older than a day. */
export function timeAgo(ms, now = Date.now()) {
  const min = Math.floor((now - ms) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  return h < 24 ? `${h} h ago` : ''
}

export const startOfDay = (ms, offsetDays = 0) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d.getTime()
}

export const customerName = (o) => o.customerName || o.address?.name || ''
export const formatPhone = (p = '') => p.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')
export const itemCount = (o) => o.items.reduce((n, i) => n + i.qty, 0)
export const itemsSummary = (o) => o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')

export function notificationText(o) {
  const who = customerName(o) || formatPhone(o.phone) || 'A customer'
  return {
    title: `New order #${o.number} · ${formatPrice(o.bill.grandTotal)}`,
    body: `${who} · ${itemsSummary(o)}${o.scheduledFor ? ` · Scheduled ${formatClock(o.scheduledFor)}` : ''}`,
  }
}
