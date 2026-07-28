# Architecture — Health HMS

Multi-tenant SaaS replacing a traditional hospital management system: appointments, follow-ups, patient records, billing, staff/doctor management. Built for multiple hospitals/clinics (tenants), each with isolated data.

## Stack

- **Framework**: Next.js (App Router, TypeScript, Tailwind)
- **Database**: PostgreSQL + Prisma ORM
- **Multi-tenancy**: shared DB, `tenantId` on every row, scoped queries per tenant
- **Auth**: Clerk or NextAuth (TBD) — roles: `PATIENT`, `DOCTOR`, `ADMIN_RECEPTION`, `SUPER_ADMIN`
- **Reminders**: scheduled job for follow-up/appointment notifications
- **Mobile**: deferred — responsive web first

## Data Model

See `prisma/schema.prisma`: `Tenant`, `User`, `Doctor`, `Patient`, `Appointment`, `FollowUp`, `VisitRecord`, `Invoice`.

## Build Order

1. Foundation — auth, tenant model, role-scoped routing
2. Appointments — booking, availability, cancel/reschedule
3. Follow-ups — auto-suggestion after visits, reminders
4. Patient records — visit history, prescriptions
5. Billing — invoice generation, payment status (real gateway later)
6. Admin/reception console
7. Super-admin — tenant onboarding, plans

## Repo Layout

```
health-hms/
  src/
    app/(patient)/ (doctor)/ (admin)/ api/
    lib/db.ts auth.ts tenant.ts
  prisma/schema.prisma
  jobs/follow-up-reminders.ts
  ARCHITECTURE.md
```

## Deferred (not v1)

- Real payment gateway integration (stub billing status only)
- Native mobile app
- Compliance work (HIPAA/ABDM-equivalent) — revisit once onboarding real hospitals
