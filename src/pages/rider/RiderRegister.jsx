import { useEffect, useState } from 'react'
import { findInvite, registerRider, riderSignOut } from '../../services/riderStore.js'
import Icon from '../../components/Icon.jsx'

const BIKE_RE = /^[A-Z]{2}[ -]?\d{1,2}[ -]?[A-Z]{0,3}[ -]?\d{1,4}$/

// First sign-in: name, mobile and bike number. Approved instantly if the admin added this email.
export default function RiderRegister({ account }) {
  const [form, setForm] = useState({ name: account.name || '', phone: '', bikeNumber: '' })
  const [invited, setInvited] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    findInvite(account.email).then((inv) => {
      if (!live || !inv) return
      setInvited(true)
      setForm((f) => ({ name: f.name || inv.name, phone: f.phone || inv.phone, bikeNumber: f.bikeNumber || inv.bikeNumber }))
    })
    return () => { live = false }
  }, [account.email])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const phone = form.phone.replace(/\D/g, '').slice(-10)
    const bike = form.bikeNumber.trim().toUpperCase()
    if (form.name.trim().length < 2) return setError('Please enter your full name')
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit mobile number')
    if (!BIKE_RE.test(bike)) return setError('Enter your bike number like JH05AB1234')
    setBusy(true)
    setError('')
    try {
      await registerRider(account, { ...form, phone, bikeNumber: bike })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="card form rider-register" onSubmit={submit}>
      <span className="eyebrow">Delivery partner</span>
      <h1>Your details</h1>
      <p className="muted small">
        {invited
          ? 'The restaurant has already added you — check your details and you can start delivering right away.'
          : 'The restaurant will approve you after checking these details.'}
      </p>
      <label>
        Full name
        <input value={form.name} onChange={set('name')} autoComplete="name" placeholder="Ravi Kumar" />
      </label>
      <label>
        Email
        <input value={account.email} readOnly className="readonly" />
      </label>
      <label>
        Mobile number
        <div className="phone-input">
          <span>+91</span>
          <input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} placeholder="98765 43210" autoComplete="tel-national" />
        </div>
      </label>
      <label>
        Bike number
        <input value={form.bikeNumber} onChange={(e) => setForm((f) => ({ ...f, bikeNumber: e.target.value.toUpperCase() }))} placeholder="JH05AB1234" autoCapitalize="characters" />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn large" disabled={busy}>
        <Icon name="bike" size={18} /> {busy ? 'Saving…' : invited ? 'Start delivering' : 'Register'}
      </button>
      <button type="button" className="text-link small" onClick={riderSignOut}>Use a different account</button>
    </form>
  )
}
