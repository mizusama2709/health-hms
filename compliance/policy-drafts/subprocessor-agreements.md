# Subprocessor agreements (DRAFT — tracking list)

**Status:** Draft tracking list, not a substitute for actually signing
anything. A Business Associate Agreement (BAA, HIPAA-style) or Data
Processing Agreement (DPA, DPDP/GDPR-style) needs to exist with every
service below **before** real patient data flows through it in
production. None are confirmed signed as of this document.

## What counts as a subprocessor here

Any third-party service this app's own code sends PHI (or PHI-adjacent
data — phone numbers, appointment details) to. Identified directly from
the codebase's integration points:

| Service | What it receives | Where in the code | Agreement needed | Status |
|---|---|---|---|---|
| WhatsApp Cloud API (Meta) | Patient phone numbers, message text, links to invoices/prescriptions/lab reports/consultation summaries | `src/lib/whatsapp/metaProvider.ts`, only active when `WHATSAPP_PROVIDER=meta` — the default `MockWhatsAppProvider` sends nothing externally | Meta's WhatsApp Business Platform data processing terms (review Meta's current Business/Commerce/WhatsApp terms — they are the ones that apply, not a generic BAA Meta doesn't offer for this product) | ⬜ Not confirmed |
| S3-compatible object storage (provider TBD — AWS S3, Cloudflare R2, or similar; `STORAGE_ENDPOINT` in `.env.example` is provider-agnostic) | Imaging (DICOM) files, and now also database backup dumps (`.github/workflows/backup.yml`) | `src/lib/storage.ts` | Whichever provider is actually chosen needs its BAA/DPA offering confirmed — not all S3-compatible providers offer one; this is a vendor-selection criterion, not just paperwork | ⬜ Provider not yet finalized in this document; confirm before enabling |
| Hosting platform (this app is built for Vercel per `README.md`) | Runs the application, has access to all traffic including PHI in transit, and to any env vars/secrets | Deployment target, not application code | Vercel does offer a BAA on qualifying plans — confirm current terms and plan tier requirement directly with Vercel before deploying real patient data | ⬜ Not confirmed |
| PostgreSQL host (self-hosted or managed — not pinned to a specific provider in this repo) | The full database, including all PHI (encrypted columns are ciphertext to the host, but connection access is a bigger risk) | `DATABASE_URL` | Depends entirely on which managed Postgres provider (or self-hosted setup) is chosen — get their BAA/DPA and confirm encryption-at-rest support before pointing production traffic at it | ⬜ Provider not yet finalized |
| Email/other notification channels | None identified — this app deliberately has no patient-facing interface and no email-based patient communication; all patient documents go through WhatsApp only (per the explicit "no patient portal" product decision — see `ARCHITECTURE.md`) | N/A | N/A | Not applicable unless this changes |

## Process going forward

1. Before adding any new external integration that will see PHI, add a row
   here first.
2. The Privacy & Security Officer (once named) approves the subprocessor
   and confirms the agreement is signed before the integration goes live
   with real patient data — not after.
3. Keep a copy of each signed agreement somewhere the org already tracks
   legal documents — this file is a checklist, not the document store.
