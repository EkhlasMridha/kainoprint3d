# Kaino Print 3D

Storefront, customer price estimators and a professional manufacturing-cost calculator for a small
3D printing business in Bangladesh (prices in BDT ৳).

**The owner can answer:** *"What does this product actually cost me to make, and what should I charge?"*
**A customer can answer:** *"Roughly how much will my custom print cost, and how do I get a final quote?"*

## Quick start

```bash
npm install
cp docs/env.example .env
npm run db:deploy && npm run db:seed
npm run dev            # http://localhost:3000 — admin at /admin
npm test               # 85 tests
```

Details, environment variables and production notes: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.
Every formula with a hand-checkable worked example: **[docs/PRICING.md](docs/PRICING.md)**.

## What's inside

**Public site** (no login)
* Landing page — hero, services, process, featured products, estimator entry points, FAQ.
* Catalog with category filters, search and sort; product pages with gallery, options,
  personalisation, quantity, live estimated price and quote request.
* Estimators: **custom keychain** (style, text, size, colours, material, ring, double-sided, rush,
  quantity — with a live preview), **desk organizer** (presets, size, compartments, pen holders,
  phone stand, drawers, cable management), **print your own file** (STL/3MF/OBJ upload, review-based quote).
* Quote requests with a reference number (e.g. `KP-261013-7Q4M`) and WhatsApp / email / Facebook
  hand-off with a URL-encoded summary. Estimates are always labelled indicative.

**Admin** (`/admin`, login required)
* **Cost calculator** — printer, material, slicer figures (paste text from Bambu Studio / OrcaSlicer /
  PrusaSlicer), hands-on labour, design treatment, failure model, packaging, premium factors.
  Live 9-line breakdown with formulas, minimum / standard / premium prices, manual price override with
  instant profit, margin and markup, warnings. Save, edit, duplicate, delete, printable report, CSV.
* **Dashboard** — projected monthly revenue & profit, average unit cost, most profitable products,
  printer utilisation, material consumption, recent calculations, below-cost / low-margin warnings;
  filter by date, printer, material and product.
* Printers, materials, products (with image upload), categories, quote requests (status, final price,
  file download, reply links), sales & cost reports, CSV exports.
* Settings: labour/design rates, overhead items and allocation method, margins, fees, tax, rounding,
  premium assumptions; customer estimator rules and presets; contact details and landing-page copy.

## Architecture

| Layer | Location | Notes |
|---|---|---|
| Domain (pure TS) | `src/domain/` | Costing engine, pricing, estimators, money, quotes, CSV. No framework imports; fully unit-tested. |
| Server | `src/server/` | Prisma access, auth & sessions, settings, upload storage, server actions. Marked `server-only`. |
| UI | `src/app/`, `src/components/` | Next.js App Router. `(site)` = public, `admin/(panel)` = protected. |
| Data | `prisma/` | Schema, migrations, idempotent seed with sample data. |

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Prisma 6 ·
SQLite (PostgreSQL-ready) · Zod · Vitest. No UI kit — a small set of components in `src/components/ui`.
SQLite was chosen because a single-owner business can run it with zero database administration;
see DEPLOYMENT.md to switch to PostgreSQL.

**Domain model:** `Printer`, `Material`, `Category`, `Product` (size options = variants, stored as
validated JSON), `CostCalculation` + `CostComponent` (inputs, a full snapshot of the rates used and the
results — so history stays auditable when prices change), `Setting` (validated JSON for pricing rules,
estimator presets, contact & landing content), `QuoteRequest` (covers inquiries too), `AdminUser`, `Session`.

## Security & privacy

* Every admin page, server action and admin API route calls `requireAdmin()` on the server
  (database-backed sessions, scrypt password hashes, httpOnly SameSite cookie, login rate limiting).
  Middleware is only an early redirect. Tests enforce that no admin page/action skips the check.
* Customer estimates run **only on the server**; the browser receives labels, limits and the resulting
  line items. Private floors, costs, margins and product minimum prices never leave the server —
  enforced by `tests/confidentiality.test.ts` (response whitelists + client import boundary).
* Uploads are validated by extension, size **and** content signature, stored outside `/public` with
  random names, never parsed or rendered by the server, and served to admins only as opaque attachments.
* Prices in quote requests are recomputed on the server; client-supplied prices are never trusted.
* CSV exports neutralise spreadsheet formulas. Security headers: `X-Frame-Options`, `nosniff`, referrer policy.

## Sample content

All seeded products are flagged **Sample** and the storefront shows a notice until you untick
"Show the sample content notice" (Admin → Contact & website). Product images are SVG illustrations in
`public/images/products/` — replace them with real photos via Admin → Products. No reviews, stock
levels or customer claims are invented. Two seeded sample products (Cable Clip Set, Minimal Desk Tray)
are deliberately priced below their modelled cost so the dashboard's price warnings are visible — review
their prices with the calculator before going live.

## Known limitations / needs external services

* **Payments:** no gateway (by design — inquiry workflow). bKash/Nagad/SSLCommerz would need merchant credentials.
* **Notifications:** new quote requests appear in the admin panel; there is no email/SMS/WhatsApp
  Business API sending (needs an SMTP or WhatsApp Business account). Customer hand-off uses `wa.me`/`mailto:` links.
* **3D file analysis:** uploaded STL/3MF/OBJ files are not sliced automatically; the owner slices them
  and enters the figures in the calculator.
* **Single instance:** uploads on local disk and an in-memory rate limiter (see DEPLOYMENT.md to scale).
* **One admin role:** additional admins can be added via the seed script or database; there is no
  user-management UI or password-reset email flow yet.
* Tax handling applies the mode you configure (none / exclusive / inclusive); confirm VAT/turnover-tax
  obligations with a tax adviser.
