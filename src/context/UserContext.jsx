import { createContext, useContext, useEffect, useState } from 'react'
import { load, save } from '../utils/storage.js'
import { signOutProvider } from '../services/otp.js'
import { watchCustomerSession } from '../services/customerAuth.js'
import { isFirebaseConfigured } from '../services/firebase.js'
import { saveAddresses, subscribeCustomer } from '../services/customerStore.js'

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
  const [addressBook, setAddressBook] = useState(() => load(ADDRESSES_KEY, {})) // local cache / demo store
  // Firebase session that is actually signed in: undefined = still checking, null = signed out.
  const [sessionUid, setSessionUid] = useState(isFirebaseConfigured ? undefined : null)

  const addresses = (user && addressBook[user.phone]) || []
  // With Firebase, addresses live in Firestore (customers/{uid}) once the session is ready.
  const synced = isFirebaseConfigured && Boolean(user?.uid) && sessionUid === user.uid

  // If the Firebase session ends (signed out elsewhere, expired), log the customer out here too.
  useEffect(
    () =>
      watchCustomerSession((uid) => {
        setSessionUid(uid)
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

  const setAddresses = (list) => {
    setAddressBook((book) => {
      const next = { ...book, [user.phone]: list }
      save(ADDRESSES_KEY, next)
      return next
    })
  }

  // Load the customer's addresses from Firestore; the first time, upload any saved on this device.
  useEffect(() => {
    if (!synced) return undefined
    return subscribeCustomer(user.uid, (remote) => {
      if (remote === null) {
        const local = load(ADDRESSES_KEY, {})[user.phone] || []
        saveAddresses(user.uid, local, { phone: user.phone, name: user.name || '' }).catch(() => {})
        return
      }
      setAddresses(remote)
    })
  }, [synced, user?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (list) => {
    setAddresses(list)
    if (synced) saveAddresses(user.uid, list, { phone: user.phone, name: user.name || '' }).catch((err) => console.error(err))
  }

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
    persist([...addresses, saved])
    return saved
  }

  const deleteAddress = (id) => {
    persist(addresses.filter((a) => a.id !== id))
  }

  return (
    <UserContext.Provider value={{ user, sessionUid, loginUser, logoutUser, addresses, addAddress, deleteAddress }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
