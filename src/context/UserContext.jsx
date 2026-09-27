import { createContext, useContext, useEffect, useState } from 'react'
import { load, save } from '../utils/storage.js'
import { signOutProvider } from '../services/otp.js'
import { watchCustomerSession } from '../services/customerAuth.js'
import { isFirebaseConfigured } from '../services/firebase.js'

const STORAGE_KEY = 'foodapp.user'
const ADDRESSES_KEY = 'foodapp.addresses' // { [phone]: Address[] }
const UserContext = createContext(null)

export function UserProvider({ children }) {
  // Logged-in customer: { phone, uid?, name?, email? } or null (uid is the Firebase account)
  const [user, setUser] = useState(() => {
    const stored = load(STORAGE_KEY, null)
    // With Firebase, every customer needs a Firebase account (uid); older demo logins must sign in again.
    return isFirebaseConfigured && stored && !stored.uid ? null : stored
  })
  const [addressBook, setAddressBook] = useState(() => load(ADDRESSES_KEY, {}))

  const addresses = (user && addressBook[user.phone]) || []

  // If the Firebase session ends (signed out elsewhere, expired), log the customer out here too.
  useEffect(
    () =>
      watchCustomerSession((uid) => {
        setUser((u) => {
          if (u?.uid && u.uid !== uid) {
            localStorage.removeItem(STORAGE_KEY)
            return null
          }
          return u
        })
      }),
    [],
  )

  const loginUser = (phone, profile = {}) => {
    const next = { phone, ...profile }
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
