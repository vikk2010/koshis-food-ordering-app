// Phone OTP service.
// If Firebase env vars are set (see .env.example), real SMS OTPs are sent via
// Firebase Phone Auth. Otherwise it runs in demo mode: the OTP is generated
// locally and shown on screen, so no SMS is sent.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isDemoMode = !firebaseConfig.apiKey

const OTP_TTL_MS = 5 * 60 * 1000

// ---------- Firebase ----------

let firebaseAuthPromise = null
let recaptchaVerifier = null

// Firebase is loaded lazily so demo mode doesn't ship it in the main bundle.
function getFirebase() {
  if (!firebaseAuthPromise) {
    firebaseAuthPromise = Promise.all([import('firebase/app'), import('firebase/auth')]).then(
      ([appMod, authMod]) => ({ auth: authMod.getAuth(appMod.initializeApp(firebaseConfig)), authMod }),
    )
  }
  return firebaseAuthPromise
}

async function firebaseSendOtp(phone, recaptchaContainerId) {
  const { auth, authMod } = await getFirebase()
  if (!recaptchaVerifier) {
    recaptchaVerifier = new authMod.RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' })
  }
  try {
    const confirmation = await authMod.signInWithPhoneNumber(auth, phone, recaptchaVerifier)
    return { confirmation }
  } catch (err) {
    // A used/failed reCAPTCHA can't be reused; reset so the next attempt gets a fresh one.
    recaptchaVerifier.clear()
    recaptchaVerifier = null
    throw new Error(firebaseErrorMessage(err))
  }
}

async function firebaseVerifyOtp(session, code) {
  try {
    await session.confirmation.confirm(code)
  } catch (err) {
    throw new Error(firebaseErrorMessage(err))
  }
}

function firebaseErrorMessage(err) {
  switch (err?.code) {
    case 'auth/invalid-phone-number': return 'Invalid phone number.'
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.'
    case 'auth/invalid-verification-code': return 'Incorrect OTP. Please try again.'
    case 'auth/code-expired': return 'OTP expired. Please request a new one.'
    default: return err?.message || 'Something went wrong. Please try again.'
  }
}

// ---------- Demo mode ----------

function demoSendOtp() {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  return { code, expiresAt: Date.now() + OTP_TTL_MS, demoCode: code }
}

function demoVerifyOtp(session, code) {
  if (Date.now() > session.expiresAt) throw new Error('OTP expired. Please request a new one.')
  if (code !== session.code) throw new Error('Incorrect OTP. Please try again.')
}

// ---------- Public API ----------

/** Sends an OTP to `phone` (E.164, e.g. +919876543210). Returns a session for verifyOtp. */
export function sendOtp(phone, recaptchaContainerId) {
  return isDemoMode ? Promise.resolve(demoSendOtp()) : firebaseSendOtp(phone, recaptchaContainerId)
}

/** Resolves if `code` is correct for the session, otherwise throws with a user-facing message. */
export async function verifyOtp(session, code) {
  return isDemoMode ? demoVerifyOtp(session, code) : firebaseVerifyOtp(session, code)
}

export async function signOutProvider() {
  if (isDemoMode) return
  const { auth, authMod } = await getFirebase()
  await authMod.signOut(auth)
}
