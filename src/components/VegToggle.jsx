import { useRef } from 'react'

const ORDER = ['veg', 'all', 'nonveg']
const TEXT = { veg: 'Veg only', all: 'All dishes', nonveg: 'Non-veg only' }

/**
 * One food-type switch: slide left for Veg, right for Non-veg, middle for everything.
 * Tap a label (or that side of the switch), drag the knob, or use the arrow keys.
 * `value` is 'all' | 'veg' | 'nonveg'.
 */
export default function VegToggle({ value, onChange, counts, label = 'Food type' }) {
  const track = useRef(null)
  const drag = useRef(null) // x where the current press started
  const pos = ORDER.indexOf(value)

  // Where on the switch the pointer is: left third = veg, right third = non-veg, middle = all.
  const pick = (clientX) => {
    const r = track.current.getBoundingClientRect()
    const x = (clientX - r.left) / r.width
    onChange(x < 0.36 ? 'veg' : x > 0.64 ? 'nonveg' : 'all')
  }
  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = e.clientX
    // A tap on the side that's already on switches back to all.
    const r = track.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const side = x < 0.36 ? 'veg' : x > 0.64 ? 'nonveg' : 'all'
    onChange(side === value && side !== 'all' ? 'all' : side)
  }
  // Dragging the knob (ignores the small wobble of a tap).
  const onPointerMove = (e) => {
    if (drag.current != null && Math.abs(e.clientX - drag.current) > 8) pick(e.clientX)
  }
  const onPointerUp = () => { drag.current = null }
  const onKeyDown = (e) => {
    const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key]
    if (step) {
      e.preventDefault()
      onChange(ORDER[Math.max(0, Math.min(2, pos + step))])
    } else if (e.key === 'Home') onChange('veg')
    else if (e.key === 'End') onChange('nonveg')
  }
  const side = (key, text) => (
    <button
      type="button"
      className={`food-switch-label ${key} ${value === key ? 'on' : ''}`}
      onClick={() => onChange(value === key ? 'all' : key)}
      aria-pressed={value === key}
    >
      <span className={`veg-icon ${key}`} aria-hidden="true" />
      {text}
      {counts && <span className="food-switch-count">{counts[key]}</span>}
    </button>
  )

  return (
    <div className={`food-switch is-${value}`}>
      {side('veg', 'Veg')}
      <div
        ref={track}
        className="food-switch-track"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={pos}
        aria-valuetext={TEXT[value]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <span className="food-switch-knob">
          {value === 'all' ? <span className="food-switch-all">ALL</span> : <span className={`veg-icon ${value}`} />}
        </span>
      </div>
      {side('nonveg', 'Non-veg')}
    </div>
  )
}

export const matchesFoodType = (dish, type) => type === 'all' || dish.category === type
