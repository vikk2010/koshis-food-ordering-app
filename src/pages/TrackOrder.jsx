import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrders } from '../context/OrderContext.jsx'
import { useRestaurant } from '../context/RestaurantContext.jsx'
import { subscribeToOrder } from '../services/orderStore.js'
import VegIcon from '../components/VegIcon.jsx'
import Icon from '../components/Icon.jsx'
import UpiPayment from '../components/UpiPayment.jsx'
import { formatPrice } from '../utils/bill.js'
import { formatAddress } from '../utils/address.js'
import { deliveryEstimate, formatTime } from '../utils/delivery.js'
import { STAGES, isUpi, needsPayment, orderStatus, paymentText } from '../utils/orderStatus.js'

const STEPS = [
  { key: 'pending', icon: 'check', title: 'Order placed', text: 'We’ve received your order' },
  { key: 'preparing', icon: 'chef', title: 'Being prepared', text: 'Freshly cooked in the Koshi’s kitchen' },
  { key: 'out', icon: 'bike', title: 'Out for delivery', text: 'Your order is on its way' },
  { key: 'delivered', icon: 'check', title: 'Delivered', text: 'Enjoy your meal!' },
]

const HEADLINES = {
  pending: 'Waiting for the restaurant to accept your order',
  preparing: 'Your food is being prepared',
  out: 'Your order is on the way!',
  delivered: 'Delivered — enjoy your meal!',
  cancelled: 'This order was cancelled',
}

// "03 · Order Tracking" screen from Figma. Status comes live from the kitchen (admin panel).
export default function TrackOrder() {
  const { id } = useParams()
  const { getOrder, loading } = useOrders()
  const { restaurant } = useRestaurant()
  const saved = getOrder(id)
  const [live, setLive] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])

  // Listen for status changes made by the restaurant.
  useEffect(() => {
    if (!saved) return undefined
    return subscribeToOrder(id, setLive)
  }, [id, Boolean(saved)]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!saved) {
    if (loading) return <p className="empty">Loading your order…</p>
    return (
      <section className="center-card">
        <h1>Order not found</h1>
        <p className="muted">We couldn't find this order in your account.</p>
        <Link className="btn" to="/">Back to menu</Link>
      </section>
    )
  }

  const order = { ...saved, ...live }
  const status = orderStatus(order)
  const cancelled = status === 'cancelled'
  const delivered = status === 'delivered'
  const stage = STAGES.indexOf(status)
  const unpaid = needsPayment(order)
  const estimate = stage >= 1 ? deliveryEstimate(order, now) : null
  const statusTimes = order.statusTimes || { pending: order.placedAt }
  const { bill } = order
  const phone = restaurant.phone

  return (
    <section className="checkout">
      <div>
        <p className="crumbs"><Link to="/">Menu</Link>  /  Order #{order.number}</p>
        <h1>Track your order</h1>
      </div>

      <div className="checkout-grid">
        <div className="checkout-main">
          {status === 'pending' && unpaid && order.upi?.id && (
            <UpiPayment upiId={order.upi.id} name={order.upi.name} amount={bill.grandTotal} note={`Order ${order.number}`} merchant={Boolean(order.upi.merchant)}
              qrImage={restaurant.upiId === order.upi.id ? restaurant.upiQr : ''}
            />
          )}

          <div className="card">
            <div className="track-status-head">
              <div>
                <h2>{HEADLINES[status]}</h2>
                <p className="muted small">
                  Order #{order.number} · Placed at {formatTime(order.placedAt)}
                  {order.scheduledFor && ` · Scheduled for ${formatTime(order.scheduledFor)}`}
                </p>
              </div>
              {status === 'pending' ? (
                <div className="eta-pill waiting">
                  <span className="pulse-dot" aria-hidden="true" />
                  <div>
                    <span className="eyebrow">Status</span>
                    <strong>{unpaid ? 'Awaiting payment' : 'Awaiting confirmation'}</strong>
                  </div>
                </div>
              ) : cancelled ? null : (
                <div className={`eta-pill ${delivered ? 'done' : ''}`}>
                  <Icon name={delivered ? 'check' : 'clock'} size={24} />
                  <div>
                    <span className="eyebrow">{delivered ? 'Delivered at' : estimate?.minutesLeft ? 'Arriving in' : 'Arriving'}</span>
                    <strong>
                      {delivered
                        ? formatTime(statusTimes.delivered ?? now)
                        : estimate?.minutesLeft ? `${estimate.minutesLeft} min` : 'Any minute'}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {status === 'pending' && (
              <div className="waiting-note" role="status">
                <span className="pulse-dot" aria-hidden="true" />
                <p>
                  {unpaid
                    ? 'Please pay using the QR code above. The restaurant will accept your order as soon as they receive your payment.'
                    : isUpi(order)
                      ? 'Payment received ✓ The restaurant will accept your order shortly.'
                      : 'The restaurant will accept your order shortly. You’ll pay in cash when it arrives.'}
                  {' '}This page updates by itself.
                </p>
              </div>
            )}

            {cancelled ? (
              <div className="waiting-note cancelled">
                <p>
                  The restaurant cancelled this order.
                  {isUpi(order) && order.paymentStatus === 'paid' && ' Your payment will be refunded.'}
                  {phone && <> For help, call <a href={`tel:+91${phone}`}>+91 {phone}</a>.</>}
                </p>
              </div>
            ) : (
              <>
                {stage >= 1 && (
                  <div className="track-map" aria-hidden="true">
                    <span className="map-dot"><Icon name={stage >= 2 ? 'bike' : 'chef'} size={32} /></span>
                    <span className="map-label">
                      {stage >= 2 ? `Heading to ${order.address.label}` : 'Preparing in the Koshi’s kitchen'}
                    </span>
                  </div>
                )}

                <ol className="steps">
                  {STEPS.map((s, i) => {
                    const state = i < stage || delivered ? 'done' : i === stage ? 'current' : 'pending'
                    const at = statusTimes[s.key]
                    return (
                      <li key={s.key} className={`step ${state}`}>
                        <div className="step-rail">
                          <span className="step-dot">{state !== 'pending' && <Icon name={s.icon} size={16} />}</span>
                          {i < STEPS.length - 1 && <span className="step-line" />}
                        </div>
                        <div className="step-text">
                          <strong>{s.title}</strong>
                          <span className="muted small">
                            {state === 'pending'
                              ? s.key === 'delivered' && estimate ? `Expected by ${formatTime(estimate.deliverAt)}` : 'Waiting'
                              : at ? `${formatTime(at)} · ${s.text}` : s.text}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </>
            )}
          </div>
        </div>

        <aside className="checkout-side">
          <div className="card summary-card">
            <h2>Order details</h2>
            <p className="muted small" style={{ margin: 0 }}>
              Order #{order.number} · Placed at {formatTime(order.placedAt)}
            </p>
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
            <span className={`status-chip ${unpaid ? 'warn' : ''}`}>
              <Icon name={unpaid ? 'clock' : 'check'} size={14} /> {paymentText(order)}
            </span>
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
