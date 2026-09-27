import { Link } from 'react-router-dom'
import { useRestaurant } from '../context/RestaurantContext.jsx'

export default function Logo() {
  const { restaurant } = useRestaurant()
  return (
    <Link to="/" className="brand" aria-label={`${restaurant.name} — home`}>
      {restaurant.logo ? (
        <img className="brand-mark brand-img" src={restaurant.logo} alt="" />
      ) : (
        <span className="brand-mark" aria-hidden="true">K</span>
      )}
      <span className="brand-text">
        <span className="brand-name">Koshi's</span>
        <span className="brand-sub">CLOUD KITCHEN</span>
      </span>
    </Link>
  )
}
