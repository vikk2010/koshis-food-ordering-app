import { useEffect, useRef, useState } from 'react'
import { routeTracker } from '../utils/route.js'

/**
 * Road route through `points` (in order) for a map. Re-fetches only when a waypoint changes or the
 * first point (the rider) has moved ~150 m. Returns { path, km, minutes, legs } or null.
 */
export default function useRoadRoute(points) {
  const tracker = useRef(null)
  tracker.current ??= routeTracker()
  const [route, setRoute] = useState(null)
  const sig = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|')

  useEffect(() => {
    if (points.length < 2) {
      setRoute(null)
      return undefined
    }
    let live = true
    tracker.current(points).then((r) => live && setRoute(r))
    return () => { live = false }
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  return route
}
