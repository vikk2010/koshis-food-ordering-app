// Defaults used until the admin fills in "Restaurant Details".
export const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

export const defaultRestaurant = {
  name: "Koshi's Cloud Kitchen",
  tagline: 'Homestyle food, cooked fresh and delivered hot.',
  about: 'Homestyle food cooked fresh in our cloud kitchen and delivered hot to your door.',
  logo: '', // data URL or image URL; empty = "K" mark
  phone: '',
  email: '',
  whatsapp: '',
  address: { line1: '', area: '', city: '', state: '', pincode: '', mapUrl: '' },
  fssai: '',
  gstin: '',
  upiId: '', // e.g. koshis@okhdfcbank — customers who pick UPI get a QR code for this ID
  upiName: '', // payee name shown in the UPI app; empty = restaurant name
  upiMerchant: false, // true = business UPI ID, so phones get a one-tap "Pay with UPI app" button
  acceptingOrders: true,
  // 24h "HH:MM"; `to` earlier than `from` means the kitchen closes after midnight.
  hours: Object.fromEntries(DAYS.map((d) => [d.key, { open: true, from: '11:00', to: '23:00' }])),
}

// Menu sections shown as filters on the menu and chosen per dish.
export const defaultSections = [
  { id: 's-starters', name: 'Starters' },
  { id: 's-mains', name: 'Main Course' },
  { id: 's-biryani', name: 'Biryani & Rice' },
  { id: 's-south', name: 'South Indian' },
  { id: 's-desserts', name: 'Desserts' },
  { id: 's-drinks', name: 'Beverages' },
]

// Labels an admin can put on a dish; shown as badges on the dish card.
export const DISH_TAGS = [
  { key: 'bestseller', label: 'Bestseller' },
  { key: 'chef', label: "Chef's special" },
  { key: 'new', label: 'New' },
  { key: 'spicy', label: 'Spicy' },
]
