# ABDM / FHIR — scope and integration plan (P4, groundwork only)

**This is a plan, not a build log**, following the same convention as
`AI_PLATFORM_EXPANSION.md`. ABDM (Ayushman Bharat Digital Mission)
integration and FHIR interoperability are each multi-month projects that
need real credentials (an HFR/HPR registration, ABDM sandbox-then-
production API access) this environment doesn't have — the same reasoning
`COMPLIANCE.md` already applies to KMS and Sentry: integrating against
something that can never actually be exercised isn't real progress. What
follows is meaningful scoping work — one schema change that unblocks
later work without forcing premature integration, and a documented plan
for what "actually integrating" requires.

## What "ABDM integration" means, concretely

ABDM is India's national digital health stack. For a hospital-management
app like this one, it has two mostly-separate halves:

1. **ABHA (Ayushman Bharat Health Account)** — a patient's national health
   ID. Two forms: a 14-digit **ABHA Number** and a self-chosen **ABHA
   Address** (like `ravikumar@abdm`). Patients create these themselves
   (via the ABHA app or a facility-assisted flow) — this app would *link*
   to an existing ABHA, not issue one.
2. **HIE-CM / Health Information Exchange & Consent Manager** — the actual
   data-sharing layer. A facility (this app, acting as an HIP — Health
   Information Provider) shares patient records with other facilities
   (HIPs/HIUs) only after the patient grants consent through a Consent
   Manager app. This is where FHIR comes in: ABDM's data-exchange format
   is FHIR R4, using India's own profiles (ABDM FHIR Implementation
   Guide), not generic FHIR.

Both require registering this organization as a facility on the **Health
Facility Registry (HFR)** and its doctors on the **Health Professional
Registry (HPR)** before any API access is granted — an organizational
step, not a code change, and a prerequisite for everything below.

## What's done here (this pass)

- **`Patient.abhaNumber` / `Patient.abhaAddress`** (nullable, unique) —
  added to `prisma/schema.prisma` via migration
  `20260808134855_add_patient_abha_fields`. Nothing writes to these
  columns yet; they exist so a future "link ABHA" step (whether manual
  staff entry or an actual ABHA-verification API call) has somewhere to
  land without a schema change blocking it. Left off `Patient`'s
  encrypted-PHI columns list deliberately — these are identifiers, not
  free-text clinical content, and (unlike a diagnosis) their whole purpose
  is to be looked up by exact value, which encryption would break without
  a separate blind-index scheme.

## What real integration would require (not done, scoped for later)

### Phase 1 — ABHA linking (smaller, do first)
- Register this organization on the HFR (org-level, not code).
- Staff-facing flow: look up/verify a patient's existing ABHA via ABDM's
  ABHA verification API (OTP-based), write the result into the two new
  columns. No new consent-manager complexity yet — this alone makes
  `abhaNumber`/`abhaAddress` real instead of just reserved columns.
- Needs: ABDM sandbox credentials, then production credentials after HFR
  approval.

### Phase 2 — FHIR record generation (medium)
- Generate FHIR R4 bundles (ABDM's India profiles) for the record types
  this app already has structured data for: `DiagnosticReport` (lab
  results — `LabOrderItem`/`LabReport` map reasonably well), `MedicationRequest`
  (prescriptions), `Encounter`/`Composition` (visit records/consultation
  summaries — the same source data already used for the WhatsApp-delivered
  PDF versions, see `lib/documents.ts`).
- This is pure data transformation against already-encrypted-at-rest
  fields (decrypt via `phiCrypto.ts` the same way the PDF generators
  already do) — no new PHI-handling surface, just a new output format.

### Phase 3 — HIE-CM consent flow (largest, do last)
- Register as an HIP, implement the consent-request callback flow (ABDM's
  Gateway calls this app's API when a patient consents to share records
  with another facility), implement the actual record-transfer API.
- This is the part that turns the app into an active participant in the
  national health data exchange, not just a record generator — it's also
  the part with the most security surface (a new inbound API accepting
  requests from ABDM's Gateway) and needs its own threat-modeling pass
  once it's actually being built, not scoped in the abstract here.

## Why this is scoped this small for now

Per the standing product decision that this app has **no patient-facing
interface** (patients interact only through WhatsApp document delivery —
see `ARCHITECTURE.md`), ABDM's consent-manager flows are inherently
*facility-to-facility*, not patient-to-app — so this integration, when
built, extends the admin/doctor side of the app (staff link an ABHA, staff
respond to a data-sharing request), not a new patient surface. That's
consistent with the app's existing shape and is worth keeping in mind
when Phase 3 is actually scoped in detail.
