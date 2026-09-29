import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// A small, dependency-free map: OpenStreetMap tiles + our own markers and a dashed route line.
// It fits all the points in view automatically; + / − zoom in and out. Free (no API key) —
// OpenStreetMap asks for light use and the attribution shown in the corner.
const TILE = 256
const TILE_URL = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`

const project = ({ lat, lng }, z) => {
  const scale = TILE * 2 ** z
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  }
}

/** Highest zoom level at which every point fits inside w × h (with padding). */
function fitZoom(points, w, h, pad = 56) {
  if (points.length < 2) return 15
  for (let z = 17; z >= 3; z--) {
    const px = points.map((p) => project(p, z))
    const dx = Math.max(...px.map((p) => p.x)) - Math.min(...px.map((p) => p.x))
    const dy = Math.max(...px.map((p) => p.y)) - Math.min(...px.map((p) => p.y))
    if (dx <= w - pad * 2 && dy <= h - pad * 2) return z
  }
  return 3
}

/**
 * points: [{ lat, lng, kind: 'kitchen' | 'home' | 'rider', label }]
 * path: the road route to draw ([{ lat, lng }], e.g. from utils/route.js) — solid line.
 * route: fallback when there's no road route: point kinds joined by a dashed straight line.
 */
export default function TileMap({ points, path = null, route = [], height = 280, className = '' }) {
  const box = useRef(null)
  const [width, setWidth] = useState(0)
  const [zoomDelta, setZoomDelta] = useState(0)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return undefined
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  // Re-fit when the set of points changes a lot (e.g. the rider's first location arrives).
  const kinds = points.map((p) => p.kind).join(',')
  useEffect(() => setZoomDelta(0), [kinds])

  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  let content = null
  if (width && valid.length) {
    const road = path?.length > 1 ? path : null
    const all = road ? [...valid, ...road] : valid // fit the whole road route in view, not just the pins
    const z = Math.max(3, Math.min(18, fitZoom(all, width, height) + zoomDelta))
    const px = valid.map((p) => ({ ...p, ...project(p, z) }))
    const bounds = all.map((p) => project(p, z))
    const cx = (Math.min(...bounds.map((p) => p.x)) + Math.max(...bounds.map((p) => p.x))) / 2
    const cy = (Math.min(...bounds.map((p) => p.y)) + Math.max(...bounds.map((p) => p.y))) / 2
    const left = cx - width / 2
    const top = cy - height / 2
    const n = 2 ** z
    const tiles = []
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
        if (ty < 0 || ty >= n) continue
        const wx = ((tx % n) + n) % n
        tiles.push(
          <img
            key={`${z}-${tx}-${ty}`}
            src={TILE_URL(z, wx, ty)}
            alt=""
            draggable="false"
            className="tile"
            style={{ left: tx * TILE - left, top: ty * TILE - top }}
          />,
        )
      }
    }
    const byKind = Object.fromEntries(px.map((p) => [p.kind, p]))
    const toXY = (p) => `${(p.x - left).toFixed(1)},${(p.y - top).toFixed(1)}`
    const roadLine = road ? road.map((p) => toXY(project(p, z))) : []
    const line = road ? [] : route.map((k) => byKind[k]).filter(Boolean).map(toXY)
    content = (
      <>
        <div className="tile-layer" aria-hidden="true">{tiles}</div>
        {roadLine.length > 1 && (
          <svg className="tile-route" width={width} height={height} aria-hidden="true">
            <polyline points={roadLine.join(' ')} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
            <polyline points={roadLine.join(' ')} fill="none" stroke="#1f6feb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {line.length > 1 && (
          <svg className="tile-route" width={width} height={height} aria-hidden="true">
            <polyline points={line.join(' ')} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
            <polyline points={line.join(' ')} fill="none" stroke="#d9480f" strokeWidth="3.5" strokeDasharray="2 9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {px.map((p) => (
          <span
            key={p.kind}
            className={`map-pin ${p.kind}`}
            style={{ left: p.x - left, top: p.y - top }}
            title={p.label}
          >
            <span className="map-pin-dot">{PIN_ICONS[p.kind]}</span>
            {p.label && <span className="map-pin-label">{p.label}</span>}
          </span>
        ))}
      </>
    )
  }

  return (
    <div ref={box} className={`tile-map ${className}`} style={{ height }} role="img" aria-label={valid.map((p) => p.label).filter(Boolean).join(', ')}>
      {content}
      <div className="tile-zoom">
        <button type="button" onClick={() => setZoomDelta((d) => d + 1)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => setZoomDelta((d) => d - 1)} aria-label="Zoom out">−</button>
      </div>
      <a className="tile-attrib" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
    </div>
  )
}

const svg = (d) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
)
const PIN_ICONS = {
  // chef hat
  kitchen: svg(<><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" /><path d="M6 17h12" /></>),
  // house
  home: svg(<><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>),
  // bike
  rider: svg(<><circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></>),
}
