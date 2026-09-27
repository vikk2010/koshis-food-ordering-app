import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RangePicker, { defaultRange } from '../../components/RangePicker.jsx'
import ExportOrders from '../../components/ExportOrders.jsx'
import { BarList, ColumnChart } from '../../components/Charts.jsx'
import VegIcon from '../../components/VegIcon.jsx'
import { useDishes } from '../../context/DishContext.jsx'
import { fetchOrders } from '../../services/orderStore.js'
import { formatPrice } from '../../utils/bill.js'
import { buildReport, resolveRange } from '../../utils/reports.js'
import { formatDate, formatPhone } from '../../utils/orders.js'
import { STATUS_LABELS } from '../../utils/orderStatus.js'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const weekdayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
const hourLabel = (h) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`
const rupees = (n) => formatPrice(Math.round(n))
const pct = (n) => `${Math.round(n * 100)}%`

// "Reports" admin screen: sales, best-selling dishes, repeat customers, busy hours — with export.
export default function AdminReports() {
  const { dishes } = useDishes()
  const [selection, setSelection] = useState(() => defaultRange('7d'))
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const range = useMemo(() => resolveRange(selection), [selection])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    fetchOrders(range.from, range.to)
      .then((list) => active && setOrders(list))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [range.from, range.to])

  const r = useMemo(() => buildReport(orders, range), [orders, range])
  const soldIds = new Set(r.topItems.map((i) => i.id))
  const unsold = dishes.filter((d) => d.available && !soldIds.has(d.id))
  const multiDay = r.byDay.length > 1

  return (
    <section className="admin-settings reports">
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p className="muted small" style={{ margin: 0 }}>
            {range.label} · cancelled orders are left out of sales numbers.
          </p>
        </div>
      </div>

      <div className="report-filters">
        <RangePicker value={selection} onChange={setSelection} />
        <ExportOrders range={selection} />
      </div>

      {error && <p className="error">{error}</p>}

      <div className={`reports-body ${loading ? 'is-loading' : ''}`} aria-busy={loading}>
        <div className="stat-row report-stats">
          <div className="card stat">
            <span className="eyebrow">Sales</span>
            <strong>{rupees(r.revenue)}</strong>
            <span className="muted small">{multiDay ? `${rupees(r.perDay)} a day` : `${rupees(r.collected)} collected`}</span>
          </div>
          <div className="card stat">
            <span className="eyebrow">Orders</span>
            <strong>{r.orders}</strong>
            <span className="muted small">{r.cancelled ? `${r.cancelled} cancelled` : 'none cancelled'}</span>
          </div>
          <div className="card stat">
            <span className="eyebrow">Average order</span>
            <strong>{rupees(r.avgOrder)}</strong>
            <span className="muted small">{r.discounts ? `${rupees(r.discounts)} given in coupons` : 'no coupon discounts'}</span>
          </div>
          <div className="card stat">
            <span className="eyebrow">Customers</span>
            <strong>{r.customers.length}</strong>
            <span className="muted small">{r.repeatCustomers} ordered again ({pct(r.repeatShare)})</span>
          </div>
          <div className="card stat">
            <span className="eyebrow">Time to accept</span>
            <strong>{r.avgAcceptMin == null ? '—' : `${r.avgAcceptMin} min`}</strong>
            <span className="muted small">placed → preparing, on average</span>
          </div>
        </div>

        {!loading && r.totalOrders === 0 ? (
          <div className="card empty">No orders for {range.label.toLowerCase()}. Pick another range above.</div>
        ) : (
          <>
            {multiDay && (
              <div className="card">
                <h2>Sales by day</h2>
                <ColumnChart
                  ariaLabel="Sales by day"
                  axisFormat={(v) => `₹${v >= 1000 ? `${Math.round(v / 100) / 10}K` : v}`}
                  data={r.byDay.map((d) => ({
                    key: d.start,
                    label: r.byDay.length > 10 ? dayFmt.format(d.start) : weekdayFmt.format(d.start).split(',')[0],
                    value: d.revenue,
                    tip: [rupees(d.revenue), `${d.orders} order${d.orders === 1 ? '' : 's'}`, weekdayFmt.format(d.start)],
                  }))}
                />
              </div>
            )}

            <div className="report-grid">
              <div className="card">
                <h2>Most ordered dishes</h2>
                <BarList
                  rows={r.topItems.slice(0, 10).map((i) => ({
                    key: i.id,
                    label: <><VegIcon category={i.category} /> {i.name}</>,
                    value: i.qty,
                    display: `${i.qty} sold`,
                    sub: `${rupees(i.revenue)} · in ${i.orders} order${i.orders === 1 ? '' : 's'}`,
                  }))}
                />
                {(r.vegQty > 0 || r.nonVegQty > 0) && (
                  <p className="muted small report-foot">
                    Veg {pct(r.vegQty / (r.vegQty + r.nonVegQty))} · Non-veg {pct(r.nonVegQty / (r.vegQty + r.nonVegQty))} of dishes sold
                  </p>
                )}
              </div>

              <div className="card">
                <h2>Busiest hours</h2>
                <ColumnChart
                  ariaLabel="Orders by hour of day"
                  height={200}
                  axisFormat={(v) => String(v)}
                  data={trimHours(r.byHour).map((h) => ({
                    key: h.hour,
                    label: hourLabel(h.hour),
                    value: h.orders,
                    tip: [`${h.orders} order${h.orders === 1 ? '' : 's'}`, `${hourLabel(h.hour)} – ${hourLabel((h.hour + 1) % 24)}`],
                  }))}
                />
                {multiDay && (
                  <>
                    <h3 className="report-sub">Busiest days of the week</h3>
                    <BarList
                      rows={[1, 2, 3, 4, 5, 6, 0].map((d) => ({
                        key: d,
                        label: WEEKDAYS[d],
                        value: r.byWeekday[d].orders,
                        display: `${r.byWeekday[d].orders} orders`,
                      }))}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h2>Repeat customers</h2>
                <span className="muted small">
                  {r.repeatCustomers} of {r.customers.length} customers ordered more than once · {r.repeatOrders} of {r.orders} orders
                  came from them
                </span>
              </div>
              <div className="table-wrap flat">
                <table className="admin-table">
                  <thead>
                    <tr><th>Customer</th><th>Phone</th><th className="num">Orders</th><th className="num">Spent</th><th>Last order</th></tr>
                  </thead>
                  <tbody>
                    {r.customers.slice(0, 15).map((c) => (
                      <tr key={c.key}>
                        <td>
                          <strong>{c.name || 'Customer'}</strong>
                          {c.orders > 1 && <span className="repeat-badge">Repeat</span>}
                        </td>
                        <td className="nowrap">
                          {c.phone ? <a href={`tel:${c.phone}`}>{formatPhone(c.phone)}</a> : '—'}
                        </td>
                        <td className="num">{c.orders}</td>
                        <td className="num nowrap">{rupees(c.spent)}</td>
                        <td className="nowrap">{formatDate(c.last)}</td>
                      </tr>
                    ))}
                    {r.customers.length === 0 && <tr><td colSpan="5" className="empty">No customers in this range.</td></tr>}
                  </tbody>
                </table>
              </div>
              {r.customers.length > 15 && <p className="muted small report-foot">Top 15 of {r.customers.length} customers. Export for the full list.</p>}
            </div>

            <div className="report-grid three">
              <div className="card">
                <h2>Payment method</h2>
                <BarList
                  max={Math.max(1, r.orders)}
                  rows={r.payment.map((p) => ({
                    key: p.key,
                    label: p.label,
                    value: p.orders,
                    display: `${p.orders} · ${pct(r.orders ? p.orders / r.orders : 0)}`,
                    sub: rupees(p.amount),
                  }))}
                />
              </div>
              <div className="card">
                <h2>Order status</h2>
                <BarList
                  max={Math.max(1, r.totalOrders)}
                  rows={r.statusCounts.filter((s) => s.orders > 0).map((s) => ({
                    key: s.key,
                    label: STATUS_LABELS[s.key],
                    value: s.orders,
                    display: String(s.orders),
                  }))}
                />
              </div>
              <div className="card">
                <h2>Coupons used</h2>
                <BarList
                  empty="No coupons used in this range."
                  rows={r.coupons.map((c) => ({
                    key: c.code,
                    label: <span className="coupon-code">{c.code}</span>,
                    value: c.uses,
                    display: `${c.uses} use${c.uses === 1 ? '' : 's'}`,
                    sub: `${rupees(c.discount)} discount given`,
                  }))}
                />
              </div>
            </div>

            {unsold.length > 0 && (
              <div className="card">
                <h2>Dishes nobody ordered</h2>
                <p className="muted small" style={{ marginTop: -8 }}>
                  Available on the menu but not ordered in this range — worth a new photo, a price check or a coupon.
                </p>
                <div className="chips">
                  {unsold.map((d) => (
                    <Link key={d.id} className="chip" to={`/admin/dishes/${d.id}/edit`}>
                      <VegIcon category={d.category} /> {d.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

/** Hours from the first to the last one with orders (at least 10am–10pm), so the chart isn't mostly empty. */
function trimHours(byHour) {
  const used = byHour.filter((h) => h.orders > 0).map((h) => h.hour)
  const first = Math.min(10, ...used)
  const last = Math.max(22, ...used)
  return byHour.slice(first, last + 1)
}
