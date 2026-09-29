import { Link, useLocation } from 'react-router-dom'
import { useOrders } from '../context/OrderContext.jsx'
import { useRestaurant } from '../context/RestaurantContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { DAYS } from '../data/defaultRestaurant.js'
import { hoursLabel } from '../utils/hours.js'

// Groups consecutive days with the same hours: "Mon – Fri: 11 AM – 11 PM".
function hoursSummary(hours) {
  const groups = []
  for (const d of DAYS) {
    const label = hoursLabel(hours[d.key])
    const last = groups.at(-1)
    if (last && last.label === label) last.to = d
    else groups.push({ from: d, to: d, label })
  }
  return groups.map((g) => ({
    days: g.from === g.to ? g.from.label.slice(0, 3) : `${g.from.label.slice(0, 3)} – ${g.to.label.slice(0, 3)}`,
    label: g.label,
  }))
}

// "Site Footer" component from Figma.
export default function Footer() {
  const { lastOrder } = useOrders()
  const { restaurant: r } = useRestaurant()
  const { isAdmin } = useAuth()
  const { pathname } = useLocation()
  const address = [r.address.line1, r.address.area, r.address.city, r.address.state, r.address.pincode]
    .filter(Boolean)
    .join(', ')

  if (pathname.startsWith('/rider')) return null // the rider app is a full-screen tool

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-cols">
          <div className="footer-brand">
            <h3>{r.name}</h3>
            <p>{r.about}</p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <Link to="/#menu">Menu</Link>
            <Link to="/#offers">Offers</Link>
            <Link to={lastOrder ? `/orders/${lastOrder.id}` : '/login'}>Track order</Link>
          </div>
          <div className="footer-col">
            <h4>Hours</h4>
            {hoursSummary(r.hours).map((h) => (
              <span key={h.days}>{h.days}: {h.label}</span>
            ))}
          </div>
          {(r.phone || r.email || r.whatsapp || address) && (
            <div className="footer-col">
              <h4>Contact</h4>
              {r.phone && <a href={`tel:+91${r.phone}`}>+91 {r.phone}</a>}
              {r.whatsapp && <a href={`https://wa.me/91${r.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp us</a>}
              {r.email && <a href={`mailto:${r.email}`}>{r.email}</a>}
              {address && (r.address.mapUrl
                ? <a href={r.address.mapUrl} target="_blank" rel="noreferrer">{address}</a>
                : <span>{address}</span>)}
            </div>
          )}
        </div>
        <div className="footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} {r.name}. All rights reserved.
            {r.fssai && <> · FSSAI Lic. No. {r.fssai}</>}
            {r.gstin && <> · GSTIN {r.gstin}</>}
          </p>
          <div className="footer-links">
            <Link className="footer-admin" to="/rider">Deliver with us</Link>
            {isAdmin ? (
              <Link className="footer-admin" to="/admin/orders">Admin dashboard →</Link>
            ) : (
              <Link className="footer-admin" to="/admin/login">Admin login</Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
