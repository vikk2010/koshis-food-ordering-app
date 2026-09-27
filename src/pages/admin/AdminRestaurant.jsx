import { useState } from 'react'
import { useRestaurant } from '../../context/RestaurantContext.jsx'
import { DAYS } from '../../data/defaultRestaurant.js'
import { fileToResizedDataUrl } from '../../utils/image.js'
import { hoursLabel } from '../../utils/hours.js'
import { UPI_ID_RE, upiPayLink } from '../../utils/qr.js'
import QrCode from '../../components/QrCode.jsx'

const PHONE_RE = /^[6-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PIN_RE = /^\d{6}$/
const FSSAI_RE = /^\d{14}$/
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

/** Returns the first problem with the form, or ''. Empty optional fields are fine. */
function validate(f) {
  if (!f.name.trim()) return 'Restaurant name is required'
  if (f.phone && !PHONE_RE.test(f.phone)) return 'Phone: enter a 10-digit Indian mobile number'
  if (f.whatsapp && !PHONE_RE.test(f.whatsapp)) return 'WhatsApp: enter a 10-digit Indian mobile number'
  if (f.email && !EMAIL_RE.test(f.email)) return 'Enter a valid email address'
  if (f.address.pincode && !PIN_RE.test(f.address.pincode)) return 'Pincode must be 6 digits'
  if (f.fssai && !FSSAI_RE.test(f.fssai)) return 'FSSAI licence number must be 14 digits'
  if (f.gstin && !GSTIN_RE.test(f.gstin)) return 'GSTIN should look like 27ABCDE1234F1Z5'
  if (f.upiId && !UPI_ID_RE.test(f.upiId)) return 'UPI ID should look like koshis@okhdfcbank'
  for (const d of DAYS) {
    const h = f.hours[d.key]
    if (h.open && h.from === h.to) return `${d.label}: opening and closing time can't be the same`
  }
  return ''
}

// "Restaurant Details" admin screen: profile, contact, address, licences and opening hours.
export default function AdminRestaurant() {
  const { ready } = useRestaurant()
  // Wait for the saved details so the form never starts from (and saves) the defaults.
  return ready ? <RestaurantForm /> : <p className="empty">Loading restaurant details…</p>
}

function RestaurantForm() {
  const { restaurant, updateRestaurant, status } = useRestaurant()
  const [form, setForm] = useState(restaurant)
  const [msg, setMsg] = useState({ text: '', error: false })
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(form) !== JSON.stringify(restaurant)

  const patch = (updates) => {
    setForm((f) => ({ ...f, ...updates }))
    setMsg({ text: '', error: false })
  }
  const set = (field, transform = (v) => v) => (e) => patch({ [field]: transform(e.target.value) })
  const setAddr = (field, transform = (v) => v) => (e) =>
    patch({ address: { ...form.address, [field]: transform(e.target.value) } })
  const setDay = (key, updates) => patch({ hours: { ...form.hours, [key]: { ...form.hours[key], ...updates } } })
  const digits = (max) => (v) => v.replace(/\D/g, '').slice(0, max)

  const copyToAll = (key) => {
    const src = form.hours[key]
    patch({ hours: Object.fromEntries(DAYS.map((d) => [d.key, { ...src }])) })
  }

  const handleLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      patch({ logo: await fileToResizedDataUrl(file, 256, 0.85) })
    } catch (err) {
      setMsg({ text: err.message, error: true })
    }
  }

  // The "accepting orders" switch saves immediately — it's the admin's emergency stop.
  const toggleOrders = async (on) => {
    setForm((f) => ({ ...f, acceptingOrders: on }))
    try {
      await updateRestaurant({ ...restaurant, acceptingOrders: on })
    } catch (err) {
      setForm((f) => ({ ...f, acceptingOrders: !on }))
      setMsg({ text: err.message, error: true })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const clean = {
      ...form,
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      about: form.about.trim(),
      email: form.email.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      upiId: form.upiId.trim(),
      upiName: form.upiName.trim(),
      address: Object.fromEntries(Object.entries(form.address).map(([k, v]) => [k, v.trim()])),
    }
    const problem = validate(clean)
    if (problem) return setMsg({ text: problem, error: true })
    setForm(clean)
    setSaving(true)
    try {
      await updateRestaurant(clean)
      setMsg({ text: 'Saved ✓ Customers see the changes right away.', error: false })
    } catch (err) {
      setMsg({ text: err.message, error: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="admin-settings form" onSubmit={handleSubmit} noValidate>
      <div className="page-head">
        <div>
          <h1>Restaurant Details</h1>
          <p className="muted small" style={{ margin: 0 }}>Shown to customers on the menu, footer and checkout.</p>
        </div>
      </div>

      {/* ----- Store status ----- */}
      <div className={`card store-status ${status.open ? 'open' : 'closed'}`}>
        <div>
          <span className={`status-dot ${status.open ? 'open' : 'closed'}`} aria-hidden="true" />
          <strong>{status.open ? 'Open for orders' : status.reason === 'paused' ? 'Orders paused' : 'Closed now'}</strong>
          <p className="muted small">
            {status.open
              ? 'Customers can place orders right now.'
              : status.reason === 'paused'
                ? 'Customers can browse the menu but cannot place orders.'
                : 'Outside opening hours. Customers see when you open next.'}
          </p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={form.acceptingOrders} onChange={(e) => toggleOrders(e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          Accepting orders
        </label>
      </div>

      {/* ----- Basic info ----- */}
      <div className="card">
        <h2>Basic info</h2>
        <div className="profile-grid">
          <div className="logo-field">
            <span className="field-label">Logo</span>
            <div className="logo-preview">
              {form.logo ? <img src={form.logo} alt="Logo preview" /> : <span className="brand-mark">{form.name.trim()[0] || 'K'}</span>}
            </div>
            <label className="btn small secondary file-btn">
              Upload
              <input type="file" accept="image/*" onChange={handleLogo} />
            </label>
            {form.logo && (
              <button type="button" className="link-btn small" onClick={() => patch({ logo: '' })}>Remove</button>
            )}
          </div>
          <div className="form">
            <label>
              Restaurant name *
              <input value={form.name} onChange={set('name')} maxLength={60} required />
            </label>
            <label>
              Tagline
              <input value={form.tagline} onChange={set('tagline')} maxLength={90} placeholder="Homestyle food, cooked fresh…" />
              <span className="hint">Headline on the home page · {form.tagline.length}/90</span>
            </label>
            <label>
              About
              <textarea rows="3" value={form.about} onChange={set('about')} maxLength={240} />
              <span className="hint">Shown in the footer · {form.about.length}/240</span>
            </label>
          </div>
        </div>
      </div>

      {/* ----- Contact & address ----- */}
      <div className="card">
        <h2>Contact & address</h2>
        <div className="settings-grid">
          <label>
            Phone
            <div className="unit-input">
              <span>+91</span>
              <input inputMode="numeric" value={form.phone} onChange={set('phone', digits(10))} placeholder="98765 43210" />
            </div>
          </label>
          <label>
            WhatsApp
            <div className="unit-input">
              <span>+91</span>
              <input inputMode="numeric" value={form.whatsapp} onChange={set('whatsapp', digits(10))} placeholder="Optional" />
            </div>
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={set('email')} placeholder="hello@koshis.in" />
          </label>
        </div>
        <div className="settings-grid" style={{ marginTop: 14 }}>
          <label className="span-2">
            Shop / building, street
            <input value={form.address.line1} onChange={setAddr('line1')} placeholder="Shop 4, Sai Complex, MG Road" />
          </label>
          <label>
            Area / locality
            <input value={form.address.area} onChange={setAddr('area')} placeholder="Indiranagar" />
          </label>
          <label>
            City
            <input value={form.address.city} onChange={setAddr('city')} placeholder="Bengaluru" />
          </label>
          <label>
            State
            <input value={form.address.state} onChange={setAddr('state')} placeholder="Karnataka" />
          </label>
          <label>
            Pincode
            <input inputMode="numeric" value={form.address.pincode} onChange={setAddr('pincode', digits(6))} placeholder="560038" />
          </label>
          <label className="span-2">
            Google Maps link
            <input type="url" value={form.address.mapUrl} onChange={setAddr('mapUrl')} placeholder="https://maps.app.goo.gl/…" />
          </label>
        </div>
      </div>

      {/* ----- Licences ----- */}
      <div className="card">
        <h2>Licences & tax</h2>
        <div className="settings-grid">
          <label>
            FSSAI licence no.
            <input inputMode="numeric" value={form.fssai} onChange={set('fssai', digits(14))} placeholder="14 digits" />
            <span className="hint">Must be displayed to customers</span>
          </label>
          <label>
            GSTIN
            <input value={form.gstin} onChange={set('gstin', (v) => v.toUpperCase().slice(0, 15))} placeholder="27ABCDE1234F1Z5" />
            <span className="hint">Printed on the bill</span>
          </label>
        </div>
      </div>

      {/* ----- Payments ----- */}
      <div className="card">
        <h2>UPI payments</h2>
        <p className="muted small" style={{ marginTop: -8 }}>
          Customers who choose UPI at checkout see a QR code for the exact order amount, paid straight to this UPI ID.
          Leave empty to hide the UPI option.
        </p>
        <div className="upi-settings">
          <div className="settings-grid">
            <label>
              UPI ID
              <input
                value={form.upiId}
                onChange={set('upiId', (v) => v.replace(/\s/g, ''))}
                placeholder="koshis@okhdfcbank"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="hint">Find it in your GPay / PhonePe / Paytm for Business profile</span>
            </label>
            <label>
              Payee name
              <input value={form.upiName} onChange={set('upiName')} maxLength={50} placeholder={form.name || 'Restaurant name'} />
              <span className="hint">Shown in the customer's UPI app · defaults to the restaurant name</span>
            </label>
          </div>
          {UPI_ID_RE.test(form.upiId.trim()) && (
            <div className="upi-preview">
              <QrCode value={upiPayLink({ upiId: form.upiId.trim(), name: form.upiName.trim() || form.name })} size={120} label="Preview of your UPI QR code" />
              <span className="hint">Test scan (no amount)</span>
            </div>
          )}
        </div>
      </div>

      {/* ----- Opening hours ----- */}
      <div className="card">
        <h2>Opening hours</h2>
        <p className="muted small" style={{ marginTop: -8 }}>
          Orders are only accepted during these hours. A closing time earlier than the opening time means after midnight.
        </p>
        <div className="hours-list">
          {DAYS.map((d) => {
            const h = form.hours[d.key]
            return (
              <div key={d.key} className={`hours-row ${h.open ? '' : 'off'}`}>
                <label className="switch compact">
                  <input type="checkbox" checked={h.open} onChange={(e) => setDay(d.key, { open: e.target.checked })} />
                  <span className="switch-track" aria-hidden="true" />
                  <span className="day">{d.label}</span>
                </label>
                {h.open ? (
                  <div className="hours-times">
                    <input type="time" value={h.from} onChange={(e) => setDay(d.key, { from: e.target.value })} aria-label={`${d.label} opens`} />
                    <span className="muted">to</span>
                    <input type="time" value={h.to} onChange={(e) => setDay(d.key, { to: e.target.value })} aria-label={`${d.label} closes`} />
                  </div>
                ) : (
                  <span className="muted small">Closed all day</span>
                )}
                <button type="button" className="link-btn small" onClick={() => copyToAll(d.key)} title={`Use ${hoursLabel(h)} for every day`}>
                  Copy to all
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="save-bar">
        {msg.text && <span className={msg.error ? 'error' : 'saved'}>{msg.text}</span>}
        {dirty && !msg.text && <span className="muted small">Unsaved changes</span>}
        <button type="button" className="btn secondary" disabled={!dirty} onClick={() => { setForm(restaurant); setMsg({ text: '', error: false }) }}>
          Discard
        </button>
        <button className="btn" type="submit" disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save details'}</button>
      </div>
    </form>
  )
}
