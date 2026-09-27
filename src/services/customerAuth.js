// Customer sign-in with Google (Firebase Auth) — free, with no SMS costs.
import { getFirebase, isFirebaseConfigured } from './firebase.js'

// 'google' (default, free) or 'phone' (Firebase SMS OTP — needs the Blaze plan, ~₹6 per SMS in India).
export const loginMethod = !isFirebaseConfigured
  ? 'demo'
  : import.meta.env.VITE_LOGIN_METHOD === 'phone' ? 'phone' : 'google'

/** Opens the Google account picker. Resolves { uid, name, email }; rejects with a user-facing message. */
export async function signInWithGoogle(appName) {
  const { auth, authMod } = await getFirebase(appName)
  const provider = new authMod.GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    const { user } = await authMod.signInWithPopup(auth, provider)
    return { uid: user.uid, name: user.displayName || '', email: user.email || '' }
  } catch (err) {
    throw new Error(googleErrorMessage(err))
  }
}

function googleErrorMessage(err) {
  switch (err?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled. Please try again.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.'
    case 'auth/unauthorized-domain':
      return 'This website address is not authorised in Firebase (Authentication → Settings → Authorized domains).'
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase (Authentication → Sign-in method → Google).'
    default:
      return err?.message || 'Could not sign in. Please try again.'
  }
}

/** Calls cb(uid | null) whenever the customer's Firebase session changes. Returns unsubscribe. */
export function watchCustomerSession(cb) {
  if (!isFirebaseConfigured) return () => {}
  let unsub = () => {}
  let cancelled = false
  getFirebase().then(({ auth, authMod }) => {
    if (!cancelled) unsub = authMod.onAuthStateChanged(auth, (u) => cb(u?.uid ?? null))
  })
  return () => {
    cancelled = true
    unsub()
  }
}
