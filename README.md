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
    Add the restaurant's **UPI ID** here to offer "Pay by UPI QR code" at checkout.
  - **Reports** (`/admin/reports`): sales by day, most ordered dishes, busiest hours and days,
    repeat customers, payment methods, order status, coupons used and dishes nobody ordered, for
    any date range (today, yesterday, last 7 / 30 days, this or last month, custom dates).
  - **Export orders**: on Orders and Reports, download every order in a date range as a CSV
    spreadsheet (opens in Excel / Google Sheets).
  - **Delivery area** (Restaurant Details → Kitchen location & delivery area): pin the kitchen (use your
    current location, find it from the address, or paste coordinates / a full Google Maps link) and set
    "Deliver up to N km" (default 20). Customers' addresses are pinned from their phone's location or looked
    up from the address text (OpenStreetMap Nominatim, free). Each order records its straight-line distance;
    orders outside the area are flagged on the Orders page with a **Cancel — too far** button (also on the order
    page, at any stage — even if it was marked delivered by mistake), which shows the customer an apology.
    Checkout won't let customers place an order for an address outside the area.
  - **Pincode autofill** (customer address form and Restaurant Details): typing a 6-digit pincode fills in
    city, state and — when it's clear-cut — the area, and suggests the pincode's localities for the Area field.
    Uses India Post's free pincode API plus OpenStreetMap (no keys). It never overwrites something the person
    typed, and shows "Pincode not found" for invalid codes. The pincode's centre is also the fallback map
    position for delivery distance when an address can't be located more precisely.
  - **Order status** (`/admin/orders` and each order page): every order starts as *Waiting to accept*.
    UPI orders: **Payment received** (after checking your UPI app) → **Start preparing** →
    **Out for delivery** → **Mark delivered**. Cash on delivery skips the payment step. Orders can
    also be cancelled. The customer's tracking page updates live and shows "Waiting for the
    restaurant to accept your order" (plus the UPI QR code) until the order is accepted.
- **Delivery partners (riders)** — stage 1, added Oct 2026:
  - **Sign-up** at `/rider` (also linked as "Deliver with us" in the footer): sign in with Google, then name,
    mobile and bike number. New riders wait for approval. Riders you add yourself under **Admin → Riders**
    (by their Gmail address) are approved automatically when they sign in.
  - **Admin → Riders**: approve or reject new sign-ups, disable / enable / delete riders, see each rider's
    deliveries today and in total, what they're delivering now, and the cash they're holding — tap
    **Received** when they hand it over.
  - **How an order reaches a rider**: when you tap **Start preparing**, every approved rider gets the order
    on their screen (with a chime and a notification) showing only the area, distance, amount and payment
    type. The first rider to tap **Accept delivery** gets it — the database refuses anyone else. Only then do
    they see the customer's name, phone, address and a Google Maps route.
  - **Rider steps**: **Picked up from kitchen** (order becomes *Out for delivery*) → **Mark as delivered**. For
    cash on delivery the rider taps **Collect ₹… & deliver**, which shows your UPI QR code and the amount;
    then **Received cash** or **Paid by UPI**. The order is marked paid.
  - **On each admin order page** a **Delivery** card shows who's delivering and when they accepted /
    picked up / delivered, or "Offered to N riders · waiting X min". You can **assign a rider yourself**,
    **remove a rider** (the order is offered to everyone again), or **send to riders** for orders accepted
    earlier. If nobody accepts within 5 minutes you get an alert. The Orders table shows the rider's name or
    "Finding rider".
  - **Customers** see their delivery partner's name, bike number and a Call button on the tracking page.
  - **Alerts need the rider page open** (in the phone's browser, screen on). Alerts on a locked phone need
    push notifications — stage 2 (Firebase Cloud Messaging on the Blaze plan).

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

## Firebase (all data)

The Firebase project is **koshis-cloud-kitchen** (Firestore in `asia-south1` Mumbai, free Spark
plan). Its web config is in `src/config/firebaseConfig.js` (safe to commit — these values are
public; security comes from `firestore.rules`). Set `VITE_DEMO_MODE=true` in a `.env` file to run
without Firebase.

Everything shared lives in Firestore, so every customer on every device sees the same data and
admin changes show up live:

| Firestore path | What | Who can change it |
| --- | --- | --- |
| `config/restaurant` | name, logo, contact, address, hours, UPI ID, "Accepting orders" | admins |
| `config/settings` | delivery time and charges | admins |
| `config/coupons` | coupons | admins |
| `config/sections` | menu sections, in order | admins |
| `dishes/{id}` | one document per dish (image stored inside, max ~1 MB) | admins |
| `orders/{id}` | orders and their status | customer creates, admins update |
| `customers/{uid}` | a customer's saved addresses | that customer |
| `admins/{uid}` | admin allowlist | only in the Firebase console |
| `riders/{uid}` | delivery partners (name, email, mobile, bike number, status) | rider registers; admins approve / disable / delete |
| `riderInvites/{email}` | riders added by the admin who haven't signed in yet | admins |
| `deliveryJobs/{orderId}` | what riders see before accepting (no customer details); who took it | admins create; the first rider claims it |

Only the cart, the login session and admin notification preferences stay in the browser.

- **First admin sign-in**: the admin panel uploads the menu, restaurant details, charges and
  coupons to Firestore once — the ones saved in that browser by the older version of the app, or
  the defaults. Check Restaurant Details afterwards.
- **Security rules**: after changing `firestore.rules`, paste it into **Firestore Database → Rules**
  and click **Publish**. The app needs the current rules to read the menu. **The rider module needs the
  rules from October 2026** — without them riders can't register or accept orders.
- **Customer login**: "Continue with Google", then name + mobile number for delivery. Free and
  unlimited. The mobile number is not OTP-verified.
- **Admin login** (`/admin/login`): "Sign in with Google". Only Google accounts whose UID has a
  document in the Firestore **admins** collection get in. The first time, the login page shows
  your UID — in the Firebase console open **Firestore → Data → Start collection**, name it
  `admins`, use the UID as the document ID and add any field (e.g. `name: Vikash`).
- **Authorized domains**: `localhost` works out of the box. Add your production domain under
  **Authentication → Settings → Authorized domains**, or Google sign-in fails there.
- **Hosting**: it's a single-page app. `public/_redirects` (Netlify / Cloudflare Pages) and
  `vercel.json` (Vercel) send every URL to `index.html` so links like `/orders/…` survive a refresh.
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
  services/    firebase.js (shared setup), catalogStore.js (menu, details, charges → Firestore), orderStore.js (orders),
               customerStore.js (saved addresses), customerAuth.js (Google login), otp.js (phone OTP)
  utils/       storage.js, hours.js (open / closed), notify.js (desktop alerts), orders.js, image.js, bill.js, address.js, delivery.js (slots, payment, progress)
```

## Notes before production

UPI payments are made by QR code straight to the restaurant and confirmed by the admin by hand.
To confirm payments automatically, connect a payment gateway (for example Razorpay or Cashfree).
