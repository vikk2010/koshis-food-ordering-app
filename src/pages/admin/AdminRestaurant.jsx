import { useRef, useState } from 'react'
import { useRestaurant } from '../../context/RestaurantContext.jsx'
import { DAYS } from '../../data/defaultRestaurant.js'
import { fileToResizedDataUrl } from '../../utils/image.js'
import { hoursLabel } from '../../utils/hours.js'
import { UPI_ID_RE, upiPayLink } from '../../utils/qr.js'
import QrCode from '../../components/QrCode.jsx'
import Icon from '../../components/Icon.jsx'
import { PinStatus } from '../../components/AddressForm.jsx'
import usePincodeAutofill, { makeAutofill } from '../../hooks/usePincodeAutofill.js'
import { currentLocation, formatCoords, geocodeAddress, mapsLink, parseCoords } from '../../utils/geo.js'

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
  if (!(f.serviceRadiusKm >= 1 && f.serviceRadiusKm <= 100)) return 'Delivery area: enter a distance from 1 to 100 km'
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
  const [coordsText, setCoordsText] = useState(() => formatCoords(restaurant.location))
  const [locBusy, setLocBusy] = useState('')
  const fill = useRef(makeAutofill()).current

  // Typing the pincode fills in city, state and (when clear-cut) the area — never over what you typed.
  const pin = usePincodeAutofill(form.address.pincode, (info) =>
    setForm((f) => ({
      ...f,
      address: {
        ...f.address,
        city: fill(f.address.city, 'city', info.city),
        state: fill(f.address.state, 'state', info.state),
        area: fill(f.address.area, 'area', info.area),
      },
    })),
  )

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

  const handleQr = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      // Large enough to scan reliably, small enough for the restaurant document (Firestore: 1 MB).
      const dataUrl = await fileToResizedDataUrl(file, 720, 0.9)
      if (dataUrl.length > 450_000) throw new Error('That image is too large — crop it to just the QR code and try again.')
      patch({ upiQr: dataUrl })
    } catch (err) {
      setMsg({ text: err.message, error: true })
    }
  }

  // ----- Kitchen location (for delivery distance) -----
  const pinKitchen = (loc, note) => {
    patch({ location: { lat: loc.lat, lng: loc.lng } })
    setCoordsText(formatCoords(loc))
    if (note) setMsg({ text: note, error: false })
  }
  const onCoordsChange = (e) => {
    setCoordsText(e.target.value)
    const loc = parseCoords(e.target.value)
    if (loc) patch({ location: loc })
    else if (!e.target.value.trim()) patch({ location: null })
  }
  const onMapUrlChange = (e) => {
    setAddr('mapUrl')(e)
    const loc = parseCoords(e.target.value)
    if (loc) {
      setForm((f) => ({ ...f, location: loc }))
      setCoordsText(formatCoords(loc))
    }
  }
  const useMyLocation = async () => {
    setLocBusy('gps')
    try {
      pinKitchen(await currentLocation(), 'Kitchen pinned at your current location — check it on the map, then save.')
    } catch (err) {
      setMsg({ text: err.message, error: true })
    } finally {
      setLocBusy('')
    }
  }
  const findFromAddress = async () => {
    const a = form.address
    if (!a.area && !a.pincode && !a.city) return setMsg({ text: 'Fill in the area, city or pincode first.', error: true })
    setLocBusy('address')
    const loc = await geocodeAddress({ landmark: a.line1, area: a.area, city: a.city, state: a.state, pincode: a.pincode })
    setLocBusy('')
    if (loc) pinKitchen(loc, 'Found from your address — this is approximate. Check it on the map, then save.')
    else setMsg({ text: "Couldn't find that address on the map. Try 'Use my current location' or paste coordinates.", error: true })
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
            Pincode
            <input inputMode="numeric" value={form.address.pincode} onChange={setAddr('pincode', digits(6))} placeholder="560038" />
            <PinStatus pin={pin} />
          </label>
          <label>
            Area / locality
            <input value={form.address.area} onChange={setAddr('area')} placeholder="Indiranagar" list="restaurant-pin-areas" />
            {pin.info?.areas?.length > 0 && (
              <datalist id="restaurant-pin-areas">
                {pin.info.areas.map((a) => <option key={a} value={a} />)}
              </datalist>
            )}
          </label>
          <label>
            City
            <input value={form.address.city} onChange={setAddr('city')} placeholder="Bengaluru" />
          </label>
          <label>
            State
            <input value={form.address.state} onChange={setAddr('state')} placeholder="Karnataka" />
          </label>
          <label className="span-2">
            Google Maps link
            <input type="url" value={form.address.mapUrl} onChange={onMapUrlChange} placeholder="https://maps.app.goo.gl/…" />
            <span className="hint">
              Open Google Maps → search your restaurant → tap <strong>Share</strong> → <strong>Copy link</strong>, then paste it
              here. Customers can open it from the footer.
            </span>
          </label>
        </div>

        <div className="kitchen-location">
          <h3>Kitchen location & delivery area</h3>
          <p className="muted small">Used to work out how far each customer is from your kitchen.</p>
          <div className="settings-grid">
            <label>
              Kitchen coordinates
              <input value={coordsText} onChange={onCoordsChange} placeholder="12.97160, 77.59460" inputMode="decimal" />
              <span className="hint">
                In Google Maps, right-click your restaurant (long-press on a phone) — the numbers shown at the top are the
                coordinates; click them to copy.
              </span>
            </label>
            <label>
              Deliver up to
              <div className="unit-input">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={form.serviceRadiusKm}
                  onChange={(e) => patch({ serviceRadiusKm: e.target.value === '' ? '' : Number(e.target.value) })}
                />
                <span>km</span>
              </div>
              <span className="hint">Orders from further away are flagged so you can cancel them. Increase it to serve a bigger area.</span>
            </label>
          </div>
          <div className="card-links location-actions">
            <button type="button" className="btn small secondary" onClick={useMyLocation} disabled={Boolean(locBusy)}>
              <Icon name="pin" size={16} /> {locBusy === 'gps' ? 'Locating…' : 'Use my current location'}
            </button>
            <button type="button" className="btn small secondary" onClick={findFromAddress} disabled={Boolean(locBusy)}>
              {locBusy === 'address' ? 'Searching…' : 'Find from address'}
            </button>
            {form.location && (
              <a className="text-link" href={mapsLink(form.location)} target="_blank" rel="noreferrer">Check on Google Maps ↗</a>
            )}
          </div>
          <p className={`location-status ${form.location ? 'ok' : 'warn'}`}>
            {form.location
              ? `✓ Kitchen pinned at ${formatCoords(form.location)} · delivering within ${form.serviceRadiusKm || '?'} km`
              : 'Kitchen location not set yet — until it is, orders can’t be checked for distance.'}
          </p>
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
          Customers who choose UPI at checkout pay straight to this UPI ID. Leave the UPI ID empty to hide the UPI option.
        </p>
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
            <span className="hint">Shown in GPay / PhonePe / Paytm under your profile</span>
          </label>
          <label>
            Payee name
            <input value={form.upiName} onChange={set('upiName')} maxLength={50} placeholder={form.name || 'Restaurant name'} />
            <span className="hint">Shown to customers on the payment screen · defaults to the restaurant name</span>
          </label>
        </div>

        <fieldset className="upi-type">
          <legend className="field-label">Type of UPI ID</legend>
          <label className={`option-tile ${!form.upiMerchant ? 'selected' : ''}`}>
            <input type="radio" name="upiType" checked={!form.upiMerchant} onChange={() => patch({ upiMerchant: false })} />
            <div className="option-body">
              <strong>Personal UPI ID</strong>
              <span className="muted small">
                Your own GPay / PhonePe / Paytm ID. Customers scan your QR code (or use your UPI ID) and type the amount
                themselves — UPI apps don't allow a pre-filled amount for personal IDs.
              </span>
            </div>
          </label>
          <label className={`option-tile ${form.upiMerchant ? 'selected' : ''}`}>
            <input type="radio" name="upiType" checked={Boolean(form.upiMerchant)} onChange={() => patch({ upiMerchant: true })} />
            <div className="option-body">
              <strong>Business (merchant) UPI ID</strong>
              <span className="muted small">
                From Google Pay for Business, PhonePe Business, Paytm for Business or your bank. The app makes a QR code and
                a one-tap "Pay" button with the exact order amount filled in.
              </span>
            </div>
          </label>
        </fieldset>

        {form.upiMerchant ? (
          UPI_ID_RE.test(form.upiId.trim()) && (
            <div className="upi-preview inline">
              <QrCode value={upiPayLink({ upiId: form.upiId.trim(), name: form.upiName.trim() || form.name })} size={120} label="Preview of your UPI QR code" />
              <span className="hint">Test scan (no amount)</span>
            </div>
          )
        ) : (
          <div className="upi-qr-upload">
            <div className="upi-qr-upload-preview">
              {form.upiQr ? <img src={form.upiQr} alt="Your UPI QR code" /> : <span className="muted small">No QR code yet</span>}
            </div>
            <div className="upi-qr-upload-info">
              <strong>Your UPI QR code</strong>
              <span className="hint">
                In GPay, PhonePe or Paytm open your profile → "Your QR code" → download or screenshot it, then upload it
                here. Customers see it on the payment screen with the amount they need to enter.
              </span>
              <div className="card-links">
                <label className="btn small secondary file-btn">
                  {form.upiQr ? 'Replace QR code' : 'Upload QR code'}
                  <input type="file" accept="image/*" onChange={handleQr} />
                </label>
                {form.upiQr && (
                  <button type="button" className="link-btn small" onClick={() => patch({ upiQr: '' })}>Remove</button>
                )}
              </div>
            </div>
          </div>
        )}
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
