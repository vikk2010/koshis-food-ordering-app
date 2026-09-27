import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrders } from '../context/OrderContext.jsx'
import VegIcon from '../components/VegIcon.jsx'
import Icon from '../components/Icon.jsx'
import { formatPrice } from '../utils/bill.js'
import { formatAddress } from '../utils/address.js'
import { formatTime, orderProgress, paymentLabel } from '../utils/delivery.js'

const STEPS = [
  { key: 'placed', icon: 'check', title: 'Order placed', text: 'We’ve received your order' },
  { key: 'preparing', icon: 'chef', title: 'Being prepared', text: 'Freshly cooked in the Koshi’s kitchen' },
  { key: 'out', icon: 'bike', title: 'Out for delivery', text: 'Your order is on its way' },
  { key: 'delivered', icon: 'check', title: 'Delivered', text: 'Enjoy your meal!' },
]

const HEADLINES = ['Order confirmed!', 'Your food is being prepared', 'Your order is on the way!', 'Delivered — enjoy your meal!']

// "03 · Order Tracking" screen from Figma.
export default function TrackOrder() {
  const { id } = useParams()
  const { getOrder } = useOrders()
  const order = getOrder(id)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])

  if (!order) {
    return (
      <section className="center-card">
        <h1>Order not found</h1>
        <p className="muted">We couldn't find this order on this device.</p>
        <Link className="btn" to="/">Back to menu</Link>
      </section>
    )
  }

  const { stage, times, deliverAt, minutesLeft } = orderProgress(order, now)
  const delivered = stage === 3
  const { bill } = order

  return (
    <section className="checkout">
      <div>
        <p className="crumbs"><Link to="/">Menu</Link>  /  Order #{order.number}</p>
        <h1>Track your order</h1>
      </div>

      <div className="checkout-grid">
        <div className="checkout-main">
          <div className="card">
            <div className="track-status-head">
              <div>
                <h2>{HEADLINES[stage]}</h2>
                <p className="muted small">
                  Order #{order.number} · Placed at {formatTime(order.placedAt)}
                  {order.scheduledFor && ` · Scheduled for ${formatTime(order.scheduledFor)}`}
                </p>
              </div>
              <div className={`eta-pill ${delivered ? 'done' : ''}`}>
                <Icon name={delivered ? 'check' : 'clock'} size={24} />
                <div>
                  <span className="eyebrow">{delivered ? 'Delivered at' : 'Arriving in'}</span>
                  <strong>{delivered ? formatTime(deliverAt) : `${minutesLeft} min`}</strong>
                </div>
              </div>
            </div>

            <div className="track-map" aria-hidden="true">
              <span className="map-dot"><Icon name={stage >= 2 ? 'bike' : 'chef'} size={32} /></span>
              <span className="map-label">
                {stage >= 2 ? `Heading to ${order.address.label}` : 'Preparing in the Koshi’s kitchen'}
              </span>
            </div>

            <ol className="steps">
              {STEPS.map((s, i) => {
                const state = i < stage || delivered ? 'done' : i === stage ? 'current' : 'pending'
                return (
                  <li key={s.key} className={`step ${state}`}>
                    <div className="step-rail">
                      <span className="step-dot">{state !== 'pending' && <Icon name={s.icon} size={16} />}</span>
                      {i < STEPS.length - 1 && <span className="step-line" />}
                    </div>
                    <div className="step-text">
                      <strong>{s.title}</strong>
                      <span className="muted small">
                        {state === 'pending' ? `Expected by ${formatTime(times[s.key])}` : `${formatTime(times[s.key])} · ${s.text}`}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        <aside className="checkout-side">
          <div className="card summary-card">
            <h2>Order details</h2>
            <div className="order-lines">
              {order.items.map((i) => (
                <div key={i.id}>
                  <span className="cart-item-name" style={{ fontFamily: 'inherit', fontWeight: 400 }}>
                    <VegIcon category={i.category} /> {i.qty} × {i.name}
                  </span>
                  <span>{formatPrice(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <hr className="divider" />
            <dl className="bill small">
              {bill.discount > 0 && (
                <div className="saved"><dt>Coupon ({order.coupon})</dt><dd>−{formatPrice(bill.discount)}</dd></div>
              )}
              <div><dt>Packaging</dt><dd>{formatPrice(bill.packaging)}</dd></div>
              <div><dt>Delivery fee</dt><dd>{bill.freeDelivery ? 'FREE' : formatPrice(bill.delivery)}</dd></div>
              <div><dt>Platform fee</dt><dd>{formatPrice(bill.platformFee)}</dd></div>
              <div><dt>GST</dt><dd>{formatPrice(bill.gst)}</dd></div>
              <div className="grand"><dt>Total</dt><dd>{formatPrice(bill.grandTotal)}</dd></div>
            </dl>
            <span className="status-chip"><Icon name="check" size={14} /> {paymentLabel(order.payment)}</span>
            <div className="address-line">
              <Icon name="pin" size={18} />
              <span>{order.address.label} · {formatAddress(order.address)}</span>
            </div>
            {order.note && <p className="muted small" style={{ margin: 0 }}>Note: “{order.note}”</p>}
          </div>
          <Link className="btn secondary" to="/">Order something else</Link>
        </aside>
      </div>
    </section>
  )
}
