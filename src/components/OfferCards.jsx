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
          <p className="muted">Apply a code at checkout</p>
        </div>
      </div>
      <div className={`offer-grid n${Math.min(coupons.length, 3)}`}>
        {coupons.map((c, i) => (
          <article key={c.id} className={`offer-card theme-${offerTheme(c, i)}`}>
            <div className="offer-card-top">
              {c.title && <span className="offer-title">{c.title}</span>}
              <h2 className="offer-headline">{couponHeadline(c)}</h2>
              <p className="offer-terms">{couponTerms(c)}</p>
            </div>
            <div className="offer-card-bottom">
              <button type="button" className="offer-code" onClick={() => copy(c.code)} aria-label={`Copy code ${c.code}`}>
                <span>{c.code}</span>
                <span className="offer-copy">{copied === c.code ? 'Copied ✓' : 'Copy'}</span>
              </button>
              <a className="offer-cta" href="#menu">Order now →</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
