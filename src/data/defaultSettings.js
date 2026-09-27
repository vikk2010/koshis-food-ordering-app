// Defaults used until the admin changes them in "Charges & Coupons".
export const defaultSettings = {
  deliveryTimeMin: 30, // minutes
  packagingCharge: 20, // ₹ per order
  deliveryCharge: 40, // ₹ per order
  freeDeliveryAbove: 499, // ₹ item total for free delivery (0 = never free)
  platformFee: 5, // ₹ per order
  gstPercent: 5, // % on (item total − discount + packaging)
}

export const defaultCoupons = [
  { id: 'c1', code: 'WELCOME50', type: 'flat', value: 50, minOrder: 199, maxDiscount: 0, active: true },
  { id: 'c2', code: 'SAVE20', type: 'percent', value: 20, minOrder: 300, maxDiscount: 100, active: true },
]
