import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import VegIcon from './VegIcon.jsx'
import Icon from './Icon.jsx'

const AUTOPLAY_MS = 5000

// Unsplash photos are saved at card size; ask for a larger crop for the banner.
const bannerSrc = (url = '') =>
  url.startsWith('https://images.unsplash.com/') ? url.replace(/w=\d+&h=\d+/, 'w=1120&h=880').replace(/q=\d+/, 'q=75') : url

const thumbSrc = (url = '') =>
  url.startsWith('https://images.unsplash.com/') ? url.replace(/w=\d+&h=\d+/, 'w=160&h=160') : url

/**
 * Home page banner: a slider of the chef's special dishes, each with an "Order now" button that
 * puts the dish in the cart and goes straight to checkout.
 */
export default function ChefSlider({ dishes }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const { items, addToCart } = useCart()
  const navigate = useNavigate()
  const swipe = useRef(null)
  const count = dishes.length
  const current = Math.min(index, count - 1)

  const go = (i) => setIndex(((i % count) + count) % count)

  // Auto-advance (paused on hover/focus, when the tab is hidden, or if the user prefers less motion).
  useEffect(() => {
    if (count < 2 || paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const t = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count)
    }, AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [count, paused])

  const orderNow = (dish) => {
    if (!items.some((i) => i.id === dish.id)) addToCart(dish)
    navigate('/cart')
  }

  // Swipe left / right on phones.
  const onPointerDown = (e) => { swipe.current = e.clientX }
  const onPointerUp = (e) => {
    if (swipe.current == null) return
    const dx = e.clientX - swipe.current
    swipe.current = null
    if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1))
  }

  return (
    <div
      className="chef-wrap"
      role="region"
      aria-roledescription="carousel"
      aria-label="Chef's specials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
    <div
      className="chef-slider"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { swipe.current = null }}
    >
      <div className="chef-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {dishes.map((d, i) => (
          <article
            key={d.id}
            className="chef-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${d.name}`}
            aria-hidden={i !== current}
          >
            <img src={bannerSrc(d.image)} alt={d.name} loading={i === 0 ? 'eager' : 'lazy'} draggable="false" />
            <div className="chef-shade" aria-hidden="true" />
            <span className="chef-badge"><Icon name="chef" size={16} /> Chef's special</span>
            <div className="chef-info">
              <h2><VegIcon category={d.category} /> {d.name}</h2>
              {d.description && <p>{d.description}</p>}
              <div className="chef-buy">
                <span className="chef-price">₹{d.price}</span>
                <button type="button" className="chef-order" onClick={() => orderNow(d)} tabIndex={i === current ? 0 : -1}>
                  Order now <Icon name="arrow" size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" className="chef-nav prev" onClick={() => go(current - 1)} aria-label="Previous dish">
            <Icon name="arrow" size={20} strokeWidth={2.5} />
          </button>
          <button type="button" className="chef-nav next" onClick={() => go(current + 1)} aria-label="Next dish">
            <Icon name="arrow" size={20} strokeWidth={2.5} />
          </button>
          <div className="chef-dots">
            {dishes.map((d, i) => (
              <button
                key={d.id}
                type="button"
                className={i === current ? 'on' : ''}
                onClick={() => go(i)}
                aria-label={`Show ${d.name}`}
                aria-current={i === current}
              >
                {i === current && !paused && <span key={current} className="chef-progress" style={{ animationDuration: `${AUTOPLAY_MS}ms` }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>

    {count > 1 && (
      <div className={`chef-thumbs ${count > 3 ? 'many' : ''}`} aria-label="Chef's specials">
        {dishes.map((d, i) => (
          <button
            key={d.id}
            type="button"
            className={`chef-thumb ${i === current ? 'on' : ''}`}
            onClick={() => go(i)}
            aria-label={`Show ${d.name}`}
            aria-current={i === current}
          >
            <img src={thumbSrc(d.image)} alt="" loading="lazy" draggable="false" title={count > 3 ? d.name : undefined} />
            <span className="chef-thumb-text">
              <strong>{d.name}</strong>
              <span>₹{d.price}</span>
            </span>
            {i === current && !paused && <span key={current} className="chef-thumb-bar" style={{ animationDuration: `${AUTOPLAY_MS}ms` }} />}
          </button>
        ))}
      </div>
    )}
    </div>
  )
}
