# Builder Assignments

Two builders, split by role surface so you're rarely editing the same files. Shared code (`lib/`, `prisma/schema.prisma`) is called out separately — coordinate before touching those.

## Builder 1 (Abhk) — Doctor + Admin/Reception

**Owns:** `src/app/(doctor)/`, `src/app/(admin)/`

| Step | Task | Status |
|---|---|---|
| 1. Foundation | Auth, tenant scoping, role routing | ✅ Done |
| 2. Appointments | Doctor schedule view (mark completed/no-show/cancelled) | ✅ Done |
| 2. Appointments | Admin console: view all appointments, book walk-ins | ✅ Done |
| 6. Admin console | Manage doctors (add/edit), manage schedules | Not started |
| 5. Billing | Invoice generation off completed appointments | Not started |

## Builder 2 (friend) — Patient + Follow-ups

**Owns:** `src/app/(patient)/`

| Step | Task | Status |
|---|---|---|
| 2. Appointments | Patient: browse doctors, book an appointment | Not started |
| 2. Appointments | Patient: cancel/reschedule their own appointment | Not started |
| 3. Follow-ups | Patient: view follow-ups due, `jobs/follow-up-reminders.ts` | Not started |
| 4. Records | Patient: view their own visit history (read-only) | Not started |

## Shared — coordinate before editing

- `lib/appointments.ts` — the query/mutation layer both sides call into. `createAppointment` is already written; call it from the patient booking form rather than writing new logic.
- `lib/tenant.ts` / `lib/auth.ts` — foundation, don't touch without discussing.
- `prisma/schema.prisma` — one person edits at a time. Say so before you start, land it, other person `git pull` before continuing.

## Builder 2 setup (first time)

```
git clone https://github.com/mizusama2709/health-hms.git
cd health-hms
npm install
```

Then get the `.env` file (DATABASE_URL + AUTH_SECRET) from Abhk directly — not over chat/Slack, use a password manager. Drop it in the repo root as `.env`, then:

```
npm run dev
```

Log in at `localhost:3000/login` with `patient@demo.com` / `password123` to see the patient side you're building.

## Workflow

1. Branch per feature: `git checkout -b patient-booking`
2. Push, open a PR into `master`, the other person reviews before merge
3. `git pull` on `master` before starting your next task

---

# Backend Expansion — Phase-wise Plan (2 builders)

Full scope: WhatsApp-driven booking, appointment dashboard, calendar, billing (Bill Patient / Invoices / Consolidated Ledger), reports (Master Report / Transactions / Self-Efficacy), staff management, organization settings, hospital settings. WhatsApp integration is built **last**, mocked (no real credentials yet).

Phase 0's schema/refactor has landed on `master` (PR #1): `prisma/schema.prisma`, `src/lib/authz.ts`, `src/lib/roles.ts`, `src/proxy.ts`, `src/app/page.tsx`, `prisma/seed.ts`, `package.json`, `ARCHITECTURE.md`. **The dev database has still not been migrated** — `master`'s `schema.prisma` and the actual DB have significant drift (confirmed via `prisma migrate diff`: new enums, `Invoice` column changes, `Role` additions, several new tables). Whoever starts Phase 1 needs to run `npx prisma migrate dev --name backend_expansion` first; the previous attempt failed because existing seed rows can't satisfy the new required `updatedAt` columns without a default — either reset the (seed-data-only) dev DB or hand-edit the generated migration to backfill a default.

### Phase 0 — Schema + shared refactors (SHARED — one person lands it, alone)

- Full revised `prisma/schema.prisma`: new enums (`UserStatus`, `AppointmentSource`, `ServiceType`, `PaymentMode`, `PaymentStatus`, `JourneyStep`, `WhatsAppDirection`, `WhatsAppMessageStatus`), extended `Role` (+`NURSE`,`RECEPTIONIST`,`LAB`,`PHARMACIST`), extended `InvoiceStatus` (+`PARTIALLY_PAID`, rename `PENDING`→`UNPAID`). New models: `InvoiceLineItem`, `Payment`, `Refund`, `PatientJourneyEvent`, `OrganizationProfile`, `HospitalSettings`, `Department`, `PharmacyReturn`, `KnowledgeBaseDocument`, `WhatsAppMessage`. Key fix: `Invoice.appointmentId` becomes nullable + non-unique (was a 1:1 cap — breaks standalone lab/pharmacy bills).
- `src/lib/authz.ts` (`requireRole()`) + `src/lib/roles.ts` (consolidated `ROLE_HOME`, replacing the copy in `proxy.ts` and `page.tsx`).
- `prisma/seed.ts` updated for new fields + sample invoice/payment data.
- `package.json`: add `db:migrate` / `db:seed` scripts.
- `ARCHITECTURE.md` updated to match new scope.
- **Whoever lands this**: run `npx prisma migrate dev --name backend_expansion`, re-seed, confirm `/login`, `/admin`, `/doctor`, `/patient` all still boot. Announce before starting, land as one PR, other person `git pull` before continuing — same convention as the existing schema rule above.

### Builder 1 (Abhk) — Appointments, Calendar, WhatsApp

| Phase | Task | Depends on | Status |
|---|---|---|---|
| 1 | Extend `lib/appointments.ts`: `updateAppointmentTiming`, `cancelAppointment`, `rescheduleAppointment`, filterable `listAppointmentsForTenant`, `getAppointmentForCalendar`; extend `createAppointment` for `serviceType`/`source`/`feeAmount`/`paymentMode`. Build `lib/billing.ts` **core only**: `createInvoice`, `recordPayment`, `getInvoiceWithBalance`. | Phase 0 | ✅ Done |
| 3 | Calendar: `getAppointmentForCalendar` wired to a doctor day/list view. Patient journey: `recordJourneyEvent` calls wired into booking + status-change actions (`APPOINTMENT_BOOKED`, `OPD_COMPLETED`, etc). | Phase 1 | ✅ Done |
| 6 (last) | WhatsApp: `lib/whatsapp/provider.ts` interface, `lib/whatsapp/mockProvider.ts`, `lib/whatsapp.ts` domain logic (`handleInboundWebhook`, `sendInvoiceViaWhatsApp`). Webhook route `src/app/api/whatsapp/webhook/route.ts`. "Send invoice via WhatsApp" button on the appointment dashboard. | Phases 1–2 (needs `createInvoice` + `createAppointment`) | ✅ Done — sent from admin console as a standalone form; will attach to invoice rows once Builder 2's billing UI lands

### Builder 2 (friend) — Billing, Reports, Org/Hospital Settings

| Phase | Task | Depends on |
|---|---|---|
| 2 | Finish `lib/billing.ts`: `issueRefund`, `listInvoices`, `getConsolidatedLedger`, `voidInvoice`. "Bill Patient" server action (patient lookup + `createInvoice` + `recordPayment` in one flow). Minimal Invoices list + Bill Patient form page. | Phase 1 (Builder 1's `createInvoice`/`recordPayment` core) |
| 4 | `lib/reports.ts`: `getMasterReport`, `listTransactions` (thin wrapper over `Payment`, don't duplicate the ledger), `getSelfEfficacyReport`. Minimal reports page (raw numbers, no charting needed yet). | Phase 3 (needs `PatientJourneyEvent` rows) + Phase 2 (needs `Payment`/`Refund` rows) |
| 5 | `lib/staff.ts`, `lib/organization.ts`, `lib/hospitalSettings.ts`, `lib/knowledgeBase.ts`. Departments CRUD, payment-settings save action, pharmacy-returns recording. Minimal staff list/edit + org-settings + hospital-settings forms. | Phase 0 only |

### Notes

- Phase 5 has no dependency on Phases 1–4 — Builder 2 can start it any time after Phase 0 lands, in parallel with Phase 2/4 if useful.
- Existing not-started items in the tables above this section (patient booking/cancel/reschedule, follow-up reminders job, visit history view, manage doctors) are unaffected by this plan and can continue in parallel — this expansion is backend/`lib/` first, per current priority; UI beyond the minimal verification pages listed here comes later.
- Every new `lib/` function follows the existing convention: explicit `tenantId` param, manual `where` filtering, no Prisma middleware/extension.
- **Note on existing overlap:** `admin/actions.ts` already has `addDoctor` (creates a `DOCTOR`-role `User` + `Doctor` row) — Phase 5's `createStaffUser` should not duplicate this; it handles the non-doctor staff roles only. `listStaff` should still list *all* users tenant-wide (including doctors) so the staff page stays the single source of truth. Unifying doctor-creation into the same flow is a later follow-up, not blocking.

---

## Builder 2 — Detailed Phase Plan

### Phase 2 — Billing complete + appointment dashboard backend

**Depends on:** Builder 1's Phase 1 (`lib/billing.ts` core: `createInvoice`, `recordPayment`, `getInvoiceWithBalance`). If Builder 1 hasn't landed that yet, coordinate — don't duplicate those three functions.

1. **Extend `lib/billing.ts`** with:
   - `issueRefund({ tenantId, invoiceId, paymentId?, amount, reason? })` — creates a `Refund` row, updates the related `Payment.status` (`REFUNDED` if fully refunded, `PARTIALLY_REFUNDED` otherwise), and recomputes `Invoice.amountPaid`/`status` in a `db.$transaction`. **Accounting rule to document in code comments:** a refund reduces the effective `amountPaid` used for status computation, but the original `Payment` row stays untouched (immutable ledger entry) — the `Refund` row is the adjustment.
   - `listInvoices(tenantId, filters: { status?, serviceType?, from?, to? })` — `db.invoice.findMany` with those as optional `where` clauses, `include: { patient: { include: { user: true } }, appointment: true }`, ordered by `createdAt desc`.
   - `getConsolidatedLedger(tenantId, filters: { from, to, source?, serviceType? })` — two queries (`Payment` + `Refund`, both joined to `Invoice` for `serviceType`/`source`), merged and sorted by timestamp in application code.
   - `voidInvoice(tenantId, invoiceId)` — guard: throw if `amountPaid > 0` (a paid invoice should be refunded, not voided).

2. **Server actions** — new file `src/app/(admin)/admin/billing/actions.ts`, following the existing `"use server"` + role check + `requireTenantId()` pattern from `admin/actions.ts`:
   - `billPatient(formData)` — look up patient by email (reuse the `db.patient.findFirst({ where: { tenantId, user: { email } } })` pattern from `bookWalkIn`), read service type + one line item (description/unitPrice/quantity — single line item for this pass, multi-line-item UI is a later enhancement) from `FormData`, call `createInvoice`.
   - `recordInvoicePayment(formData)` — `invoiceId`, `amount`, `mode`, `reference?` → `recordPayment`.
   - `refundInvoicePayment(formData)` — `invoiceId`, `paymentId?`, `amount`, `reason?` → `issueRefund`.
   - `voidInvoiceAction(formData)` → `voidInvoice`.

3. **Minimal pages:**
   - `src/app/(admin)/admin/billing/page.tsx` — "Bill Patient" form (patient email, service type select, description/amount) + an Invoices table (patient, service type, total, paid, status badge, filter controls for `status`/`serviceType` via `searchParams`, inline "Record payment"/"Refund"/"Void" action forms per row).
   - `src/app/(admin)/admin/billing/ledger/page.tsx` — Consolidated Ledger table (timestamp, type Payment/Refund, amount, source, service type, invoice link), with `from`/`to`/`source` filter inputs via `searchParams` (GET form, matching the existing plain-form convention — no client JS).

4. **Manual verification steps** (once the Phase 0 migration blocker above is resolved):
   - Bill the seeded patient for a `LAB` service, ₹300 → invoice status `UNPAID`.
   - Record a ₹150 payment → status `PARTIALLY_PAID`, `amountPaid = 150`.
   - Record the remaining ₹150 → status `PAID`.
   - Issue a ₹50 refund against that payment → `Payment.status = PARTIALLY_REFUNDED`, ledger shows both the payment and the refund as separate rows.
   - Filter the Invoices list by `serviceType=LAB` → only the lab invoice shows.
   - Filter the ledger by a date range excluding today → empty result, no crash.

### Phase 4 — Reports

**Depends on:** Phase 2 (needs real `Payment`/`Refund` rows), Builder 1's Phase 3 (needs `PatientJourneyEvent` rows for the self-efficacy report). **Cross-dependency:** `recordJourneyEvent(tenantId, appointmentId, patientId, step)` lives in `lib/reports.ts` per the module breakdown, but Builder 1 needs to *call* it during Phase 3. Builder 2 should write this one function early (it's a single `db.patientJourneyEvent.create`) and land it as part of Phase 2's PR, so Builder 1 isn't blocked waiting on Phase 4.

1. **`lib/reports.ts`:**
   - `recordJourneyEvent(tenantId, appointmentId, patientId, step: JourneyStep)` — land early, see above.
   - `getMasterReport(tenantId, { from, to, doctorId? })` → `{ totalAppointments, consultations, pharmacy, lab, totalRevenue, totalDiscounts, totalRefunds }`. Counting rule: `totalAppointments`/`consultations` come from `Appointment` (filtered by `datetime` range + optional `doctorId`, `consultations` = count where `serviceType: CONSULTATION`); `pharmacy`/`lab` counts come from `Invoice.serviceType` grouped counts (pharmacy/lab bills often have no appointment); `totalRevenue` = `sum(Invoice.totalAmount)` in range; `totalDiscounts` = `sum(Invoice.discountAmount)`; `totalRefunds` = `sum(Refund.amount)`.
   - `listTransactions(tenantId, filters: { from?, to?, status? })` — thin wrapper over `db.payment.findMany` (reuse, don't reimplement the ledger).
   - `getSelfEfficacyReport(tenantId, filters: { from?, to?, doctorId? })` — for each `Appointment` in range, fetch its `PatientJourneyEvent`s ordered by `occurredAt`, compute deltas between consecutive step pairs (booked→vitals, vitals→OPD start, OPD start→OPD complete, OPD complete→lab ordered, lab ordered→lab completed, →medicines prescribed), aggregate avg/median per transition across all matching appointments. **Must return zeros/empty gracefully, not throw, when no journey events exist yet** (likely true until Builder 1 finishes Phase 3).

2. **Minimal page:** `src/app/(admin)/admin/reports/page.tsx` — three stacked sections: Master Report (number grid + `from`/`to`/`doctorId` filter form), Transactions (table), Self-Efficacy (table of step-transition → avg time). No charting needed for this pass.

3. **Manual verification:**
   - Master report against seed data alone: `totalAppointments: 1, consultations: 1, totalRevenue: 500`.
   - After Phase 2 testing above: revenue/discount/refund numbers reflect those transactions too.
   - Doctor filter narrows to zero when given a doctor with no appointments in range — no crash.
   - Self-efficacy report renders an empty state cleanly if Phase 3 hasn't landed yet.

### Phase 5 — Staff, Organization, Hospital settings

**Depends on:** Phase 0 (schema) only — can start immediately, in parallel with Phase 2/4.

1. **`lib/staff.ts`:**
   - `listStaff(tenantId, filters?: { role?, status? })` — `db.user.findMany`, tenant-scoped.
   - `updateStaffRole(tenantId, userId, role: Role)` — guard: don't allow changing a user's role to/from `PATIENT` here (identity-changing, out of scope; staff management only reassigns among staff roles).
   - `updateStaffStatus(tenantId, userId, status: UserStatus)`.
   - `createStaffUser(tenantId, { email, name, phone?, role, password })` — bcrypt hash (reuse the exact pattern from `addDoctor`), reject `role: PATIENT` or `role: DOCTOR` (those have dedicated flows already).

2. **Server actions:** `src/app/(admin)/admin/staff/actions.ts` — `createStaff`, `changeStaffRole`, `changeStaffStatus`.

3. **Minimal page:** `src/app/(admin)/admin/staff/page.tsx` — table (name, email, phone, role, status) with inline role/status change forms per row, plus an "Add staff" form (role dropdown excludes `PATIENT`/`DOCTOR`).

4. **`lib/organization.ts`:**
   - `getOrganizationProfile(tenantId)` — `findUnique`, return `null` if not yet configured (page handles empty state).
   - `updateOrganizationProfile(tenantId, params)` — `upsert` (create-on-first-save).

5. **`lib/hospitalSettings.ts`:**
   - `getHospitalSettings(tenantId)` / `updateHospitalSettings(tenantId, params)` — same upsert pattern, covers registration/address/booking-policy/branding fields.
   - `savePaymentSettings(tenantId, params)` — **separate function**, touches only the payment-related fields (`paymentUpiId`, `paymentPayeeName`, `razorpayPaymentLink`, `labUpiId`, `pharmacyUpiId`, `paymentQrImageUrl`) per the spec's distinct "save payment settings" action.
   - `listDepartments(tenantId)` / `addDepartment(tenantId, name)` / `removeDepartment(tenantId, departmentId)`.
   - `recordPharmacyReturn(tenantId, { invoiceLineItemId, invoiceId, quantityReturned, refundAmount?, reason? })`.

6. **`lib/knowledgeBase.ts`:** `listKnowledgeBaseDocuments`, `uploadKnowledgeBaseDocument` (accept a `fileUrl` string for now — real file upload/storage is out of scope for this backend pass, flag as a follow-up), `deleteKnowledgeBaseDocument`.

7. **Minimal pages:**
   - `src/app/(admin)/admin/organization/page.tsx` — org profile form.
   - `src/app/(admin)/admin/settings/page.tsx` — hospital settings form (general/booking-policy/branding sections), a **separate** "Save payment settings" sub-form, departments list + add/remove, pharmacy-returns log.
   - `src/app/(admin)/admin/knowledge-base/page.tsx` — document list + add-by-URL form.

8. **Manual verification:**
   - Create a `NURSE` staff user → appears in staff list, status `ACTIVE` by default.
   - Set status to `SUSPENDED` → reflected immediately.
   - Save org profile (GST number, HQ city) → reload page, values persist.
   - Add two departments, remove one → list reflects it.
   - Save payment settings independently of the general settings form → confirm only those fields changed.
   - Record a pharmacy return against a pharmacy invoice line item (needs a pharmacy invoice created via Phase 2's Bill Patient flow first — cross-phase test dependency, verify after Phase 2 is testable).
