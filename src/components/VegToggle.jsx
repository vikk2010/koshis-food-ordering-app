/**
 * Veg / Non-veg toggle switches (food-app style). Turning one on turns the other off;
 * both off = show everything. `value` is 'all' | 'veg' | 'nonveg'.
 */
export default function VegToggle({ value, onChange, counts, label = 'Food type' }) {
  const item = (key, text) => {
    const on = value === key
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`veg-toggle ${key} ${on ? 'on' : ''}`}
        onClick={() => onChange(on ? 'all' : key)}
      >
        <span className="veg-toggle-track" aria-hidden="true">
          <span className="veg-toggle-knob"><span className={`veg-icon ${key}`} /></span>
        </span>
        <span>{text}{counts && <span className="muted"> ({counts[key]})</span>}</span>
      </button>
    )
  }
  return (
    <div className="veg-toggles" role="group" aria-label={label}>
      {item('veg', 'Veg')}
      {item('nonveg', 'Non-veg')}
    </div>
  )
}

export const matchesFoodType = (dish, type) => type === 'all' || dish.category === type
