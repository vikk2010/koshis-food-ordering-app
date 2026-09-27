// Where placed orders are sent so the admin panel can see them.
//
// - Firebase configured (.env): orders go to the Firestore "orders" collection. The admin panel
//   receives them live on any device. Access is controlled by firestore.rules.
// - Demo mode: orders go to this browser's localStorage. The admin panel sees them live only in
//   the same browser (e.g. customer in one tab, /admin/orders in another).
import { isFirebaseConfigured, getFirestoreDb } from './firebase.js'
import { load, save } from '../utils/storage.js'

export const ordersAreShared = isFirebaseConfigured

const LOCAL_KEY = 'foodapp.allOrders'
const LOCAL_EVENT = 'foodapp:orders-changed'
const MAX_ORDERS = 300

/** Sends a placed order to the kitchen. Rejects with a user-facing message on failure. */
export async function submitOrder(order) {
  if (!isFirebaseConfigured) {
    const all = [order, ...load(LOCAL_KEY, []).filter((o) => o.id !== order.id)].slice(0, MAX_ORDERS)
    if (!save(LOCAL_KEY, all)) throw new Error('Could not save your order. Please try again.')
    window.dispatchEvent(new Event(LOCAL_EVENT))
    return
  }
  try {
    const { db, fs } = await getFirestoreDb()
    await fs.setDoc(fs.doc(db, 'orders', order.id), order)
  } catch (err) {
    console.error(err)
    throw new Error('Could not place your order — please check your connection and try again.')
  }
}

/** Admin: saves a status / payment change on an order. Rejects with a user-facing message on failure. */
export async function updateOrder(id, updates) {
  if (!isFirebaseConfigured) {
    const all = load(LOCAL_KEY, [])
    if (!all.some((o) => o.id === id)) throw new Error('Order not found')
    if (!save(LOCAL_KEY, all.map((o) => (o.id === id ? { ...o, ...updates } : o)))) throw new Error('Could not save the change.')
    window.dispatchEvent(new Event(LOCAL_EVENT))
    return
  }
  try {
    const { db, fs } = await getFirestoreDb('admin')
    await fs.updateDoc(fs.doc(db, 'orders', id), updates)
  } catch (err) {
    console.error(err)
    throw new Error(err.code === 'permission-denied'
      ? 'This account is not allowed to update orders.'
      : 'Could not update the order — check your connection and try again.')
  }
}

/**
 * Customer: calls onChange(order) with the latest copy of one order (status set by the kitchen)
 * now and whenever it changes. Returns an unsubscribe function.
 */
export function subscribeToOrder(id, onChange) {
  if (!isFirebaseConfigured) {
    const emit = () => {
      const found = load(LOCAL_KEY, []).find((o) => o.id === id)
      if (found) onChange(found)
    }
    const onStorage = (e) => e.key === LOCAL_KEY && emit()
    emit()
    window.addEventListener('storage', onStorage) // admin updates from another tab
    window.addEventListener(LOCAL_EVENT, emit)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(LOCAL_EVENT, emit)
    }
  }

  let unsubscribe = () => {}
  let cancelled = false
  getFirestoreDb()
    .then(({ db, fs }) => {
      if (cancelled) return
      unsubscribe = fs.onSnapshot(
        fs.doc(db, 'orders', id),
        (snap) => snap.exists() && onChange(snap.data()),
        (err) => console.error('Order status updates unavailable:', err.message),
      )
    })
    .catch((err) => console.error(err))
  return () => {
    cancelled = true
    unsubscribe()
  }
}

/**
 * Admin: calls onChange(orders) with every order (newest first) now and whenever one arrives.
 * Returns an unsubscribe function.
 */
export function subscribeToOrders(onChange, onError) {
  if (!isFirebaseConfigured) {
    const emit = () => onChange(load(LOCAL_KEY, []).sort((a, b) => b.placedAt - a.placedAt))
    const onStorage = (e) => e.key === LOCAL_KEY && emit()
    emit()
    window.addEventListener('storage', onStorage) // orders placed in other tabs
    window.addEventListener(LOCAL_EVENT, emit) // orders placed in this tab
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(LOCAL_EVENT, emit)
    }
  }

  let unsubscribe = () => {}
  let cancelled = false
  getFirestoreDb('admin')
    .then(({ db, fs }) => {
      if (cancelled) return
      const q = fs.query(fs.collection(db, 'orders'), fs.orderBy('placedAt', 'desc'), fs.limit(MAX_ORDERS))
      unsubscribe = fs.onSnapshot(
        q,
        (snap) => onChange(snap.docs.map((d) => d.data())),
        (err) => onError?.(err.code === 'permission-denied'
          ? 'This account is not allowed to read orders. Add its UID to the "admins" collection (see README).'
          : err.message),
      )
    })
    .catch((err) => onError?.(err.message))
  return () => {
    cancelled = true
    unsubscribe()
  }
}
