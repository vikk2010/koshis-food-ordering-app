import { useState } from 'react'

const LABELS = ['Home', 'Work', 'Other']
const EMPTY = { label: 'Home', name: '', house: '', area: '', landmark: '', city: '', pincode: '' }

export default function AddressForm({ onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // Not a <form>: this renders inside the cart page, and nested submit handling isn't needed.
  const handleSave = () => {
    const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]))
    if (!trimmed.name || !trimmed.house || !trimmed.area || !trimmed.city) {
      setError('Please fill name, house/flat, area and city')
      return
    }
    if (!/^\d{6}$/.test(trimmed.pincode)) {
      setError('Enter a valid 6-digit pincode')
      return
    }
    onSave(trimmed)
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
      <label>
        Name
        <input value={form.name} onChange={set('name')} placeholder="Who should the rider ask for?" maxLength={40} autoComplete="name" />
      </label>
      <label>
        House / Flat / Floor
        <input value={form.house} onChange={set('house')} placeholder="Flat 402, Sunrise Apartments" />
      </label>
      <label>
        Area / Street
        <input value={form.area} onChange={set('area')} placeholder="MG Road, Indiranagar" />
      </label>
      <label>
        Landmark (optional)
        <input value={form.landmark} onChange={set('landmark')} placeholder="Near City Mall" />
      </label>
      <div className="form-row">
        <label>
          City
          <input value={form.city} onChange={set('city')} />
        </label>
        <label>
          Pincode
          <input
            inputMode="numeric"
            maxLength={6}
            value={form.pincode}
            onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))}
          />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        {onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>}
        <button type="button" className="btn" onClick={handleSave}>Save Address</button>
      </div>
    </div>
  )
}
