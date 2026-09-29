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
            <div className="qty dish-qty">
              <button onClick={() => setQty(dish.id, inCart.qty - 1)} aria-label={`Remove one ${dish.name}`}>−</button>
              <span aria-live="polite">{inCart.qty}</span>
              <button onClick={() => setQty(dish.id, inCart.qty + 1)} aria-label={`Add one more ${dish.name}`}>+</button>
            </div>
          ) : (
            <button className="dish-add" onClick={() => addToCart(dish)} aria-label={`Add ${dish.name} to cart`}>
              <Icon name="plus" size={18} strokeWidth={2.5} /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
