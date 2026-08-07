# Architecture — Health HMS

Multi-tenant SaaS replacing a traditional hospital management system: WhatsApp-driven appointment booking, appointments dashboard, calendar, billing (bill patient / invoices / consolidated ledger), reports (master report / transactions / self-efficacy patient journey), staff management, organization settings, and hospital settings (registration, departments, booking policy, payment config, branding, pharmacy returns, knowledge base). Built for multiple hospitals/clinics (tenants), each with isolated data.

## Stack

- **Framework**: Next.js (App Router, TypeScript, Tailwind)
- **Database**: PostgreSQL + Prisma ORM
- **Multi-tenancy**: shared DB, `tenantId` on every row, scoped queries per tenant (manual — every `lib/` function takes an explicit `tenantId` param, no Prisma middleware/extension)
- **Auth**: NextAuth v5 (Credentials provider, JWT sessions) — roles: `PATIENT`, `DOCTOR`, `ADMIN_RECEPTION`, `SUPER_ADMIN`, `NURSE`, `RECEPTIONIST`, `LAB`, `PHARMACIST`
- **Authorization**: `lib/authz.ts` (`requireRole()`) for role gating in Server Actions, alongside `lib/tenant.ts` (`requireTenantId()`) for tenant scoping
- **WhatsApp**: inbound booking + outbound invoice delivery, built against a `WhatsAppProvider` interface (`lib/whatsapp/provider.ts`) with a mock implementation (`lib/whatsapp/mockProvider.ts`) until real credentials exist
- **Reminders**: `runFollowUpReminders` (`lib/followUpReminders.ts`) dispatches whatever staff scheduled via the Reminders page (`FollowUp.reminderScheduled`/`reminderAt`/`reminderMessage`) once `reminderAt` arrives — triggered via a secret-protected route (`api/jobs/follow-up-reminders`, `CRON_SECRET`-gated) on Vercel Cron (`vercel.json`)
- **Mobile**: deferred — responsive web first

## Data Model

See `prisma/schema.prisma`. Core: `Tenant`, `User`, `Doctor`, `Patient`, `Appointment`, `FollowUp`, `VisitRecord`. Billing: `Invoice`, `InvoiceLineItem`, `Payment`, `Refund` (an invoice can exist without an appointment, for standalone lab/pharmacy bills, and an appointment can have multiple invoices). Reports: `PatientJourneyEvent` (append-only per-step log powering the self-efficacy report). Org/settings: `OrganizationProfile`, `HospitalSettings`, `Department`, `PharmacyReturn`, `KnowledgeBaseDocument`. Integration: `WhatsAppMessage` (audit log for both inbound webhook processing and outbound mock-sends).

## Build Order

1. Foundation — auth, tenant model, role-scoped routing [done]
2. Schema expansion — billing/reports/staff/org/settings/WhatsApp models, shared `requireRole()`/`ROLE_HOME` helpers
3. Appointments extended + billing primitives (create invoice, record payment)
4. Billing complete (refunds, invoice list, consolidated ledger) + appointment dashboard backend
5. Calendar + patient journey event tracking
6. Reports (master report, transactions, self-efficacy)
7. Staff, Organization, Hospital settings (departments, payment settings, pharmacy returns, knowledge base)
8. WhatsApp integration (mocked provider; real provider swap-in later) — built last, isolated behind the `WhatsAppProvider` interface

## Repo Layout

```
health-hms/
  src/
    app/(patient)/ (doctor)/ (admin)/ api/
    lib/
      db.ts auth.ts tenant.ts authz.ts roles.ts
      appointments.ts billing.ts reports.ts staff.ts
      organization.ts hospitalSettings.ts knowledgeBase.ts
      whatsapp/ provider.ts mockProvider.ts
      whatsapp.ts followUpReminders.ts cronAuth.ts
    app/api/jobs/follow-up-reminders/route.ts
  prisma/schema.prisma
  vercel.json
  ARCHITECTURE.md
```

## Deferred (not v1)

- Real WhatsApp provider (Meta Cloud API or a BSP) — mocked for now behind `WhatsAppProvider`
- Real payment gateway integration beyond a Razorpay link field (stub billing status only)
- Native mobile app
- Compliance work (HIPAA/ABDM-equivalent) — revisit once onboarding real hospitals
