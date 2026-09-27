import { useState } from 'react'
import DishCard from './DishCard.jsx'
import Icon from './Icon.jsx'
import VegToggle, { matchesFoodType } from './VegToggle.jsx'

const isStarters = (s) => s.id === 's-starters' || /starter|snack|appeti/i.test(s.name)
// Hearty sharing dishes for a family meal: mains, curries, biryani, rice, thalis.
const isFamily = (s) => ['s-mains', 's-biryani'].includes(s.id) || /main|curr|biryani|rice|thali|combo|meal/i.test(s.name)

/**
 * Home page "Explore more": Offers · Plan a party · Family time.
 * Party and Family time open a row of dishes right below the tiles.
 */
export default function ExploreMore({ dishes, sections, offerCount }) {
  const [open, setOpen] = useState(null) // 'party' | 'family' | null
  const [familyType, setFamilyType] = useState('veg')

  const inSections = (test) => {
    const ids = new Set(sections.filter(test).map((s) => s.id))
    return dishes.filter((d) => ids.has(d.sectionId))
  }
  const partyDishes = inSections(isStarters)
  const familyAll = inSections(isFamily)
  const familyBase = familyAll.length ? familyAll : dishes
  const familyDishes = familyBase.filter((d) => matchesFoodType(d, familyType))

  const toggle = (key) => setOpen((o) => (o === key ? null : key))
  const tiles = [
    {
      key: 'offers', icon: 'tag', title: 'Offers', theme: 't-offers',
      text: offerCount ? `${offerCount} offer${offerCount > 1 ? 's' : ''} for you today` : 'Deals and coupon codes',
      onClick: () => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' }),
    },
    { key: 'party', icon: 'party', title: 'Plan a party', theme: 't-party', text: 'Starters for the whole crowd', onClick: () => toggle('party') },
    { key: 'family', icon: 'home', title: 'Family time', theme: 't-family', text: 'Hearty meals everyone loves', onClick: () => toggle('family') },
  ]

  return (
    <section className="explore" aria-labelledby="explore-title">
      <div className="section-head">
        <div>
          <h1 id="explore-title">Explore more</h1>
          <p className="muted">Pick what you're in the mood for</p>
        </div>
      </div>

      <div className="explore-tiles">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`explore-tile ${t.theme} ${open === t.key ? 'active' : ''}`}
            onClick={t.onClick}
            aria-expanded={t.key === 'offers' ? undefined : open === t.key}
          >
            <span className="explore-icon"><Icon name={t.icon} size={26} /></span>
            <span className="explore-text">
              <strong>{t.title}</strong>
              <span>{t.text}</span>
            </span>
            <span className="explore-arrow" aria-hidden="true">{t.key === 'offers' ? '↓' : open === t.key ? '−' : '+'}</span>
          </button>
        ))}
      </div>

      {open === 'party' && (
        <div className="explore-panel">
          <div className="explore-panel-head">
            <div>
              <h2>Plan a party</h2>
              <p className="muted small">Starters to share — add a few of each for your guests.</p>
            </div>
            <button type="button" className="text-link" onClick={() => setOpen(null)}>Close</button>
          </div>
          {partyDishes.length ? (
            <div className="explore-row">{partyDishes.map((d) => <DishCard key={d.id} dish={d} />)}</div>
          ) : (
            <p className="empty small">No starters on the menu yet — check back soon.</p>
          )}
        </div>
      )}

      {open === 'family' && (
        <div className="explore-panel">
          <div className="explore-panel-head">
            <div>
              <h2>Family time</h2>
              <p className="muted small">Mains, curries and biryanis to share at the table.</p>
            </div>
            <div className="explore-panel-actions">
              <VegToggle
                value={familyType}
                onChange={setFamilyType}
                label="Family time food type"
                counts={{ veg: familyBase.filter((d) => d.category === 'veg').length, nonveg: familyBase.filter((d) => d.category !== 'veg').length }}
              />
              <button type="button" className="text-link" onClick={() => setOpen(null)}>Close</button>
            </div>
          </div>
          {familyDishes.length ? (
            <div className="explore-row">{familyDishes.map((d) => <DishCard key={d.id} dish={d} />)}</div>
          ) : (
            <p className="empty small">No {familyType === 'veg' ? 'veg' : familyType === 'nonveg' ? 'non-veg' : ''} dishes here yet.</p>
          )}
        </div>
      )}
    </section>
  )
}
