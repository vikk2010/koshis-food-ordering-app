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
 * - Business (merchant) UPI ID: QR code / one-tap link with the amount already filled in.
 * - Personal UPI ID: GPay / PhonePe / Paytm block (or cap at ₹2,000) links and QR images with a
 *   preset amount for personal IDs. So we show the restaurant's own QR code (uploaded in Restaurant
 *   Details) or the UPI ID, and the customer types the amount themselves.
 */
export default function UpiPayment({ upiId, name, amount, note, merchant = false, qrImage = '' }) {
  const [copied, setCopied] = useState('')
  const [phone] = useState(isPhone)
  const link = upiPayLink({ upiId, name, amount, note })
  const amountText = Number(amount).toFixed(2).replace(/\.00$/, '')
  const ownQr = !merchant && qrImage ? qrImage : ''

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

  const qr = ownQr ? (
    <div className="upi-pay-qr own">
      <img src={ownQr} alt={`UPI QR code for ${name}`} width={phone ? 180 : 200} />
    </div>
  ) : (
    <div className="upi-pay-qr">
      <QrCode value={link} size={phone ? 150 : 200} label={`UPI QR code to pay ${formatPrice(amount)} to ${name}`} />
    </div>
  )

  const amountBox = (
    <div className="upi-amount-box">
      <span className="muted small">{ownQr || !merchant ? 'Enter this amount in your UPI app' : 'Amount'}</span>
      <strong className="upi-amount">₹{amountText}</strong>
    </div>
  )

  if (phone) {
    return (
      <div className="card upi-pay phone">
        <div className="upi-pay-info">
          <span className="eyebrow">Pay by UPI</span>
          <h2>Pay {formatPrice(amount)} to {name}</h2>

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
                <span className="muted small">Type the amount and pay <strong>{name}</strong></span>
                <strong className="upi-amount">₹{amountText}</strong>
              </div>
              <button type="button" className="btn small secondary" onClick={() => copy('amount', amountText)}>
                {copied === 'amount' ? 'Copied ✓' : 'Copy'}
              </button>
            </li>
          </ol>

          {ownQr ? (
            <details className="upi-qr-more">
              <summary>Or pay with our QR code</summary>
              <p className="muted small">
                Scan it from another phone, or save it and choose it from your gallery in the UPI app (up to ₹2,000).
                Then enter <strong>₹{amountText}</strong>.
              </p>
              {qr}
              <a className="btn small secondary" href={ownQr} download="upi-qr.jpg">Save QR image</a>
            </details>
          ) : (
            <details className="upi-qr-more">
              <summary>Paying from another phone? Show QR code</summary>
              {qr}
            </details>
          )}
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
          {ownQr
            ? 'Open GPay, PhonePe, Paytm or BHIM on your phone, scan this code, then type the amount below and pay.'
            : 'Open GPay, PhonePe, Paytm or BHIM on your phone, scan this code with the app’s scanner and confirm. The amount is filled in for you.'}
        </p>
        {ownQr && amountBox}
        <div className="upi-id-row">
          <span className="muted small">Paying</span>
          <strong>{name}</strong>
        </div>
        <div className="upi-id-row">
          <span className="muted small">UPI ID</span>
          <code>{upiId}</code>
          <button type="button" className="text-link small" onClick={() => copy('id', upiId)}>{copied === 'id' ? 'Copied ✓' : 'Copy'}</button>
        </div>
      </div>
    </div>
  )
}
