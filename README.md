# Unic

Unic is a complete, production-ready e-commerce marketplace built with Next.js 14 (App Router), TypeScript, Prisma and SQLite. It ships with a full customer storefront and a single-admin back office — products, a live order ledger with a status machine, customer profiles, and money tracking with Razorpay online payments (or Cash on Delivery when Razorpay is not configured).

## Features

**Storefront (customers)**
- Home page with hero, category chips and a featured products grid
- Product listing with search (`?q=`), category filter (`?cat=`) and sorting (`price_asc`, `price_desc`, `newest`)
- Product detail pages with stock badges, quantity selector and add-to-cart
- Persistent cart (localStorage-backed React context) with quantity steppers
- Free shipping above ₹499, otherwise ₹49 flat
- Checkout with delivery address (pre-filled from profile) and payment choice: Razorpay online (UPI / cards / netbanking) or Cash on Delivery
- If Razorpay keys are not configured, checkout automatically falls back to COD only with a friendly note (plus an admin UPI VPA note if set)
- Order history and order detail pages with status timelines
- Account page: edit name/phone, change password

**Admin (store owner)**
- Dashboard: revenue, order/customer counts, low-stock alerts, pending approvals with quick Approve/Reject, recent orders
- Product management: create / edit / delete, activate/deactivate, price and cost price in rupees (stored in paise)
- Orders: a live ledger filterable by status, with Approve / Reject, status advancement (Packed → Shipped → Out for delivery → Delivered), Cancel, and Refund for paid orders
- Customers: order counts and lifetime value
- Money: online payments received, COD collected, refunds, net balance, settlements, pending settlement, plus a 6-month revenue / refunds / estimated-profit table
- Settings: store name, contact details, UPI VPA, Razorpay keys, and admin password change

**Platform**
- Passwords hashed with scrypt (`node:crypto`), sessions via HMAC-SHA256 signed cookies (no auth libraries)
- Prices stored in paise (integers), rendered with Indian digit grouping (`Intl.NumberFormat('en-IN')`)
- Razorpay integrated with plain `fetch` + Basic auth (no SDK); server-side signature verification with `timingSafeEqual`
- Order status machine with an audit trail (`OrderEvent`) for every change
- Hand-written responsive CSS (no Tailwind, no component libraries)

## Local setup

Requirements: Node.js 18+ (Node 20 recommended) and npm.

```bash
npm install
cp .env.example .env          # then edit SESSION_SECRET
npx prisma db push            # create the SQLite database
node prisma/seed.mjs          # admin user, 5 categories, 12 products, settings
npm run dev                   # http://localhost:3000
```

Scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run db:push` | Sync the Prisma schema to SQLite |
| `npm run db:seed` | Re-seed demo data |

## Default admin login

- **Email:** `admin@unic.local`
- **Password:** `Admin@123`

⚠️ **Change this password immediately** after your first login: Admin → Settings → “Change admin password”. The default credentials are also shown on the admin Settings page as a reminder.

## Plugging in Razorpay

1. Create an account at [razorpay.com](https://razorpay.com) and complete KYC.
2. In the Razorpay dashboard, go to **Settings → API Keys** and generate **Test** keys.
3. In Unic, go to **Admin → Settings** and paste the **Key ID** and **Key Secret**. Save.
4. The checkout page will now offer “Pay online with Razorpay (UPI/Cards/Netbanking)”.
5. Test with the standard test card: `4111 1111 1111 1111`, any future expiry, any CVV.
6. Once you are done testing, paste your **Live** keys in Admin → Settings (after completing KYC).

No page reloads or code changes are needed — the checkout reads the keys live. If the keys are removed, the store automatically falls back to Cash on Delivery only.

## How money reaches your bank

Online payments are collected by Razorpay and **settled automatically to the bank account linked in your Razorpay dashboard**, typically on a **T+2** schedule. Unic’s **Admin → Money** page does not move money — it is a tracking / reconciliation tool: it shows online payments received, COD collected, refunds issued, the net balance, and lets you record settlements as they hit your bank so you can see what is still pending.

## Deployment

The app needs a writable SQLite database file, so pick a host with a persistent disk. Two good options:

**Option A — Railway**
1. Create an account at [railway.app](https://railway.app) and create a New Project → **Deploy from GitHub repo** (push this project first).
2. Add the environment variables `SESSION_SECRET` (a long random string) and `DATABASE_URL` (e.g. `file:./data/dev.db` — keep it on the mounted volume).
3. Open the Railway shell once and run:
   ```bash
   npx prisma db push && node prisma/seed.mjs
   ```
   (Skip the seed if you don’t want demo data; create your own admin instead.)
4. Railway auto-detects Next.js — the start command is `npm run build && npm start` (or set it explicitly).

**Option B — Render**
1. Create a **Web Service** at [render.com](https://render.com) from your repo.
2. Build command: `npm install && npx prisma db push`
3. Start command: `npm start` (run `npm run build` in the build command too, e.g. `npm install && npx prisma db push && npm run build`).
4. Add `SESSION_SECRET` and `DATABASE_URL` in the dashboard.

> **Note on Vercel:** on Vercel the filesystem is ephemeral, so SQLite **will not persist** across deploys and requests. To host there you would switch the Prisma datasource to a hosted Postgres (e.g. Neon or Supabase) — change the `datasource` provider in `prisma/schema.prisma` and the `DATABASE_URL` accordingly.

## Security notes

- Always set a strong, unique `SESSION_SECRET` in production.
- Never commit `.env` — only `.env.example` is tracked.
- Razorpay payments are verified server-side (HMAC-SHA256 over `order_id|payment_id` with `timingSafeEqual`) before an order is marked paid.
- Order prices are always recomputed server-side from the database; client cart values are never trusted.

## Project structure

```
app/            App Router pages + API routes (public, admin, api)
components/     Header, CartProvider, forms, badges, admin nav
lib/            db (Prisma singleton), session, password, settings, format
lib/actions/    Server actions (products, orders, settings)
prisma/         schema.prisma + seed.mjs
```
