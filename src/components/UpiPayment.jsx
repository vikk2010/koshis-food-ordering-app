import { useState } from 'react'
import QrCode from './QrCode.jsx'
import { formatPrice } from '../utils/bill.js'
import { upiPayLink } from '../utils/qr.js'

// Phones and tablets: the customer can't scan a QR code shown on their own screen.
const isPhone = () =>
  typeof window !== 'undefined' &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia?.('(pointer: coarse)').matches)

/**
 * "Pay by UPI" card.
 *
 * GPay / PhonePe / Paytm block (or cap at ₹2,000) one-tap payment links and saved QR images that
 * pay a *personal* UPI ID — the "You can pay up to ₹2,000 with QR codes via gallery" message.
 * So on a phone we only offer the one-tap button for a business (merchant) UPI ID; otherwise the
 * customer copies the UPI ID and amount and pays it with "Pay to UPI ID" inside their app, which
 * has no such limit. On a computer the customer scans the QR code with their phone camera.
 */
export default function UpiPayment({ upiId, name, amount, note, merchant = false }) {
  const [copied, setCopied] = useState('')
  const [phone] = useState(isPhone)
  const link = upiPayLink({ upiId, name, amount, note })
  const amountText = Number(amount).toFixed(2).replace(/\.00$/, '')

  const copy = async (what, text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Older browsers: fall back to a temporary text field.
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    setCopied(what)
    setTimeout(() => setCopied((c) => (c === what ? '' : c)), 2500)
  }

  const qr = (
    <div className="upi-pay-qr">
      <QrCode value={link} size={phone ? 150 : 200} label={`UPI QR code to pay ${formatPrice(amount)} to ${name}`} />
    </div>
  )

  if (phone) {
    return (
      <div className="card upi-pay phone">
        <div className="upi-pay-info">
          <span className="eyebrow">Pay by UPI</span>
          <h2>Pay {formatPrice(amount)}</h2>

          {merchant && (
            <>
              <a className="btn large upi-app-link" href={link}>Pay with GPay / PhonePe / Paytm</a>
              <p className="muted small">If your app doesn't open or won't let you pay, use these steps:</p>
            </>
          )}

          <ol className="upi-steps">
            <li>
              <div>
                <span className="muted small">Copy the UPI ID</span>
                <code>{upiId}</code>
              </div>
              <button type="button" className={`btn small ${merchant ? 'secondary' : ''}`} onClick={() => copy('id', upiId)}>
                {copied === 'id' ? 'Copied ✓' : 'Copy'}
              </button>
            </li>
            <li>
              <div>
                <span className="muted small">
                  Open GPay, PhonePe or Paytm → <strong>Pay UPI ID</strong> (or "To UPI ID / number") → paste it
                </span>
              </div>
            </li>
            <li>
              <div>
                <span className="muted small">Pay exactly this amount to <strong>{name}</strong></span>
                <strong className="upi-amount">₹{amountText}</strong>
              </div>
              <button type="button" className="btn small secondary" onClick={() => copy('amount', amountText)}>
                {copied === 'amount' ? 'Copied ✓' : 'Copy'}
              </button>
            </li>
            {note && (
              <li>
                <div>
                  <span className="muted small">Add this note so we can match your payment</span>
                  <code>{note}</code>
                </div>
                <button type="button" className="btn small secondary" onClick={() => copy('note', note)}>
                  {copied === 'note' ? 'Copied ✓' : 'Copy'}
                </button>
              </li>
            )}
          </ol>

          <details className="upi-qr-more">
            <summary>Paying from another phone? Show QR code</summary>
            {qr}
          </details>
        </div>
      </div>
    )
  }

  return (
    <div className="card upi-pay">
      {qr}
      <div className="upi-pay-info">
        <span className="eyebrow">Scan & pay with any UPI app</span>
        <h2>Pay {formatPrice(amount)}</h2>
        <p className="muted small">
          Open GPay, PhonePe, Paytm or BHIM on your phone, scan this code with the app's scanner and confirm. The amount
          is filled in for you.
        </p>
        <div className="upi-id-row">
          <span className="muted small">Paying</span>
          <strong>{name}</strong>
        </div>
        <div className="upi-id-row">
          <span className="muted small">UPI ID</span>
          <code>{upiId}</code>
          <button type="button" className="text-link small" onClick={() => copy('id', upiId)}>{copied === 'id' ? 'Copied ✓' : 'Copy'}</button>
        </div>
        {note && <p className="muted small" style={{ margin: 0 }}>Reference: {note}</p>}
      </div>
    </div>
  )
}
