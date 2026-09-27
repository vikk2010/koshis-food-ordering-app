export function formatAddress(a) {
  return [a.house, a.area, a.landmark, a.city, a.pincode].filter(Boolean).join(', ')
}
