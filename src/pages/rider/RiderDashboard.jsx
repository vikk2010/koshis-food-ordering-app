import { useEffect, useRef, useState } from 'react'
import { acceptJob, cashInHand, markDelivered, markPickedUp, riderSignOut, shareRiderLocation, subscribeMyDeliveries, subscribeOpenJobs } from '../../services/riderStore.js'
import { distanceKm } from '../../utils/geo.js'
import { useRestaurant } from '../../context/RestaurantContext.jsx'
import Icon from '../../components/Icon.jsx'
import VegIcon from '../../components/VegIcon.jsx'
import QrCode from '../../components/QrCode.jsx'
import TileMap from '../../components/TileMap.jsx'
import useRoadRoute from '../../hooks/useRoadRoute.js'
import { formatPrice } from '../../utils/bill.js'
import { formatAddress } from '../../utils/address.js'
import { formatClock, formatDate, formatPhone, startOfDay, timeAgo } from '../../utils/orders.js'
import { mapsSearchLink } from '../../utils/geo.js'
import { upiPayLink } from '../../utils/qr.js'
import { notificationPermission, playChime, requestNotificationPermission, showDesktopNotification, unlockAudio } from '../../utils/notify.js'

const ACTIVE = ['pending', 'preparing', 'out'] // 'pending' = the restaurant assigned it before accepting the order

// The approved rider's screen: new orders to accept, their own deliveries, and today's history.
export default function RiderDashboard({ rider }) {
  const [jobs, setJobs] = useState([])
  const [mine, setMine] = useState([])
  const [tab, setTab] = useState('new')
  const [now, setNow] = useState(() => Date.now())
  const [permission, setPermission] = useState(notificationPermission)
  const [flash, setFlash] = useState(null) // { text, warn } short message after accepting / delivering
  const known = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  // New orders: alert (chime + notification) for jobs that weren't there before.
  useEffect(() => subscribeOpenJobs((list) => {
    setJobs(list)
    if (known.current === null) {
      known.current = new Set(list.map((j) => j.id))
      return
    }
    const fresh = list.filter((j) => !known.current.has(j.id))
    list.forEach((j) => known.current.add(j.id))
    if (fresh.length) {
      playChime()
      fresh.forEach((j) => showDesktopNotification(`New delivery · ${formatPrice(j.amount)}`, {
        body: `${[j.area, j.city].filter(Boolean).join(', ') || 'New order'}${j.distanceKm != null ? ` · ${j.distanceKm} km` : ''} — tap to accept`,
        tag: `job-${j.id}`,
        onClick: () => setTab('new'),
      }))
    }
  }, (err) => console.error(err)), [])

  // My deliveries — and tell the rider if the restaurant cancels or takes back one they were doing.
  const prevActive = useRef(null)
  useEffect(() => subscribeMyDeliveries(rider.uid, (list) => {
    setMine(list)
    const nowActive = new Map(list.filter((o) => ACTIVE.includes(o.status)).map((o) => [o.id, o]))
    if (prevActive.current) {
      for (const [id, o] of prevActive.current) {
        if (nowActive.has(id)) continue
        const latest = list.find((x) => x.id === id)
        if (!latest) setFlash({ text: `Order #${o.number} was given to another rider by the restaurant.`, warn: true })
        else if (latest.status === 'cancelled') setFlash({ text: `Order #${o.number} was cancelled by the restaurant — don't deliver it.`, warn: true })
        if (!latest || latest.status === 'cancelled') playChime()
      }
    }
    prevActive.current = nowActive
  }, (err) => console.error(err)), [rider.uid])

  // Browsers only play sound after a tap; keep the screen awake while the app is open (where supported).
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    let lock = null
    const keepAwake = async () => {
      try { if (document.visibilityState === 'visible') lock = await navigator.wakeLock?.request('screen') } catch { /* not supported */ }
    }
    keepAwake()
    document.addEventListener('visibilitychange', keepAwake)
    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      document.removeEventListener('visibilitychange', keepAwake)
      lock?.release?.().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!flash) return undefined
    const t = setTimeout(() => setFlash(null), flash.warn ? 15000 : 4000)
    return () => clearTimeout(t)
  }, [flash])

  const active = mine.filter((o) => ACTIVE.includes(o.status))
  const location = useShareLocation(active.filter((o) => o.status !== 'pending'))
  const today = mine.filter((o) => o.status === 'delivered' && (o.statusTimes?.delivered ?? 0) >= startOfDay(now))
  const cash = cashInHand(mine, rider.uid)
  const cashTotal = cash.reduce((s, o) => s + o.collection.amount, 0)

  const accepted = () => {
    setFlash({ text: 'Order accepted — it’s in “My deliveries”.' })
    setTab('mine')
  }

  return (
    <section className="rider-app">
      <header className="rider-top">
        <div className="rider-me">
          <span className="rider-avatar">{rider.name[0]?.toUpperCase()}</span>
          <div>
            <strong>{rider.name}</strong>
            <span className="muted small">{rider.bikeNumber} · <span className="online-dot" /> Online</span>
          </div>
        </div>
        <button type="button" className="btn small secondary" onClick={riderSignOut}>Sign out</button>
      </header>

      <div className="rider-stats">
        <div><strong>{today.length}</strong><span>Delivered today</span></div>
        <div><strong>{active.length}</strong><span>In progress</span></div>
        <div className={cashTotal ? 'cash' : ''}><strong>{formatPrice(cashTotal)}</strong><span>Cash to hand over</span></div>
      </div>

      {permission !== 'granted' && permission !== 'unsupported' && (
        <div className="rider-alert-card">
          <Icon name="clock" size={20} />
          <span>Turn on alerts so you hear new orders. Keep this page open while you're on duty.</span>
          <button type="button" className="btn small" onClick={async () => { unlockAudio(); setPermission(await requestNotificationPermission()) }}>Turn on</button>
        </div>
      )}

      <div className="tabs rider-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'new'} className={`tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>
          New orders {jobs.length > 0 && <span className="tab-count hot">{jobs.length}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'mine'} className={`tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
          My deliveries {active.length > 0 && <span className="tab-count">{active.length}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'history'} className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          History
        </button>
      </div>

      {location.state !== 'idle' && (
        <div className={`rider-location ${location.state}`}>
          <Icon name="pin" size={16} />
          <span>
            {location.state === 'sharing' && 'Sharing your live location with the customer.'}
            {location.state === 'waiting' && 'Finding your location…'}
            {location.state === 'denied' && 'Location is off — the customer can’t see you on the map.'}
            {location.state === 'error' && 'Couldn’t get your location. Move to an open area or check GPS.'}
          </span>
          {(location.state === 'denied' || location.state === 'error') && (
            <button type="button" className="btn small secondary" onClick={location.retry}>Try again</button>
          )}
        </div>
      )}

      {flash && (
        <p className={`rider-flash ${flash.warn ? 'warn' : ''}`} role="status">
          <Icon name={flash.warn ? 'clock' : 'check'} size={16} /> {flash.text}
        </p>
      )}

      {tab === 'new' && (
        jobs.length === 0 ? (
          <div className="rider-empty">
            <Icon name="bike" size={40} />
            <strong>No orders waiting</strong>
            <span className="muted small">New orders appear here as soon as the kitchen starts cooking. We'll ring when one arrives.</span>
          </div>
        ) : (
          <div className="rider-list">
            {jobs.map((j) => <JobCard key={j.id} job={j} rider={rider} now={now} onAccepted={accepted} />)}
          </div>
        )
      )}

      {tab === 'mine' && (
        active.length === 0 ? (
          <div className="rider-empty">
            <Icon name="check" size={40} />
            <strong>Nothing to deliver right now</strong>
            <span className="muted small">Accept an order from “New orders” and it will show up here with the address and customer details.</span>
          </div>
        ) : (
          <div className="rider-list">
            {active.map((o) => <ActiveDelivery key={o.id} order={o} me={location.position} onDone={(msg) => setFlash({ text: msg })} />)}
          </div>
        )
      )}

      {tab === 'history' && <History orders={mine} cash={cash} cashTotal={cashTotal} />}
    </section>
  )
}

function JobCard({ job, rider, now, onAccepted }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const cod = job.payment === 'cod'
  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      await acceptJob(job.id, rider)
      onAccepted()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }
  return (
    <article className="card job-card">
      <div className="job-top">
        <div>
          <span className="eyebrow">Order #{job.number}</span>
          <h3>{[job.area, job.city].filter(Boolean).join(', ') || 'Delivery'}</h3>
        </div>
        <span className="job-amount">{formatPrice(job.amount)}</span>
      </div>
      <div className="job-chips">
        {job.distanceKm != null && <span className="chip-lite"><Icon name="pin" size={14} /> {job.distanceKm} km away</span>}
        <span className={`chip-lite ${cod ? 'warn' : 'ok'}`}>{cod ? `Cash on delivery · collect ${formatPrice(job.amount)}` : 'Paid online'}</span>
        <span className="chip-lite">{job.itemCount} item{job.itemCount > 1 ? 's' : ''}</span>
        {job.scheduledFor && <span className="chip-lite">Deliver at {formatClock(job.scheduledFor)}</span>}
        <span className="chip-lite muted">{timeAgo(job.openedAt, now) || formatClock(job.openedAt)}</span>
      </div>
      {error && <p className="error small">{error}</p>}
      <button type="button" className="btn large job-accept" onClick={accept} disabled={busy}>
        {busy ? 'Accepting…' : 'Accept delivery'}
      </button>
    </article>
  )
}

function ActiveDelivery({ order, me, onDone }) {
  const { restaurant } = useRestaurant()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [collecting, setCollecting] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const { address, bill } = order
  const cod = order.payment === 'cod'
  const phoneDigits = order.phone?.replace(/\D/g, '')

  const run = async (fn, msg) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      onDone(msg)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="card delivery-card">
      <div className="job-top">
        <div>
          <span className="eyebrow">Order #{order.number}</span>
          <h3>{order.status === 'pending' ? 'Assigned to you' : order.status === 'preparing' ? 'Pick up from the kitchen' : 'On the way to the customer'}</h3>
        </div>
        <span className={`order-status s-${order.status}`}>{{ pending: 'Not started yet', preparing: 'Being prepared', out: 'Out for delivery' }[order.status]}</span>
      </div>

      <div className="delivery-customer">
        <div>
          <strong>{order.customerName || address?.name || 'Customer'}</strong>
          <span className="muted small">{formatPhone(order.phone)}</span>
        </div>
        <div className="delivery-contact">
          <a className="btn small secondary" href={`tel:${order.phone}`}><Icon name="phone" size={15} /> Call</a>
          <a className="btn small secondary" href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
      </div>

      <div className="address-line">
        <Icon name="pin" size={18} />
        <span><strong>{address?.label}</strong> · {formatAddress(address || {})}</span>
      </div>
      <RouteMap order={order} restaurant={restaurant} me={me} />

      <details className="delivery-items">
        <summary>{order.items.reduce((n, i) => n + i.qty, 0)} items · {formatPrice(bill.grandTotal)}</summary>
        <ul>
          {order.items.map((i) => <li key={i.id}><VegIcon category={i.category} /> {i.qty} × {i.name}</li>)}
        </ul>
        {order.note && <p className="small muted">Note: “{order.note}”</p>}
      </details>

      <div className={`delivery-pay ${cod ? 'cod' : 'paid'}`}>
        {cod ? <>Collect <strong>{formatPrice(bill.grandTotal)}</strong> — cash on delivery</> : <>Already paid online — <strong>don't collect money</strong></>}
      </div>

      {error && <p className="error small">{error}</p>}

      {order.status === 'pending' && (
        <p className="rider-flash warn" style={{ margin: 0 }}>
          <Icon name="clock" size={16} /> The restaurant assigned this to you. They haven't started cooking yet — wait for “Being prepared” before going to the kitchen.
        </p>
      )}

      {order.status === 'preparing' && (
        <button type="button" className="btn large" disabled={busy} onClick={() => run(() => markPickedUp(order), 'Picked up — drive safe!')}>
          <Icon name="bike" size={18} /> {busy ? 'Saving…' : 'Picked up from kitchen'}
        </button>
      )}

      {order.status === 'out' && cod && !collecting && (
        <button type="button" className="btn large" onClick={() => setCollecting(true)}>
          Collect {formatPrice(bill.grandTotal)} & deliver
        </button>
      )}
      {order.status === 'out' && cod && collecting && (
        <CollectPayment
          order={order}
          restaurant={restaurant}
          busy={busy}
          onCancel={() => setCollecting(false)}
          onPaid={(method) => run(() => markDelivered(order, method), method === 'cash' ? 'Delivered — cash noted.' : 'Delivered — UPI payment noted.')}
        />
      )}

      {order.status === 'out' && !cod && (
        confirm ? (
          <div className="cancel-confirm">
            <span className="small">Handed the food to the customer?</span>
            <button type="button" className="btn small" disabled={busy} onClick={() => run(() => markDelivered(order), 'Delivered — great job!')}>Yes, delivered</button>
            <button type="button" className="btn small secondary" onClick={() => setConfirm(false)}>Not yet</button>
          </div>
        ) : (
          <button type="button" className="btn large" onClick={() => setConfirm(true)}>
            <Icon name="check" size={18} /> Mark as delivered
          </button>
        )
      )}
    </article>
  )
}

/** Cash-on-delivery handover: show the restaurant's UPI QR with the amount, then record how they paid. */
function CollectPayment({ order, restaurant, busy, onCancel, onPaid }) {
  const amount = order.bill.grandTotal
  const amountText = Number(amount).toFixed(2).replace(/\.00$/, '')
  const upiId = restaurant.upiId
  const name = restaurant.upiName || restaurant.name
  const ownQr = !restaurant.upiMerchant && restaurant.upiQr
  return (
    <div className="collect-pay">
      <div className="collect-amount">
        <span className="muted small">Collect from customer</span>
        <strong>₹{amountText}</strong>
      </div>
      {upiId ? (
        <div className="collect-qr">
          {ownQr ? (
            <img src={restaurant.upiQr} alt={`UPI QR code for ${name}`} />
          ) : (
            <QrCode value={upiPayLink({ upiId, name, amount, note: `Order ${order.number}` })} size={210} label={`Pay ₹${amountText} to ${name}`} />
          )}
          <p className="small">
            Paying by UPI? Let the customer scan this with GPay / PhonePe / Paytm
            {ownQr || !restaurant.upiMerchant ? <> and type <strong>₹{amountText}</strong></> : ' — the amount is filled in'}.
            <br /><span className="muted">{name} · {upiId}</span>
          </p>
        </div>
      ) : (
        <p className="muted small">The restaurant hasn't added a UPI ID yet — collect cash.</p>
      )}
      <div className="collect-actions">
        <button type="button" className="btn large" disabled={busy} onClick={() => onPaid('cash')}>Received cash</button>
        {upiId && <button type="button" className="btn large secondary" disabled={busy} onClick={() => onPaid('upi')}>Paid by UPI</button>}
      </div>
      <button type="button" className="text-link small" onClick={onCancel}>Back</button>
    </div>
  )
}

function History({ orders, cash, cashTotal }) {
  const done = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled')
  if (!done.length) {
    return (
      <div className="rider-empty">
        <Icon name="receipt" size={40} />
        <strong>No deliveries yet</strong>
        <span className="muted small">Your completed deliveries will be listed here.</span>
      </div>
    )
  }
  return (
    <div className="rider-list">
      {cashTotal > 0 && (
        <div className="card rider-cash">
          <strong>Cash to hand over: {formatPrice(cashTotal)}</strong>
          <span className="muted small">From {cash.length} cash order{cash.length > 1 ? 's' : ''}. Give it to the restaurant — they'll mark it as received.</span>
        </div>
      )}
      <ul className="history rider-history">
        {done.map((o) => {
          const at = o.statusTimes?.delivered ?? o.statusTimes?.cancelled ?? o.riderAcceptedAt
          return (
            <li key={o.id} className="history-item">
              <div className="history-top">
                <strong>#{o.number}</strong>
                <span className={`order-status s-${o.status}`}>{o.status === 'delivered' ? 'Delivered' : 'Cancelled'}</span>
              </div>
              <span className="muted small">{at ? `${formatDate(at)}, ${formatClock(at)}` : ''} · {o.address?.area || o.address?.city}</span>
              <div className="history-bottom">
                <span className="small">
                  {o.payment === 'cod'
                    ? o.collection ? `Collected by ${o.collection.method === 'cash' ? 'cash' : 'UPI'}${o.collection.method === 'cash' ? (o.cashSettled ? ' · handed over ✓' : ' · to hand over') : ''}` : 'Cash on delivery'
                    : 'Paid online'}
                </span>
                <strong>{formatPrice(o.bill.grandTotal)}</strong>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * While the rider has an order in progress, send the phone's GPS position to it (at most every
 * 15 s, and only after moving ~25 m or a minute passing), so the customer sees them on the map.
 * Stops as soon as there's nothing to deliver.
 */
function useShareLocation(orders) {
  const [state, setState] = useState('idle') // idle | waiting | sharing | denied | error
  const [position, setPosition] = useState(null) // for the rider's own map (updated at most every 5 s)
  const shownAt = useRef(0)
  const [attempt, setAttempt] = useState(0)
  const ordersRef = useRef(orders)
  ordersRef.current = orders
  const last = useRef(null) // { lat, lng, at }
  const on = orders.length > 0

  useEffect(() => {
    if (!on) {
      setState('idle')
      return undefined
    }
    if (!navigator.geolocation) {
      setState('error')
      return undefined
    }
    setState('waiting')
    let timer = null
    const send = (pos) => {
      last.current = { ...pos, at: Date.now() }
      shareRiderLocation(ordersRef.current, pos).catch((err) => console.error('Location not shared:', err))
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setState('sharing')
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }
        if (Date.now() - shownAt.current > 5000) {
          shownAt.current = Date.now()
          setPosition({ lat: pos.lat, lng: pos.lng })
        }
        const prev = last.current
        clearTimeout(timer)
        if (!prev) return send(pos)
        const since = Date.now() - prev.at
        if ((distanceKm(prev, pos) ?? 0) < 0.025 && since < 60000) return // hasn't really moved
        // Too soon after the last update: send this newest position when the 15 s window ends.
        if (since < 15000) timer = setTimeout(() => send(pos), 15000 - since)
        else send(pos)
      },
      (err) => setState(err.code === 1 ? 'denied' : 'error'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    )
    return () => {
      clearTimeout(timer)
      navigator.geolocation.clearWatch(id)
    }
  }, [on, attempt])

  // A newly accepted order gets the current position straight away.
  const ids = orders.map((o) => o.id).join(',')
  useEffect(() => { last.current = null }, [ids])

  return { state, position, retry: () => setAttempt((a) => a + 1) }
}

/**
 * Rider's delivery card: road route from where the rider is now to the next stop (the kitchen while
 * the food is cooking, then the customer), with distance / time and a Google Maps navigation button.
 */
function RouteMap({ order, restaurant, me }) {
  const { address } = order
  const home = address?.location
  const kitchen = restaurant.location
  const toKitchen = order.status !== 'out'
  const target = toKitchen ? kitchen : home
  const points = [
    kitchen && { ...kitchen, kind: 'kitchen', label: 'Kitchen' },
    home && { ...home, kind: 'home', label: 'Customer' },
    me && { ...me, kind: 'rider', label: 'You' },
  ].filter(Boolean)
  const byKind = Object.fromEntries(points.map((p) => [p.kind, p]))
  const kinds = toKitchen ? ['rider', 'kitchen', 'home'] : ['rider', 'home']
  const road = useRoadRoute(kinds.map((k) => byKind[k]).filter(Boolean))
  const leg = me && road ? road.legs?.[0] : null

  // Google Maps turn-by-turn from the phone's current location to the next stop.
  const navigate = target
    ? `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`
    : mapsSearchLink(formatAddress(address || {}))

  return (
    <>
      {points.length > 0 && (
        <div className="rider-route">
          <TileMap points={points} path={road?.path} route={kinds} height={220} />
          <p className="small rider-route-info">
            {leg
              ? <><strong>{leg.km} km · about {leg.minutes} min</strong> to {toKitchen ? 'the kitchen' : 'the customer'}{toKitchen && road.legs[1] ? `, then ${road.legs[1].km} km to the customer` : ''}</>
              : me ? 'Finding the best road route…' : 'Waiting for your location to show the route…'}
          </p>
        </div>
      )}
      <a className="btn secondary delivery-map" target="_blank" rel="noreferrer" href={navigate}>
        <Icon name="pin" size={16} /> Navigate to {toKitchen ? 'kitchen' : 'customer'} in Google Maps
      </a>
    </>
  )
}
