import { useCart } from '../context/CartContext.jsx'
import VegIcon from './VegIcon.jsx'
import DishImage from './DishImage.jsx'
import Icon from './Icon.jsx'
import { DISH_TAGS } from '../data/defaultRestaurant.js'

// "Dish Card" component from Figma.
export default function DishCard({ dish }) {
  const { items, addToCart, setQty } = useCart()
  const inCart = items.find((i) => i.id === dish.id)

  return (
    <article className={`dish-card ${dish.available ? '' : 'unavailable'}`}>
      <DishImage dish={dish} />
      <div className="dish-body">
        <div className="dish-meta">
          <VegIcon category={dish.category} />
          {DISH_TAGS.filter((t) => dish.tags?.includes(t.key)).map((t) => (
            <span key={t.key} className={`dish-tag ${t.key}`}>{t.label}</span>
          ))}
        </div>
        <h3>{dish.name}</h3>
        <p className="dish-desc">{dish.description}</p>
        <div className="dish-footer">
          <span className="price">₹{dish.price}</span>
          {!dish.available ? (
            <span className="muted small">Currently unavailable</span>
          ) : inCart ? (
            <div className="qty">
              <button onClick={() => setQty(dish.id, inCart.qty - 1)} aria-label="Decrease">−</button>
              <span>{inCart.qty}</span>
              <button onClick={() => setQty(dish.id, inCart.qty + 1)} aria-label="Increase">+</button>
            </div>
          ) : (
            <button className="btn soft small" onClick={() => addToCart(dish)}>
              <Icon name="plus" size={16} /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
