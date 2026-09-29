import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isFirebaseConfigured } from '../../services/firebase.js'
import { riderSignIn, riderSignOut, subscribeRiderProfile, watchRiderSession } from '../../services/riderStore.js'
import { useRestaurant } from '../../context/RestaurantContext.jsx'
import Icon from '../../components/Icon.jsx'
import RiderRegister from './RiderRegister.jsx'
import RiderDashboard from './RiderDashboard.jsx'

// /rider — the delivery partner app: sign in → register → wait for approval → take deliveries.
export default function RiderApp() {
  const [account, setAccount] = useState(undefined) // undefined = checking, null = signed out
  const [profile, setProfile] = useState(undefined) // undefined = loading, null = not registered yet
  const [error, setError] = useState('')

  useEffect(() => watchRiderSession(setAccount), [])
  useEffect(() => {
    setProfile(undefined)
    if (!account) return undefined
    return subscribeRiderProfile(account.uid, setProfile, (err) => {
      console.error(err)
      setError(err?.code === 'permission-denied'
        ? 'The delivery partner feature isn’t switched on yet. Please ask the restaurant to finish the setup (publish the latest Firebase rules), then reload this page.'
        : 'Could not load your rider profile. Check your connection and reload.')
    })
  }, [account?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <RiderShell><p className="error">{error}</p></RiderShell>
  if (account === undefined || (account && profile === undefined)) return <RiderShell><p className="empty">Loading…</p></RiderShell>
  if (!account) return <RiderWelcome />
  if (!profile) return <RiderShell><RiderRegister account={account} /></RiderShell>
  if (profile.status === 'approved') return <RiderDashboard rider={profile} />
  return <RiderShell><RiderWaiting rider={profile} /></RiderShell>
}

function RiderShell({ children }) {
  return <section className="rider-shell">{children}</section>
}

function RiderWelcome() {
  const { restaurant } = useRestaurant()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const signIn = async (e) => {
    e?.preventDefault()
    setBusy(true)
    setError('')
    try {
      await riderSignIn(email)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rider-shell">
      <div className="rider-welcome">
        <span className="rider-welcome-icon"><Icon name="bike" size={34} /></span>
        <h1>Deliver with {restaurant.name}</h1>
        <p className="muted">Get delivery requests on your phone, accept the ones you want and get paid for every drop.</p>
        <ul className="rider-points">
          <li><Icon name="check" size={18} /> New orders pop up here as soon as the kitchen starts cooking</li>
          <li><Icon name="check" size={18} /> First to accept gets the delivery</li>
          <li><Icon name="check" size={18} /> Customer address, phone and map link once it's yours</li>
          <li><Icon name="check" size={18} /> Show our UPI QR code for cash-on-delivery orders</li>
        </ul>
        {isFirebaseConfigured ? (
          <button type="button" className="btn large google-btn" onClick={signIn} disabled={busy}>
            {busy ? 'Opening Google…' : 'Sign in with Google'}
          </button>
        ) : (
          <form className="form rider-demo-login" onSubmit={signIn}>
            <label>
              Email (demo mode)
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ravi@gmail.com" autoComplete="email" />
            </label>
            <button type="submit" className="btn large" disabled={busy}>Continue</button>
          </form>
        )}
        <p className="muted small">New here? Sign in and fill in your details — the restaurant will approve you.</p>
        {error && <p className="error">{error}</p>}
        <Link to="/" className="text-link small">← Back to the menu</Link>
      </div>
    </section>
  )
}

function RiderWaiting({ rider }) {
  const { restaurant } = useRestaurant()
  const disabled = rider.status === 'disabled'
  return (
    <div className="card rider-waiting">
      <span className={`rider-waiting-icon ${disabled ? 'off' : ''}`}>
        <Icon name={disabled ? 'logout' : 'clock'} size={30} />
      </span>
      <h1>{disabled ? 'Your account is turned off' : 'Waiting for approval'}</h1>
      <p className="muted">
        {disabled
          ? `${restaurant.name} has paused your delivery account. Please contact the restaurant.`
          : `Thanks, ${rider.name.split(' ')[0]}! ${restaurant.name} will check your details and approve you. This page updates by itself — keep it open or come back later.`}
      </p>
      <dl className="rider-details">
        <div><dt>Name</dt><dd>{rider.name}</dd></div>
        <div><dt>Email</dt><dd>{rider.email}</dd></div>
        <div><dt>Mobile</dt><dd>+91 {rider.phone}</dd></div>
        <div><dt>Bike number</dt><dd>{rider.bikeNumber}</dd></div>
      </dl>
      {restaurant.phone && <a className="btn secondary" href={`tel:+91${restaurant.phone}`}><Icon name="phone" size={16} /> Call the restaurant</a>}
      <button type="button" className="text-link small" onClick={riderSignOut}>Sign out</button>
    </div>
  )
}
