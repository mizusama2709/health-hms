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

A draft schema/refactor for Phase 0 already exists locally, uncommitted (`prisma/schema.prisma`, `src/lib/authz.ts`, `src/lib/roles.ts`, `src/proxy.ts`, `src/app/page.tsx`, `prisma/seed.ts`, `package.json`, `ARCHITECTURE.md`) — review it before landing; **the local dev database has not been migrated yet** (the old schema is still applied), so no data has been touched.

### Phase 0 — Schema + shared refactors (SHARED — one person lands it, alone)

- Full revised `prisma/schema.prisma`: new enums (`UserStatus`, `AppointmentSource`, `ServiceType`, `PaymentMode`, `PaymentStatus`, `JourneyStep`, `WhatsAppDirection`, `WhatsAppMessageStatus`), extended `Role` (+`NURSE`,`RECEPTIONIST`,`LAB`,`PHARMACIST`), extended `InvoiceStatus` (+`PARTIALLY_PAID`, rename `PENDING`→`UNPAID`). New models: `InvoiceLineItem`, `Payment`, `Refund`, `PatientJourneyEvent`, `OrganizationProfile`, `HospitalSettings`, `Department`, `PharmacyReturn`, `KnowledgeBaseDocument`, `WhatsAppMessage`. Key fix: `Invoice.appointmentId` becomes nullable + non-unique (was a 1:1 cap — breaks standalone lab/pharmacy bills).
- `src/lib/authz.ts` (`requireRole()`) + `src/lib/roles.ts` (consolidated `ROLE_HOME`, replacing the copy in `proxy.ts` and `page.tsx`).
- `prisma/seed.ts` updated for new fields + sample invoice/payment data.
- `package.json`: add `db:migrate` / `db:seed` scripts.
- `ARCHITECTURE.md` updated to match new scope.
- **Whoever lands this**: run `npx prisma migrate dev --name backend_expansion`, re-seed, confirm `/login`, `/admin`, `/doctor`, `/patient` all still boot. Announce before starting, land as one PR, other person `git pull` before continuing — same convention as the existing schema rule above.

### Builder 1 (Abhk) — Appointments, Calendar, WhatsApp

| Phase | Task | Depends on |
|---|---|---|
| 1 | Extend `lib/appointments.ts`: `updateAppointmentTiming`, `cancelAppointment`, `rescheduleAppointment`, filterable `listAppointmentsForTenant`, `getAppointmentForCalendar`; extend `createAppointment` for `serviceType`/`source`/`feeAmount`/`paymentMode`. Build `lib/billing.ts` **core only**: `createInvoice`, `recordPayment`, `getInvoiceWithBalance`. | Phase 0 |
| 3 | Calendar: `getAppointmentForCalendar` wired to a doctor day/list view. Patient journey: `recordJourneyEvent` calls wired into booking + status-change actions (`APPOINTMENT_BOOKED`, `OPD_COMPLETED`, etc). | Phase 1 |
| 6 (last) | WhatsApp: `lib/whatsapp/provider.ts` interface, `lib/whatsapp/mockProvider.ts`, `lib/whatsapp.ts` domain logic (`handleInboundWebhook`, `sendInvoiceViaWhatsApp`). Webhook route `src/app/api/whatsapp/webhook/route.ts`. "Send invoice via WhatsApp" button on the appointment dashboard. | Phases 1–2 (needs `createInvoice` + `createAppointment`) |

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
