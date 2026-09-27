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
- **Login** (`/login`): Continue with Google + mobile number (demo mode: mobile number + OTP). Guests can add dishes freely; they are asked to log in when they tap Place Order.
- **Admin panel** (open `/admin` directly - not linked in the header; Sign in with Google, or the
  demo password `admin123` when Firebase isn't configured):
  - **Orders** (`/admin/orders`, opens after login): every order with order number, date and
    time, customer name and phone, items, delivery (now / scheduled), payment and total. Filter by
    Today / Yesterday / Last 7 days / All and search by order #, phone or name. New orders are
    highlighted, counted in the tab title and on the Orders tab. Click an order for full details
    (address, note, bill, Call / WhatsApp buttons) and **Print ticket** for the kitchen.
  - **Desktop notifications**: click **Enable notifications** on the Orders page once. Every new
    order then shows a desktop notification with a chime (sound can be switched off), plus an
    in-page toast. Keep the admin panel open in a browser tab — it can be in the background or
    minimised. Clicking the notification opens that order.
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

## Firebase (login + orders)

The Firebase project is **koshis-cloud-kitchen** (Firestore in `asia-south1` Mumbai, free Spark
plan). Its web config is in `src/config/firebaseConfig.js` (safe to commit — these values are
public; security comes from `firestore.rules`). Set `VITE_DEMO_MODE=true` in a `.env` file to run
without Firebase.

- **Customer login**: "Continue with Google", then name + mobile number for delivery. Free and
  unlimited. The mobile number is not OTP-verified.
- **Admin login** (`/admin/login`): "Sign in with Google". Only Google accounts whose UID has a
  document in the Firestore **admins** collection get in. The first time, the login page shows
  your UID — in the Firebase console open **Firestore → Data → Start collection**, name it
  `admins`, use the UID as the document ID and add any field (e.g. `name: Vikash`).
- **Orders** are saved to the Firestore `orders` collection and appear live in the admin panel on
  any device. Access is controlled by `firestore.rules` (already published; paste it again under
  **Firestore → Rules** if you change it).
- **Authorized domains**: `localhost` works out of the box. When you host the site, add its domain
  under **Authentication → Settings → Authorized domains**.
- **Free limits** (Spark): 50K document reads / 20K writes per day, 1 GiB stored.

In demo mode orders stay in the browser's localStorage, so the admin panel only sees
orders placed in the same browser.

Desktop notifications use the browser Notification API, so they arrive while the admin panel is
open in a tab. To be notified with the browser closed (or on a phone), add Firebase Cloud
Messaging with a service worker and a Cloud Function that fires when an order is created.

## Optional: SMS OTP login

In demo mode the app uses phone + OTP with the code shown on screen (no SMS is sent).

To send real SMS OTPs instead of Google login, set `VITE_LOGIN_METHOD=phone` in `.env` and:

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
               RestaurantContext (profile, hours), OrderContext (placed orders),
               AdminOrdersContext (live order feed + notifications)
  components/  Navbar, Footer, Logo, Icon, DishCard, DishImage, VegIcon, AddressForm,
               CheckoutBar, ProtectedRoute, RequireUser
  pages/       Menu, Cart, TrackOrder, Login
  pages/admin/ AdminLogin, AdminOrders, AdminOrderDetail, AdminDashboard, AdminSettings, AdminSections, AdminRestaurant, DishForm
  data/        seedDishes.js (initial menu), defaultSettings.js, defaultRestaurant.js (profile, sections, labels)
  services/    firebase.js (shared setup), customerAuth.js (Google login), otp.js (phone OTP), orderStore.js (orders → kitchen)
  utils/       storage.js, hours.js (open / closed), notify.js (desktop alerts), orders.js, image.js, bill.js, address.js, delivery.js (slots, payment, progress)
```

## Notes before production

UPI / card payment is only recorded on the order — connect a payment gateway (for example
Razorpay) before taking real payments.

Data is stored in the browser's `localStorage`, so each browser has its own menu, and the
admin password ships in the client bundle. For a real deployment, replace `DishContext`
and `AuthContext` with calls to a backend API (for example Node/Express, Firebase or
Supabase) that stores dishes, images and orders and handles admin authentication.
