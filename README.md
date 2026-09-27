# Koshis — Online Food Ordering (React + Vite)

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Features

- **Home / Menu** (`/`): hero, **All / Veg / Non-Veg** filters, search, add-to-cart, and an offer
  banner that shows the first active coupon.
- **Cart / Checkout** (`/cart`, login required; cart icon shown only when logged in): veg/non-veg
  icon and 2-line description per item, add more items, note for the restaurant, coupons,
  delivery now or in a scheduled slot, saved delivery addresses, payment method (UPI / card /
  cash on delivery), and an order summary (item total, packaging, delivery, platform fee, GST,
  grand total).
- **Order tracking** (`/orders/:id`, login required): opened after placing an order and from
  "Track order" in the header. Shows the ETA, progress steps and order details. Progress is
  simulated from the clock (`src/utils/delivery.js`) until a backend sends real status updates.
- **Login** (`/login`): mobile number + OTP. Guests can add dishes freely; they are asked to log in when they tap Place Order.
- **Admin panel** (open `/admin` directly - not linked in the header; demo password `admin123`):
  - Add, edit and delete dishes
  - Set name, category (veg / non-veg), price and description
  - Upload an image (resized in the browser) or paste an image URL
  - Mark a dish available or unavailable
  - **Charges & Coupons** (`/admin/settings`): delivery time, packaging charges, delivery
    charges, free-delivery threshold, platform fee, GST %, and coupons (flat ₹ / % off,
    minimum order, max discount, active on/off)
  - **Menu Sections** (`/admin/sections`): add, rename, reorder and delete sections (Starters,
    Main Course…). Each dish gets a section and optional labels (Bestseller, Chef's special,
    New, Spicy) in the dish form; customers see section filters and label badges on the menu.
  - **Restaurant Details** (`/admin/restaurant`): name, logo, tagline, about, phone, WhatsApp,
    email, address, FSSAI licence, GSTIN, weekly opening hours and an "Accepting orders" switch.
    The footer shows these details; outside opening hours (or when orders are paused) the menu
    shows a closed banner and checkout only allows a scheduled slot inside opening hours.

Set a different admin password with a `.env` file: `VITE_ADMIN_PASSWORD=yourpassword`.

## Design (Figma)

Screens and components live in Figma:
https://www.figma.com/design/LSg0O5c7eDAKWJ2DDrUYpk/Koshis

- Colours and fonts in `src/index.css` (`:root`) match the **Koshis Tokens** variables and text
  styles in Figma (Poppins for headings, Inter for body). Change them in both places.
- Figma components map to code: Site Header → `Navbar.jsx`, Site Footer → `Footer.jsx`,
  Dish Card → `DishCard.jsx`, Cart Item → the item rows in `pages/Cart.jsx`.
- Screens: 01 Home / Menu → `pages/Menu.jsx`, 02 Cart & Checkout → `pages/Cart.jsx`,
  03 Order Tracking → `pages/TrackOrder.jsx`.
- Admin screens (page **Koshis – Admin**): 04 Restaurant Details → `pages/admin/AdminRestaurant.jsx`,
  05 Menu Sections → `pages/admin/AdminSections.jsx`, 06 Add / Edit Dish → `pages/admin/DishForm.jsx`.

## Phone OTP login

Without configuration the app runs in **demo mode**: no SMS is sent and the OTP is shown
on the verify screen.

To send real SMS OTPs with Firebase Phone Auth:

1. Create a project at https://console.firebase.google.com and add a **Web app**.
2. **Authentication → Sign-in method → Phone**: enable it.
3. **Authentication → Settings → Authorized domains**: make sure `localhost` (and your
   production domain) are listed.
4. Copy `.env.example` to `.env`, fill in the `VITE_FIREBASE_*` values from the web app
   config, and restart `npm run dev`.

For testing without using SMS quota, add test numbers and fixed codes under
**Authentication → Sign-in method → Phone → Phone numbers for testing**.
Phone auth needs the Firebase **Blaze** (pay-as-you-go) plan for real SMS.

The OTP logic lives in `src/services/otp.js`; to use another provider (MSG91, Twilio, etc.)
replace `sendOtp` / `verifyOtp` there. Those providers require a backend to keep API keys secret.

## Structure

```
src/
  context/     DishContext (menu CRUD), CartContext, AuthContext, UserContext, SettingsContext,
               RestaurantContext (profile, hours), OrderContext (placed orders)
  components/  Navbar, Footer, Logo, Icon, DishCard, DishImage, VegIcon, AddressForm,
               CheckoutBar, ProtectedRoute, RequireUser
  pages/       Menu, Cart, TrackOrder, Login
  pages/admin/ AdminLogin, AdminDashboard, AdminSettings, AdminSections, AdminRestaurant, DishForm
  data/        seedDishes.js (initial menu), defaultSettings.js, defaultRestaurant.js (profile, sections, labels)
  utils/       storage.js, hours.js (open / closed), image.js, bill.js, address.js, delivery.js (slots, payment, progress)
```

## Notes before production

UPI / card payment is only recorded on the order — connect a payment gateway (for example
Razorpay) before taking real payments.

Data is stored in the browser's `localStorage`, so each browser has its own menu, and the
admin password ships in the client bundle. For a real deployment, replace `DishContext`
and `AuthContext` with calls to a backend API (for example Node/Express, Firebase or
Supabase) that stores dishes, images and orders and handles admin authentication.
