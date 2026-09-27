import { createContext, useContext, useEffect, useState } from 'react'
import { load, save } from '../utils/storage.js'

const STORAGE_KEY = 'foodapp.cart'
const CartContext = createContext(null)

export function CartProvider({ children }) {
  // Cart items: { id, name, price, qty }
  const [items, setItems] = useState(() => load(STORAGE_KEY, []))

  useEffect(() => {
    save(STORAGE_KEY, items)
  }, [items])

  const addToCart = (dish) =>
    setItems((prev) => {
      const existing = prev.find((i) => i.id === dish.id)
      if (existing) return prev.map((i) => (i.id === dish.id ? { ...i, qty: i.qty + 1 } : i))
      return [...prev, { id: dish.id, name: dish.name, price: dish.price, qty: 1 }]
    })

  const setQty = (id, qty) =>
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty } : i)),
    )

  const clearCart = () => setItems([])

  const count = items.reduce((sum, i) => sum + i.qty, 0)
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0)

  return (
    <CartContext.Provider value={{ items, addToCart, setQty, clearCart, count, total }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
