# Access control policy (DRAFT)

**Status:** Draft, describing both what the application already enforces
technically and what organizational process still needs to be adopted
around it. The technical half is accurate as of this writing (verified
against `src/lib/roles.ts` and `src/proxy.ts`); the process half (who
approves a role grant, review cadence) is not yet decided.

## Roles the application enforces today (technical, already built)

| Role | Access scope | Enforced by |
|---|---|---|
| `SUPER_ADMIN` | Unrestricted admin console access, including staff role management | `src/proxy.ts` + `src/lib/roles.ts` (no entry in `ROLE_ALLOWED_PREFIXES` means unrestricted) |
| `ADMIN_RECEPTION` | Unrestricted admin console access | Same as above |
| `RECEPTIONIST` | `/admin/patients`, `/admin/inbox`, `/admin/schedule`, `/admin/queue` only | `ROLE_ALLOWED_PREFIXES` |
| `NURSE` | Same scope as `RECEPTIONIST` | `ROLE_ALLOWED_PREFIXES` |
| `LAB` | `/admin/patients`, `/admin/lab`, `/admin/queue` only | `ROLE_ALLOWED_PREFIXES` |
| `PHARMACIST` | `/admin/patients`, `/admin/pharmacy`, `/admin/queue` only | `ROLE_ALLOWED_PREFIXES` |
| `DOCTOR` | Doctor console (`/doctor/*`), not the admin console | Separate route group + role check |
| `PATIENT` | No application access — this app has no patient-facing interface by design (patients receive documents via WhatsApp only) | N/A |

Route access and nav visibility are checked against the same
`ROLE_ALLOWED_PREFIXES` table (`src/proxy.ts` for enforcement, the admin
layout for what's shown), specifically so a role's visible nav links and
its actually-permitted routes can't drift apart — a gap that existed
before and was closed (see `COMPLIANCE.md` history: NURSE/LAB/PHARMACIST
previously had unrestricted admin access despite the nav suggesting
otherwise).

## What's not yet built or decided (process, not code)

- **Who approves a role grant.** `updateStaffRole`/`createStaffUser`
  (`src/lib/staff.ts`) are audited (who changed what, when — see
  `AuditLog`) and alerted-on for `SUPER_ADMIN` grants specifically
  (`lib/auditAlerts.ts`), but there's no approval *gate* before a grant
  happens — any existing `SUPER_ADMIN`/`ADMIN_RECEPTION` user can grant
  any role today, and the system only notices after the fact.
- **Periodic access review.** No process exists for reviewing "does this
  person still need this role" on a schedule — access is granted at
  onboarding and only revisited if someone thinks to check. The Privacy &
  Security Officer (once named) should own a recurring review (see
  `risk-register.md` row 5).
- **Offboarding.** `updateStaffStatus` can deactivate a user, but there's
  no documented checklist (revoke role, confirm no shared credentials,
  etc.) tied to someone leaving.
- **No MFA.** Authentication is email/password only (`src/lib/auth.ts`).
  Adding MFA is an engineering task once this is prioritized, not covered
  by this policy document.
- **Least-privilege defaults.** New staff should be granted the narrowest
  role that covers their actual job (e.g. `RECEPTIONIST` or `NURSE`, not
  `ADMIN_RECEPTION`, unless the broader scope is genuinely needed) — this
  is a process discipline the app doesn't enforce for you.

## Open items

- [ ] Decide and document the role-grant approval process.
- [ ] Set the periodic access review cadence and assign ownership.
- [ ] Write the offboarding checklist.
- [ ] Prioritize MFA if/when this scope is picked back up.
