import { useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { currentLocation, geocodeAddress, reverseGeocode } from '../utils/geo.js'
import usePincodeAutofill, { makeAutofill } from '../hooks/usePincodeAutofill.js'

const LABELS = ['Home', 'Work', 'Other']
const EMPTY = { label: 'Home', name: '', house: '', area: '', landmark: '', city: '', state: '', pincode: '' }

export default function AddressForm({ onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [location, setLocation] = useState(null) // { lat, lng, accuracy } from the phone's GPS
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const fill = useRef(makeAutofill()).current

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // Typing a 6-digit pincode fills in city, state and (when clear-cut) the area.
  const pin = usePincodeAutofill(form.pincode, (info) =>
    setForm((f) => ({
      ...f,
      city: fill(f.city, 'city', info.city),
      state: fill(f.state, 'state', info.state),
      area: fill(f.area, 'area', info.area),
    })),
  )

  // "Use my current location": pins the exact spot and fills in area / city / pincode if empty.
  const locate = async () => {
    setLocating(true)
    setError('')
    try {
      const loc = await currentLocation()
      setLocation(loc)
      const found = await reverseGeocode(loc)
      if (found) {
        setForm((f) => ({
          ...f,
          area: f.area || found.area,
          city: f.city || found.city,
          state: f.state || found.state,
          pincode: f.pincode || found.pincode,
        }))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLocating(false)
    }
  }

  // Not a <form>: this renders inside the cart page, and nested submit handling isn't needed.
  const handleSave = async () => {
    const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]))
    if (!trimmed.name || !trimmed.house) {
      setError('Please fill in the name and house / flat')
      return
    }
    if (!/^\d{6}$/.test(trimmed.pincode)) {
      setError('Enter a valid 6-digit pincode')
      return
    }
    if (!trimmed.area || !trimmed.city) {
      setError('Please fill in the area and city')
      return
    }
    // Save the map position so the kitchen knows how far away this is:
    // phone GPS (exact) → address lookup → the pincode's centre (rough).
    setSaving(true)
    let pinned = location ? { lat: location.lat, lng: location.lng, source: 'gps' } : null
    if (!pinned) {
      const loc = await geocodeAddress(trimmed)
      pinned = loc ? { ...loc, source: 'address' } : pin.info?.location ? { ...pin.info.location, source: 'pincode' } : null
    }
    setSaving(false)
    onSave(pinned ? { ...trimmed, location: pinned } : trimmed)
  }

  return (
    <div className="form address-form">
      <div className="chips">
        {LABELS.map((l) => (
          <button
            key={l}
            type="button"
            className={`chip ${form.label === l ? 'active' : ''}`}
            onClick={() => setForm((f) => ({ ...f, label: l }))}
          >
            {l}
          </button>
        ))}
      </div>
      <button type="button" className={`locate-btn ${location ? 'done' : ''}`} onClick={locate} disabled={locating}>
        <Icon name="pin" size={18} />
        {locating ? 'Finding your location…' : location ? 'Location pinned ✓ — tap to update' : 'Use my current location'}
      </button>
      <label>
        Name
        <input value={form.name} onChange={set('name')} placeholder="Who should the rider ask for?" maxLength={40} autoComplete="name" />
      </label>
      <label>
        House / Flat / Floor
        <input value={form.house} onChange={set('house')} placeholder="Flat 402, Sunrise Apartments" />
      </label>
      <div className="form-row pin-row">
        <label>
          Pincode
          <input
            inputMode="numeric"
            maxLength={6}
            value={form.pincode}
            onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))}
            placeholder="560038"
            autoComplete="postal-code"
          />
          <PinStatus pin={pin} />
        </label>
        <label>
          City
          <input value={form.city} onChange={set('city')} autoComplete="address-level2" />
        </label>
        <label>
          State
          <input value={form.state} onChange={set('state')} autoComplete="address-level1" />
        </label>
      </div>
      <label>
        Area / Street
        <input value={form.area} onChange={set('area')} placeholder="MG Road, Indiranagar" list="pin-areas" />
        {pin.info?.areas?.length > 0 && (
          <datalist id="pin-areas">
            {pin.info.areas.map((a) => <option key={a} value={a} />)}
          </datalist>
        )}
      </label>
      <label>
        Landmark (optional)
        <input value={form.landmark} onChange={set('landmark')} placeholder="Near City Mall" />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        {onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>}
        <button type="button" className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Address'}</button>
      </div>
    </div>
  )
}

/** Small line under a pincode field: "Looking up…", "✓ Bengaluru, Karnataka" or "Pincode not found". */
export function PinStatus({ pin }) {
  if (pin.status === 'loading') return <span className="hint">Looking up pincode…</span>
  if (pin.status === 'notfound') return <span className="hint pin-bad">Pincode not found — please check it</span>
  if (pin.status === 'found') return <span className="hint pin-ok">✓ {[pin.info.city, pin.info.state].filter(Boolean).join(', ')}</span>
  return null
}
