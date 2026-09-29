// Delivery partners ("riders") and delivery jobs.
//
// Firestore layout (see firestore.rules):
// - riders/{uid}: { uid, name, email, phone, bikeNumber, status: 'pending'|'approved'|'disabled', createdAt, approvedAt }
//   A rider signs in with Google (separate "rider" Firebase app) and registers → status 'pending' until the
//   admin approves. If the admin added them first (riderInvites/{email}), they are approved straight away.
// - riderInvites/{email}: riders the admin added by email who haven't signed in yet.
// - deliveryJobs/{orderId}: the part of an order riders may see before accepting it (area, distance, amount,
//   payment type — no customer name, phone or address). Created when the admin starts preparing an order.
//   The first rider to accept sets riderUid; the rules refuse every later attempt, so only one rider wins.
// - orders/{id} gets riderUid + rider { uid, name, phone, bikeNumber } when a rider accepts; only then can
//   that rider read the full order. The rider moves it to 'out' (picked up) and 'delivered', and for cash on
//   delivery records how the customer paid in `collection` { method: 'cash'|'upi', amount, at, riderUid }.
//   The admin marks a rider's collected cash as handed over with `cashSettled`.
//
// Demo mode (no Firebase): everything lives in this browser's localStorage.
import { getFirebase, getFirestoreDb, isFirebaseConfigured } from './firebase.js'
import { signInWithGoogle } from './customerAuth.js'
import { load, save } from '../utils/storage.js'
import { itemCount } from '../utils/orders.js'

const RIDER_APP = 'rider'
const ORDERS_KEY = 'foodapp.allOrders' // same as orderStore.js (demo)
const KEYS = { riders: 'foodapp.riders', invites: 'foodapp.riderInvites', jobs: 'foodapp.deliveryJobs', session: 'foodapp.riderSession' }
const EVENT = 'foodapp:riders-changed'
const ORDERS_EVENT = 'foodapp:orders-changed'

export const RIDER_STATUS = { pending: 'Waiting for approval', approved: 'Active', disabled: 'Disabled' }
export const OPEN_JOB_WARN_MIN = 5 // admin is warned when nobody accepts an order within this many minutes

const emailKey = (email = '') => email.trim().toLowerCase()
const friendly = (err, fallback) => {
  console.error(err)
  if (err?.userMessage) return err.userMessage
  return err?.code === 'permission-denied' ? 'You are not allowed to do this. Please reload and try again.' : fallback
}
const fail = (message) => Object.assign(new Error(message), { userMessage: message })

// ------------------------------------------------------------------ demo helpers

const local = {
  get: (k, d = []) => load(KEYS[k] ?? k, d),
  set(k, v) {
    save(KEYS[k] ?? k, v)
    window.dispatchEvent(new Event(k === ORDERS_KEY ? ORDERS_EVENT : EVENT))
  },
  listen(emit) {
    const onStorage = (e) => [...Object.values(KEYS), ORDERS_KEY].includes(e.key) && emit()
    emit()
    window.addEventListener('storage', onStorage)
    window.addEventListener(EVENT, emit)
    window.addEventListener(ORDERS_EVENT, emit)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(EVENT, emit)
      window.removeEventListener(ORDERS_EVENT, emit)
    }
  },
  updateOrder(id, updates) {
    const all = load(ORDERS_KEY, [])
    save(ORDERS_KEY, all.map((o) => (o.id === id ? { ...o, ...updates } : o)))
    window.dispatchEvent(new Event(ORDERS_EVENT))
  },
}

/** Firestore listener helper: subscribe(db, fs) returns an unsubscribe; handles lazy loading. */
function withDb(appName, subscribe, onError) {
  let unsub = () => {}
  let cancelled = false
  getFirestoreDb(appName)
    .then(({ db, fs }) => {
      if (!cancelled) unsub = subscribe(db, fs)
    })
    .catch((err) => onError?.(err))
  return () => {
    cancelled = true
    unsub()
  }
}

// ------------------------------------------------------------------ rider session (rider app)

/** Calls cb({ uid, email, name } | null) when the rider's sign-in changes. Returns unsubscribe. */
// Demo sessions are per browser tab (sessionStorage), so two tabs can be two different riders.
const demoSession = {
  get() { try { return JSON.parse(sessionStorage.getItem(KEYS.session)) } catch { return null } },
  set(v) {
    try { v ? sessionStorage.setItem(KEYS.session, JSON.stringify(v)) : sessionStorage.removeItem(KEYS.session) } catch { /* ignore */ }
    window.dispatchEvent(new Event(EVENT))
  },
}

export function watchRiderSession(cb) {
  if (!isFirebaseConfigured) return local.listen(() => cb(demoSession.get()))
  let unsub = () => {}
  let cancelled = false
  getFirebase(RIDER_APP).then(({ auth, authMod }) => {
    if (!cancelled) unsub = authMod.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email || '', name: u.displayName || '' } : null))
  })
  return () => {
    cancelled = true
    unsub()
  }
}

/** Google sign-in for riders (demo: pass an email). */
export async function riderSignIn(demoEmail = '') {
  if (!isFirebaseConfigured) {
    const email = emailKey(demoEmail)
    if (!/^\S+@\S+\.\S+$/.test(email)) throw fail('Enter a valid email address')
    const session = { uid: `demo-${email}`, email, name: '' }
    demoSession.set(session)
    return session
  }
  return signInWithGoogle(RIDER_APP)
}

export async function riderSignOut() {
  if (!isFirebaseConfigured) return demoSession.set(null)
  const { auth, authMod } = await getFirebase(RIDER_APP)
  await authMod.signOut(auth)
}

/** Calls cb(riderDoc | null) for the signed-in rider. */
export function subscribeRiderProfile(uid, cb, onError) {
  if (!isFirebaseConfigured) return local.listen(() => cb(local.get('riders').find((r) => r.uid === uid) ?? null))
  return withDb(RIDER_APP, (db, fs) => fs.onSnapshot(fs.doc(db, 'riders', uid), (s) => cb(s.exists() ? s.data() : null), onError), onError)
}

/** The admin's invite for this email, if any (used to pre-fill and auto-approve registration). */
export async function findInvite(email) {
  const key = emailKey(email)
  if (!key) return null
  if (!isFirebaseConfigured) return local.get('invites').find((i) => i.email === key) ?? null
  try {
    const { db, fs } = await getFirestoreDb(RIDER_APP)
    const snap = await fs.getDoc(fs.doc(db, 'riderInvites', key))
    return snap.exists() ? snap.data() : null
  } catch {
    return null
  }
}

/** Creates the rider's profile. Approved straight away if the admin invited this email. */
export async function registerRider(account, { name, phone, bikeNumber }) {
  const invite = await findInvite(account.email)
  const rider = {
    uid: account.uid,
    email: account.email,
    name: name.trim(),
    phone: phone.replace(/\D/g, '').slice(-10),
    bikeNumber: bikeNumber.trim().toUpperCase(),
    status: invite ? 'approved' : 'pending',
    createdAt: Date.now(),
    ...(invite ? { approvedAt: Date.now() } : {}),
  }
  if (!isFirebaseConfigured) {
    local.set('riders', [...local.get('riders').filter((r) => r.uid !== rider.uid), rider])
    if (invite) local.set('invites', local.get('invites').filter((i) => i.email !== invite.email))
    return rider
  }
  try {
    const { db, fs } = await getFirestoreDb(RIDER_APP)
    await fs.setDoc(fs.doc(db, 'riders', rider.uid), rider)
    if (invite) await fs.deleteDoc(fs.doc(db, 'riderInvites', emailKey(account.email))).catch(() => {})
    return rider
  } catch (err) {
    throw new Error(friendly(err, 'Could not save your details — check your connection and try again.'))
  }
}

// ------------------------------------------------------------------ jobs (rider app)

/** Calls cb(jobs) with every order waiting for a rider, oldest first. */
export function subscribeOpenJobs(cb, onError) {
  const sort = (list) => list.sort((a, b) => a.openedAt - b.openedAt)
  if (!isFirebaseConfigured) return local.listen(() => cb(sort(local.get('jobs').filter((j) => j.status === 'open'))))
  return withDb(
    RIDER_APP,
    (db, fs) => fs.onSnapshot(
      fs.query(fs.collection(db, 'deliveryJobs'), fs.where('status', '==', 'open')),
      (snap) => cb(sort(snap.docs.map((d) => d.data()))),
      onError,
    ),
    onError,
  )
}

/** Calls cb(orders) with every order this rider has accepted, newest first. */
export function subscribeMyDeliveries(uid, cb, onError) {
  const sort = (list) => list.sort((a, b) => (b.riderAcceptedAt ?? 0) - (a.riderAcceptedAt ?? 0))
  if (!isFirebaseConfigured) return local.listen(() => cb(sort(load(ORDERS_KEY, []).filter((o) => o.riderUid === uid))))
  return withDb(
    RIDER_APP,
    (db, fs) => fs.onSnapshot(
      fs.query(fs.collection(db, 'orders'), fs.where('riderUid', '==', uid)),
      (snap) => cb(sort(snap.docs.map((d) => d.data()))),
      onError,
    ),
    onError,
  )
}

const riderSummary = (r) => ({ uid: r.uid, name: r.name, phone: r.phone, bikeNumber: r.bikeNumber })

/**
 * Rider accepts a job. Only the first rider succeeds — rejects with "already taken" otherwise.
 * (A Firestore transaction reads the job; the security rules also refuse a second taker.)
 */
export async function acceptJob(jobId, rider) {
  const now = Date.now()
  const taken = fail('Another rider has already accepted this order.')
  if (!isFirebaseConfigured) {
    const jobs = local.get('jobs')
    const job = jobs.find((j) => j.id === jobId)
    if (!job) throw fail('This order is no longer available.')
    if (job.status !== 'open' || job.riderUid) throw taken
    local.set('jobs', jobs.map((j) => (j.id === jobId ? { ...j, status: 'taken', riderUid: rider.uid, riderName: rider.name, takenAt: now } : j)))
    local.updateOrder(jobId, { riderUid: rider.uid, rider: riderSummary(rider), riderAcceptedAt: now })
    return
  }
  try {
    const { db, fs } = await getFirestoreDb(RIDER_APP)
    await fs.runTransaction(db, async (tx) => {
      const ref = fs.doc(db, 'deliveryJobs', jobId)
      const snap = await tx.get(ref)
      if (!snap.exists()) throw fail('This order is no longer available.')
      const job = snap.data()
      if (job.status !== 'open' || job.riderUid) throw taken
      tx.update(ref, { status: 'taken', riderUid: rider.uid, riderName: rider.name, takenAt: now })
      tx.update(fs.doc(db, 'orders', jobId), { riderUid: rider.uid, rider: riderSummary(rider), riderAcceptedAt: now })
    })
  } catch (err) {
    if (err.userMessage) throw err
    // A rules refusal here almost always means someone else won the race.
    throw new Error(err.code === 'permission-denied' || err.code === 'aborted' || err.code === 'failed-precondition'
      ? taken.message
      : friendly(err, 'Could not accept the order — check your connection and try again.'))
  }
}

async function riderUpdateOrder(order, updates) {
  if (!isFirebaseConfigured) return local.updateOrder(order.id, updates)
  try {
    const { db, fs } = await getFirestoreDb(RIDER_APP)
    await fs.updateDoc(fs.doc(db, 'orders', order.id), updates)
  } catch (err) {
    throw new Error(friendly(err, 'Could not update the order — check your connection and try again.'))
  }
}

/**
 * Rider's phone position → shown on the customer's tracking map. Written to each order the rider is
 * currently handling, as riderLocation { lat, lng, accuracy, at }.
 */
export async function shareRiderLocation(orders, { lat, lng, accuracy }) {
  const riderLocation = { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, accuracy: Math.round(accuracy || 0), at: Date.now() }
  if (!isFirebaseConfigured) return orders.forEach((o) => local.updateOrder(o.id, { riderLocation }))
  const { db, fs } = await getFirestoreDb(RIDER_APP)
  await Promise.all(orders.map((o) => fs.updateDoc(fs.doc(db, 'orders', o.id), { riderLocation })))
}

/** Rider collected the food from the kitchen → "Out for delivery". */
export function markPickedUp(order) {
  const now = Date.now()
  return riderUpdateOrder(order, { status: 'out', statusTimes: { ...(order.statusTimes || {}), out: now } })
}

/**
 * Rider handed the food over → "Delivered". For cash on delivery, `method` is how the customer paid
 * ('cash' or 'upi'); the order is then marked paid.
 */
export function markDelivered(order, method) {
  const now = Date.now()
  const updates = { status: 'delivered', statusTimes: { ...(order.statusTimes || {}), delivered: now } }
  if (order.payment === 'cod') {
    Object.assign(updates, {
      paymentStatus: 'paid',
      paidAt: now,
      collection: { method, amount: order.bill.grandTotal, at: now, riderUid: order.riderUid },
    })
  }
  return riderUpdateOrder(order, updates)
}

// ------------------------------------------------------------------ admin

/** Admin: every rider (newest first). */
export function subscribeRiders(cb, onError) {
  const sort = (list) => list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  if (!isFirebaseConfigured) return local.listen(() => cb(sort(local.get('riders'))))
  return withDb('admin', (db, fs) => fs.onSnapshot(fs.collection(db, 'riders'), (s) => cb(sort(s.docs.map((d) => d.data()))), onError), onError)
}

/** Admin: riders added by email who haven't signed in yet. */
export function subscribeInvites(cb, onError) {
  if (!isFirebaseConfigured) return local.listen(() => cb(local.get('invites')))
  return withDb('admin', (db, fs) => fs.onSnapshot(fs.collection(db, 'riderInvites'), (s) => cb(s.docs.map((d) => d.data())), onError), onError)
}

/** Admin: every delivery job, newest first (to show "finding a rider" and warn when nobody accepts). */
export function subscribeJobs(cb, onError) {
  const sort = (list) => list.sort((a, b) => b.openedAt - a.openedAt).slice(0, 300)
  if (!isFirebaseConfigured) return local.listen(() => cb(sort(local.get('jobs'))))
  return withDb(
    'admin',
    (db, fs) => fs.onSnapshot(
      fs.query(fs.collection(db, 'deliveryJobs'), fs.orderBy('openedAt', 'desc'), fs.limit(300)),
      (s) => cb(s.docs.map((d) => d.data())),
      onError,
    ),
    onError,
  )
}

async function adminWrite(fn, fallback) {
  try {
    const { db, fs } = await getFirestoreDb('admin')
    await fn(db, fs)
  } catch (err) {
    throw new Error(friendly(err, fallback))
  }
}

/** Admin: add a rider by email. They're approved as soon as they sign in with that Google account. */
export async function inviteRider({ name, email, phone, bikeNumber }) {
  const invite = {
    email: emailKey(email),
    name: name.trim(),
    phone: phone.replace(/\D/g, '').slice(-10),
    bikeNumber: bikeNumber.trim().toUpperCase(),
    invitedAt: Date.now(),
  }
  if (!/^\S+@\S+\.\S+$/.test(invite.email)) throw fail('Enter a valid email address')
  if (!isFirebaseConfigured) return local.set('invites', [...local.get('invites').filter((i) => i.email !== invite.email), invite])
  return adminWrite((db, fs) => fs.setDoc(fs.doc(db, 'riderInvites', invite.email), invite), 'Could not add the rider.')
}

export async function removeInvite(email) {
  if (!isFirebaseConfigured) return local.set('invites', local.get('invites').filter((i) => i.email !== email))
  return adminWrite((db, fs) => fs.deleteDoc(fs.doc(db, 'riderInvites', email)), 'Could not remove the invite.')
}

/** Admin: approve / disable / re-enable a rider. */
export async function setRiderStatus(uid, status) {
  const updates = { status, ...(status === 'approved' ? { approvedAt: Date.now() } : {}) }
  if (!isFirebaseConfigured) return local.set('riders', local.get('riders').map((r) => (r.uid === uid ? { ...r, ...updates } : r)))
  return adminWrite((db, fs) => fs.updateDoc(fs.doc(db, 'riders', uid), updates), 'Could not update the rider.')
}

export async function deleteRider(uid) {
  if (!isFirebaseConfigured) return local.set('riders', local.get('riders').filter((r) => r.uid !== uid))
  return adminWrite((db, fs) => fs.deleteDoc(fs.doc(db, 'riders', uid)), 'Could not delete the rider.')
}

/** What riders may see about an order before accepting it. */
export function jobFromOrder(o, now = Date.now()) {
  return {
    id: o.id,
    orderId: o.id,
    number: o.number,
    area: o.address?.area || '',
    city: o.address?.city || '',
    pincode: o.address?.pincode || '',
    distanceKm: o.distanceKm ?? null,
    amount: o.bill?.grandTotal ?? 0,
    payment: o.payment || 'cod',
    itemCount: itemCount(o),
    placedAt: o.placedAt,
    scheduledFor: o.scheduledFor ?? null,
    openedAt: now,
    status: 'open',
    riderUid: null,
    riderName: '',
  }
}

/**
 * Admin: saves an order status change and keeps its delivery job in step:
 * start preparing → riders are offered the order; cancelled, or sent out / delivered by the kitchen
 * without a rider → the offer is withdrawn.
 */
export async function applyOrderUpdate(order, updates) {
  const next = { ...order, ...updates }
  const openJob = updates.status === 'preparing' && !order.riderUid
  const dropJob = updates.status === 'cancelled' || (['out', 'delivered'].includes(updates.status) && !order.riderUid)
  if (!isFirebaseConfigured) {
    local.updateOrder(order.id, updates)
    if (openJob) local.set('jobs', [...local.get('jobs').filter((j) => j.id !== order.id), jobFromOrder(next)])
    else if (dropJob) local.set('jobs', local.get('jobs').filter((j) => j.id !== order.id))
    return
  }
  return adminWrite(async (db, fs) => {
    const batch = fs.writeBatch(db)
    batch.update(fs.doc(db, 'orders', order.id), updates)
    if (openJob) batch.set(fs.doc(db, 'deliveryJobs', order.id), jobFromOrder(next))
    else if (dropJob) batch.delete(fs.doc(db, 'deliveryJobs', order.id))
    await batch.commit()
  }, 'Could not update the order — check your connection and try again.')
}

/** Admin: offer an already-accepted order to riders (e.g. orders accepted before riders existed). */
export async function sendToRiders(order) {
  const job = jobFromOrder(order)
  if (!isFirebaseConfigured) return local.set('jobs', [...local.get('jobs').filter((j) => j.id !== order.id), job])
  return adminWrite((db, fs) => fs.setDoc(fs.doc(db, 'deliveryJobs', order.id), job), 'Could not send the order to riders.')
}

/** Admin: give the order to a specific rider (skipping the "first to accept" offer). */
export async function assignRider(order, rider) {
  const now = Date.now()
  const job = { ...jobFromOrder(order), status: 'taken', riderUid: rider.uid, riderName: rider.name, takenAt: now, assignedBy: 'admin' }
  const orderUpdates = { riderUid: rider.uid, rider: riderSummary(rider), riderAcceptedAt: now }
  if (!isFirebaseConfigured) {
    local.set('jobs', [...local.get('jobs').filter((j) => j.id !== order.id), job])
    return local.updateOrder(order.id, orderUpdates)
  }
  return adminWrite(async (db, fs) => {
    const batch = fs.writeBatch(db)
    batch.set(fs.doc(db, 'deliveryJobs', order.id), job)
    batch.update(fs.doc(db, 'orders', order.id), orderUpdates)
    await batch.commit()
  }, 'Could not assign the rider.')
}

/**
 * Admin: take the order away from its rider. Once cooking has started it's offered to all riders
 * again; an order the kitchen hasn't accepted yet just goes back to having no rider.
 */
export async function unassignRider(order) {
  const reoffer = (order.status || 'pending') !== 'pending'
  const job = jobFromOrder(order)
  const orderUpdates = { riderUid: null, rider: null, riderAcceptedAt: null }
  if (!isFirebaseConfigured) {
    local.set('jobs', [...local.get('jobs').filter((j) => j.id !== order.id), ...(reoffer ? [job] : [])])
    return local.updateOrder(order.id, orderUpdates)
  }
  return adminWrite(async (db, fs) => {
    const batch = fs.writeBatch(db)
    if (reoffer) batch.set(fs.doc(db, 'deliveryJobs', order.id), job)
    else batch.delete(fs.doc(db, 'deliveryJobs', order.id))
    batch.update(fs.doc(db, 'orders', order.id), orderUpdates)
    await batch.commit()
  }, 'Could not remove the rider.')
}

/** Admin: the rider has handed over the cash they collected for these orders. */
export async function settleCash(orders) {
  const now = Date.now()
  if (!orders.length) return
  if (!isFirebaseConfigured) {
    const ids = new Set(orders.map((o) => o.id))
    const all = load(ORDERS_KEY, [])
    save(ORDERS_KEY, all.map((o) => (ids.has(o.id) ? { ...o, cashSettled: true, cashSettledAt: now } : o)))
    window.dispatchEvent(new Event(ORDERS_EVENT))
    return
  }
  return adminWrite(async (db, fs) => {
    const batch = fs.writeBatch(db)
    orders.forEach((o) => batch.update(fs.doc(db, 'orders', o.id), { cashSettled: true, cashSettledAt: now }))
    await batch.commit()
  }, 'Could not save — check your connection and try again.')
}

// ------------------------------------------------------------------ shared helpers

/** Cash a rider collected and hasn't handed over yet. */
export const cashInHand = (orders, uid) =>
  orders.filter((o) => o.riderUid === uid && o.collection?.method === 'cash' && !o.cashSettled)

export const deliveredBy = (orders, uid) => orders.filter((o) => o.riderUid === uid && o.status === 'delivered')
