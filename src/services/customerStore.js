// A signed-in customer's saved delivery addresses, kept in Firestore (customers/{uid}) so they
// follow the customer to any device. Only that customer can read or write it (firestore.rules).
import { getFirestoreDb, isFirebaseConfigured } from './firebase.js'

export const customersAreShared = isFirebaseConfigured

/** Calls onChange(addresses | null) now and on every change. null = no saved profile yet. */
export function subscribeCustomer(uid, onChange) {
  let unsubscribe = () => {}
  let cancelled = false
  getFirestoreDb()
    .then(({ db, fs }) => {
      if (cancelled) return
      unsubscribe = fs.onSnapshot(
        fs.doc(db, 'customers', uid),
        (snap) => onChange(snap.exists() ? snap.data().addresses ?? [] : null),
        (err) => console.error('Could not load saved addresses:', err.message),
      )
    })
    .catch((err) => console.error(err))
  return () => {
    cancelled = true
    unsubscribe()
  }
}

/** Saves the customer's address list. Rejects with a user-facing message. */
export async function saveAddresses(uid, addresses, profile = {}) {
  try {
    const { db, fs } = await getFirestoreDb()
    await fs.setDoc(fs.doc(db, 'customers', uid), { ...profile, addresses, updatedAt: Date.now() }, { merge: true })
  } catch (err) {
    console.error(err)
    throw new Error('Could not save the address — check your connection and try again.')
  }
}
