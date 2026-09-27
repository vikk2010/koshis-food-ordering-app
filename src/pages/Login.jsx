import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { isDemoMode, sendOtp, verifyOtp } from '../services/otp.js'

const COUNTRY_CODE = '+91'
const RESEND_SECONDS = 30
const RECAPTCHA_ID = 'recaptcha-container'

export default function Login() {
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
      await verifyOtp(session, otp)
      loginUser(fullPhone)
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
