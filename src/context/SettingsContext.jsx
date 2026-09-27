import { createContext, useContext, useEffect, useState } from 'react'
import { defaultCoupons, defaultSettings } from '../data/defaultSettings.js'
import { cachedConfig, saveConfig, subscribeConfig } from '../services/catalogStore.js'

const SettingsContext = createContext(null)

// Delivery time, charges and coupons (edited in "Charges & Coupons").
// Stored in Firestore (config/settings, config/coupons) and shared live with every customer.
export function SettingsProvider({ children }) {
  const [storedSettings, setStoredSettings] = useState(() => cachedConfig('settings'))
  const [storedCoupons, setStoredCoupons] = useState(() => cachedConfig('coupons'))
  const [settingsLoaded, setSettingsLoaded] = useState(() => cachedConfig('settings') !== null)
  const [couponsLoaded, setCouponsLoaded] = useState(() => cachedConfig('coupons') !== null)
  const ready = settingsLoaded && couponsLoaded

  useEffect(() => {
    const unsubSettings = subscribeConfig(
      'settings',
      (v) => {
        setStoredSettings(v)
        setSettingsLoaded(true)
      },
      () => setSettingsLoaded(true),
    )
    const unsubCoupons = subscribeConfig(
      'coupons',
      (v) => {
        setStoredCoupons(v)
        setCouponsLoaded(true)
      },
      () => setCouponsLoaded(true),
    )
    return () => {
      unsubSettings()
      unsubCoupons()
    }
  }, [])

  const settings = { ...defaultSettings, ...storedSettings }
  const coupons = storedCoupons ?? defaultCoupons

  /** Admin: saves charges for everyone. Rejects with a user-facing message. */
  const updateSettings = async (next) => {
    const previous = storedSettings
    setStoredSettings(next)
    try {
      await saveConfig('settings', next)
    } catch (err) {
      setStoredSettings(previous)
      throw err
    }
  }

  const commitCoupons = async (next) => {
    const previous = storedCoupons
    setStoredCoupons(next)
    try {
      await saveConfig('coupons', next)
    } catch (err) {
      setStoredCoupons(previous)
      throw err
    }
  }

  const addCoupon = (coupon) => commitCoupons([...coupons, { ...coupon, id: crypto.randomUUID() }])
  const updateCoupon = (id, updates) => commitCoupons(coupons.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  const deleteCoupon = (id) => commitCoupons(coupons.filter((c) => c.id !== id))

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, coupons, addCoupon, updateCoupon, deleteCoupon, ready }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
