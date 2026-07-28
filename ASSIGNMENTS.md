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
