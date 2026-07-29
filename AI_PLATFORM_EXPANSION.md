# AI Platform Expansion — Architecture & Change Plan

Companion to `ASSIGNMENTS.md` (Phases 0–6, the original two-builder backend plan) and `PAGES.md` (Phase 8–15b nav expansion, PR #4). This document designs how to bring the app's feature set up to InZob's model (see prior gap analysis) — a real WhatsApp channel + an AI layer sitting on top of the workflow scaffolding that already exists.

**This is a plan, not a build log** for everything except §C4, which has shipped (PR #5, merged into `master`). Three items below still require you to pick and pay for a vendor before any related code can run against something real (§A). Everything else can be built and demoed against seed data first, then pointed at real credentials later.

**Since this plan was written**, `/admin/queue` was also rebuilt from a flat "Current step" badge into a real multi-stage live-tracker board (PR #6, merged, not originally part of this plan — it came out of a separate sidebar/feature audit against InZob's actual product). This changes the ground truth for §C1 and §C4 below: Queue now reads from a new `QueueStageEntry`/`QueueStageConfig` pair of models, not just `PatientJourneyEvent`, and the Vitals-recording flow (§C4) is now surfaced as a link inside the Queue board's Vitals stage cell rather than a bare per-row action.

---

## A. Vendor decisions needed before implementation starts

These aren't things I can choose for you — they involve accounts, billing, and terms of service:

1. **WhatsApp channel provider.** Options: Meta's WhatsApp Cloud API directly (free tier, more setup), or a BSP (Gupshup, Twilio, Interakt, etc. — paid, easier onboarding, India-specific ones handle template approval for you). This app is a multi-tenant SaaS, so whichever you pick needs to support per-tenant phone numbers or a shared-number + routing model.
2. **LLM provider.** Given this is Claude Code, the natural default is the **Anthropic API** (a Claude model) for intent parsing, summarization, and the InZi assistant. I'll build against that unless you tell me otherwise — but you'll need an Anthropic API key in `.env` (`ANTHROPIC_API_KEY`).
3. **Drug-drug interaction dataset**, for §5 in the original gap list. This is a licensed clinical dataset (e.g., a commercial interaction-checking API, or a curated open dataset like a subset of DrugBank/RxNorm depending on license terms). I'm flagging this as its own decision — it's the one item in the whole plan that's a clinical-safety feature, so I'd rather you explicitly choose the source than have me pick a random dataset.

Everything else below (§0–§9 minus the interaction dataset) can proceed without waiting on you, using seed/mock data until real credentials exist — same pattern as the current WhatsApp webhook, which already runs fully mocked.

---

## B. Shared infrastructure (build once, used by almost everything)

### B1. `lib/ai/client.ts` — single LLM entry point
One wrapped client (Anthropic SDK), with a small set of typed helper functions rather than raw prompt strings scattered across the codebase:
```ts
classifyWhatsAppIntent(text: string, context?: ConversationContext): Promise<IntentResult>
generateConsultSummary(input: ConsultSummaryInput): Promise<string>
answerClinicalQuery(question: string, context: KbContext[]): Promise<string>
extractLabValues(imageUrl: string): Promise<ExtractedLabResult[]>
extractPaymentScreenshot(imageUrl: string): Promise<ExtractedPayment>
```
Every AI-touching feature (Receptionist, Co-Pilot, InZi, Lab parsing, UPI verification) calls through this one file — no direct SDK calls from route handlers or page components. This keeps model/provider choice swappable in one place and gives you a single spot to add logging/cost tracking later.

### B2. `lib/whatsapp/client.ts` — real send/receive, replacing the mock
Today: `/api/whatsapp/webhook` accepts a hand-shaped JSON body and `WhatsAppMessageStatus.SENT` is set without sending anything. This becomes:
- Inbound: real webhook signature verification (provider-specific), parsing the provider's payload shape into the same internal `WhatsAppMessage` row shape already in the schema — **no schema change needed here**, `rawPayload Json` already stores whatever comes in.
- Outbound: an actual `sendWhatsAppMessage(tenantId, toPhone, body)` that calls the provider's send API, replacing every place that currently just creates an `OUTBOUND`/`SENT` row (the invoice-via-WhatsApp form on `/admin`, booking confirmations once §2 exists).
- Media handling: inbound image messages (for §7's UPI screenshots) need a new payload branch — provider APIs give you a media URL/ID to fetch, not inline bytes.

### B3. Conversation state (needed for multi-turn booking, §1)
`WhatsAppMessage.relatedAppointmentId` is `@unique` — a 1:1 link from one message to one appointment, not a thread key. Rather than repurpose it, add a new model:
```prisma
model WhatsAppConversation {
  id            String   @id @default(cuid())
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  phone         String
  state         String   // e.g. "AWAITING_DOCTOR_CHOICE", "AWAITING_TIME_CONFIRM"
  context       Json      // slot-filling data collected so far
  lastMessageAt DateTime @default(now())
  expiresAt     DateTime  // stale conversations auto-expire, e.g. now + 30min

  @@unique([tenantId, phone])
  @@index([tenantId, expiresAt])
}
```
Every inbound message looks up (or creates) a `WhatsAppConversation` by `(tenantId, phone)`, and the AI intent classifier is given the current `state`/`context` as part of its prompt so multi-turn slot-filling works. This is additive — doesn't touch `WhatsAppMessage`.

### B4. Notification/escalation channel (needed for emergency escalation, §1; critical lab alerts, §6)
Rather than build a bespoke path for each escalation type, one shared primitive:
```prisma
model StaffAlert {
  id         String   @id @default(cuid())
  tenantId   String
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  kind       String   // "EMERGENCY_WHATSAPP" | "CRITICAL_LAB_RESULT"
  message    String
  relatedId  String?  // e.g. WhatsAppMessage.id or LabOrderItem.id, untyped on purpose (polymorphic)
  acknowledgedById String?
  acknowledgedAt   DateTime?
  createdAt  DateTime @default(now())

  @@index([tenantId, acknowledgedAt])
}
```
Both §1's emergency flag and §6's critical-value alert write a `StaffAlert` row and (if WhatsApp/SMS delivery to staff is in scope — confirm with you) send an outbound message via B2. A small `/admin` banner or a new `/admin/alerts` page lists unacknowledged ones. This is the one place where I'd want your input on delivery channel (WhatsApp to staff phones? Email? In-app only to start?) before building the send side — the data model and in-app list work regardless.

---

## C. Per-feature plan, with cross-effects called out

### C1. AI Receptionist (§1 from the gap list)
**Changes:** `/api/whatsapp/webhook` route rewritten to: verify signature (B2) → look up/create `WhatsAppConversation` (B3) → call `classifyWhatsAppIntent` (B1) with conversation context → branch on intent (`book`/`reschedule`/`cancel`/`ask_question`/`emergency`) → for `book`, drive slot-filling turns using C2's real availability function instead of the hardcoded next-day-10am; for `emergency`, write a `StaffAlert` (B4) and short-circuit to a "help is on the way" auto-reply; for `ask_question`, call `answerClinicalQuery` (B1) against `KnowledgeBaseDocument` context.
**Effects on other features:** Replaces the fixed-slot logic entirely — Reports still reads from `Appointment`/`PatientJourneyEvent` unchanged, so nothing there breaks. Queue (post-PR#6) reads from `QueueStageEntry`/`QueueStageConfig`, which are keyed off `Appointment`, not the booking path — a real vs. heuristic booking doesn't change how Queue tracks a patient once booked, so no changes needed there either. `Inbox` UI (`/admin/inbox`) needs no changes — it already just lists `WhatsAppMessage` rows regardless of how they got created.

### C2. Smart Scheduling (§2)
**Changes:** New `lib/scheduling.ts`: `getAvailableSlots(doctorId, dateRange)` reading `Doctor.workingHours` (already exists, currently unused — `Json?` field with zero readers today) against existing `Appointment` rows to compute free slots. Slot locking via a short-lived `SlotHold` row (`doctorId`, `datetime`, `expiresAt`) checked-and-inserted in a transaction at booking time, cleaned up by a cron or lazily on next read. New `Waitlist`/`WaitlistEntry` models; cancelling an appointment (existing `setAppointmentStatus` in doctor actions) gains a hook to check the waitlist and notify (via B2) the next patient in line.
**Effects on other features:** `Doctor.workingHours` finally gets a real consumer — currently dead data. The walk-in booking form on `/admin` should also switch to `getAvailableSlots` for consistency (today it lets staff pick any time freely, which is fine for walk-ins but worth deciding whether to keep unconstrained or route through the same availability check — flagging as a decision point, not assuming). Appointment cancellation flow in `(doctor)/doctor/actions.ts` gains a side effect (waitlist notify) it doesn't have today.

### C3. Doctor Co-Pilot (§3)
**Changes:** `lib/copilot.ts`: `generatePreConsultSummary(appointmentId, tenantId)` gathers `VisitRecord` history, `LabOrder`+`LabOrderItem` results, active `Prescription`s for the patient, plus relevant `KnowledgeBaseDocument` snippets, and calls B1's `generateConsultSummary`. New panel on `/doctor` (expandable per appointment row) or a `/doctor/[appointmentId]/summary` page. Uses `Doctor.specialty` (already exists in schema) to pick a prompt template — no schema change needed there, just a `SPECIALTY_PROMPTS: Record<string, string>` map.
**Effects on other features:** Read-only — doesn't write to any existing model, so zero risk to Queue/Reports/journey events. `KnowledgeBaseDocument` goes from zero consumers to a real one, which is worth telling whoever's populating it — the retrieval quality depends on what's actually uploaded there today.

### C4. Check-in & Vitals Capture (§4) — ✅ SHIPPED (PR #5)
**Built:** New `Vitals` model (`patientId`, `appointmentId?`, `bp`, `glucose`, `weight`, `spo2`, `recordedAt`, `source: IN_CLINIC | WHATSAPP` — only `IN_CLINIC` has a write path so far). `lib/vitals.ts`: `recordVitals`, `listVitalsForPatient`. `recordVitals` fires the existing `recordJourneyEvent(..., "VITALS_TAKEN")` when an `appointmentId` is given — **this is the line that finally made the previously-decorative `VITALS_TAKEN` label real**. A dedicated `/admin/queue/[appointmentId]/vitals` page holds the recording form + that patient's vitals history; after PR #6's Queue rebuild, this is now reached via a "Record vitals →" link inside the Queue board's Vitals stage cell (once that stage is started) rather than a bare per-row link on the old flat table. Patient chart (`/admin/patients/[id]`) shows a vitals history table.
**Not built (still open)**: WhatsApp-based between-visit vitals capture — that still needs B1 (LLM) + B2 (real WhatsApp) + B3 (conversation state), none of which exist yet, plus a new `"AWAITING_VITALS"` conversation state and a classifier prompt to extract structured numbers from free text.
**Effects on other features:** `/admin/reports`' Self-Efficacy tab computes booked→vitals→OPD gaps from `PatientJourneyEvent` — now that `VITALS_TAKEN` is actually recorded, those numbers are real going forward instead of always falling back; anyone treating pre-PR#5 Self-Efficacy numbers as a baseline should be aware the underlying data changed.

### C5. Real-Time Consultation Assistance (§5)
**Changes:** Blocked on the vendor decision in §A.3 for interaction checking. Once a dataset/API is chosen: `Patient` gains `allergies String?` / a small `PatientMedicationNote` free-text or structured list; `lib/interactions.ts` checks a `Prescription`'s items against active meds + allergies before `dispensePrescription`/`createPrescription` commits, surfacing a warning (not a hard block, unless you want it to be — flagging as a decision). Treatment-suggestion personalization reuses C3's Co-Pilot infrastructure with a narrower prompt.
**Effects on other features:** If interaction warnings are made blocking, `createPrescriptionAction`/`dispensePrescriptionAction` in `/admin/pharmacy/actions.ts` gain a new failure path — anything scripted or tested against those actions today would need to account for a possible warning/block response.

### C6. Lab Intelligence (§6)
**Changes:** `attachLabReport` (already exists) gains a post-step: if the attached file is an image, call B1's `extractLabValues`, auto-populate `LabOrderItem.resultValue`/`resultUnit`/`referenceRange`, and compute `LabResultFlag` by comparing against the reference range instead of a manual select. On `flag = CRITICAL`, write a `StaffAlert` (B4) and send a WhatsApp message to the ordering doctor.
**Effects on other features:** `/admin/lab/orders` UI changes from "type in the result" to "review/correct the AI-extracted result" — a meaningfully different interaction, worth a quick look together before it ships rather than a silent swap. Trend charts on the patient chart page follow the same pattern as C4's vitals charts.

### C7. Pharmacy & Billing upgrade (§7)
**Changes:** `Service`/`Medicine` gain optional `hsnCode`/`sacCode`. Since there's no invoice PDF/printable output anywhere in the app today, GST-compliant invoicing needs that to exist first — a new `lib/invoicePdf.ts` (or an HTML print view, cheaper to build than real PDF generation) rendering `Invoice` + line items + computed GST breakup using `HospitalSettings.pharmacyGstNumber`. UPI screenshot verification: new inbound-media branch in B2's webhook handling → B1's `extractPaymentScreenshot` → auto-match against open `Invoice`s by amount, creating a `Payment` with a new `verificationSource: "AI_VISION"` field, flagged for staff review rather than auto-confirmed (recommend not fully automating money reconciliation without a human check — flagging as a deliberate choice, not a default I'd silently ship).
**Effects on other features:** New `Payment.verificationSource` field is additive, existing manual-entry payments keep working unchanged. `/admin/billing` and `/admin/pharmacy/invoices` would want a filter/badge for AI-verified-but-unreviewed payments.

### C8. Follow-Up Engine upgrade (§8)
**Changes:** `FollowUp` gains `escalationStage Int @default(0)`. A scheduled job (see §D — this app has no job runner today) checks overdue reminders and bumps the stage, sending a WhatsApp re-send via B2. New `RecallSchedule` model for perpetual chronic-patient recall (recurring interval instead of a single `dueDate`), separate from `FollowUp` since the semantics genuinely differ (one-shot vs. open-ended).
**Effects on other features:** `/admin/schedule/reminders` UI gains an escalation-stage column; nothing else reads `FollowUp` today so this is low-risk.

### C9. InZi AI Assistant (§9)
**Changes:** A chat panel (client component, the first genuinely stateful client-side UI in an otherwise server-action-only app — worth noting as a departure from the current zero-client-JS convention, done deliberately here since a chat UI can't be a plain form) calling a new server action that wraps B1's `answerClinicalQuery`/general Q&A, scoped by role (staff onboarding questions vs. doctor clinical questions use different context/prompts).
**Effects on other features:** None structurally — purely additive UI. Shares B1/B2 infrastructure with C3.

---

## D. One more piece of shared infrastructure this plan depends on: a job runner

Several features above (§C2 slot-hold cleanup, §C8 escalation checks, potentially §C1's conversation expiry) need something to run periodically. This app currently has **no background job/cron mechanism at all** — everything today is request-triggered (a page load or a form submit). Options: a simple `node-cron` process alongside `next dev`/the production server, a Vercel Cron Job hitting an API route on a schedule, or an external queue (BullMQ + Redis) if volume ever justifies it. For this app's scale, a Vercel Cron Job calling a `/api/cron/*` route is the least new infrastructure — flagging this as its own small decision rather than bundling it silently into §C8.

---

## E. Suggested build order (unchanged from the original sequencing, restated with the shared-infra pieces folded in)

1. ~~**C4** (Vitals capture)~~ — ✅ shipped (PR #5), plus the unplanned Queue live-tracker rebuild (PR #6) that now hosts it.
2. **B1 + B2** (LLM client, real WhatsApp client) — foundation, nothing else below is real without it. Requires your Anthropic key + WhatsApp provider choice (§A.1, §A.2).
3. **B3 + B4 + C1 + C2** (conversation state, alerts, real AI Receptionist, real scheduling) — the core WhatsApp booking rebuild, highest visible impact.
4. **C3 + C9** (Co-Pilot + InZi) — share infrastructure, natural to build together.
5. **C6** (Lab parsing/alerts) — needs vision extraction; **C5** (interaction checking) waits on §A.3's dataset decision.
6. **C7** (GST/UPI) — needs an invoice-PDF/print view built first as a sub-step.
7. **C8** (escalation/recall) — needs §D's job runner decided first.

Each numbered step above would get its own schema migration + `lib/` functions + pages + browser verification + commit, same discipline as every phase shipped so far — I'd turn this into an `ASSIGNMENTS.md`-style phase list once you've weighed in on §A and the flagged decision points (D, C2's walk-in-booking question, C5's block-vs-warn, C7's auto-confirm-vs-review).
