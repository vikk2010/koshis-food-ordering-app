import { useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { couponLabel } from '../../utils/bill.js'

const FIELDS = [
  { key: 'deliveryTimeMin', label: 'Delivery time', unit: 'mins' },
  { key: 'packagingCharge', label: 'Restaurant packaging charges', unit: '₹' },
  { key: 'deliveryCharge', label: 'Delivery charges', unit: '₹' },
  { key: 'freeDeliveryAbove', label: 'Free delivery above (0 = never)', unit: '₹' },
  { key: 'platformFee', label: 'Platform fee', unit: '₹' },
  { key: 'gstPercent', label: 'GST', unit: '%', max: 28 },
]

const EMPTY_COUPON = { code: '', type: 'flat', value: '', minOrder: '', maxDiscount: '' }

export default function AdminSettings() {
  const { settings, updateSettings, coupons, addCoupon, updateCoupon, deleteCoupon } = useSettings()

  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(settings[f.key])])))
  const [settingsMsg, setSettingsMsg] = useState({ text: '', error: false })
  const [coupon, setCoupon] = useState(EMPTY_COUPON)
  const [couponError, setCouponError] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const saveSettings = (e) => {
    e.preventDefault()
    const next = {}
    for (const f of FIELDS) {
      const n = Number(form[f.key])
      if (form[f.key] === '' || !Number.isFinite(n) || n < 0 || (f.max != null && n > f.max)) {
        setSettingsMsg({ text: `${f.label}: enter a number from 0${f.max != null ? ` to ${f.max}` : ''}`, error: true })
        return
      }
      next[f.key] = n
    }
    updateSettings(next)
    setSettingsMsg({ text: 'Saved ✓', error: false })
  }

  const setC = (field) => (e) => setCoupon((c) => ({ ...c, [field]: e.target.value }))

  const saveCoupon = (e) => {
    e.preventDefault()
    const code = coupon.code.trim().toUpperCase()
    const value = Number(coupon.value)
    const minOrder = Number(coupon.minOrder || 0)
    const maxDiscount = coupon.type === 'percent' ? Number(coupon.maxDiscount || 0) : 0

    if (!/^[A-Z0-9]{3,15}$/.test(code)) return setCouponError('Code must be 3–15 letters/numbers')
    if (coupons.some((c) => c.code === code)) return setCouponError('This code already exists')
    if (!(value > 0) || (coupon.type === 'percent' && value > 100)) {
      return setCouponError(coupon.type === 'percent' ? 'Percent must be 1–100' : 'Discount must be more than 0')
    }
    if (minOrder < 0 || maxDiscount < 0) return setCouponError('Amounts cannot be negative')

    addCoupon({ code, type: coupon.type, value, minOrder, maxDiscount, active: true })
    setCoupon(EMPTY_COUPON)
    setCouponError('')
  }

  return (
    <section className="admin-settings">
      <h1>Charges & Coupons</h1>

      <form className="card form" onSubmit={saveSettings}>
        <h2>Delivery & Charges</h2>
        <div className="settings-grid">
          {FIELDS.map((f) => (
            <label key={f.key}>
              {f.label}
              <div className="unit-input">
                {f.unit === '₹' && <span>₹</span>}
                <input
                  type="number"
                  min="0"
                  max={f.max}
                  step="any"
                  value={form[f.key]}
                  onChange={(e) => {
                    setForm((s) => ({ ...s, [f.key]: e.target.value }))
                    setSettingsMsg({ text: '', error: false })
                  }}
                />
                {f.unit !== '₹' && <span>{f.unit}</span>}
              </div>
            </label>
          ))}
        </div>
        <p className="muted small">GST is calculated on item total − coupon discount + packaging charges.</p>
        <div className="actions">
          {settingsMsg.text && <span className={settingsMsg.error ? 'error' : 'saved'}>{settingsMsg.text}</span>}
          <button className="btn" type="submit">Save Charges</button>
        </div>
      </form>

      <div className="card">
        <h2>Coupons</h2>
        <form className="form coupon-form" onSubmit={saveCoupon}>
          <label>
            Code
            <input value={coupon.code} onChange={(e) => setCoupon((c) => ({ ...c, code: e.target.value.toUpperCase() }))} placeholder="DIWALI100" />
          </label>
          <label>
            Type
            <select value={coupon.type} onChange={setC('type')}>
              <option value="flat">Flat ₹ off</option>
              <option value="percent">% off</option>
            </select>
          </label>
          <label>
            {coupon.type === 'percent' ? 'Discount %' : 'Discount ₹'}
            <input type="number" min="1" value={coupon.value} onChange={setC('value')} />
          </label>
          <label>
            Min order ₹
            <input type="number" min="0" value={coupon.minOrder} onChange={setC('minOrder')} placeholder="0" />
          </label>
          {coupon.type === 'percent' && (
            <label>
              Max discount ₹
              <input type="number" min="0" value={coupon.maxDiscount} onChange={setC('maxDiscount')} placeholder="No cap" />
            </label>
          )}
          <button className="btn" type="submit">+ Add Coupon</button>
        </form>
        {couponError && <p className="error">{couponError}</p>}

        <div className="table-wrap flat">
          <table className="admin-table">
            <thead>
              <tr><th>Code</th><th>Offer</th><th>Active</th><th></th></tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td><span className="coupon-code">{c.code}</span></td>
                  <td>{couponLabel(c)}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={c.active}
                      onChange={(e) => updateCoupon(c.id, { active: e.target.checked })}
                      aria-label={`Toggle ${c.code}`}
                    />
                  </td>
                  <td className="row-actions">
                    {confirmId === c.id ? (
                      <>
                        <button className="btn small danger" onClick={() => deleteCoupon(c.id)}>Confirm</button>
                        <button className="btn small secondary" onClick={() => setConfirmId(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn small danger" onClick={() => setConfirmId(c.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan="4" className="empty">No coupons yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
