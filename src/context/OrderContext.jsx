import { createContext, useContext, useState } from 'react'
import { load, save } from '../utils/storage.js'
import { useUser } from './UserContext.jsx'

const ORDERS_KEY = 'foodapp.orders' // { [phone]: Order[] } (newest last)
const OrderContext = createContext(null)

// Placed orders, kept in localStorage per customer so the tracking page survives a reload.
// TODO: replace with a backend API once orders are sent to the kitchen.
export function OrderProvider({ children }) {
  const { user } = useUser()
  const [orderBook, setOrderBook] = useState(() => load(ORDERS_KEY, {}))

  const orders = (user && orderBook[user.phone]) || []

  /** Saves an order for the logged-in user and returns it (with id and number). */
  const addOrder = (order) => {
    const id = crypto.randomUUID()
    const saved = {
      ...order,
      id,
      number: `KC-${Date.now().toString().slice(-5)}`,
      placedAt: Date.now(),
    }
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
