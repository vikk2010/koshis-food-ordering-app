// Date ranges, report numbers and CSV export for the admin "Reports" and "Orders" screens.
import { orderStatus } from './orderStatus.js'
import { formatAddress } from './address.js'
import { customerName } from './orders.js'

const DAY = 24 * 60 * 60 * 1000

const startOfDay = (ms) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const addDays = (ms, n) => {
  const d = new Date(ms)
  d.setDate(d.getDate() + n)
  return d.getTime()
}
const monthStart = (ms, offset = 0) => {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime()
}

/** Preset ranges. Each returns { from, to } in ms; `to` is exclusive. */
export const RANGE_PRESETS = [
  { key: 'today', label: 'Today', get: (now) => ({ from: startOfDay(now), to: addDays(startOfDay(now), 1) }) },
  { key: 'yesterday', label: 'Yesterday', get: (now) => ({ from: addDays(startOfDay(now), -1), to: startOfDay(now) }) },
  { key: '7d', label: 'Last 7 days', get: (now) => ({ from: addDays(startOfDay(now), -6), to: addDays(startOfDay(now), 1) }) },
  { key: '30d', label: 'Last 30 days', get: (now) => ({ from: addDays(startOfDay(now), -29), to: addDays(startOfDay(now), 1) }) },
  { key: 'month', label: 'This month', get: (now) => ({ from: monthStart(now), to: monthStart(now, 1) }) },
  { key: 'lastMonth', label: 'Last month', get: (now) => ({ from: monthStart(now, -1), to: monthStart(now) }) },
  { key: 'custom', label: 'Custom dates', get: null },
]

/** "2026-09-28" for <input type="date"> */
export const toDateInput = (ms) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fromDateInput = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** Resolves a range selection { preset, from, to } (from/to = date-input strings, inclusive) to ms. */
export function resolveRange({ preset, from, to }, now = Date.now()) {
  const p = RANGE_PRESETS.find((r) => r.key === preset)
  if (p?.get) return { ...p.get(now), label: p.label }
  const start = from ? fromDateInput(from) : startOfDay(now)
  const end = to ? addDays(fromDateInput(to), 1) : addDays(startOfDay(now), 1)
  const fmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return { from: Math.min(start, end - 1), to: end, label: `${fmt.format(start)} – ${fmt.format(end - 1)}` }
}

// ------------------------------------------------------------------ report numbers

const money = (n) => Math.round(n * 100) / 100
const customerKey = (o) => o.customerUid || o.phone || o.id

/** Everything the Reports screen shows, computed from the orders in the range. */
export function buildReport(orders, { from, to }) {
  const valid = orders.filter((o) => orderStatus(o) !== 'cancelled')
  const cancelled = orders.length - valid.length
  const revenue = money(valid.reduce((s, o) => s + o.bill.grandTotal, 0))
  const collected = money(valid.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + o.bill.grandTotal, 0))

  // Per day (or per hour for a single day)
  const days = Math.max(1, Math.round((Math.min(to, addDays(startOfDay(Date.now()), 1)) - from) / DAY))
  const byDay = []
  for (let t = from; t < to && byDay.length < 400; t = addDays(t, 1)) {
    if (t > Date.now()) break
    byDay.push({ start: t, orders: 0, revenue: 0 })
  }
  for (const o of valid) {
    const slot = byDay.findLast((d) => o.placedAt >= d.start)
    if (slot) {
      slot.orders++
      slot.revenue = money(slot.revenue + o.bill.grandTotal)
    }
  }

  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }))
  const byWeekday = Array.from({ length: 7 }, (_, d) => ({ day: d, orders: 0 }))
  for (const o of valid) {
    const d = new Date(o.placedAt)
    byHour[d.getHours()].orders++
    byWeekday[d.getDay()].orders++
  }

  // Items
  const items = new Map()
  for (const o of valid) {
    for (const i of o.items) {
      const cur = items.get(i.id) || { id: i.id, name: i.name, category: i.category, qty: 0, revenue: 0, orders: 0 }
      cur.qty += i.qty
      cur.revenue = money(cur.revenue + i.price * i.qty)
      cur.orders++
      items.set(i.id, cur)
    }
  }
  const topItems = [...items.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)

  // Customers
  const customers = new Map()
  for (const o of valid) {
    const k = customerKey(o)
    const cur = customers.get(k) || { key: k, name: customerName(o), phone: o.phone, orders: 0, spent: 0, first: o.placedAt, last: o.placedAt }
    cur.orders++
    cur.spent = money(cur.spent + o.bill.grandTotal)
    cur.first = Math.min(cur.first, o.placedAt)
    cur.last = Math.max(cur.last, o.placedAt)
    if (!cur.name) cur.name = customerName(o)
    customers.set(k, cur)
  }
  const customerList = [...customers.values()].sort((a, b) => b.orders - a.orders || b.spent - a.spent)
  const repeat = customerList.filter((c) => c.orders > 1)

  // Payment, status, coupons
  const payment = [
    { key: 'upi', label: 'UPI', orders: valid.filter((o) => o.payment === 'upi').length, amount: money(valid.filter((o) => o.payment === 'upi').reduce((s, o) => s + o.bill.grandTotal, 0)) },
    { key: 'cod', label: 'Cash on delivery', orders: valid.filter((o) => o.payment !== 'upi').length, amount: money(valid.filter((o) => o.payment !== 'upi').reduce((s, o) => s + o.bill.grandTotal, 0)) },
  ]
  const statusCounts = ['pending', 'preparing', 'out', 'delivered', 'cancelled'].map((k) => ({
    key: k,
    orders: orders.filter((o) => orderStatus(o) === k).length,
  }))
  const couponMap = new Map()
  for (const o of valid) {
    if (!o.coupon) continue
    const cur = couponMap.get(o.coupon) || { code: o.coupon, uses: 0, discount: 0 }
    cur.uses++
    cur.discount = money(cur.discount + (o.bill.discount || 0))
    couponMap.set(o.coupon, cur)
  }
  const vegQty = topItems.filter((i) => i.category === 'veg').reduce((s, i) => s + i.qty, 0)
  const nonVegQty = topItems.filter((i) => i.category !== 'veg').reduce((s, i) => s + i.qty, 0)
  const acceptTimes = valid.filter((o) => o.statusTimes?.preparing).map((o) => o.statusTimes.preparing - o.placedAt)

  return {
    totalOrders: orders.length,
    orders: valid.length,
    cancelled,
    revenue,
    collected,
    avgOrder: valid.length ? money(revenue / valid.length) : 0,
    perDay: money(revenue / days),
    discounts: money(valid.reduce((s, o) => s + (o.bill.discount || 0), 0)),
    byDay,
    byHour,
    byWeekday,
    topItems,
    customers: customerList,
    repeatCustomers: repeat.length,
    repeatShare: customerList.length ? repeat.length / customerList.length : 0,
    repeatOrders: repeat.reduce((s, c) => s + c.orders, 0),
    payment,
    statusCounts,
    coupons: [...couponMap.values()].sort((a, b) => b.uses - a.uses),
    vegQty,
    nonVegQty,
    avgAcceptMin: acceptTimes.length ? Math.round(acceptTimes.reduce((s, t) => s + t, 0) / acceptTimes.length / 60000) : null,
  }
}

// ------------------------------------------------------------------ CSV export

const csvCell = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const pad = (n) => String(n).padStart(2, '0')
const date = (ms) => {
  const d = new Date(ms)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}
const time = (ms) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const COLUMNS = [
  ['Order no', (o) => o.number],
  ['Date', (o) => date(o.placedAt)],
  ['Time', (o) => time(o.placedAt)],
  ['Status', (o) => orderStatus(o)],
  ['Payment', (o) => (o.payment === 'upi' ? 'UPI' : 'Cash on delivery')],
  ['Payment status', (o) => (o.paymentStatus === 'paid' ? 'Paid' : 'Pending')],
  ['Customer', (o) => customerName(o)],
  ['Phone', (o) => o.phone],
  ['Email', (o) => o.customerEmail],
  ['Address', (o) => (o.address ? formatAddress(o.address) : '')],
  ['Address label', (o) => o.address?.label || ''],
  ['Items', (o) => o.items.map((i) => `${i.qty} x ${i.name}`).join('; ')],
  ['Item count', (o) => o.items.reduce((n, i) => n + i.qty, 0)],
  ['Item total', (o) => o.bill.itemTotal],
  ['Coupon', (o) => o.coupon || ''],
  ['Discount', (o) => o.bill.discount || 0],
  ['Packaging', (o) => o.bill.packaging],
  ['Delivery fee', (o) => (o.bill.freeDelivery ? 0 : o.bill.delivery)],
  ['Platform fee', (o) => o.bill.platformFee],
  ['GST', (o) => o.bill.gst],
  ['Total', (o) => o.bill.grandTotal],
  ['Scheduled for', (o) => (o.scheduledFor ? `${date(o.scheduledFor)} ${time(o.scheduledFor)}` : '')],
  ['Kitchen note', (o) => o.note || ''],
]

/** CSV text (Excel-friendly) for a list of orders. */
export function ordersToCsv(orders) {
  const rows = [COLUMNS.map(([h]) => h), ...orders.map((o) => COLUMNS.map(([, get]) => get(o)))]
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

/** Starts a download of the orders as a .csv file (opens in Excel / Google Sheets). */
export function downloadOrdersCsv(orders, { from, to }) {
  const name = `orders_${toDateInput(from)}_to_${toDateInput(to - 1)}.csv`
  // BOM so Excel reads ₹ and names in Indian languages correctly.
  const blob = new Blob(['﻿' + ordersToCsv(orders)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return name
}
