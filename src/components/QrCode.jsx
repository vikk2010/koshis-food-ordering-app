import { useMemo } from 'react'
import { encodeQr } from '../utils/qr.js'

/** Renders `value` as a QR code (crisp SVG, scales to any size). */
export default function QrCode({ value, size = 200, label = 'QR code' }) {
  const { path, dim } = useMemo(() => {
    const grid = encodeQr(value)
    const quiet = 4 // white border required by scanners
    let d = ''
    grid.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x + quiet} ${y + quiet}h1v1h-1z` }))
    return { path: d, dim: grid.length + quiet * 2 }
  }, [value])

  return (
    <svg className="qr-code" width={size} height={size} viewBox={`0 0 ${dim} ${dim}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={dim} height={dim} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}
