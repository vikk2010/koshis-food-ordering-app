import { useState } from 'react'
import QrCode from './QrCode.jsx'
import { formatPrice } from '../utils/bill.js'
import { upiPayLink } from '../utils/qr.js'

/** "Scan to pay" card: UPI QR code for the exact amount, plus a deep link for phones. */
export default function UpiPayment({ upiId, name, amount, note }) {
  const [copied, setCopied] = useState(false)
  const link = upiPayLink({ upiId, name, amount, note })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(upiId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — the ID is still visible to copy by hand */
    }
  }

  return (
    <div className="card upi-pay">
      <div className="upi-pay-qr">
        <QrCode value={link} size={200} label={`UPI QR code to pay ${formatPrice(amount)} to ${name}`} />
      </div>
      <div className="upi-pay-info">
        <span className="eyebrow">Scan & pay with any UPI app</span>
        <h2>Pay {formatPrice(amount)}</h2>
        <p className="muted small">
          Open GPay, PhonePe, Paytm or BHIM, scan this code and confirm. The amount is filled in for you.
        </p>
        <div className="upi-id-row">
          <span className="muted small">Paying</span>
          <strong>{name}</strong>
        </div>
        <div className="upi-id-row">
          <span className="muted small">UPI ID</span>
          <code>{upiId}</code>
          <button type="button" className="text-link small" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
        </div>
        {note && <p className="muted small" style={{ margin: 0 }}>Reference: {note}</p>}
        <a className="btn secondary upi-app-link" href={link}>Open UPI app</a>
      </div>
    </div>
  )
}
