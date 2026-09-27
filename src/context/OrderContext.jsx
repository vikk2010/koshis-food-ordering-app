import { createContext, useContext, useState } from 'react'
import { load, save } from '../utils/storage.js'
import { useUser } from './UserContext.jsx'
import { submitOrder } from '../services/orderStore.js'

const ORDERS_KEY = 'foodapp.orders' // { [phone]: Order[] } (newest last)
const OrderContext = createContext(null)

// Placed orders, kept in localStorage per customer so the tracking page survives a reload.
// Each order is also sent to the kitchen (services/orderStore.js) so it shows up in the admin panel.
export function OrderProvider({ children }) {
  const { user } = useUser()
  const [orderBook, setOrderBook] = useState(() => load(ORDERS_KEY, {}))

  const orders = (user && orderBook[user.phone]) || []

  /**
   * Sends an order to the kitchen, saves it for the logged-in user and returns it (with id and number).
   * Rejects with a user-facing message if the kitchen could not be reached.
   */
  const addOrder = async (order) => {
    const id = crypto.randomUUID()
    const saved = {
      ...order,
      id,
      number: `KC-${Date.now().toString().slice(-5)}`,
      placedAt: Date.now(),
      phone: user.phone,
      customerUid: user.uid || '',
      customerEmail: user.email || '',
      customerName: order.address?.name || user.name || '',
    }
    await submitOrder(saved)
    const next = { ...orderBook, [user.phone]: [...orders, saved] }
    setOrderBook(next)
    save(ORDERS_KEY, next)
    return saved
  }

  const getOrder = (id) => orders.find((o) => o.id === id)
  const lastOrder = orders.at(-1) ?? null

  return (
    <OrderContext.Provider value={{ orders, addOrder, getOrder, lastOrder }}>{children}</OrderContext.Provider>
  )
}

export const useOrders = () => useContext(OrderContext)
