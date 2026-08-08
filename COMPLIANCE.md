# Compliance posture — Health HMS

Technical controls toward a HIPAA/ABDM/DPDP-style program. **This document
tracks engineering controls only — it is not a compliance certification.**
Certification requires a named Privacy/Security Officer, a formal risk
assessment, signed data-processing agreements with every subprocessor, and
a third-party audit, none of which engineering can deliver alone.

## Technical safeguards — done

- **Field-level PHI encryption** (AES-256-GCM, `lib/phiCrypto.ts`): visit
  notes/diagnosis/prescription, follow-up focus instructions, follow-up
  call-log notes, lab result values/reference ranges, imaging order
  descriptions, and vitals blood pressure are encrypted at write time and
  transparently decrypted on every read path that displays them (verified
  live for each: ciphertext confirmed at rest via a raw DB read, plaintext
  confirmed on the actual page). Legacy pre-encryption plaintext rows are
  tolerated (`decryptPHIMaybe` passes through anything without the
  `enc:v1:` prefix) — no backfill migration required, but see "Deferred"
  below for what isn't covered yet.
- **Session idle timeout** (`lib/auth.ts`): 30-minute idle window
  (`session.maxAge`), refreshed every 5 minutes of active use
  (`session.updateAge`) — previously the JWT session had no configured
  `maxAge` and fell back to NextAuth's 30-*day* default with no idle logout
  at all.
- **Audit log coverage** (`lib/audit.ts`, `AuditLog` model): now covers
  patient chart views, visit-record writes, prescription creation, lab
  report PDF views, staff role/status changes and staff creation, invoice
  views, and report CSV exports. Previously only 4 event types were
  logged, and notably the staff role-change endpoint — the exact vector a
  prior privilege-escalation fix closed — wasn't audited at all.
- **Automated audit alerting** (`lib/auditAlerts.ts`, `api/jobs/audit-alerts`):
  a scheduled job (hourly via `vercel.json`) scans `AuditLog` for three
  concrete patterns — a grant of `SUPER_ADMIN`, a report export, or one
  user viewing 20+ patient charts within an hour — and raises each as a
  real notification through the in-app `Notification` bell rather than
  requiring anyone to go read raw audit rows.
- **Backup/restore** (`scripts/backup-db.sh`, `scripts/restore-db.sh`,
  `npm run db:backup` / `db:restore`): `pg_dump`/`pg_restore` wrapper
  scripts, verified end-to-end against the real dev database — full
  round-trip restore into a scratch database, row counts matched exactly
  across all tables. `backups/` is gitignored (dump files contain the same
  PHI the live database does).

## Deferred — needs real infrastructure or organizational decisions

- **Key management**: the PHI encryption key is currently derived from
  `AUTH_SECRET` via `scrypt` (see `lib/phiCrypto.ts`) — functional, but no
  rotation capability and a single point of failure if that secret leaks.
  Production should move to a cloud KMS (AWS KMS / GCP Cloud KMS / Vault).
  Not done here — it requires real cloud credentials this environment
  doesn't have, and integrating against a KMS that can never actually be
  tested isn't real progress.
- **Encryption coverage still stops short of `Vitals.glucose`/`weight`** —
  both are `Decimal` columns, so encrypting them needs a type change to
  `String` first, which touches every calculation that reads them (trend
  charts, etc.). Deliberately scoped out of the rest of this pass rather
  than rushed in as a drive-by schema change.
- **Encryption in transit / at rest at the infrastructure layer**: enforce
  `sslmode=require` on `DATABASE_URL` and enable the hosting provider's
  Postgres encryption-at-rest setting — both are host configuration, not
  application code, so they need to be set wherever this gets deployed.
- **Legacy plaintext backfill**: rows written before a given field's
  encryption coverage was added stay plaintext until they're next updated.
  A one-time backfill script (read, encrypt, write) would close that gap
  if a hard requirement to encrypt *everything already stored* exists.
- **Everything organizational**: named Privacy/Security Officer, formal
  risk assessment, written incident-response/retention/access-control
  policies, signed BAAs/DPAs with every subprocessor, staff training, a
  patient-facing privacy policy (none exists yet), and the actual
  third-party audit engagement (SOC 2, ABDM empanelment, or both). This is
  the longer pole and needs a decision-maker on the business side to start
  in parallel — see the "Compliance (HIPAA/ABDM-equivalent)" discussion
  this document's history was born from for the full breakdown.

## Operational notes

- `CRON_SECRET` must be set in the deployment environment for
  `api/jobs/follow-up-reminders` and `api/jobs/audit-alerts` to run —
  both fail closed (401) if it's unset, matching the existing
  `WHATSAPP_WEBHOOK_SECRET` pattern.
- Vercel's Hobby plan caps cron jobs at once-per-day granularity; the
  hourly `audit-alerts` schedule in `vercel.json` needs at least a Pro
  plan, or should be turned into a daily schedule if staying on Hobby.
