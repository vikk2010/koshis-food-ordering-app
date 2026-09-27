import { firebaseProjectConfig } from '../config/firebaseConfig.js'

// Shared Firebase setup. Everything is loaded lazily.
// Set VITE_DEMO_MODE=true in .env to run without Firebase (local demo data, OTP shown on screen).
const env = import.meta.env
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseProjectConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseProjectConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseProjectConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseProjectConfig.appId,
}

export const isFirebaseConfigured = env.VITE_DEMO_MODE !== 'true' && Boolean(firebaseConfig.apiKey)

const apps = {}

/**
 * Returns { app, auth, authMod } for a named Firebase app.
 * The customer (phone login) uses the default app; the admin panel uses a separate "admin" app,
 * so an admin can stay signed in while testing the store as a customer in the same browser.
 */
export function getFirebase(name = '[DEFAULT]') {
  if (!apps[name]) {
    apps[name] = Promise.all([import('firebase/app'), import('firebase/auth')]).then(([appMod, authMod]) => {
      const existing = appMod.getApps().find((a) => a.name === name)
      const app = existing ?? (name === '[DEFAULT]' ? appMod.initializeApp(firebaseConfig) : appMod.initializeApp(firebaseConfig, name))
      return { app, auth: authMod.getAuth(app), authMod }
    })
  }
  return apps[name]
}

const dbs = {}

/** Returns { db, fs } (Firestore instance + module) for a named Firebase app. */
export function getFirestoreDb(name = '[DEFAULT]') {
  if (!dbs[name]) {
    dbs[name] = Promise.all([getFirebase(name), import('firebase/firestore')]).then(([{ app }, fs]) => {
      let db
      try {
        db = fs.initializeFirestore(app, { ignoreUndefinedProperties: true })
      } catch {
        db = fs.getFirestore(app) // already initialised (e.g. after a hot reload)
      }
      return { db, fs }
    })
  }
  return dbs[name]
}
