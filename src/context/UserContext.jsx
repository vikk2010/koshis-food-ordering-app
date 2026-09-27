import { createContext, useContext, useState } from 'react'
import { load, save } from '../utils/storage.js'
import { signOutProvider } from '../services/otp.js'

const STORAGE_KEY = 'foodapp.user'
const ADDRESSES_KEY = 'foodapp.addresses' // { [phone]: Address[] }
const UserContext = createContext(null)

export function UserProvider({ children }) {
  // Logged-in customer: { phone } or null
  const [user, setUser] = useState(() => load(STORAGE_KEY, null))
  const [addressBook, setAddressBook] = useState(() => load(ADDRESSES_KEY, {}))

  const addresses = (user && addressBook[user.phone]) || []

  const loginUser = (phone) => {
    const next = { phone }
    save(STORAGE_KEY, next)
    setUser(next)
  }

  const logoutUser = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    signOutProvider().catch(() => {})
  }

  /** Saves an address for the logged-in user and returns it (with its new id). */
  const addAddress = (address) => {
    const saved = { ...address, id: crypto.randomUUID() }
    const next = { ...addressBook, [user.phone]: [...addresses, saved] }
    setAddressBook(next)
    save(ADDRESSES_KEY, next)
    return saved
  }

  const deleteAddress = (id) => {
    const next = { ...addressBook, [user.phone]: addresses.filter((a) => a.id !== id) }
    setAddressBook(next)
    save(ADDRESSES_KEY, next)
  }

  return (
    <UserContext.Provider value={{ user, loginUser, logoutUser, addresses, addAddress, deleteAddress }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
