import { createContext, useContext, useEffect, useState } from 'react'
import { load, save } from '../utils/storage.js'
import { useUser } from './UserContext.jsx'
import { submitOrder, subscribeToCustomerOrders } from '../services/orderStore.js'

const ORDERS_KEY = 'foodapp.orders' // { [phone]: Order[] } (newest last)
const OrderContext = createContext(null)

// The customer's orders: loaded from Firestore (so they appear on any device) and also kept in
// localStorage as a fallback.
// Each order is also sent to the kitchen (services/orderStore.js) so it shows up in the admin panel.
export function OrderProvider({ children }) {
  const { user, sessionUid } = useUser()
  const [orderBook, setOrderBook] = useState(() => load(ORDERS_KEY, {}))
  const [remote, setRemote] = useState(null) // orders from Firestore (all devices)

  // With Firebase, also load every order this customer placed — from any device.
  const uid = user?.uid && sessionUid === user.uid ? user.uid : null
  useEffect(() => {
    setRemote(null)
    if (!uid) return undefined
    return subscribeToCustomerOrders(uid, setRemote)
  }, [uid])

  // Still fetching this customer's orders (session check, then the first Firestore read).
  const loading = Boolean(user?.uid) && (sessionUid === undefined || (Boolean(uid) && remote === null))

  const localOrders = (user && orderBook[user.phone]) || []
  const byId = new Map(localOrders.map((o) => [o.id, o]))
  for (const o of remote || []) byId.set(o.id, { ...byId.get(o.id), ...o })
  const orders = [...byId.values()].sort((a, b) => a.placedAt - b.placedAt)

  /**
   * Sends an order to the kitchen, saves it for the logged-in user and returns it (with id and number).
   * Rejects with a user-facing message if the kitchen could not be reached.
   */
  const addOrder = async (order) => {
    const id = crypto.randomUUID()
    const placedAt = Date.now()
    const saved = {
      ...order,
      id,
      number: `KC-${placedAt.toString().slice(-5)}`,
      placedAt,
      // The restaurant moves the order along from the admin panel (see utils/orderStatus.js).
      status: 'pending',
      statusTimes: { pending: placedAt },
      paymentStatus: 'pending',
      phone: user.phone,
      customerUid: user.uid || '',
      customerEmail: user.email || '',
      customerName: order.address?.name || user.name || '',
    }
    await submitOrder(saved)
    const next = { ...orderBook, [user.phone]: [...localOrders, saved] }
    setOrderBook(next)
    save(ORDERS_KEY, next)
    return saved
  }

  const getOrder = (id) => orders.find((o) => o.id === id)
  const lastOrder = orders.at(-1) ?? null

  return (
    <OrderContext.Provider value={{ orders, addOrder, getOrder, lastOrder, loading }}>{children}</OrderContext.Provider>
  )
}

export const useOrders = () => useContext(OrderContext)
