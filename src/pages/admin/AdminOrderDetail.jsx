import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdminOrders } from '../../context/AdminOrdersContext.jsx'
import VegIcon from '../../components/VegIcon.jsx'
import Icon from '../../components/Icon.jsx'
import { formatPrice } from '../../utils/bill.js'
import { formatAddress } from '../../utils/address.js'
import { paymentLabel } from '../../utils/delivery.js'
import { customerName, formatClock, formatDateTime, formatPhone, itemCount } from '../../utils/orders.js'

// Full details of one order for the kitchen, with a printable ticket.
export default function AdminOrderDetail() {
  const { id } = useParams()
  const { getOrder, loading, markSeen } = useAdminOrders()
  const order = getOrder(id)

  // Opening a new order counts as seeing it.
  useEffect(() => {
    if (order) markSeen(order.id)
  }, [order, markSeen])

  if (!order) {
    return (
      <section className="center-card">
        <h1>{loading ? 'Loading…' : 'Order not found'}</h1>
        <Link className="btn" to="/admin/orders">Back to orders</Link>
      </section>
    )
  }

  const { bill, address } = order
  const phoneDigits = order.phone?.replace(/\D/g, '')

  return (
    <section className="admin-settings order-detail">
      <div className="page-head">
        <div>
          <p className="crumbs no-print"><Link to="/admin/orders">Orders</Link>  /  #{order.number}</p>
          <h1>Order #{order.number}</h1>
          <p className="muted small" style={{ margin: 0 }}>
            Placed {formatDateTime(order.placedAt)}
            {order.scheduledFor && <> · <strong className="accent">Deliver at {formatDateTime(order.scheduledFor)}</strong></>}
          </p>
        </div>
        <button className="btn secondary no-print" onClick={() => window.print()}>Print ticket</button>
      </div>

      <div className="checkout-grid">
        <div className="checkout-main">
          <div className="card">
            <h2>Items · {itemCount(order)}</h2>
            <div className="order-lines">
              {order.items.map((i) => (
                <div key={i.id}>
                  <span className="cart-item-name" style={{ fontFamily: 'inherit', fontWeight: 500 }}>
                    <VegIcon category={i.category} /> {i.qty} × {i.name}
                  </span>
                  <span>{formatPrice(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            {order.note && (
              <p className="kitchen-note"><Icon name="note" size={16} /> “{order.note}”</p>
            )}
          </div>

          <div className="card">
            <h2>Customer</h2>
            <div className="customer-block">
              <strong>{customerName(order) || 'Customer'}</strong>
              <span>{formatPhone(order.phone)}</span>
              <div className="card-links no-print">
                <a className="btn small secondary" href={`tel:${order.phone}`}>Call</a>
                <a className="btn small secondary" href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            </div>
            <div className="address-line">
              <Icon name="pin" size={18} />
              <span><strong>{address.label}</strong> · {formatAddress(address)}</span>
            </div>
          </div>
        </div>

        <aside className="checkout-side">
          <div className="card summary-card">
            <h2>Bill</h2>
            <dl className="bill small">
              <div><dt>Item total</dt><dd>{formatPrice(bill.itemTotal)}</dd></div>
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
            <p className="muted small" style={{ margin: 0 }}>
              {order.scheduledFor ? `Scheduled delivery at ${formatClock(order.scheduledFor)}` : `Deliver now · promised in ${order.eta} min`}
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
