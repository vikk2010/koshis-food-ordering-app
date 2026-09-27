import { createContext, useContext, useEffect, useState } from 'react'
import { defaultRestaurant } from '../data/defaultRestaurant.js'
import { load, save } from '../utils/storage.js'
import { openStatus } from '../utils/hours.js'

const STORAGE_KEY = 'foodapp.restaurant'
const RestaurantContext = createContext(null)

// Restaurant profile, contact details, licences and opening hours (edited in "Restaurant Details").
// TODO: load from / save to a backend API before going to production.
export function RestaurantProvider({ children }) {
  const [restaurant, setRestaurant] = useState(() => {
    const stored = load(STORAGE_KEY, {})
    return {
      ...defaultRestaurant,
      ...stored,
      address: { ...defaultRestaurant.address, ...stored.address },
      hours: { ...defaultRestaurant.hours, ...stored.hours },
    }
  })
  const [now, setNow] = useState(() => Date.now())

  // Re-check open / closed every minute.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(t)
  }, [])

  /** Saves the profile; returns false if browser storage is full (e.g. a large logo). */
  const updateRestaurant = (next) => {
    setRestaurant(next)
    return save(STORAGE_KEY, next)
  }

  const status = openStatus(restaurant, new Date(now))

  return (
    <RestaurantContext.Provider value={{ restaurant, updateRestaurant, status }}>{children}</RestaurantContext.Provider>
  )
}

export const useRestaurant = () => useContext(RestaurantContext)
