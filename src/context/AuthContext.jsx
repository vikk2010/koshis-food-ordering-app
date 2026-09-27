import { createContext, useContext, useState } from 'react'

// Demo-only auth: the password lives in the client bundle.
// Replace with a real backend login before going to production.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
const SESSION_KEY = 'foodapp.isAdmin'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true')

  const login = (password) => {
    if (password !== ADMIN_PASSWORD) return false
    sessionStorage.setItem(SESSION_KEY, 'true')
    setIsAdmin(true)
    return true
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setIsAdmin(false)
  }

  return <AuthContext.Provider value={{ isAdmin, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
