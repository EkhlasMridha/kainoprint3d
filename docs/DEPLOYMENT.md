# Setup & deployment

## Requirements

* Node.js **20.9+** (developed on 20.11). Prisma 6 is pinned because Prisma 7 needs Node 22.
* No database server needed for the default SQLite setup.

## Local development

```bash
npm install
cp docs/env.example .env        # Windows PowerShell: Copy-Item docs\env.example .env
npm run db:deploy               # create the SQLite database from prisma/migrations
npm run db:seed                 # admin user, settings, sample printers/materials/products/calculations
npm run dev                     # http://localhost:3000   (use `npx next dev -p 3210` if 3000 is busy)
```

Sign in at `/admin` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.
The seed is idempotent: it never overwrites settings, products or calculations that already exist.

| Command | Purpose |
|---|---|
| `npm test` | Pricing engine, estimators, confidentiality and CSV tests (Vitest) |
| `npm run typecheck` | Strict TypeScript check |
| `npm run build && npm start` | Production build and server |
| `npm run db:migrate` | Create a new migration after editing `prisma/schema.prisma` |
| `npm run db:reset` | **Deletes all data**, re-applies migrations and re-seeds |

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | `file:./kaino.db` | Relative to `prisma/`. |
| `ADMIN_EMAIL` | for seeding | `owner@kainoprint3d.com` | First admin account. |
| `ADMIN_PASSWORD` | for seeding | dev-only default | ≥ 10 characters. **Required** when `NODE_ENV=production`. |
| `ADMIN_NAME` | no | `Kaino Owner` | |
| `STORAGE_DIR` | no | `./storage` | Uploaded files, outside `/public`. Back it up with the database. |
| `NEXT_PUBLIC_SITE_URL` | no | `http://localhost:3000` | Canonical URL for metadata. |

No secrets are committed; `.env`, the SQLite file and `storage/` are git-ignored.

## Production (single server / VPS)

1. Copy the project, create `.env` with a strong `ADMIN_PASSWORD`.
2. `npm ci && npm run db:deploy && npm run db:seed && npm run build`
3. Run `npm start` behind a reverse proxy (Nginx/Caddy) with HTTPS — the session cookie is `Secure`
   in production and will not be sent over plain HTTP.
4. Use a process manager (systemd, PM2) and back up `prisma/kaino.db` and `storage/` daily.
5. If you allow uploads larger than ~100 MB, raise the proxy's body size limit accordingly.

The app keeps uploads on the local disk and its rate limiter in memory, so run **one** instance.
Serverless hosts with read-only/ephemeral disks (e.g. Vercel) need the changes below.

## Switching to PostgreSQL

1. In `prisma/schema.prisma` set `provider = "postgresql"`.
2. Set `DATABASE_URL="postgresql://user:pass@host:5432/kaino?schema=public"`.
3. Remove `prisma/migrations/`, run `npx prisma migrate dev --name init`, then `npm run db:seed`.

All money columns are integers and JSON columns are already portable, so no code changes are needed.
For multiple app instances also move uploads to object storage (S3/R2) and the rate limiter to Redis.
