import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useDishes } from '../context/DishContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useRestaurant } from '../context/RestaurantContext.jsx'
import DishCard from '../components/DishCard.jsx'
import CheckoutBar from '../components/CheckoutBar.jsx'
import OfferCards from '../components/OfferCards.jsx'
import Icon from '../components/Icon.jsx'
import HeroIllustration from '../components/HeroIllustration.jsx'
import VegToggle, { matchesFoodType } from '../components/VegToggle.jsx'

// "01 · Home / Menu" screen from Figma.
export default function Menu() {
  const { dishes, sections, ready: menuReady } = useDishes()
  const { restaurant, status } = useRestaurant()
  const { settings, coupons } = useSettings()
  const { hash } = useLocation()
  const [foodType, setFoodType] = useState('all')
  const [search, setSearch] = useState('')
  const [section, setSection] = useState('all')

  // Scroll to #menu / #offers when arriving from the header or footer links.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  const query = search.trim().toLowerCase()
  const visible = dishes.filter(
    (d) =>
      matchesFoodType(d, foodType) &&
      (section === 'all' || d.sectionId === section) &&
      d.name.toLowerCase().includes(query),
  )
  const counts = { veg: dishes.filter((d) => d.category === 'veg').length, nonveg: dishes.filter((d) => d.category !== 'veg').length }
  const availableCount = dishes.filter((d) => d.available).length
  const activeCoupons = coupons.filter((c) => c.active)
  const offer = activeCoupons[0]
  // Only offer section filters that have dishes (in the admin's order).
  const usedSections = sections.filter((s) => dishes.some((d) => d.sectionId === s.id))

  return (
    <section>
      {!status.open && status.reason !== 'loading' && (
        <div className="closed-banner" role="status">
          <Icon name="clock" size={18} /> {status.message}
        </div>
      )}
      <div className="hero">
        <div className="hero-copy">
          <span className="pill-badge">
            <Icon name="leaf" size={14} /> Fresh from {restaurant.name}
          </span>
          <h1>{restaurant.tagline || 'Homestyle food, cooked fresh and delivered hot.'}</h1>
          <p className="hero-lead">
            Biryanis, curries, thalis and more — cooked every day in our cloud kitchen and at your door in
            about {settings.deliveryTimeMin} minutes.
          </p>
          <div className="hero-ctas">
            <a className="btn large" href="#menu">Order now</a>
            {offer && <a className="btn secondary large" href="#offers">View offers</a>}
          </div>
          <div className="hero-stats">
            <div><strong>{settings.deliveryTimeMin} min</strong><span>avg. delivery</span></div>
            <div><strong>{availableCount}</strong><span>dishes today</span></div>
            <div><strong>100%</strong><span>freshly cooked</span></div>
          </div>
        </div>
        <div className="hero-art">
          <HeroIllustration />
          <span className="hero-note">
            <Icon name="clock" /> Delivery in ~{settings.deliveryTimeMin} min
          </span>
        </div>
      </div>

      <section className="hungry" aria-labelledby="hungry-title">
        <h2 id="hungry-title">Feeling hungry?</h2>
        <p className="muted">Find your favourite dish in seconds</p>
        <form
          role="search"
          className="hungry-search"
          onSubmit={(e) => {
            e.preventDefault()
            document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          <Icon name="search" size={22} />
          <input
            type="search"
            placeholder="Search biryani, dosa…"
            aria-label="Search dishes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="hungry-go">Search</button>
        </form>
        {query && (
          <p className="hungry-hint small">
            {visible.length ? `${visible.length} dish${visible.length > 1 ? 'es' : ''} found` : 'No dishes found'} ·{' '}
            <a href="#menu">See results</a>
          </p>
        )}
      </section>

      <div id="menu" className="section-head">
        <div>
          <h1>Today's menu</h1>
          <p className="muted">Freshly cooked, packed with care</p>
        </div>
        {query && (
          <p className="search-note">
            Results for “{search.trim()}” <button type="button" className="text-link" onClick={() => setSearch('')}>Clear</button>
          </p>
        )}
      </div>

      <div className="menu-filters">
        <VegToggle value={foodType} onChange={setFoodType} counts={counts} label="Menu food type" />
      </div>

      {usedSections.length > 1 && (
        <div className="chips section-chips" aria-label="Menu sections">
          <button className={`chip ${section === 'all' ? 'active' : ''}`} onClick={() => setSection('all')}>All sections</button>
          {usedSections.map((s) => (
            <button key={s.id} className={`chip ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {!menuReady && dishes.length === 0 ? (
        <p className="empty">Loading today's menu…</p>
      ) : visible.length === 0 ? (
        <p className="empty">No dishes found{query ? ` for “${search.trim()}”` : foodType !== 'all' ? ` — try turning off the ${foodType === 'veg' ? 'Veg' : 'Non-veg'} filter` : ' in this section'}.</p>
      ) : (
        <div className="grid">
          {visible.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}

      {activeCoupons.length > 0 && <OfferCards coupons={activeCoupons} />}

      <CheckoutBar />
    </section>
  )
}
