// Road routes for the delivery maps (free OpenStreetMap routing, no API key).
//
// Uses the OSRM servers run by FOSSGIS (routing.openstreetmap.de), with the OSRM project's demo
// server as a backup. Both ask for light use, so routes are cached and only re-fetched when the
// rider has moved a fair way. If routing is unavailable the maps fall back to a straight line.
import { distanceKm } from './geo.js'

const SERVERS = [
  (pts) => `https://routing.openstreetmap.de/routed-car/route/v1/driving/${pts}?overview=full&geometries=geojson`,
  (pts) => `https://router.project-osrm.org/route/v1/driving/${pts}?overview=full&geometries=geojson`,
]
const cache = new Map()
const key = (points) => points.map((p) => `${p.lng.toFixed(4)},${p.lat.toFixed(4)}`).join(';')

/**
 * Road route through `points` ({ lat, lng }, in order). Resolves
 * { path: [{ lat, lng }], km, minutes, legs: [{ km, minutes }] } or null if no route could be found.
 */
export function fetchRoute(points) {
  if (points.length < 2) return Promise.resolve(null)
  const k = key(points)
  if (!cache.has(k)) {
    const job = (async () => {
      for (const url of SERVERS) {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 8000)
        try {
          const res = await fetch(url(k), { signal: ctrl.signal })
          if (!res.ok) continue
          const route = (await res.json()).routes?.[0]
          if (!route) continue
          return {
            path: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
            km: Math.round(route.distance / 100) / 10,
            // Car times on city roads are close to a delivery bike's; add a little for stops.
            minutes: Math.max(1, Math.round((route.duration / 60) * 1.1)),
            legs: (route.legs || []).map((l) => ({ km: Math.round(l.distance / 100) / 10, minutes: Math.max(1, Math.round((l.duration / 60) * 1.1)) })),
          }
        } catch {
          // try the next server
        } finally {
          clearTimeout(timer)
        }
      }
      return null
    })()
    cache.set(k, job)
    job.then((r) => r || cache.delete(k)) // don't cache failures
  }
  return cache.get(k)
}

/**
 * Keeps a route fresh while the rider moves: returns the cached route unless the start point has
 * moved more than `minMoveKm` since the last request (so we don't ask the server every 15 s).
 */
export function routeTracker(minMoveKm = 0.15) {
  let lastStart = null
  let lastRest = ''
  let last = null
  return async (points) => {
    const [start, ...rest] = points
    const restKey = key(rest)
    const moved = lastStart ? distanceKm(lastStart, start) ?? 0 : Infinity
    if (last && restKey === lastRest && moved < minMoveKm) return last
    const route = await fetchRoute(points)
    if (route) {
      lastStart = start
      lastRest = restKey
      last = route
    }
    return route ?? last
  }
}
