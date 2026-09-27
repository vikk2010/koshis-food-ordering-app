import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useDishes } from '../context/DishContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useRestaurant } from '../context/RestaurantContext.jsx'
import DishCard from '../components/DishCard.jsx'
import CheckoutBar from '../components/CheckoutBar.jsx'
import OfferCards from '../components/OfferCards.jsx'
import Icon from '../components/Icon.jsx'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'veg', label: 'Veg' },
  { key: 'nonveg', label: 'Non-Veg' },
]

// "01 · Home / Menu" screen from Figma.
export default function Menu() {
  const { dishes, sections, ready: menuReady } = useDishes()
  const { restaurant, status } = useRestaurant()
  const { settings, coupons } = useSettings()
  const { hash } = useLocation()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [section, setSection] = useState('all')

  // Scroll to #menu / #offers when arriving from the header or footer links.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  const query = search.trim().toLowerCase()
  const visible = dishes.filter(
    (d) =>
      (tab === 'all' || d.category === tab) &&
      (section === 'all' || d.sectionId === section) &&
      d.name.toLowerCase().includes(query),
  )
  const countFor = (key) => (key === 'all' ? dishes.length : dishes.filter((d) => d.category === key).length)
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
        <div className="hero-art" aria-hidden="true">
          <Icon name="soup" strokeWidth={1.5} />
          <span className="hero-note">
            <Icon name="clock" /> Delivery in ~{settings.deliveryTimeMin} min
          </span>
        </div>
      </div>

      {activeCoupons.length > 0 && <OfferCards coupons={activeCoupons} />}

      <div id="menu" className="section-head">
        <div>
          <h1>Today's menu</h1>
          <p className="muted">Freshly cooked, packed with care</p>
        </div>
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Search dishes…"
            aria-label="Search dishes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.key !== 'all' && <span className={`veg-icon ${t.key}`} aria-hidden="true" />}
            {t.label} <span className="muted">({countFor(t.key)})</span>
          </button>
        ))}
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
        <p className="empty">No dishes found{query ? ` for “${search.trim()}”` : ' in this section'}.</p>
      ) : (
        <div className="grid">
          {visible.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}

      <CheckoutBar />
    </section>
  )
}
