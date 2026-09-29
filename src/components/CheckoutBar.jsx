import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import Icon from './Icon.jsx'

// Sticky bottom bar on the menu once dishes are selected.
// Guests are asked to log in by phone before they can place the order.
export default function CheckoutBar() {
  const { count, total, clearCart } = useCart()
  const { user } = useUser()
  const navigate = useNavigate()
  const bar = useRef(null)
  const [confirming, setConfirming] = useState(false)

  // Reserve room at the bottom of the page for the bar, so it never covers the footer
  // (Admin login, contact details…). Follows the bar's real height (it's taller on phones).
  useEffect(() => {
    const el = bar.current
    if (!el) return undefined
    const apply = () => document.body.style.setProperty('--checkout-bar-h', `${el.offsetHeight}px`)
    apply()
    document.body.classList.add('has-checkout-bar')
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
    ro?.observe(el)
    return () => {
      ro?.disconnect()
      document.body.classList.remove('has-checkout-bar')
      document.body.style.removeProperty('--checkout-bar-h')
    }
  }, [count > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (count === 0) setConfirming(false) }, [count])

  if (count === 0) return null

  const placeOrder = () => navigate(user ? '/cart' : '/login?redirect=/cart')

  return (
    <div className="checkout-bar" ref={bar}>
      <div className="container checkout-inner">
        {confirming ? (
          <div className="checkout-confirm" role="alert">
            <span>Remove all {count} item{count > 1 ? 's' : ''}?</span>
            <button type="button" className="btn small danger" onClick={() => { clearCart(); setConfirming(false) }}>
              Yes, clear
            </button>
            <button type="button" className="btn small secondary" onClick={() => setConfirming(false)}>Keep</button>
          </div>
        ) : (
          <>
            <div className="checkout-summary">
              <span>
                <strong>{count} item{count > 1 ? 's' : ''}</strong> · ₹{total}
              </span>
              <button type="button" className="checkout-clear" onClick={() => setConfirming(true)} aria-label="Clear all items">
                <Icon name="trash" size={16} /> Clear
              </button>
            </div>
            <button className="btn" onClick={placeOrder}>Place Order →</button>
          </>
        )}
      </div>
    </div>
  )
}
