import { RANGE_PRESETS, toDateInput } from '../utils/reports.js'

/**
 * Date-range control: preset dropdown (Today, Yesterday, Last 7 days, This month…) plus
 * from/to date fields for "Custom dates". `value` = { preset, from, to }.
 */
export default function RangePicker({ value, onChange, presets = RANGE_PRESETS }) {
  const today = toDateInput(Date.now())
  return (
    <div className="range-picker">
      <select
        value={value.preset}
        onChange={(e) => onChange({ ...value, preset: e.target.value })}
        aria-label="Date range"
      >
        {presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      {value.preset === 'custom' && (
        <>
          <input type="date" value={value.from} max={value.to || today} onChange={(e) => onChange({ ...value, from: e.target.value })} aria-label="From date" />
          <span className="muted small">to</span>
          <input type="date" value={value.to} min={value.from} max={today} onChange={(e) => onChange({ ...value, to: e.target.value })} aria-label="To date" />
        </>
      )}
    </div>
  )
}

export const defaultRange = (preset = '7d') => {
  const today = toDateInput(Date.now())
  return { preset, from: today, to: today }
}
