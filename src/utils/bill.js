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
