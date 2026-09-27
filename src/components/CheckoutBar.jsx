import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useUser } from '../context/UserContext.jsx'

// Sticky bottom bar on the menu once dishes are selected.
// Guests are asked to log in by phone before they can place the order.
export default function CheckoutBar() {
  const { count, total } = useCart()
  const { user } = useUser()
  const navigate = useNavigate()

  if (count === 0) return null

  const placeOrder = () => navigate(user ? '/cart' : '/login?redirect=/cart')

  return (
    <div className="checkout-bar">
      <div className="container checkout-inner">
        <span>
          <strong>{count} item{count > 1 ? 's' : ''}</strong> · ₹{total}
        </span>
        <button className="btn" onClick={placeOrder}>Place Order →</button>
      </div>
    </div>
  )
}
