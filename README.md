# Health HMS

Multi-tenant hospital management system — appointments, queue, billing, pharmacy, lab, imaging, staff/org/settings, and WhatsApp-delivered patient documents (invoice, prescription, consultation summary, lab report). See `ARCHITECTURE.md` for the full system design and `COMPLIANCE.md` for the current compliance posture.

## Stack

Next.js (App Router) · TypeScript · PostgreSQL + Prisma · NextAuth v5 · Tailwind · Vitest

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values, see below
npx prisma migrate dev       # applies the schema to your local Postgres
npm run db:seed              # demo tenant + admin/doctor/patient accounts
npm run dev
```

Log in at `localhost:3000/login` — seeded accounts (password `password123` for all): `admin@demo.com` (ADMIN_RECEPTION), `doctor@demo.com` (DOCTOR), `reception@demo.com` (RECEPTIONIST), `patient@demo.com` (PATIENT — bounces to `/login`; there is no patient-facing app, see `ARCHITECTURE.md`).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Use `sslmode=require` in production. |
| `AUTH_SECRET` | Yes | NextAuth session signing key, and the source key for PHI field-level encryption (`lib/phiCrypto.ts`). Generate with `npx auth secret` or `openssl rand -base64 32`. **Rotating this invalidates all existing sessions and makes previously-encrypted PHI unreadable** — see `COMPLIANCE.md` for the KMS migration this should eventually move to. |
| `WHATSAPP_WEBHOOK_SECRET` | Yes, for inbound WhatsApp | HMAC secret verifying Meta's inbound-message and delivery-status webhooks (`api/whatsapp/webhook`, `api/whatsapp/status`). |
| `WHATSAPP_PROVIDER` | No (defaults to mock) | Set to `meta` to send real WhatsApp messages. Anything else, or missing, uses the mock provider — sends are logged, never actually delivered. |
| `WHATSAPP_ACCESS_TOKEN` | Only if `WHATSAPP_PROVIDER=meta` | Meta WhatsApp Cloud API access token. |
| `WHATSAPP_PHONE_NUMBER_ID` | Only if `WHATSAPP_PROVIDER=meta` | Meta Cloud API phone number id to send from. |
| `CRON_SECRET` | Yes, for scheduled jobs | Bearer-token secret for `api/jobs/follow-up-reminders` and `api/jobs/audit-alerts`. Vercel Cron sends this automatically when the env var is set on the project. |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | Yes, for imaging | Credentials for the S3-compatible bucket storing DICOM/imaging files. |
| `STORAGE_BUCKET` | Yes, for imaging | Bucket name. |
| `STORAGE_ENDPOINT` | No | Set for non-AWS S3-compatible storage (e.g. Cloudflare R2). Omit for real AWS S3. |
| `STORAGE_REGION` | No | Defaults to `auto`. |

Nothing above is fabricated for this file — it's every `process.env.*` read anywhere in `src/`; grep for `process.env` if this list and the code ever drift.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | `prisma migrate deploy` then `next build` — this is what CI and Vercel run |
| `npm run start` | Production server (after `build`) |
| `npm run test` | Vitest — hits a real Postgres database (`DATABASE_URL`), not mocks; see "Testing" below |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate dev` — create + apply a migration locally |
| `npm run db:seed` | Seed the demo tenant/accounts (`prisma/seed.ts`) |
| `npm run db:backup` | `pg_dump` the database to `backups/` (gitignored — contains real PHI in production) |
| `npm run db:restore <file>` | Restore a `db:backup` dump — destructive, asks for confirmation unless `FORCE=1` |

## Testing

The test suite (`src/**/*.test.ts`, Vitest) runs against a real database rather than mocks — set `DATABASE_URL` to a Postgres instance you're fine writing test data into (a local dev DB is normal; **never point this at a production database**). Every test file cleans up the rows it creates. `vitest.config.mts` sets `fileParallelism: false` since tests share DB state.

## Deployment

Built for Vercel (`vercel.json` configures cron jobs for the reminder and audit-alert background jobs). `npm run build` runs `prisma migrate deploy` before building, so migrations apply automatically on deploy — there's no separate manual migration step. See `.github/workflows/ci.yml` for what's checked on every PR before merge is safe.

`.github/workflows/backup.yml` runs a daily database backup (independent of Vercel, since serverless functions there can't run `pg_dump` or persist a file to upload) — it needs `DATABASE_URL`, `AUTH_SECRET`, and the five `STORAGE_*` variables set as GitHub Actions repo secrets (Settings → Secrets and variables → Actions) before it can run.

Before pointing this at real patient data: `WHATSAPP_PROVIDER=meta` needs approved message templates in Meta Business Manager (the provider currently only sends free-text, which Meta rejects outside a live chat window — see `ARCHITECTURE.md`), and `COMPLIANCE.md` lists what's still open on the compliance side.
