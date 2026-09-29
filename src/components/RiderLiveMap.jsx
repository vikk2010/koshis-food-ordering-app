import TileMap from './TileMap.jsx'
import Icon from './Icon.jsx'
import useRoadRoute from '../hooks/useRoadRoute.js'
import { distanceKm, mapsLink } from '../utils/geo.js'

const FRESH_MS = 10 * 60 * 1000 // hide the rider's dot if their phone hasn't reported for 10 minutes

function ago(ms, now) {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`
}

/**
 * Customer tracking page, once a rider has the order: a live map with the kitchen, the customer's
 * address, the rider's position (sent from the rider's phone every ~15 s) and the road route
 * the rider will take (rider → kitchen → home while the food is cooking, rider → home once picked up).
 */
export default function RiderLiveMap({ order, restaurant, now }) {
  const rider = order.rider
  const first = rider.name?.split(' ')[0] || 'Your rider'
  const home = order.address?.location
  const kitchen = restaurant.location
  const loc = order.riderLocation
  const live = loc && now - loc.at < FRESH_MS ? { lat: loc.lat, lng: loc.lng } : null
  const onTheWay = order.status === 'out'

  const points = [
    kitchen && { ...kitchen, kind: 'kitchen', label: 'Kitchen' },
    home && { ...home, kind: 'home', label: order.address?.label || 'You' },
    live && { ...live, kind: 'rider', label: first },
  ].filter(Boolean)
  const kinds = onTheWay ? (live ? ['rider', 'home'] : ['kitchen', 'home']) : ['rider', 'kitchen', 'home']
  const byKind = Object.fromEntries(points.map((p) => [p.kind, p]))
  const waypoints = kinds.map((k) => byKind[k]).filter(Boolean)
  const road = useRoadRoute(waypoints)

  if (!points.length) return null

  // Distance / time for the rider's next stop: by road when we have the route, else straight line.
  const target = onTheWay ? home : kitchen
  const leg = live && road ? road.legs?.[0] : null
  const away = leg ? leg.km : live && target ? distanceKm(live, target) : null

  let caption
  if (live) {
    const eta = leg ? ` · about ${leg.minutes} min` : ''
    caption = onTheWay
      ? <><strong>{first}</strong> is {away != null ? <strong>{away < 0.2 ? 'almost there' : `${away} km away${eta}`}</strong> : 'on the way'}</>
      : <><strong>{first}</strong> is heading to the kitchen{away != null && away >= 0.2 ? ` · ${away} km${eta}` : ''}</>
  } else {
    caption = loc
      ? <>{first}'s location was last updated {ago(loc.at, now)}</>
      : <>Waiting for {first}'s live location…</>
  }

  return (
    <div className="live-map">
      <TileMap points={points} path={road?.path} route={kinds} height={300} />
      <div className="live-map-bar">
        <span className={`live-dot ${live ? 'on' : ''}`} aria-hidden="true" />
        <span className="live-map-text">
          {caption}
          {live && <span className="muted small"> · updated {ago(loc.at, now)}</span>}
          {road && !live && <span className="muted small"> · {road.km} km by road from the kitchen</span>}
        </span>
        {live && home && (
          <a className="text-link small" href={mapsLink(home, live)} target="_blank" rel="noreferrer">
            <Icon name="pin" size={14} /> Google Maps
          </a>
        )}
      </div>
    </div>
  )
}
