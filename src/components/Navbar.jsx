import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { useOrders } from '../context/OrderContext.jsx'
import Logo from './Logo.jsx'
import Icon from './Icon.jsx'

// "Site Header" component from Figma.
export default function Navbar() {
  const { count } = useCart()
  const { user, logoutUser } = useUser()
  const { lastOrder } = useOrders()

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Logo />
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Menu</NavLink>
          <Link to="/#offers">Offers</Link>
          {lastOrder && <NavLink to={`/orders/${lastOrder.id}`}>Track order</NavLink>}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="user-chip">
                <span className="phone">{user.phone}</span>
                <button className="link-btn" onClick={logoutUser}>Logout</button>
              </span>
              <Link to="/cart" className="cart-pill" aria-label={`Cart, ${count} items`}>
                <Icon name="cart" size={18} />
                Cart{count > 0 && ` · ${count}`}
              </Link>
            </>
          ) : (
            <Link to="/login" className="btn secondary">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  )
}
