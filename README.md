# Footzi — Premium Footwear Ecommerce Platform

> **Architectural footwear handcrafted with the generational precision of Agra, engineered for modern India.**

Footzi is a full-stack footwear ecommerce platform featuring a dropshipping-style fulfillment architecture. Customers browse and purchase artisanal footwear while the administrative operations center manages products, size-level inventory, customer orders, simulated supplier fulfillment from artisan workshops in Agra, and size exchanges / returns.

This is a real-world, production-ready portfolio project built to demonstrate full-stack software engineering rigor, clean separation of concerns, secure payment verification, and complex order/inventory state machines.

---

## 1. Brand Identity & Visual Direction

- **Inspiration:** The timeless stone symmetry, marble inlays, and 500-year leathercraft legacy of Agra, Uttar Pradesh.
- **Color Palette:**
  - **Warm Ivory:** `#FAF8F5`, `#F3EFE6` (Subtle marble texture, airy canvas)
  - **Deep Charcoal & Onyx:** `#141414`, `#222222` (High-contrast editorial typography)
  - **Sandstone & Tanned Leather:** `#C8A27C`, `#B3895F` (Artisan warmth and accents)
- **Typography:**
  - **Primary Display / Serif:** *Cormorant Garamond* (Editorial poise and heritage elegance)
  - **Body & UI / Sans:** *Plus Jakarta Sans* (Legibility, pricing, and modern UI clarity)
- **Motifs:** Subtle Agra architectural arches, radial lattice jaali patterns (`.bg-agra-jaali`), and zero-distraction editorial layouts.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript & Vite
- **Styling:** Tailwind CSS with custom theme tokens & typography
- **State Management:** Zustand (Cart, Wishlist, QuickView, Coupon calculations with local persistence)
- **Server Cache:** TanStack Query (React Query)
- **Routing:** React Router v6
- **Icons & Animation:** Lucide Icons & Framer Motion
- **Currency:** Indian Rupee (`₹ INR`) formatting with discount & free shipping logic
- **Testing:** Vitest + React Testing Library + `@testing-library/jest-dom`

### Backend
- **Runtime:** Node.js & Express with TypeScript (`NodeNext` modules)
- **Database:** MongoDB & Mongoose
- **Payments:** Razorpay Test Mode with backend cryptographic HMAC-SHA256 signature verification
- **Media Management:** Cloudinary SDK with automatic format and quality optimization (`q_auto, f_auto`)
- **Security:** Helmet, CORS, Rate Limiting, Zod schema validation, bcryptjs password hashing
- **Testing:** Vitest + Supertest

---

## 3. Monorepo Architecture

```
footzi/
├── client/                     # Vite + React + TypeScript Frontend
│   ├── public/
│   │   └── favicon.svg         # Architectural Agra monogram
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Navbar, Footer, AnnouncementBar, CartDrawer, QuickViewModal, SizeGuideModal
│   │   │   ├── home/           # HeroSection, FeaturedCollections, NewArrivalsGrid, AgraHeritageBanner, CraftsmanshipStory, TrustFeatures
│   │   │   └── ui/             # Button, Badge, ProductCard
│   │   ├── data/               # High-res editorial footwear mock catalog (12 silhouettes)
│   │   ├── layouts/            # MainLayout (with global drawers & modals)
│   │   ├── lib/                # Tailwind merge utils, INR currency formatters
│   │   ├── pages/              # HomePage, ProductListingPage, ProductDetailPage, CartPage, CheckoutPage, AccountPage, AdminDashboardPage, LoginPage, RegisterPage
│   │   ├── services/           # REST client services (productService, authService, orderService, adminService, returnService)
│   │   ├── store/              # Zustand Cart, Wishlist & Auth stores with coupon discounts & persistence
│   │   ├── tests/              # Client test suites (cartStore, productCard, returnService)
│   │   ├── types/              # Footwear variants, ShoeSize (UK 6-11), CartItem, Product
│   │   ├── App.tsx             # Routing configuration
│   │   ├── index.css           # Agra jaali patterns & global typography styles
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                     # Modular Monolith Express REST Backend
│   ├── src/
│   │   ├── config/             # DB & service clients (MongoDB, Razorpay, Cloudinary)
│   │   ├── controllers/        # Request handlers (auth, product, cart, order, payment, admin, return)
│   │   ├── middleware/         # Auth (JWT Bearer), Role guards (requireAdmin), Error handling
│   │   ├── models/             # Mongoose models (User, Product, Inventory, Cart, Order, Payment, Supplier, SupplierOrder, ReturnRequest)
│   │   ├── routes/             # REST endpoints (/api/products, /api/auth, /api/cart, /api/orders, /api/payments, /api/returns, /api/admin)
│   │   ├── scripts/            # Database seed script (seed.ts)
│   │   ├── services/           # Core business logic (auth, product, cart, order, payment, supplierFulfillment, return, cloudinary)
│   │   ├── tests/              # Integration test suites (auth, order_payment, returns_admin)
│   │   ├── validators/         # Zod request payload schemas
│   │   ├── app.ts              # Express application factory
│   │   └── server.ts           # HTTP server bootstrapper
│   ├── package.json
│   └── tsconfig.json
├── package.json                # Monorepo root scripts
└── README.md
```

---

## 4. Key Systems & Engineering Implementation

### A. Authentication & Role-Based Authorization
- **Approach:** Stateless JWT Bearer tokens with client persistence and active database user lookups on protected endpoints (`/api/auth/me`).
- **Tradeoff Analysis:** Stateless JWTs scale horizontally across server instances without requiring Redis session caches, while preventing cross-origin 3rd-party cookie issues on mobile Safari/Chrome. Active user lookup in middleware ensures instantaneous revocation for deleted or suspended accounts.
- **Roles:** `customer` vs. `admin`. Admin routes (`/api/admin/*`) are strictly guarded with `requireAdmin` middleware.

### B. Size-Variant Footwear Inventory System
- Every product supports independent variant units representing **UK Shoe Sizes (`UK 6`–`UK 11`)** and colorways with unique SKUs (e.g. `FTZ-BLG-TAN-UK8`).
- **Atomic Stock Reservation:**
  - Upon customer order placement, `Inventory.reserveStock(qty)` atomically decrements `availableStock` and increments `reservedStock`.
  - If payment fails or times out, `Inventory.releaseStock(qty)` restores stock immediately.
  - Upon verified payment signature, `Inventory.confirmFulfillment(qty)` permanently deducts reserved stock.
  - Customers cannot purchase unavailable shoe sizes on both frontend and backend.

### C. Server-Authoritative Pricing & Razorpay Verification
- **Price Security:** The backend never trusts client-submitted prices or totals. During order creation, the server looks up the product from MongoDB, computes the subtotal, verifies valid coupons (`FOOTZI10`, `AGRAFIRST`), applies the free delivery threshold ($\ge ₹1,999$), and calculates the definitive order total.
- **Razorpay HMAC Signature Verification:**
  - An order is initialized in paise on the Razorpay gateway.
  - After user payment in the checkout modal, the frontend sends `{ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }` to `/api/payments/verify`.
  - The server reconstructs the signature: `HMAC-SHA256(order_id + "|" + payment_id, secret)` and compares it cryptographically using `crypto.timingSafeEqual` to prevent timing attacks.

### D. Agra Dropshipping Supplier Fulfillment Simulation
- Once payment is verified, the order automatically triggers a `SupplierOrder` linked to supplier `SUP-AGR-01` (*Agra Master Artisan Guild Ltd.*).
- Wholesale pricing is calculated at 55% wholesale cost.
- An automated BlueDart Air Express tracking number is assigned (`BD-AGR-XXXXXXXXIN`).
- Operators can step through the simulated fulfillment lifecycle:
  `Submitted` $\to$ `Accepted` $\to$ `Start Lasting (Processing)` $\to$ `Mark Shipped` $\to$ `Confirm Delivered`.

### E. 7-Day Size Exchange & Returns Portal
- Footwear fit is essential. Patrons can initiate size exchanges or full returns for any fulfilled order directly from their account portal.
- Exchange requests validate replacement size availability in the database.
- Reverse pickup courier tracking is automatically issued (`BD-REV-XXXXXXXXIN`).
- Admins can review exchange requests, schedule doorstep reverse pickups, and dispatch replacement pairs (`BD-EXC-XXXXXXXXIN`).

### F. Cloudinary Image Management & Catalog Control
- Products feature high-resolution editorial photography.
- Cloudinary service automatically applies format and quality optimizations (`f_auto, q_auto`).
- Offline/fallback mode preserves development and automated test speed without requiring live cloud credit.
- Admin dashboard allows creating new footwear styles, editing specifications, uploading images, adjusting size-level stock, and toggling catalog visibility.

---

## 5. API Reference Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Healthcheck and service uptime |
| `GET` | `/api/products` | Public | Paginated footwear list with filters (category, size, color, price) |
| `GET` | `/api/products/:slug` | Public | Retrieve single silhouette by slug with variants |
| `POST` | `/api/products/:id/reviews` | Public | Submit verified customer review and recalculate rating |
| `POST` | `/api/auth/register` | Public | Register new customer account |
| `POST` | `/api/auth/login` | Public | Authenticate patron/admin and obtain JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve sanitized profile of logged-in user |
| `GET` | `/api/cart` | Authenticated | Fetch server-persisted shopping bag |
| `POST` | `/api/cart/items` | Authenticated | Add variant to bag with stock check |
| `POST` | `/api/orders` | Authenticated | Create customer order with server price calculation & stock hold |
| `GET` | `/api/orders/my-orders` | Authenticated | View logged-in patron order history |
| `POST` | `/api/payments/create-order`| Authenticated | Generate Razorpay order in paise |
| `POST` | `/api/payments/verify` | Authenticated | Verify HMAC-SHA256 signature and trigger dropship pipeline |
| `POST` | `/api/returns` | Authenticated | Request size exchange or return |
| `GET` | `/api/returns/my-returns` | Authenticated | View patron return and exchange requests |
| `GET` | `/api/admin/analytics` | Admin Only | Dashboard metrics, verified revenue, low stock count, return rates |
| `GET` | `/api/admin/supplier-orders`| Admin Only | View active supplier orders |
| `POST` | `/api/admin/supplier-orders/:id/fulfill` | Admin Only | Advance supplier fulfillment pipeline state |
| `GET` | `/api/admin/inventory` | Admin Only | View size-level inventory across all variants |
| `PATCH`| `/api/admin/inventory/:sku` | Admin Only | Update variant stock count directly |
| `POST` | `/api/admin/products` | Admin Only | Handcraft and publish new footwear style |
| `PATCH`| `/api/admin/products/:id/toggle-active` | Admin Only | Toggle product visibility in catalog |
| `POST` | `/api/admin/products/upload-image` | Admin Only | Upload & optimize image via Cloudinary CDN |
| `GET` | `/api/admin/returns` | Admin Only | View all customer return requests |
| `PATCH`| `/api/admin/returns/:id` | Admin Only | Approve return or dispatch replacement footwear |

---

## 6. Demo Accounts & Credentials

The seed script initializes two pre-configured accounts:

| Role | Email | Password | Access Capabilities |
|---|---|---|---|
| **Patron** | `patron@footzi.in` | `Footzi@2026` | Full customer shopping, cart, Razorpay checkout, order tracking, size exchange portal |
| **Admin** | `admin@footzi.in` | `Footzi@2026` | Operations deck, analytics, dropship fulfillment pipeline, catalog creator, inventory matrix, returns manager |

*Both accounts can also be logged into with 1 click using the "Demo Accounts" quick-fill buttons on `/login`.*

---

## 7. Running & Testing the Application

### Prerequisites
- **Node.js**: v18+
- **MongoDB**: Running locally on `mongodb://localhost:27017` (or provide `MONGODB_URI` in `.env`)

### Step 1: Install Dependencies
```bash
# In client/
cd client && npm install

# In server/
cd ../server && npm install
```

### Step 2: Seed the Database
```bash
cd server
npx tsx src/scripts/seed.ts
```
*Seeds 12 handcrafted footwear styles, 30 size-variant inventory records, and demo patron/admin accounts.*

### Step 3: Run the Development Servers
In two separate terminal windows:
```bash
# Terminal 1: Backend API (port 5001)
cd server
npm run dev

# Terminal 2: Frontend Client (port 5173)
cd client
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** to explore Footzi.

### Step 4: Run the Automated Test Suites
Footzi features **33 automated unit and integration tests**:

```bash
# Run Client Vitest Suite (11 tests: Cart calculations, coupon math, UI components, return service)
cd client
npm test

# Run Server Integration Suite (22 tests: Auth, Cart, Orders, Razorpay HMAC, Dropship Pipeline, Returns, Cloudinary, Inventory)
cd server
npx vitest run
```

### Step 5: Verify Production Builds
```bash
# Client production bundle
cd client && npm run build

# Server TypeScript compilation
cd ../server && npm run build
```
Both builds compile cleanly with **0 TypeScript errors**.
