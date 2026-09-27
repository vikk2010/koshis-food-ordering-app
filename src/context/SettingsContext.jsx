import { createContext, useContext, useState } from 'react'
import { defaultCoupons, defaultSettings } from '../data/defaultSettings.js'
import { load, save } from '../utils/storage.js'

const SETTINGS_KEY = 'foodapp.settings'
const COUPONS_KEY = 'foodapp.coupons'
const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => ({ ...defaultSettings, ...load(SETTINGS_KEY, {}) }))
  const [coupons, setCoupons] = useState(() => load(COUPONS_KEY, defaultCoupons))

  const updateSettings = (next) => {
    setSettings(next)
    save(SETTINGS_KEY, next)
  }

  const commitCoupons = (next) => {
    setCoupons(next)
    save(COUPONS_KEY, next)
  }

  const addCoupon = (coupon) => commitCoupons([...coupons, { ...coupon, id: crypto.randomUUID() }])
  const updateCoupon = (id, updates) => commitCoupons(coupons.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  const deleteCoupon = (id) => commitCoupons(coupons.filter((c) => c.id !== id))

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, coupons, addCoupon, updateCoupon, deleteCoupon }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
