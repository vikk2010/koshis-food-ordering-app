import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { isDemoMode, sendOtp, verifyOtp } from '../services/otp.js'
import { loginMethod, signInWithGoogle } from '../services/customerAuth.js'

const COUNTRY_CODE = '+91'
const RESEND_SECONDS = 30
const RECAPTCHA_ID = 'recaptcha-container'

export default function Login() {
  return loginMethod === 'google' ? <GoogleLogin /> : <PhoneLogin />
}

// Free login: Google account + mobile number for delivery (no SMS, so the number isn't OTP-verified).
function GoogleLogin() {
  const { user, loginUser } = useUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') || '/'
  const [account, setAccount] = useState(null) // { uid, name, email } after Google sign-in
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={redirect} replace />

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const acc = await signInWithGoogle()
      setAccount(acc)
      setName(acc.name)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDetails = (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Please enter your name')
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit mobile number')
    loginUser(COUNTRY_CODE + phone, { uid: account.uid, name: name.trim(), email: account.email })
    navigate(redirect, { replace: true })
  }

  return (
    <div className="center-card">
      {!account ? (
        <div className="form">
          <h1>Login</h1>
          <p className="muted small">
            {redirect === '/cart' ? 'Sign in to place your order.' : 'Sign in to order and track your food.'}
          </p>
          <button type="button" className="btn google-btn" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon /> {loading ? 'Opening Google…' : 'Continue with Google'}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <form className="form" onSubmit={handleDetails}>
          <h1>Almost done</h1>
          <p className="muted small">
            Signed in as <strong>{account.email}</strong>. Add your mobile number so the rider can reach you.
          </p>
          <label>
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" />
          </label>
          <label>
            Mobile number
            <div className="phone-input">
              <span>{COUNTRY_CODE}</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit">Continue</button>
        </form>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

// Mobile number + OTP (demo mode, or Firebase SMS when VITE_LOGIN_METHOD=phone).
function PhoneLogin() {
  const { user, loginUser } = useUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') || '/'

  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const otpInput = useRef(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  if (user) return <Navigate to={redirect} replace />

  const fullPhone = COUNTRY_CODE + phone

  const requestOtp = async () => {
    setError('')
    setLoading(true)
    try {
      setSession(await sendOtp(fullPhone, RECAPTCHA_ID))
      setOtp('')
      setStep('otp')
      setResendIn(RESEND_SECONDS)
      setTimeout(() => otpInput.current?.focus(), 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneSubmit = (e) => {
    e.preventDefault()
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    requestOtp()
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP')
      return
    }
    setError('')
    setLoading(true)
    try {
      const uid = await verifyOtp(session, otp)
      loginUser(fullPhone, uid ? { uid } : {})
      navigate(redirect, { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const changeNumber = () => {
    setStep('phone')
    setSession(null)
    setOtp('')
    setError('')
  }

  return (
    <div className="center-card">
      {step === 'phone' ? (
        <form className="form" onSubmit={handlePhoneSubmit}>
          <h1>Login</h1>
          <p className="muted small">
            {redirect === '/cart' ? 'Log in with your mobile number to place your order. ' : 'Enter your mobile number. '}
            We'll send you an OTP to verify it.
          </p>
          <label>
            Mobile number
            <div className="phone-input">
              <span>{COUNTRY_CODE}</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Sending OTP…' : 'Get OTP'}
          </button>
        </form>
      ) : (
        <form className="form" onSubmit={handleOtpSubmit}>
          <h1>Verify OTP</h1>
          <p className="muted small">
            Enter the 6-digit code sent to <strong>{fullPhone}</strong>{' '}
            <button type="button" className="link-btn accent" onClick={changeNumber}>Change</button>
          </p>
          {isDemoMode && session?.demoCode && (
            <p className="demo-note">Demo mode (no SMS sent). Your OTP is <strong>{session.demoCode}</strong></p>
          )}
          <label>
            OTP
            <input
              ref={otpInput}
              className="otp-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify & Login'}
          </button>
          <p className="muted small center">
            {resendIn > 0 ? (
              `Resend OTP in ${resendIn}s`
            ) : (
              <button type="button" className="link-btn accent" onClick={requestOtp} disabled={loading}>
                Resend OTP
              </button>
            )}
          </p>
        </form>
      )}
      {/* Firebase invisible reCAPTCHA mounts here */}
      <div id={RECAPTCHA_ID} />
    </div>
  )
}
