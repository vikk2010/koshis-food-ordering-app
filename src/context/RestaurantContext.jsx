import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultRestaurant } from '../data/defaultRestaurant.js'
import { cachedConfig, saveConfig, subscribeConfig } from '../services/catalogStore.js'
import { openStatus } from '../utils/hours.js'

const RestaurantContext = createContext(null)

const withDefaults = (stored) => ({
  ...defaultRestaurant,
  ...stored,
  address: { ...defaultRestaurant.address, ...stored?.address },
  hours: { ...defaultRestaurant.hours, ...stored?.hours },
})

// Restaurant profile, contact details, licences, opening hours and UPI ID (edited in
// "Restaurant Details"). Stored in Firestore (config/restaurant) and shared live with every customer.
export function RestaurantProvider({ children }) {
  const [stored, setStored] = useState(() => cachedConfig('restaurant'))
  const [ready, setReady] = useState(() => cachedConfig('restaurant') !== null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(
    () =>
      subscribeConfig(
        'restaurant',
        (value) => {
          setStored(value)
          setReady(true)
        },
        () => setReady(true), // offline / blocked: fall back to the cached copy or defaults
      ),
    [],
  )

  // Re-check open / closed every minute.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const restaurant = useMemo(() => withDefaults(stored), [stored])

  /** Admin: saves the profile for everyone. Rejects with a user-facing message. */
  const updateRestaurant = async (next) => {
    const previous = stored
    setStored(next) // show the change right away
    try {
      await saveConfig('restaurant', next)
    } catch (err) {
      setStored(previous)
      throw err
    }
  }

  const status = ready ? openStatus(restaurant, new Date(now)) : { open: false, reason: 'loading', message: '' }

  return (
    <RestaurantContext.Provider value={{ restaurant, updateRestaurant, status, ready }}>{children}</RestaurantContext.Provider>
  )
}

export const useRestaurant = () => useContext(RestaurantContext)
