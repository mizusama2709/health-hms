# Page-wise Plan

Every route in the app, what it does, which role(s) can reach it, and the `lib/` functions it's backed by. Originally written after the Phase 0–6 backend expansion (see `ASSIGNMENTS.md` for that phase history); updated after the nav-expansion work (Phases 8–15b, PR #4) added Patients, Inbox, Queue, Reminders, Services, Lab, and Pharmacy. Reflects what's actually in `master`.

Role-based routing is enforced in `src/proxy.ts`: `/patient/*` → `PATIENT`, `/doctor/*` → `DOCTOR`, `/admin/*` → `ADMIN_RECEPTION`, `SUPER_ADMIN`, `NURSE`, `RECEPTIONIST`, `LAB`, `PHARMACIST`. Unauthenticated users are redirected to `/login`; authenticated users hitting the wrong surface are redirected to their role's home via `lib/roles.ts`.

The admin sidebar is grouped into four sections (`src/app/(admin)/layout.tsx`): **Workspace**, **Clinical**, **Insights**, **Admin** — the table below is ordered to match.

## Public

| Route | Purpose |
|---|---|
| `/` | Redirects to the signed-in user's role home, or `/login` if signed out. |
| `/login` | Email/password sign-in (NextAuth Credentials provider). |

## Admin / Reception console — Workspace

| Route | Purpose | Backed by |
|---|---|---|
| `/admin` | Doctor list + add-doctor form, walk-in appointment booking, a standalone "send invoice via WhatsApp" form (invoice ID + phone, not yet wired to specific invoice rows — see Known gaps), and the full appointments list for the tenant. | `lib/appointments.ts`, `lib/whatsapp.ts` |
| `/admin/patients` | Patients directory with search by name/email. | `lib/patients.ts` (`listPatients`) |
| `/admin/patients/[id]` | Patient chart view: appointment history with per-appointment visit notes/diagnosis/prescription and linked invoices, in one page. | `lib/patients.ts` (`getPatientWithHistory`) |
| `/admin/inbox` | List of `WhatsAppMessage` rows, filterable by direction (inbound/outbound) and status. | `lib/whatsappInbox.ts` (`listWhatsAppMessages`) |
| `/admin/inbox/[id]` | Single message detail: direction, phone, parsed intent, error (if any), and raw payload JSON. | `lib/whatsappInbox.ts` (`getWhatsAppMessage`) |
| `/admin/schedule/reminders` | Follow-ups list (auto-created when a doctor marks a visit Completed); schedule a reminder (datetime + message) or update a follow-up's status (pending/done/cancelled). | `lib/followUps.ts` |
| `/admin/queue` | Today's appointments joined with each one's latest patient-journey step (Booked → Vitals taken → In consultation → ... → Medicines dispensed), read-only. | `lib/appointments.ts`, `lib/journey.ts` (`getLatestJourneyStepsForAppointments`) |

## Admin / Reception console — Clinical

| Route | Purpose | Backed by |
|---|---|---|
| `/admin/services` | Service catalog CRUD (name, type — consultation/lab/pharmacy, default price, active/inactive toggle). | `lib/services.ts` |
| `/admin/billing` | **Bill Patient**: create an invoice (consultation/lab/pharmacy, single line item) against a patient looked up by email. **Invoices**: list with status (`UNPAID`/`PARTIALLY_PAID`/`PAID`/`VOID`) and service-type filters, inline record-payment / refund / void actions per row. | `lib/billing.ts` |
| `/admin/billing/ledger` | Consolidated Ledger — every `Payment` and `Refund` merged and sorted by timestamp, filterable by date range, source (manual/WhatsApp), and service type. | `lib/billing.ts` (`getConsolidatedLedger`) |
| `/admin/lab/tests` | Lab test catalog CRUD (name, code, default price, turnaround time text). | `lib/lab.ts` (`listLabTests`, `createLabTest`) |
| `/admin/lab/orders` | Create a lab order (patient + one or more catalog tests) and list existing orders with status; update status and record per-item result value/unit/reference range/flag. | `lib/lab.ts` (`createLabOrder`, `updateLabOrderStatus`, `recordLabResult`, `listLabOrders`) |
| `/admin/lab/reports/upload` | Attach a report file (URL) to a lab order. | `lib/lab.ts` (`attachLabReport`) |
| `/admin/lab/templates` | Lab report template CRUD (name + free-text body). | `lib/lab.ts` (`listLabReportTemplates`, `createLabReportTemplate`, `updateLabReportTemplate`) |
| `/admin/pharmacy` | Pharmacy dashboard — landing page for the Pharmacy group (low-stock summary). | `lib/pharmacy.ts` (`listMedicines` with `lowStock` filter) |
| `/admin/pharmacy/medicines` | Medicine catalog CRUD (name, SKU, unit price, stock quantity, reorder level) and manual stock adjustment. | `lib/pharmacy.ts` (`listMedicines`, `createMedicine`, `adjustMedicineStock`) |
| `/admin/pharmacy/goods-receipt` | Record a goods receipt from a supplier (one or more medicine lines with quantity + unit cost); increments medicine stock in a transaction. | `lib/pharmacy.ts` (`createGoodsReceipt`, `listGoodsReceipts`) |
| `/admin/pharmacy/suppliers` | Supplier CRUD (name, contact phone/email). | `lib/pharmacy.ts` (`listSuppliers`, `createSupplier`) |
| `/admin/pharmacy/dispense` | Create a prescription (patient + medicine + quantity + dosage) and Rx queue with a per-row Dispense action (decrements stock, records `MEDICINES_DISPENSED` journey event). | `lib/pharmacy.ts` (`listPrescriptions`, `createPrescription`, `dispensePrescription`) |
| `/admin/pharmacy/invoices` | Pharmacy-only invoice list. Thin page — reuses `listInvoices` filtered to `serviceType: PHARMACY`, no separate schema. | `lib/billing.ts` (`listInvoices`) |
| `/admin/pharmacy/ledger` | Pharmacy-only sales ledger. Thin page — reuses `getConsolidatedLedger` filtered to `serviceType: PHARMACY`, no separate schema. | `lib/billing.ts` (`getConsolidatedLedger`) |
| `/admin/pharmacy/store-credit` | Record a pharmacy return against an invoice line item, optionally issuing it as store credit (instead of a cash refund) against a patient looked up by email; lists issued store credits. Moved here from `/admin/settings`. | `lib/hospitalSettings.ts` (`recordPharmacyReturn`), `lib/pharmacy.ts` (`createStoreCredit`, `listStoreCredits`) |

## Admin / Reception console — Insights

| Route | Purpose | Backed by |
|---|---|---|
| `/admin/reports` | **Master Report**: total appointments, consultations, pharmacy/lab invoice counts, revenue, discounts, refunds — filterable by date range and doctor. **Transactions**: raw `Payment` feed (reuses the ledger data, not duplicated). **Self-Efficacy**: average time between patient-journey steps (booked → vitals → OPD → lab → medicines), computed from `PatientJourneyEvent` rows. | `lib/reports.ts` |

## Admin / Reception console — Admin

| Route | Purpose | Backed by |
|---|---|---|
| `/admin/staff` | List all tenant users with role/status/contact info; add a new staff member (any role except `PATIENT`/`DOCTOR`, which have their own flows); change a staff member's role or status (`ACTIVE`/`INACTIVE`/`SUSPENDED`). | `lib/staff.ts` |
| `/admin/organization` | Org profile form: legal name, GST number, company size, HQ address. | `lib/organization.ts` |
| `/admin/settings` | Hospital settings in three sections: **General** (registration number, address, booking lead-time/cancellation-window policy, pharmacy GST, invoice branding text, pharmacy invoice template), **Payment settings** (UPI ID, payee name, Razorpay link, separate lab/pharmacy UPI IDs — saved independently of General), **Departments** (add/remove). The pharmacy-returns form that used to live here moved to `/admin/pharmacy/store-credit`. | `lib/hospitalSettings.ts` |
| `/admin/knowledge-base` | List/add/delete knowledge-base documents (title + URL — no file upload/storage yet, just links). | `lib/knowledgeBase.ts` |

## Doctor (`DOCTOR`)

| Route | Purpose | Backed by |
|---|---|---|
| `/doctor` | Today's/all schedule for the signed-in doctor; mark an appointment Completed / No-show / Cancelled. Marking Completed also records an `OPD_COMPLETED` patient-journey event and creates a follow-up. | `lib/appointments.ts`, `lib/journey.ts`, `lib/followUps.ts` |
| `/doctor/calendar` | Day-by-day calendar view (prev/next navigation) of the doctor's own appointments. | `lib/appointments.ts` (`getAppointmentForCalendar`) |

## Patient (`PATIENT`)

| Route | Purpose | Status |
|---|---|---|
| `/patient` | Patient dashboard. | **Stub only** — currently renders just a heading. Browsing doctors, booking/cancelling/rescheduling appointments, viewing follow-ups, and visit history are still on the original `ASSIGNMENTS.md` backlog (Builder 2's patient-surface track), unaffected by the backend/nav expansion and not yet started. |

## API routes

| Route | Purpose | Notes |
|---|---|---|
| `/api/auth/[...nextauth]` | NextAuth request handler. | Unchanged from the original scaffold. |
| `/api/whatsapp/webhook` (`POST`) | Inbound WhatsApp webhook — accepts `{ tenantId, from, text }`, logs a `WhatsAppMessage` row, parses `"book"` keyword intent, and on a match looks up the patient by `User.phone`, books the next-day 10am slot with the tenant's first doctor (`source: WHATSAPP`), records an `APPOINTMENT_BOOKED` journey event, and links the message to the created appointment (`status: PROCESSED`). Unknown phone or no doctors in tenant → `status: FAILED` with `errorMessage`, no crash. | Slot/doctor selection is a fixed heuristic (next day 10am, first doctor) — no real availability check yet. |

## Known gaps / next steps

- **Patient-facing booking flow** (browse doctors, book, cancel/reschedule, follow-ups, visit history) — not started, tracked separately in `ASSIGNMENTS.md`'s original Builder 2 patient-surface table.
- **"Send invoice via WhatsApp" on `/admin`** is a standalone form (paste an invoice ID + phone) rather than a button on each invoice row in `/admin/billing` — functional, but not yet integrated into the Billing page UI.
- **WhatsApp inbound booking uses a fixed slot heuristic** (next day 10am, tenant's first doctor) rather than real availability — fine for the mock/demo stage, would need real scheduling logic before this touches a live WhatsApp number. It's also single-keyword (`"book"`) intent matching — no natural-language understanding, no multi-language support.
- **Multi-line-item invoices**: `Bill Patient` currently creates one line item per invoice. `lib/billing.ts`'s `createInvoice` already supports multiple line items — only the UI is single-item for now.
- **No vitals-capture flow**: `VITALS_TAKEN` exists as a `PatientJourneyEvent` step (referenced in Queue's step labels and Reports' Self-Efficacy calc) but nothing in the app actually records it — there's no vitals form or model anywhere.
- **No visit-record creation UI**: `VisitRecord` (notes/diagnosis/prescription free text, shown on the patient chart) has no create/edit form anywhere in the app — a pre-existing gap, not addressed by this expansion.
- **Lab results are entered manually**, one value at a time — no report-file parsing, no automatic out-of-range flagging beyond what a user sets on the `flag` field themselves, no alerting.
- **Pharmacy invoices don't include GST HSN/SAC line-item codes** — `HospitalSettings.pharmacyGst`/`pharmacyInvoiceTemplate` exist for branding text, but invoice generation doesn't compute or attach tax codes.
- A duplicate `recordJourneyEvent` briefly existed in both `lib/journey.ts` (Builder 1, wired into `/doctor` and `/admin` actions) and `lib/reports.ts` (Builder 2, unused) — the unused copy in `lib/reports.ts` has been removed; `lib/journey.ts` is the canonical one.
