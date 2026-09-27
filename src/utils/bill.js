const round2 = (n) => Math.round(n * 100) / 100

export function formatPrice(n) {
  return `₹${Number.isInteger(n) ? n : n.toFixed(2)}`
}

export function couponLabel(c) {
  const off = c.type === 'percent'
    ? `${c.value}% off${c.maxDiscount > 0 ? ` up to ₹${c.maxDiscount}` : ''}`
    : `Flat ₹${c.value} off`
  return c.minOrder > 0 ? `${off} on orders above ₹${c.minOrder}` : off
}

/** Big headline for an offer card: "20% OFF" / "₹50 OFF". */
export const couponHeadline = (c) => (c.type === 'percent' ? `${c.value}% OFF` : `₹${c.value} OFF`)

/** Conditions under the headline: "Up to ₹100 · On orders above ₹300". */
export function couponTerms(c) {
  const parts = []
  if (c.type === 'percent' && c.maxDiscount > 0) parts.push(`Up to ₹${c.maxDiscount}`)
  parts.push(c.minOrder > 0 ? `On orders above ₹${c.minOrder}` : 'On any order')
  return parts.join(' · ')
}

/** Colour themes for offer cards on the home page (chosen per coupon in "Charges & Coupons"). */
export const OFFER_THEMES = [
  { key: 'saffron', label: 'Saffron' },
  { key: 'mint', label: 'Mint green' },
  { key: 'berry', label: 'Berry' },
  { key: 'indigo', label: 'Indigo' },
  { key: 'turmeric', label: 'Turmeric' },
  { key: 'charcoal', label: 'Charcoal' },
]
/** The coupon's theme, or one picked by its position so neighbours differ. */
export const offerTheme = (c, index) =>
  OFFER_THEMES.some((t) => t.key === c.theme) ? c.theme : OFFER_THEMES[Math.max(0, index) % OFFER_THEMES.length].key

/** Returns { discount, error } for a coupon against the current item total. */
export function evaluateCoupon(coupon, itemTotal) {
  if (!coupon) return { discount: 0, error: '' }
  if (itemTotal < coupon.minOrder) {
    return { discount: 0, error: `Add ${formatPrice(round2(coupon.minOrder - itemTotal))} more to use ${coupon.code}` }
  }
  let discount = coupon.type === 'percent' ? (itemTotal * coupon.value) / 100 : coupon.value
  if (coupon.type === 'percent' && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount)
  return { discount: round2(Math.min(discount, itemTotal)), error: '' }
}

/** Full bill breakdown. GST applies to (item total − discount + packaging). */
export function calcBill(items, settings, discount = 0) {
  const itemTotal = round2(items.reduce((sum, i) => sum + i.price * i.qty, 0))
  const packaging = settings.packagingCharge
  const freeDelivery = settings.freeDeliveryAbove > 0 && itemTotal >= settings.freeDeliveryAbove
  const delivery = freeDelivery ? 0 : settings.deliveryCharge
  const platformFee = settings.platformFee
  const gst = round2(((itemTotal - discount + packaging) * settings.gstPercent) / 100)
  const grandTotal = round2(itemTotal - discount + packaging + delivery + platformFee + gst)
  return { itemTotal, discount, packaging, delivery, freeDelivery, platformFee, gst, grandTotal }
}
