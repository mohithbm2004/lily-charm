# Lily Charm

A premium botanical-art e-commerce site — pressed flower frames, resin castings,
and wedding-bouquet keepsakes. Built as an editorial, gallery-inspired storefront
rather than a typical product-grid template.

```
lily-charm/
├── src/            React 19 + Vite + Tailwind v4 + Framer Motion frontend
├── server/         Express + MongoDB + JWT + Razorpay + Cloudinary backend
└── README.md
```

## Frontend

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # production build -> dist/
```

The frontend currently runs against `src/data/products.js`, a mock catalogue, so
the whole site (home, shop, product pages, cart, checkout flow, dashboard, admin)
works standalone with `npm run dev` — no backend required to preview or demo it.

To wire it to the real API, replace the imports of `src/data/products.js` with
`fetch` calls to the endpoints below (a small `src/lib/api.js` wrapper is a good
next step — point it at `VITE_API_URL`).

## Backend (`/server`)

```bash
cd server
npm install
cp .env.example .env      # fill in MongoDB URI, JWT secret, Razorpay + Cloudinary keys
npm run dev                # http://localhost:5000
node seed.js                # populates the DB with the same demo catalogue + an admin user
```

Seeded admin login: `admin@bloomatelier.com` / `admin1234` (change immediately in a
real deployment).

### API overview

| Method | Route                   | Auth  | Purpose                              |
|--------|--------------------------|-------|----------------------------------------|
| POST   | /api/auth/register        | —     | Create account                         |
| POST   | /api/auth/login             | —     | Log in, returns JWT                    |
| GET    | /api/auth/me                 | user  | Current profile                        |
| GET    | /api/products                  | —     | List/filter/sort products              |
| GET    | /api/products/:id                | —     | Single product (id or slug)          |
| POST   | /api/products                      | admin | Create product                       |
| PUT    | /api/products/:id                    | admin | Update product                     |
| DELETE | /api/products/:id                      | admin | Delete product                   |
| POST   | /api/orders                              | user  | Create order + Razorpay order    |
| POST   | /api/orders/verify                         | user  | Verify Razorpay payment signature |
| GET    | /api/orders/mine                             | user  | Current user's orders           |
| GET    | /api/orders                                    | admin | All orders                    |
| PATCH  | /api/orders/:id/status                           | admin | Update order status          |
| POST   | /api/uploads                                       | admin | Upload a product image to Cloudinary |

### Payment flow (Razorpay)

1. Client calls `POST /api/orders` with cart items + shipping address. The server
   creates a `pending` `Order` and a matching Razorpay order, and returns `keyId`
   plus `razorpayOrderId` to the client.
2. Client opens Razorpay's `checkout.js` with those values.
3. On success, client calls `POST /api/orders/verify` with the returned payment
   id and signature. The server re-derives the HMAC signature itself and only
   then marks the order `paid` — never trust the client-side success callback alone.

## Design tokens

| Token | Value |
|---|---|
| Background | `#F8F6F1` |
| Primary (buttons, accents) | `#4D5A3F` |
| Primary hover | `#6A7A58` |
| Accent beige | `#E9DFD3` |
| Soft brown (eyebrow labels) | `#8D6E63` |
| Ink (body text) | `#2B2B2B` |
| Display font | Cormorant Garamond |
| Body font | Inter |
| Button / label font | Poppins |

Signature motif: every product card carries a small herbarium-style "specimen"
tag (No. 01, No. 02…), echoing the botanical-plate references the whole brief is
built around, instead of a generic badge or ribbon.

## What's real vs. stubbed

- Real: full routing, all page UI, cart logic, filtering/sorting, animations,
  Mongoose models, JWT auth, Razorpay signature verification, Cloudinary upload
  pipeline, and a seed script.
- Stubbed for demo purposes: the frontend checkout currently simulates order
  creation client-side (`mockCreateRazorpayOrder` in `src/pages/Checkout.jsx`)
  instead of calling the live `/api/orders` route — swap that one function out
  once your backend is deployed and you have real Razorpay test keys.
