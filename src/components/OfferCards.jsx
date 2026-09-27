import { useState } from 'react'
import { couponHeadline, couponTerms, offerTheme } from '../utils/bill.js'

/** Home page "Offers for you": one card per active coupon from "Charges & Coupons". */
export default function OfferCards({ coupons }) {
  const [copied, setCopied] = useState('')

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      /* clipboard blocked — the code is still visible */
    }
    setCopied(code)
    setTimeout(() => setCopied((c) => (c === code ? '' : c)), 2000)
  }

  return (
    <section id="offers" className="offers" aria-labelledby="offers-title">
      <div className="section-head">
        <div>
          <h1 id="offers-title">Offers for you</h1>
          <p className="muted">Tap a card to copy its code, then apply it at checkout</p>
        </div>
      </div>
      <div className={`offer-grid n${Math.min(coupons.length, 3)}`}>
        {coupons.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`offer-card theme-${offerTheme(c, i)} ${copied === c.code ? 'copied' : ''}`}
            onClick={() => copy(c.code)}
            aria-label={`${couponHeadline(c)}, ${couponTerms(c)}. Copy code ${c.code}`}
          >
            <span className="offer-card-top">
              {c.title && <span className="offer-title">{c.title}</span>}
              <span className="offer-headline">{couponHeadline(c)}</span>
              <span className="offer-terms">{couponTerms(c)}</span>
            </span>
            <span className="offer-card-bottom">
              <span className="offer-code">
                <span>{c.code}</span>
                <span className="offer-copy">{copied === c.code ? 'Copied ✓' : 'Tap to copy'}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
