// Locations and delivery distance.
//
// Distances are straight-line ("as the crow flies"), so real road distance is usually a bit longer.
// Addresses are turned into map positions with OpenStreetMap's free Nominatim service
// (no key needed; light use only — about one lookup per saved address).

const round = (n, d = 5) => Math.round(n * 10 ** d) / 10 ** d

/** Straight-line distance in km between two { lat, lng } points. */
export function distanceKm(a, b) {
  if (!a || !b) return null
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10
}

const valid = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)

/**
 * Reads coordinates from text: "12.9716, 77.5946", or a full Google Maps link that contains them
 * (…/@12.97,77.59,17z, ?q=12.97,77.59, !3d12.97!4d77.59). Returns { lat, lng } or null.
 * Short share links (maps.app.goo.gl/…) don't contain coordinates.
 */
export function parseCoords(text = '') {
  const t = decodeURIComponent(String(text))
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query|destination|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m) {
      const lat = Number(m[1])
      const lng = Number(m[2])
      if (valid(lat, lng)) return { lat: round(lat), lng: round(lng) }
    }
  }
  return null
}

export const formatCoords = (loc) => (loc ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : '')

/** Google Maps link for a point (or directions between two points). */
export const mapsLink = (to, from) =>
  from
    ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${to.lat},${to.lng}`

/** Google Maps search link for an address that has no coordinates. */
export const mapsSearchLink = (text) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`

/** The device's current position (asks the user for permission). Rejects with a user-facing message. */
export function currentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('This browser cannot share your location.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: round(p.coords.latitude), lng: round(p.coords.longitude), accuracy: Math.round(p.coords.accuracy) }),
      (err) =>
        reject(new Error(err.code === 1
          ? 'Location permission was denied. Allow location for this site in your browser settings and try again.'
          : 'Could not get your location. Please try again.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  })
}

async function nominatim(path) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 7000)
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/${path}`, {
      signal: ctrl.signal,
      headers: { 'Accept-Language': 'en' },
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Finds the map position of an address ({ house, area, landmark, city, pincode, state }).
 * Tries the full locality first, then just pincode + city. Resolves { lat, lng } or null.
 */
export async function geocodeAddress(a) {
  const attempts = [
    [a.area, a.city, a.state, a.pincode],
    [a.landmark, a.area, a.city],
    [a.pincode, a.city],
    [a.pincode],
  ]
  const tried = new Set()
  for (const parts of attempts) {
    const q = parts.filter(Boolean).join(', ')
    if (!q || tried.has(q)) continue
    tried.add(q)
    const list = await nominatim(`search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`)
    if (list?.[0]) return { lat: round(Number(list[0].lat)), lng: round(Number(list[0].lon)) }
  }
  return null
}

/** Area, city and pincode for a point — used to pre-fill the address form. */
export async function reverseGeocode({ lat, lng }) {
  const r = await nominatim(`reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`)
  const a = r?.address
  if (!a) return null
  return {
    area: [a.road, a.neighbourhood || a.suburb].filter(Boolean).join(', '),
    city: a.city || a.town || a.village || a.county || '',
    pincode: (a.postcode || '').replace(/\D/g, '').slice(0, 6),
    state: a.state || '',
  }
}

// ------------------------------------------------------------------ pincode lookup

const pinCache = new Map()
const cleanPO = (name = '') => name.replace(/\s*\((?:[^)]*)\)\s*$/, '').replace(/\s+(S\.?O|B\.?O|H\.?O|G\.?P\.?O)\.?$/i, '').trim()

/**
 * Looks up an Indian pincode. Resolves { city, state, areas, location } or null if it doesn't exist.
 * India Post's public API gives the state and the post-office areas; OpenStreetMap gives the modern
 * city name ("Bengaluru" rather than "Bangalore") and an approximate map position.
 */
export function lookupPincode(pin) {
  if (!/^[1-9]\d{5}$/.test(pin)) return Promise.resolve(null)
  if (!pinCache.has(pin)) {
    const post = fetch(`https://api.postalpincode.in/pincode/${pin}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j?.[0]?.Status === 'Success' ? j[0].PostOffice || [] : []))
      .catch(() => [])
    const osm = nominatim(`search?format=jsonv2&limit=1&countrycodes=in&addressdetails=1&postalcode=${pin}`).then((l) => l?.[0] || null)
    const result = Promise.all([post, osm]).then(([offices, place]) => {
      const a = place?.address || {}
      if (!offices.length && !place) return null
      const first = offices[0] || {}
      const areas = [...new Set([a.suburb, a.neighbourhood, ...offices.map((o) => cleanPO(o.Name))].filter(Boolean))]
      return {
        city: a.city || a.town || first.District || a.state_district || '',
        state: first.State || a.state || '',
        areas,
        // Only suggest an area when it's unambiguous (the map's locality, or a single post office).
        area: a.suburb || a.neighbourhood || (offices.length === 1 ? cleanPO(first.Name) : ''),
        location: place ? { lat: round(Number(place.lat)), lng: round(Number(place.lon)) } : null,
      }
    })
    pinCache.set(pin, result)
    result.then((r) => r || pinCache.delete(pin)) // don't cache failures (e.g. offline)
  }
  return pinCache.get(pin)
}
