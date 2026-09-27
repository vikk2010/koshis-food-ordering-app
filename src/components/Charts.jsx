import { useEffect, useRef, useState } from 'react'

// Small, dependency-free charts for the admin Reports screen.
// Single-series marks in the brand colour; text always in text colours; hover/focus tooltips.

/** Rounds up to a clean axis maximum (1, 2, 2.5, 5 × 10^n) and returns 4 tick values. */
function niceTicks(max) {
  if (max <= 0) return [0, 1, 2, 3, 4]
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)
  return [0, 1, 2, 3, 4].map((i) => Math.round(i * step * 100) / 100)
}

const compact = (n) =>
  n >= 100000 ? `${Math.round(n / 1000) / 100}L` : n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(Math.round(n * 100) / 100)

/**
 * Column chart. data = [{ key, label, value, tip: [line, ...] }].
 * `axisFormat` formats y-axis ticks; x labels are thinned to fit.
 */
export function ColumnChart({ data, height = 220, axisFormat = compact, ariaLabel }) {
  const [active, setActive] = useState(null)
  const [ref, width] = useWidth()
  const W = Math.max(260, width) // drawn at real pixel size so text stays 11px on any screen
  const H = height
  const pad = { top: 12, right: 8, bottom: 26, left: 44 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom
  const ticks = niceTicks(Math.max(0, ...data.map((d) => d.value)))
  const top = ticks.at(-1) || 1
  const band = innerW / Math.max(1, data.length)
  const barW = Math.max(4, Math.min(24, band - 6))
  const every = Math.ceil(data.length / Math.floor(innerW / 44)) || 1
  const y = (v) => pad.top + innerH - (v / top) * innerH

  const bar = (x, v) => {
    const h = Math.max(0, (v / top) * innerH)
    if (h === 0) return ''
    const r = Math.min(4, h, barW / 2)
    const x0 = x - barW / 2
    const yb = pad.top + innerH
    const yt = yb - h
    return `M${x0},${yb} V${yt + r} Q${x0},${yt} ${x0 + r},${yt} H${x0 + barW - r} Q${x0 + barW},${yt} ${x0 + barW},${yt + r} V${yb} Z`
  }

  const act = active != null ? data[active] : null
  const actX = active != null ? pad.left + band * active + band / 2 : 0

  return (
    <div className="chart" ref={ref} onPointerLeave={() => setActive(null)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="chart-svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="chart-tick">{axisFormat(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + band * i + band / 2
          return (
            <g
              key={d.key}
              className={`chart-col ${active === i ? 'active' : ''}`}
              tabIndex={0}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${d.label}: ${d.tip?.join(', ') ?? d.value}`}
            >
              <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} className="chart-hit" />
              <path d={bar(x, d.value)} className="chart-bar" />
              {i % every === 0 && (
                <text x={x} y={H - 8} textAnchor="middle" className="chart-tick">{d.label}</text>
              )}
            </g>
          )
        })}
      </svg>
      {act && (
        <div className="chart-tip" style={{ left: `${(actX / W) * 100}%` }} role="status">
          <strong>{act.tip?.[0] ?? act.value}</strong>
          {act.tip?.slice(1).map((l) => <span key={l}>{l}</span>)}
        </div>
      )}
    </div>
  )
}

/** Width of an element in px, kept up to date as it resizes. */
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(600)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

/**
 * Horizontal bar list — label, bar, value. rows = [{ key, label, value, display, sub }].
 * Plain HTML so every number is readable without hovering.
 */
export function BarList({ rows, max, empty = 'No data yet.' }) {
  if (!rows.length) return <p className="empty small">{empty}</p>
  const top = max ?? Math.max(1, ...rows.map((r) => r.value))
  return (
    <ol className="bar-list">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="bar-list-head">
            <span className="bar-list-label">{r.label}</span>
            <span className="bar-list-value">{r.display ?? r.value}</span>
          </div>
          <div className="bar-track" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${Math.max(r.value > 0 ? 2 : 0, (r.value / top) * 100)}%` }} />
          </div>
          {r.sub && <span className="muted small">{r.sub}</span>}
        </li>
      ))}
    </ol>
  )
}
