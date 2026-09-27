import { createContext, useContext, useEffect, useState } from 'react'
import { getFirebase, getFirestoreDb, isFirebaseConfigured } from '../services/firebase.js'
import { signInWithGoogle } from '../services/customerAuth.js'

// Admin login.
// - Firebase configured: "Sign in with Google" (separate "admin" Firebase app). Only Google accounts
//   whose UID has a document in the Firestore "admins" collection are let in.
// - Demo mode: a password from VITE_ADMIN_PASSWORD. It lives in the client bundle — demo only.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
const SESSION_KEY = 'foodapp.isAdmin'

export const adminUsesGoogle = isFirebaseConfigured

const AuthContext = createContext(null)

async function isListedAdmin(uid) {
  const { db, fs } = await getFirestoreDb('admin')
  try {
    return (await fs.getDoc(fs.doc(db, 'admins', uid))).exists()
  } catch {
    return false // permission denied = not an admin
  }
}

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => !isFirebaseConfigured && sessionStorage.getItem(SESSION_KEY) === 'true')
  const [adminEmail, setAdminEmail] = useState('')
  const [ready, setReady] = useState(!isFirebaseConfigured)

  useEffect(() => {
    if (!isFirebaseConfigured) return
    let unsub = () => {}
    getFirebase('admin').then(({ auth, authMod }) => {
      unsub = authMod.onAuthStateChanged(auth, async (u) => {
        const ok = Boolean(u) && (await isListedAdmin(u.uid))
        setIsAdmin(ok)
        setAdminEmail(ok ? u.email ?? '' : '')
        setReady(true)
      })
    })
    return () => unsub()
  }, [])

  /** Resolves true on success, or rejects with a user-facing message. */
  const login = async (password) => {
    if (!isFirebaseConfigured) {
      if (password !== ADMIN_PASSWORD) throw new Error('Incorrect password')
      sessionStorage.setItem(SESSION_KEY, 'true')
      setIsAdmin(true)
      return true
    }
    const account = await signInWithGoogle('admin')
    if (!(await isListedAdmin(account.uid))) {
      const { auth, authMod } = await getFirebase('admin')
      await authMod.signOut(auth)
      const err = new Error(`${account.email} is not an admin yet.`)
      err.uid = account.uid
      throw err
    }
    setIsAdmin(true)
    setAdminEmail(account.email)
    return true
  }

  const logout = async () => {
    if (isFirebaseConfigured) {
      const { auth, authMod } = await getFirebase('admin')
      await authMod.signOut(auth)
    } else {
      sessionStorage.removeItem(SESSION_KEY)
      setIsAdmin(false)
    }
  }

  return (
    <AuthContext.Provider value={{ isAdmin, adminEmail, ready, login, logout }}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
