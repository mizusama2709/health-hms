# Page-wise Plan

Every route in the app, what it does, which role(s) can reach it, and the `lib/` functions it's backed by. Written after the Phase 0–6 backend expansion (see `ASSIGNMENTS.md` for the phase history) so this reflects what's actually in `master`, not just what was planned.

Role-based routing is enforced in `src/proxy.ts`: `/patient/*` → `PATIENT`, `/doctor/*` → `DOCTOR`, `/admin/*` → `ADMIN_RECEPTION`, `SUPER_ADMIN`, `NURSE`, `RECEPTIONIST`, `LAB`, `PHARMACIST`. Unauthenticated users are redirected to `/login`; authenticated users hitting the wrong surface are redirected to their role's home via `lib/roles.ts`.

## Public

| Route | Purpose |
|---|---|
| `/` | Redirects to the signed-in user's role home, or `/login` if signed out. |
| `/login` | Email/password sign-in (NextAuth Credentials provider). |

## Admin / Reception console (`ADMIN_RECEPTION`, `SUPER_ADMIN`, `NURSE`, `RECEPTIONIST`, `LAB`, `PHARMACIST`)

| Route | Purpose | Backed by |
|---|---|---|
| `/admin` | Doctor list + add-doctor form, walk-in appointment booking, a standalone "send invoice via WhatsApp" form (invoice ID + phone, not yet wired to specific invoice rows — see Known gaps), and the full appointments list for the tenant. | `lib/appointments.ts`, `lib/whatsapp.ts` |
| `/admin/billing` | **Bill Patient**: create an invoice (consultation/lab/pharmacy, single line item) against a patient looked up by email. **Invoices**: list with status (`UNPAID`/`PARTIALLY_PAID`/`PAID`/`VOID`) and service-type filters, inline record-payment / refund / void actions per row. | `lib/billing.ts` |
| `/admin/billing/ledger` | Consolidated Ledger — every `Payment` and `Refund` merged and sorted by timestamp, filterable by date range, source (manual/WhatsApp), and service type. | `lib/billing.ts` (`getConsolidatedLedger`) |
| `/admin/reports` | **Master Report**: total appointments, consultations, pharmacy/lab invoice counts, revenue, discounts, refunds — filterable by date range and doctor. **Transactions**: raw `Payment` feed (reuses the ledger data, not duplicated). **Self-Efficacy**: average time between patient-journey steps (booked → vitals → OPD → lab → medicines), computed from `PatientJourneyEvent` rows. | `lib/reports.ts` |
| `/admin/staff` | List all tenant users with role/status/contact info; add a new staff member (any role except `PATIENT`/`DOCTOR`, which have their own flows); change a staff member's role or status (`ACTIVE`/`INACTIVE`/`SUSPENDED`). | `lib/staff.ts` |
| `/admin/organization` | Org profile form: legal name, GST number, company size, HQ address. | `lib/organization.ts` |
| `/admin/settings` | Hospital settings in four sections: **General** (registration number, address, booking lead-time/cancellation-window policy, pharmacy GST, invoice branding text, pharmacy invoice template), **Payment settings** (UPI ID, payee name, Razorpay link, separate lab/pharmacy UPI IDs — saved independently of General), **Departments** (add/remove), **Pharmacy returns** (record a return against a specific pharmacy invoice line item, with optional refund amount). | `lib/hospitalSettings.ts` |
| `/admin/knowledge-base` | List/add/delete knowledge-base documents (title + URL — no file upload/storage yet, just links). | `lib/knowledgeBase.ts` |

## Doctor (`DOCTOR`)

| Route | Purpose | Backed by |
|---|---|---|
| `/doctor` | Today's/all schedule for the signed-in doctor; mark an appointment Completed / No-show / Cancelled. Marking Completed also records an `OPD_COMPLETED` patient-journey event. | `lib/appointments.ts`, `lib/journey.ts` |
| `/doctor/calendar` | Day-by-day calendar view (prev/next navigation) of the doctor's own appointments. | `lib/appointments.ts` (`getAppointmentForCalendar`) |

## Patient (`PATIENT`)

| Route | Purpose | Status |
|---|---|---|
| `/patient` | Patient dashboard. | **Stub only** — currently renders just a heading. Browsing doctors, booking/cancelling/rescheduling appointments, viewing follow-ups, and visit history are still on the original `ASSIGNMENTS.md` backlog (Builder 2's patient-surface track), unaffected by the backend expansion and not yet started. |

## API routes

| Route | Purpose | Notes |
|---|---|---|
| `/api/auth/[...nextauth]` | NextAuth request handler. | Unchanged from the original scaffold. |
| `/api/whatsapp/webhook` (`POST`) | Inbound WhatsApp webhook — accepts `{ tenantId, from, text }`, logs a `WhatsAppMessage` row, parses `"book"` keyword intent, and on a match looks up the patient by `User.phone`, books the next-day 10am slot with the tenant's first doctor (`source: WHATSAPP`), records an `APPOINTMENT_BOOKED` journey event, and links the message to the created appointment (`status: PROCESSED`). Unknown phone or no doctors in tenant → `status: FAILED` with `errorMessage`, no crash. | Slot/doctor selection is a fixed heuristic (next day 10am, first doctor) — no real availability check yet. |

## Known gaps / next steps

- **Patient-facing booking flow** (browse doctors, book, cancel/reschedule, follow-ups, visit history) — not started, tracked separately in `ASSIGNMENTS.md`'s original Builder 2 patient-surface table.
- **"Send invoice via WhatsApp" on `/admin`** is a standalone form (paste an invoice ID + phone) rather than a button on each invoice row in `/admin/billing` — functional, but not yet integrated into the Billing page UI.
- **WhatsApp inbound booking uses a fixed slot heuristic** (next day 10am, tenant's first doctor) rather than real availability — fine for the mock/demo stage, would need real scheduling logic before this touches a live WhatsApp number.
- **Multi-line-item invoices**: `Bill Patient` currently creates one line item per invoice. `lib/billing.ts`'s `createInvoice` already supports multiple line items — only the UI is single-item for now.
- A duplicate `recordJourneyEvent` briefly existed in both `lib/journey.ts` (Builder 1, wired into `/doctor` and `/admin` actions) and `lib/reports.ts` (Builder 2, unused) — the unused copy in `lib/reports.ts` has been removed; `lib/journey.ts` is the canonical one.
