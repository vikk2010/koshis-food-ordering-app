import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useDishes } from '../context/DishContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useRestaurant } from '../context/RestaurantContext.jsx'
import { withinHours } from '../utils/hours.js'
import { useUser } from '../context/UserContext.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import VegIcon from '../components/VegIcon.jsx'
import DishImage from '../components/DishImage.jsx'
import AddressForm from '../components/AddressForm.jsx'
import Icon from '../components/Icon.jsx'
import { calcBill, couponLabel, evaluateCoupon, formatPrice } from '../utils/bill.js'
import { formatAddress } from '../utils/address.js'
import { deliverySlots, formatTime, PAYMENT_METHODS } from '../utils/delivery.js'

// "02 · Cart & Checkout" screen from Figma.
export default function Cart() {
  const { items, setQty, clearCart } = useCart()
  const { getDish } = useDishes()
  const { settings, coupons } = useSettings()
  const { restaurant, status } = useRestaurant()
  const { addresses, addAddress } = useUser()
  const { addOrder } = useOrders()
  const navigate = useNavigate()

  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCode, setAppliedCode] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [addressId, setAddressId] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [showAllAddresses, setShowAllAddresses] = useState(false)
  const [schedule, setSchedule] = useState(false)
  const [slots] = useState(() => deliverySlots(settings.deliveryTimeMin + 30))
  const [slot, setSlot] = useState(null)
  // UPI is only offered once the admin has added the restaurant's UPI ID.
  const paymentMethods = PAYMENT_METHODS.filter((m) => m.key !== 'upi' || restaurant.upiId)
  const [paymentChoice, setPayment] = useState(() => paymentMethods[0].key)
  const payment = paymentMethods.some((m) => m.key === paymentChoice) ? paymentChoice : paymentMethods[0].key
  const [error, setError] = useState('')
  const [placing, setPlacing] = useState(false)

  if (items.length === 0) {
    return (
      <section className="center-card">
        <h1>Your cart is empty</h1>
        <p className="muted">Add a few dishes from today's menu to get started.</p>
        <Link className="btn" to="/">Browse the menu</Link>
      </section>
    )
  }

  const activeCoupons = coupons.filter((c) => c.active)
  const itemTotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0)
  const appliedCoupon = activeCoupons.find((c) => c.code === appliedCode)
  const couponResult = evaluateCoupon(appliedCoupon, itemTotal)
  const bill = calcBill(items, settings, couponResult.discount)
  const address = addresses.find((a) => a.id === addressId) ?? addresses.at(-1)
  const scheduledFor = schedule ? (slot ?? slots[0]) : null
  // Paused = no orders at all. Outside hours = only a scheduled slot inside opening hours works.
  const closedReason =
    status.reason === 'paused'
      ? status.message
      : scheduledFor
        ? withinHours(restaurant.hours, new Date(scheduledFor)) ? '' : 'The kitchen is closed at that time. Please pick another slot.'
        : status.open ? '' : `${status.message} You can schedule a delivery for later.`

  const applyCoupon = (code) => {
    const coupon = activeCoupons.find((c) => c.code === code.trim().toUpperCase())
    if (!coupon) {
      setCouponError('Invalid or expired coupon code')
      return
    }
    const { error: err } = evaluateCoupon(coupon, itemTotal)
    if (err) {
      setCouponError(err)
      return
    }
    setAppliedCode(coupon.code)
    setCouponInput('')
    setCouponError('')
  }

  const removeCoupon = () => {
    setAppliedCode(null)
    setCouponError('')
  }

  const saveAddress = (data) => {
    const saved = addAddress(data)
    setAddressId(saved.id)
    setShowAddressForm(false)
    setShowAllAddresses(false)
    setError('')
  }

  const placeOrder = async () => {
    if (closedReason) {
      setError(closedReason)
      return
    }
    if (!address) {
      setError('Please add a delivery address')
      return
    }
    // UPI is paid by QR after placing the order; the admin confirms it before cooking starts.
    setPlacing(true)
    setError('')
    let order
    try {
      order = await addOrder({
      items: items.map((i) => ({ ...i, category: getDish(i.id)?.category ?? 'veg' })),
      note: note.trim(),
      coupon: couponResult.discount > 0 ? appliedCode : null,
      address,
      bill,
      eta: settings.deliveryTimeMin,
      scheduledFor,
      payment,
      // Snapshot of where to pay, so the QR code on the tracking page matches this order.
      upi: payment === 'upi' ? { id: restaurant.upiId, name: restaurant.upiName || restaurant.name } : null,
      })
    } catch (err) {
      setError(err.message)
      setPlacing(false)
      return
    }
    clearCart()
    navigate(`/orders/${order.id}`)
  }

  return (
    <section className="checkout">
      <div>
        <p className="crumbs"><Link to="/">Menu</Link>  /  Checkout</p>
        <h1>Checkout</h1>
      </div>

      <div className="checkout-grid">
        <div className="checkout-main">
          {/* Items */}
          <div className="card">
            <h2>Your order · {itemCount} item{itemCount > 1 ? 's' : ''}</h2>
            {items.map((item) => {
              const dish = getDish(item.id)
              return (
                <div className="cart-item" key={item.id}>
                  <DishImage dish={dish ?? { name: item.name }} className="thumb" />
                  <div className="cart-item-info">
                    <div className="cart-item-name">
                      <VegIcon category={dish?.category ?? 'veg'} />
                      {item.name}
                    </div>
                    {dish?.description && <p className="clamp-2 muted small">{dish.description}</p>}
                  </div>
                  <div className="cart-item-right">
                    <div className="qty">
                      <button onClick={() => setQty(item.id, item.qty - 1)} aria-label="Decrease">−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => setQty(item.id, item.qty + 1)} aria-label="Increase">+</button>
                    </div>
                    <span className="price">{formatPrice(item.price * item.qty)}</span>
                  </div>
                </div>
              )
            })}
            <div className="card-links">
              <Link to="/" className="text-link"><Icon name="plus" size={16} /> Add more items</Link>
              {!showNote && (
                <button className="text-link" onClick={() => setShowNote(true)}>
                  <Icon name="note" size={16} /> {note ? 'Edit note' : 'Add a note for the kitchen'}
                </button>
              )}
            </div>
            {showNote && (
              <div className="note-box">
                <textarea
                  rows="2"
                  maxLength={200}
                  placeholder="e.g. Less spicy, no onions, extra chutney…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  autoFocus
                />
                <button className="btn small" onClick={() => setShowNote(false)}>Done</button>
              </div>
            )}
            {!showNote && note && <p className="muted small note-preview">Note: “{note}”</p>}
          </div>

          {/* Address */}
          <div className="card">
            <h2>Delivery address</h2>
            {showAddressForm || addresses.length === 0 ? (
              <AddressForm onSave={saveAddress} onCancel={addresses.length ? () => setShowAddressForm(false) : null} />
            ) : showAllAddresses ? (
              <div className="options">
                {addresses.map((a) => (
                  <label key={a.id} className={`option-tile ${a.id === address?.id ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="address"
                      checked={a.id === address?.id}
                      onChange={() => {
                        setAddressId(a.id)
                        setShowAllAddresses(false)
                      }}
                    />
                    <div className="option-body">
                      <strong>{a.label}</strong>
                      <div className="muted small">{formatAddress(a)}</div>
                    </div>
                  </label>
                ))}
                <button className="option-tile" onClick={() => setShowAddressForm(true)}>
                  <Icon name="plus" /> <strong>Add a new address</strong>
                </button>
              </div>
            ) : (
              <div className="options">
                <div className="option-tile selected">
                  <Icon name="pin" size={22} />
                  <div className="option-body">
                    <strong>{address.label}{address.name && ` · ${address.name}`}</strong>
                    <div className="muted small">{formatAddress(address)}</div>
                  </div>
                  <button className="text-link" onClick={() => setShowAllAddresses(true)}>Change</button>
                </div>
                <button className="option-tile" onClick={() => setShowAddressForm(true)}>
                  <Icon name="plus" /> <strong>Add a new address</strong>
                </button>
              </div>
            )}
          </div>

          {/* Delivery time */}
          <div className="card">
            <h2>Delivery time</h2>
            <div className="options row">
              <button className={`option-tile ${!schedule ? 'selected' : ''}`} onClick={() => setSchedule(false)}>
                <Icon name="clock" size={22} />
                <div className="option-body">
                  <strong>Deliver now</strong>
                  <span className="muted small">Arrives in about {settings.deliveryTimeMin} min</span>
                </div>
              </button>
              <button className={`option-tile ${schedule ? 'selected' : ''}`} onClick={() => setSchedule(true)}>
                <Icon name="calendar" size={22} />
                <div className="option-body">
                  <strong>Schedule for later</strong>
                  <span className="muted small">{schedule ? `At ${formatTime(scheduledFor)}` : 'Pick a time slot'}</span>
                </div>
              </button>
            </div>
            {schedule && (
              <select
                className="slot-select"
                aria-label="Delivery slot"
                value={scheduledFor}
                onChange={(e) => setSlot(Number(e.target.value))}
              >
                {slots.map((s) => (
                  <option key={s} value={s}>
                    {new Date(s).toDateString() === new Date().toDateString() ? 'Today' : 'Tomorrow'}, {formatTime(s)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Payment */}
          <div className="card">
            <h2>Payment method</h2>
            <div className="options">
              {paymentMethods.map((m) => (
                <label key={m.key} className={`option-tile ${payment === m.key ? 'selected' : ''}`}>
                  <input type="radio" name="payment" checked={payment === m.key} onChange={() => setPayment(m.key)} />
                  <div className="option-body">
                    <strong>{m.label}</strong>
                    <span className="muted small">{m.hint}</span>
                  </div>
                </label>
              ))}
            </div>
            {payment === 'upi' && (
              <p className="muted small" style={{ margin: '12px 0 0' }}>
                After you place the order you'll get a QR code for {formatPrice(bill.grandTotal)}. The restaurant starts
                cooking once your payment is received.
              </p>
            )}
          </div>
        </div>

        <aside className="checkout-side">
          {/* Coupons */}
          <div className="card">
            <h2>Offers & coupons</h2>
            {appliedCoupon ? (
              <div className={`applied-coupon ${couponResult.error ? 'invalid' : ''}`}>
                <div>
                  <strong><Icon name="tag" size={16} /> {appliedCoupon.code}</strong>{' '}
                  {couponResult.error ? (
                    <span className="small">{couponResult.error}</span>
                  ) : (
                    <span className="small">applied · you saved {formatPrice(couponResult.discount)}</span>
                  )}
                </div>
                <button className="text-link" onClick={removeCoupon}>Remove</button>
              </div>
            ) : (
              <>
                <div className="coupon-input">
                  <input
                    placeholder="Enter coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyCoupon(couponInput)}
                  />
                  <button className="btn" onClick={() => applyCoupon(couponInput)} disabled={!couponInput.trim()}>
                    Apply
                  </button>
                </div>
                {couponError && <p className="error small">{couponError}</p>}
                {activeCoupons.length > 0 && (
                  <ul className="coupon-list">
                    {activeCoupons.map((c) => (
                      <li key={c.id}>
                        <div>
                          <span className="coupon-code">{c.code}</span>
                          <div className="muted small">{couponLabel(c)}</div>
                        </div>
                        <button className="text-link" onClick={() => applyCoupon(c.code)}>Apply</button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Bill + place order */}
          <div className="card summary-card">
            <h2>Order summary</h2>
            <dl className="bill">
              <div><dt>Item total</dt><dd>{formatPrice(bill.itemTotal)}</dd></div>
              {bill.discount > 0 && (
                <div className="saved"><dt>Coupon ({appliedCode})</dt><dd>−{formatPrice(bill.discount)}</dd></div>
              )}
              <div><dt>Packaging charges</dt><dd>{formatPrice(bill.packaging)}</dd></div>
              <div>
                <dt>Delivery fee</dt>
                <dd>
                  {bill.freeDelivery ? (
                    <><s className="muted">{formatPrice(settings.deliveryCharge)}</s> <span className="saved">FREE</span></>
                  ) : formatPrice(bill.delivery)}
                </dd>
              </div>
              <div><dt>Platform fee</dt><dd>{formatPrice(bill.platformFee)}</dd></div>
              <div><dt>GST ({settings.gstPercent}%)</dt><dd>{formatPrice(bill.gst)}</dd></div>
              <div className="grand"><dt>To pay</dt><dd>{formatPrice(bill.grandTotal)}</dd></div>
            </dl>
            {!bill.freeDelivery && settings.freeDeliveryAbove > 0 && (
              <p className="muted small" style={{ margin: 0 }}>
                Add {formatPrice(Math.round((settings.freeDeliveryAbove - bill.itemTotal) * 100) / 100)} more for free delivery
              </p>
            )}
            {closedReason && <p className="closed-note">{closedReason}</p>}
            {error && error !== closedReason && <p className="error">{error}</p>}
            <div className="place-order">
              <button className="btn large" onClick={placeOrder} disabled={Boolean(closedReason) || placing}>
                {placing ? 'Placing order…' : `Place order · ${formatPrice(bill.grandTotal)}`}
              </button>
              <button className="btn secondary" onClick={clearCart}>Clear cart</button>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              {scheduledFor
                ? `Scheduled for ${formatTime(scheduledFor)}.`
                : `Estimated delivery in about ${settings.deliveryTimeMin} minutes.`}
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
