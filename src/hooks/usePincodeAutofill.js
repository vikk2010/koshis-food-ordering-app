import { useEffect, useRef, useState } from 'react'
import { lookupPincode } from '../utils/geo.js'

/**
 * Looks up a 6-digit pincode as it's typed and hands the result to `apply(info)` so the form can fill
 * in city, state and area. Returns { status: 'idle' | 'loading' | 'found' | 'notfound', info }.
 */
export default function usePincodeAutofill(pincode, apply) {
  const [state, setState] = useState({ status: 'idle', info: null })
  const applyRef = useRef(apply)
  applyRef.current = apply

  useEffect(() => {
    if (!/^\d{6}$/.test(pincode || '')) {
      setState({ status: 'idle', info: null })
      return undefined
    }
    let live = true
    setState({ status: 'loading', info: null })
    lookupPincode(pincode).then((info) => {
      if (!live) return
      setState({ status: info ? 'found' : 'notfound', info })
      if (info) applyRef.current(info)
    })
    return () => {
      live = false
    }
  }, [pincode])

  return state
}

/**
 * Fills a field only if it's empty or still holds the value we filled in last time — never overwrites
 * something the person typed themselves.
 */
export function makeAutofill() {
  const filled = {}
  return (current, key, value) => {
    const untouched = !current || current === filled[key]
    if (!value) {
      // New pincode has no clear value: clear what we filled before, keep what the person typed.
      if (current && current === filled[key]) {
        delete filled[key]
        return ''
      }
      return current
    }
    if (!untouched) return current
    filled[key] = value
    return value
  }
}
