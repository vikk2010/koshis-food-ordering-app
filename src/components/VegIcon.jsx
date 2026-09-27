// Standard Indian veg / non-veg indicator: green or red dot in a square.
export default function VegIcon({ category }) {
  const label = category === 'veg' ? 'Vegetarian' : 'Non-vegetarian'
  return <span className={`veg-icon ${category}`} title={label} aria-label={label} />
}
