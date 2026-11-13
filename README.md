# Footzi — Premium Footwear Ecommerce Platform

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay_Sandbox-02042B?style=for-the-badge&logo=razorpay&logoColor=3395FF)
![Vitest](https://img.shields.io/badge/Vitest-156_Tests_Passed-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

<p align="center">
  <strong>Architectural footwear inspired by the generational leathercraft of Agra, engineered for modern Indian luxury.</strong>
</p>

[Key Features](#1-core-platform-features) •
[System Architecture](#2-system-architecture) •
[Engineering Deep Dive](#3-engineering-interview-deep-dive) •
[Quick Demo Accounts](#4-demo-credentials--1-click-access) •
[API Reference](#5-api-reference-summary) •
[Local Setup & Tests](#6-local-setup--verification)

</div>

---

## Executive Overview

**Footzi** is a production-grade, full-stack footwear ecommerce platform featuring a dropshipping fulfillment architecture. Customers browse artisanal footwear, manage carts, and purchase via Razorpay, while the operations control desk manages catalog publishing, size-level inventory, customer orders, size exchanges/returns, and supplier fulfillment simulation from artisan workshops in Agra, Uttar Pradesh.

Built as a portfolio demonstration for **Software Development Engineer (SDE)** interviews, Footzi showcases clean separation of concerns, atomic concurrency control, server-authoritative calculations, and zero tolerance for client-side price tampering.

---

## 1. Core Platform Features

- **Artisanal Footwear Catalog**: 16 handcrafted silhouettes across 5 core categories: *Loafers*, *Sneakers*, *Oxfords*, *Boots*, and *Slip-ons*.
- **Indian Sizing Matrix**: Full variant system supporting sizes `UK 6` through `UK 11` with individual SKU tracking and live stock enforcement.
- **Dual-Mode Shopping Cart**:
  - Local client storage (Zustand) for instant guest browsing.
  - Automatic synchronization with MongoDB `/api/cart` upon customer login.
- **Server-Authoritative Pricing**: Subtotals, coupons and free delivery thresholds ($\ge ₹1,999$) are strictly recalculated and verified on the backend. Coupons live in the database and are managed from the admin panel: percent or flat, minimum order, maximum discount, first-order-only, total and per-customer limits, and an expiry date. A cancelled or expired order gives its coupon use back.
- **Razorpay Payment Gateway Integration**:
  - Razorpay gateway order generation in paise.
  - Interactive Sandbox Checkout Sheet with HMAC-SHA256 signature verification.
  - Automated inventory release upon payment cancellation.
- **Agra Dropshipping Supplier Fulfillment Simulation**:
  - Successful checkout automatically queues a wholesale supplier order linked to `SUP-AGR-01` (*Agra Master Artisan Guild Ltd.*).
  - BlueDart Air Express tracking number allocation (`BD-AGR-XXXXXXXXIN`).
  - Multi-step status progression (*Accepted → Processing/Lasting → Shipped → Delivered*).
- **7-Day Size Exchange & Returns Workflow**:
  - Customers can initiate size exchanges with database stock reservation for the replacement size.
  - Automated reverse-logistics tracking code generation (`BD-REV-XXXXXXXXIN`).
- **Administrative Operations Deck**:
  - Real-time business analytics (Total Revenue, Paid Orders, Low-Stock Alerts, Return Rates).
  - Size-level stock adjustment with direct inventory patching.
  - Catalog management: Create styles, toggle catalog visibility, and upload images.
- **Role-Based Access Control**:
  - Protected routes for patron accounts (`/account/*`) and admin operations (`/admin`).

---

## 2. System Architecture

### 2.1 High-Level Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 18 + Vite + TypeScript)"]
        UI["Tailwind CSS UI / Editorial Presentation"]
        Router["React Router v6 (Protected & Admin Route Guards)"]
        State["Zustand Stores (Cart, Wishlist, Auth)"]
        Query["TanStack Query (Product Caching & Deduplication)"]
    end

    subgraph Server ["Backend (Node.js + Express REST API)"]
        Middleware["Security Middleware (Helmet, CORS, Rate Limit, Auth JWT)"]
        Controllers["Express Controllers (Auth, Product, Cart, Order, Payment, Admin)"]
        Services["Business Services (Inventory, Pricing, SupplierDropship, Cloudinary)"]
        Validators["Zod Schema Validation Layer"]
    end

    subgraph DataStore ["Database & External Services"]
        Mongo[("MongoDB Database\n(Users, Products, Inventories, Orders, Carts)")]
        Razorpay["Razorpay Payment Gateway\n(Order Creation & Webhooks)"]
        AgraSupplier["Agra Artisan Supplier Guild\n(Dropshipping Simulation & BlueDart API)"]
    end

    UI --> Router
    Router --> State
    State --> Query
    Query -->|HTTPS / REST API| Middleware
    Middleware --> Validators
    Validators --> Controllers
    Controllers --> Services
    Services --> Mongo
    Services -->|HMAC-SHA256| Razorpay
    Services --> AgraSupplier
```

---

### 2.2 Order & Inventory State Machine

```mermaid
stateDiagram-v2
    [*] --> Cart: Customer adds UK size & colorway
    Cart --> Checkout: Proceed to checkout
    Checkout --> OrderCreated: POST /api/orders (Server recalculates total)
    
    state OrderCreated {
        [*] --> StockReserved: Atomic Inventory.reserveStock(qty)
    }

    OrderCreated --> RazorpayGateway: POST /api/payments/create-order
    RazorpayGateway --> SignatureVerification: Patron completes payment in modal
    
    state SignatureVerification {
        [*] --> CheckHMAC: HMAC_SHA256(order_id + '|' + payment_id, secret)
    }

    CheckHMAC --> PaymentPaid: Signature match verified
    CheckHMAC --> PaymentFailed: Tampered or invalid signature
    
    PaymentFailed --> StockReleased: Inventory.releaseStock(qty)
    PaymentFailed --> [*]

    PaymentPaid --> StockDeducted: Inventory.confirmFulfillment(qty)
    PaymentPaid --> SupplierQueued: Trigger dropship order for SUP-AGR-01
    
    state SupplierQueued {
        Submitted --> Accepted
        Accepted --> Processing_Lasting
        Processing_Lasting --> Dispatched_BlueDart
        Dispatched_BlueDart --> Delivered
    }
```

---

### 2.3 Authentication & Cart Synchronization Flow

```mermaid
sequenceDiagram
    autonumber
    actor Patron as Customer / Reviewer
    participant Client as React Client (Zustand)
    participant API as Express API (/api)
    participant DB as MongoDB

    Patron->>Client: Browses as Guest & Adds shoe to Bag
    Client->>Client: Stores items in local Zustand state
    Patron->>Client: Clicks "1-Click Patron Sign-In"
    Client->>API: POST /api/auth/login (patron@footzi.in)
    API->>DB: Query User & Verify bcrypt password hash
    DB-->>API: User record verified
    API-->>Client: Returns signed JWT + Patron profile
    Client->>API: POST /api/cart/items (Sync local items to server)
    API->>DB: Persist items into Cart collection
    Client->>API: POST /api/orders (Bearer token)
    API->>DB: Atomically reserve size-level inventory
    API-->>Client: 201 Created (Order FTZ-AGR-XXXXXX)
```

---

## 3. Engineering Interview Deep Dive

### Q1: How does Footzi prevent inventory overselling and race conditions?
> **Answer**: Concurrency bugs occur when two patrons attempt to purchase the last pair of shoe size `UK 9` simultaneously. 
> Footzi prevents this at the database engine level using **atomic document queries** rather than read-then-write loops:
> ```ts
> const result = await Inventory.findOneAndUpdate(
>   { variantSku: sku, availableStock: { $gte: quantity } },
>   { 
>     $inc: { availableStock: -quantity, reservedStock: quantity } 
>   },
>   { new: true }
> );
> if (!result) throw new Error("Insufficient stock");
> ```
> If two requests arrive at the same millisecond, MongoDB's document-level locking ensures that only the transaction satisfying `{ availableStock: { $gte: quantity } }` succeeds; the second receives `null` and is immediately notified of unavailability.

### Q2: Why JWT Bearer Tokens over Server-Side Sessions with Cookies?
> **Answer**: Footzi utilizes stateless **JSON Web Tokens (JWT)** for multiple reasons:
> 1. **Horizontal Scalability**: Stateless verification removes the requirement for a shared Redis session store, allowing multi-instance cloud deployments (e.g., Render, Railway, Kubernetes) with zero sticky-session overhead.
> 2. **Cross-Origin Client Decoupling**: Vite frontend and Express backend can run on independent domains without encountering Third-Party Cookie blocking (Safari ITP / Chrome Privacy Sandbox).
> 3. **Mitigating Revocation Tradeoffs**: While JWTs are stateless, Footzi's `authenticate` middleware loads the user from MongoDB on every request, so a deleted account loses access immediately instead of when its token expires.

### Q3: How is payment tampering prevented?
> **Answer**: The frontend is treated as completely untrusted:
> - Prices and discounts submitted in client payloads are ignored; the server looks up the product, applies verified coupons, and calculates totals in INR.
> - Razorpay orders are initialized in integer **paise** (`₹1,999` $\to$ `199900` paise).
> - Upon payment completion, the backend cryptographically reconstructs the signature:
>   $$\text{Signature} = \text{HMAC-SHA256}(\text{razorpay\_order\_id} \mathbin{\Vert} \text{razorpay\_payment\_id}, \text{secret})$$
>   The comparison uses `crypto.timingSafeEqual` to safeguard against timing side-channel attacks.

### Q4: How is the Agra dropshipping supplier fulfillment simulated?
> **Answer**: In real-world ecommerce, footwear brands rarely warehouse every single variant directly; fulfillment is delegated to regional manufacturing workshops. In Footzi:
> - Verification of payment triggers an automated `SupplierOrder` document mapped to Agra craftsman guild `SUP-AGR-01`.
> - Wholesale cost is calculated dynamically ($55\%$ of retail price).
> - An algorithmic BlueDart Air tracking number is generated (`BD-AGR-XXXXXXXXIN`).
> - Administrators can transition the order through an industrial pipeline: *Accepted $\to$ Lasting $\to$ Shipped $\to$ Delivered*.

---

## 4. Demo Credentials & 1-Click Access

For evaluation, three pre-configured accounts are seeded into MongoDB. The patron and the read-only demo admin can be accessed using the **1-Click Demo Login** buttons on `/login` or `/checkout`:

| Role | Account Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Patron (Customer)** | `patron@footzi.in` | `Footzi@2026` | Full customer shopping, cart sync, Razorpay test checkout, order tracking, 7-day size exchange portal |
| **Demo Admin (read-only)** | `demo-admin@footzi.in` | `Footzi@2026` | Browse the whole operations deck. Every change is refused and customer contact details are masked |
| **Admin (Operations)** | `admin@footzi.in` | `Footzi@2026` locally; the `SEED_ADMIN_PASSWORD` you set on a deployment | Full control: fulfillment pipeline, returns, catalog creator, inventory adjustment |

---

## 5. API Reference Summary

### Catalog & Reviews
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Public | Paginated footwear list with filters (category, size, color, price) |
| `GET` | `/api/products/:slug` | Public | Retrieve single silhouette by slug with size variants |
| `POST` | `/api/products/:id/reviews` | Authenticated | One review per customer; marked verified only if the customer has a paid order for the shoe |

### Authentication & Cart
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new customer account |
| `POST` | `/api/auth/login` | Public | Authenticate patron/admin and obtain JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve sanitized profile of logged-in user |
| `PATCH` | `/api/auth/profile` | Authenticated | Edit name and mobile number |
| `POST` | `/api/auth/addresses` | Authenticated | Save a delivery address (the first one becomes the default) |
| `PUT` / `DELETE` | `/api/auth/addresses/:id` | Authenticated | Edit, make default, or remove one of your own addresses |
| `POST` | `/api/auth/change-password` | Authenticated | Needs the current password; signs out every other device and returns a fresh token |
| `POST` | `/api/auth/forgot-password` | Public | Emails a single-use link valid for 60 minutes. Always answers the same, so it never reveals which emails have accounts |
| `POST` | `/api/auth/reset-password` | Public | Sets a new password from the emailed token, signs the user in, and voids older sessions |
| `GET` | `/api/cart` | Authenticated | Fetch server-persisted shopping bag |
| `POST` | `/api/cart/items` | Authenticated | Add variant to bag with stock check |
| `PATCH` | `/api/cart/items/:id`| Authenticated | Update item quantity in bag |
| `DELETE`| `/api/cart/items/:id`| Authenticated | Remove item from bag (`:id` is the line id or the variant SKU) |
| `POST` | `/api/cart/merge` | Authenticated | Fold a guest bag into the saved bag; the larger quantity wins, so it is safe to repeat |

### Coupons
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/coupons/validate` | Public | Check a code against the bag. Guests get the general rules; signed-in customers also get their first-order and per-customer limits. Limited to 40 attempts per 15 minutes |

### Orders & Payments
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | Authenticated | Create customer order with server price calculation & stock hold |
| `GET` | `/api/orders/my-orders` | Authenticated | View logged-in patron order history |
| `GET` | `/api/orders/:id` | Owner / Admin | Order with tracking events. Customers never see supplier costs or payment signatures |
| `POST` | `/api/orders/:id/cancel`| Authenticated | Cancel an unpaid order, or a paid one before it ships (full refund, stock returned, workshop job cancelled) |
| `POST` | `/api/payments/create-order`| Authenticated | Generate Razorpay gateway order in paise |
| `POST` | `/api/payments/verify` | Authenticated | Verify HMAC-SHA256 signature and trigger dropship pipeline |

### Returns & Exchanges
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/returns` | Authenticated | Open a return or size exchange on a **delivered** order within 7 days; prices and item details come from the order, and an exchange holds the replacement pair |
| `GET` | `/api/returns/my-returns` | Authenticated | The patron's own requests |
| `GET` | `/api/returns/:id` | Owner / Admin | One request |

Requests move one step at a time (`requested → approved → pickup_scheduled → inspected → replacement_dispatched` or `refund_processed`, or `rejected` along the way). Finished pairs are restocked and held replacements are released on rejection. Completing a return (`refund_processed`) refunds the customer through Razorpay before the request is closed. Each refund is tied to its return, so a retry can never pay twice, and a gateway failure leaves the request open for another attempt.

### Admin Operations
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/analytics` | Admin Only | Dashboard metrics, verified revenue, low stock count, return rates |
| `GET` | `/api/admin/inventory` | Admin Only | View size-level inventory across all variants |
| `PATCH`| `/api/admin/inventory/:sku` | Admin Only | Update variant stock count directly |
| `GET` | `/api/admin/supplier-orders`| Admin Only | View active dropshipping supplier orders |
| `POST` | `/api/admin/supplier-orders/:id/fulfill` | Admin Only | Advance the workshop pipeline one step at a time (`accepted → processing → shipped → delivered`). `cancelled` is allowed until it ships and refunds the customer and returns the stock |
| `GET` | `/api/admin/products` | Admin Only | Every product, including archived ones |
| `POST` | `/api/admin/products` | Admin Only | Publish a new footwear style (validated; a SKU may belong to only one product) |
| `PUT` | `/api/admin/products/:id` | Admin Only | Edit details, price, images and badge. Existing variants keep their stock (use the inventory endpoint); new SKUs can be added |
| `GET` / `POST` | `/api/admin/coupons` | Admin Only | List coupons with their usage, or create one |
| `PUT` | `/api/admin/coupons/:id` | Admin Only | Edit a coupon (the code itself never changes) or switch it off |
| `POST` | `/api/admin/products/upload-image` | Admin Only | Store an image on Cloudinary, or reuse an https link. File uploads need the `CLOUDINARY_*` settings; without them the server says so instead of inventing a link |
| `PATCH`| `/api/admin/products/:id/toggle-active` | Admin Only | Toggle product visibility in catalog |
| `POST` | `/api/admin/orders/:id/refund` | Admin Only | Retry the refund of a cancelled paid order whose automatic refund failed (safe to repeat) |
| `GET` | `/api/admin/returns` | Admin Only | View customer return/exchange requests |
| `PATCH`| `/api/admin/returns/:id` | Admin Only | Approve return or dispatch replacement footwear |

---

## 6. Local Setup & Verification

### Prerequisites
- **Node.js**: v18 or later
- **MongoDB**: Running locally on `mongodb://localhost:27017` (or provide `MONGODB_URI` in `server/.env`)

### 1. Install Dependencies
```bash
# In client/
cd client && npm install

# In server/
cd ../server && npm install
```

### 2. Seed Database
```bash
cd server
npm run seed
```
*Seeds 16 handcrafted footwear styles, 76 size-variant inventory records, and the demo patron, demo admin and admin accounts.*

### 3. Launch Development Servers
```bash
# Terminal 1: Backend API (port 5001)
cd server
npm run dev

# Terminal 2: Frontend Client (port 5173)
cd client
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

### 4. Running Automated Tests

Footzi includes **156 automated unit and integration tests** ensuring test-driven reliability:

```bash
# Client Vitest Suite (58 tests: Cart and server-checked coupons, bag merge on sign-in, password reset and order pages, admin panels, page titles and meta tags, dialog keyboard behaviour, automated accessibility checks with axe, UI components, return service)
cd client
npm test

# Server Integration Suite (98 tests: Auth, Cart, Orders, Razorpay HMAC and webhook, Dropship Pipeline,
# Returns, Reviews, Order expiry, Demo admin, Password reset, Refunds, Email providers, Coupons, Product editing, Workshop pipeline, SEO (page tags, sitemap, robots), Cloudinary, Inventory). Needs a seeded MongoDB; point
# MONGODB_URI at a scratch database, because the tests create and delete orders.
cd server
npx vitest run
```

---

### 5. Production Build Verification

```bash
# Client production bundle (TypeScript check + Vite bundle)
cd client && npm run build

# Server compilation (tsc)
cd ../server && npm run build
```
Both compile with **0 errors**.

---

## 7. Production Deployment (Render + MongoDB Atlas)

Footzi deploys as **one Render web service**: the build compiles the API and the React client, and Express serves both from the same origin. The repository's [`render.yaml`](render.yaml) describes the service.

> **Database:** Footzi needs MongoDB. Upstash does not offer MongoDB (it provides Redis, Vector and QStash), so use the free **MongoDB Atlas** M0 tier.

### 1. Create the database (MongoDB Atlas)
1. Create a free M0 cluster at <https://www.mongodb.com/atlas>, ideally in the same region as the Render service.
2. **Database Access**: add a database user with a generated password.
3. **Network Access**: allow `0.0.0.0/0` (Render's free tier has no fixed outbound IP).
4. **Connect → Drivers**: copy the connection string and put the database name in it:
   `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/footzi?retryWrites=true&w=majority`

### 2. Seed the catalog (once, from your machine)
```bash
MONGODB_URI="<atlas connection string>" SEED_ADMIN_PASSWORD="<private admin password>" npm run seed
```
The seed **deletes all products, inventory and users** before inserting, so run it only on a fresh database. Without `SEED_ADMIN_PASSWORD`, `admin@footzi.in` gets the public demo password.

To add the read-only demo admin to a database that already has data, without wiping anything:
```bash
MONGODB_URI="<atlas connection string>" npm run seed:demo-admin
```

### 3. Deploy on Render
1. Push the repository to GitHub.
2. In Render: **New → Blueprint**, pick the repository; Render reads `render.yaml`.
3. Enter `MONGODB_URI` when prompted. `JWT_SECRET` is generated automatically.
4. Deploy, then open `https://<service>.onrender.com/api/health`.

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | yes (`production`) | Enables fail-fast config checks and production logging |
| `MONGODB_URI` | yes | Atlas connection string |
| `JWT_SECRET` | yes | At least 32 random characters; the server refuses to start otherwise |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | no | Real Razorpay keys (use `rzp_test_...` to try it with test money). Unset = demo mode: the sandbox payment sheet, and refunds are simulated |
| `RAZORPAY_WEBHOOK_SECRET` | with real keys | Webhook URL: `https://<service>.onrender.com/api/payments/webhook` |
| `BREVO_API_KEY` | no | Sends order, shipping, refund and password-reset emails through [Brevo](https://www.brevo.com) (free: 300/day). Needs `EMAIL_FROM` set to a sender you verified in Brevo, which can be a plain Gmail address. Used first when both keys are set |
| `RESEND_API_KEY` | no | Same emails through [Resend](https://resend.com). Resend can only mail your own address until you verify a domain |
| `EMAIL_FROM` | with Brevo | Sender, e.g. `Footzi <you@gmail.com>`. Required for Brevo; optional for Resend. With neither key set, emails are only written to the server log, so **password reset cannot reach customers** |
| `APP_URL` | no | Public site URL used in email links, canonical links, the sitemap and share previews. Set it to your real domain once you have one (defaults to Render's `RENDER_EXTERNAL_URL`) |
| `CLOUDINARY_*` | no | Real image uploads; unset = uploads are simulated |
| `CORS_ORIGIN` | no | Only if a separately hosted frontend calls this API |
| `ORDER_EXPIRY_MINUTES` | no | Unpaid orders are cancelled and their stock released after this long (default 30) |

### Performance, SEO and accessibility
- **Fast first load:** only the home page and shared code ship up front. Every other screen (admin, checkout, account...) is fetched when opened. The first load fell from 555 kB to 353 kB (145 kB to 107 kB compressed), the server compresses text responses (the shared React file goes from 165 kB to 54 kB), and images below the fold load lazily.
- **Search and sharing:** the server sends every page with its own title, description, canonical link and Open Graph/Twitter tags in the very first response, plus schema.org `Product` data (price, stock, rating) on product pages, so Google and link previews (WhatsApp, Slack) do not depend on running JavaScript. `/sitemap.xml` is built from the live catalogue, and `/robots.txt` keeps the API, cart, checkout, account and admin pages out of search. Retired or unknown products return a real 404.
- **Accessibility:** skip-to-content link, focus moves to the new page on navigation, the bag, quick view and size guide are proper dialogs (focus trapped inside, Escape closes, focus returns), form errors are announced, icon buttons have names, and animations stop for visitors who ask for reduced motion. Automated axe checks run in the test suite. They cannot judge colour contrast or screen reader wording, so a manual pass with a screen reader is still worth doing.

### Production behaviour
- The server exits at startup if `MONGODB_URI` is missing, `JWT_SECRET` is weak, or the database is unreachable.
- Rate limits: 600 requests / 15 min per IP on `/api`, 20 / 15 min on login and register.
- Free Render services sleep after 15 minutes idle; the first request afterwards takes up to a minute.

---

<div align="center">
  <sub>Crafted with passion for engineering excellence • Inspired by the timeless heritage of Agra</sub>
</div>
