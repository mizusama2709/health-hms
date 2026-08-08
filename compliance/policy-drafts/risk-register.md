# Risk register (DRAFT — starter)

**Status:** Draft, not a completed formal risk assessment. A real risk
assessment needs the Privacy & Security Officer (once named — see
`privacy-security-officer-role.md`) to review, add anything specific to
the organization's actual deployment (physical office access, staff
device policy, vendor contracts) that isn't visible from the codebase, and
formally accept/mitigate/transfer each entry. What's below is seeded from
the concrete, already-identified technical gaps in `COMPLIANCE.md`'s
"Deferred" section plus a few structural risks visible from how the app
is built — a real starting point, not a fabricated compliance artifact.

Likelihood/impact are rough (High/Medium/Low), for prioritization only.

| # | Risk | Likelihood | Impact | Current mitigation | Residual risk / next step |
|---|---|---|---|---|---|
| 1 | `AUTH_SECRET` leaks (env var exposure, compromised deploy credential) — since the PHI encryption key is derived from it (`lib/phiCrypto.ts`), this is also a full PHI-decryption key leak, not just a session-forgery risk | Low | Critical | Secret is stored in deployment platform's env var store, not in source | No key rotation capability exists — a leak requires re-encrypting all PHI columns, not just rotating a secret. Move to a real KMS (COMPLIANCE.md) before this app holds PHI at scale. |
| 2 | Database compromise (stolen credentials, unpatched Postgres, misconfigured network access) exposes PHI at rest | Medium | Critical | Field-level encryption on the highest-sensitivity free-text columns (visit notes, diagnosis, lab results, imaging descriptions, vitals BP) | `Vitals.glucose`/`weight` (Decimal columns) are still plaintext at rest (COMPLIANCE.md). Infrastructure-level encryption-at-rest and `sslmode=require` are host configuration, not yet confirmed set on the actual deployment target. |
| 3 | A subprocessor (WhatsApp/Meta, the S3-compatible storage provider, the hosting platform, the Postgres host) mishandles or is breached with PHI in their custody | Medium | Critical | None specific to this app — relies entirely on the subprocessor's own security posture | No BAAs/DPAs are currently signed with any subprocessor (see `subprocessor-agreements.md`). This is the single largest open item before real patient data should flow through the app. |
| 4 | Staff credential compromise (phishing, password reuse, weak password) leads to unauthorized PHI access | Medium | High | Postgres-backed login rate limiting (5 attempts/15 min, multi-instance-safe), bcrypt password hashing, 30-minute session idle timeout, RBAC route restrictions (`lib/roles.ts`) | No MFA. No password complexity/rotation policy. No staff security-awareness training program exists yet. |
| 5 | A staff member with legitimate access views/exports PHI outside their clinical need ("browsing") | Medium | High | Audit logging on chart views, exports, and role changes; automated alerting on 20+ patient views/hour by one user (`lib/auditAlerts.ts`) | Alerting is threshold-based and reactive (hourly job), not real-time blocking. No periodic manual audit-log review is scheduled — needs an owner (see role doc). |
| 6 | WhatsApp message delivery failure or misrouting sends a document (invoice, prescription, lab report, consultation summary) to the wrong phone number or fails silently | Low | High | Signed, time-limited download tokens (a leaked link expires); delivery-status webhook updates message status and raises a notification on failure | Phone number correctness at data-entry time is not independently verified (no OTP/confirmation step on the number a document is sent to). |
| 7 | `WHATSAPP_PROVIDER=meta` is enabled in production before Meta's message-template approval is complete | Medium (if rushed) | Medium | `MetaWhatsAppProvider` fails loudly (status `FAILED`, visible to staff) rather than silently on a rejected send | Free-text sends outside the 24-hour customer-service window will be rejected by Meta until templates are submitted and approved — a manual, non-code step (see `ARCHITECTURE.md`). Don't flip this in production until template approval is confirmed. |
| 8 | No third-party security review or penetration test has been performed on this application | High (as a certainty — none has happened) | Unknown until assessed | Internal engineering-led hardening passes (this document's own history) | Not a substitute for independent review. Needed before any formal certification (SOC 2, ABDM empanelment) claim. |
| 9 | Backup dumps (`scripts/backup-db.sh` output, and the automated GitHub Actions copy) contain full plaintext-adjacent PHI (encrypted columns stay encrypted, but the dump itself needs the same access control as production) | Low | Critical | `backups/` is gitignored; automated backups go to the same access-controlled bucket as imaging files | No confirmed retention/expiry policy on backup objects yet (see `data-retention-policy.md`) — old backups could accumulate indefinitely without a bucket lifecycle rule. |
| 10 | No named individual is accountable for any of the above | High (currently true) | High (everything above stays unmanaged) | This document exists | Close by filling `privacy-security-officer-role.md`. This is the prerequisite for every other row's "next step" actually happening. |

## Review cadence

Not yet set — the Privacy & Security Officer should set and own this once
named (quarterly is a reasonable default). Re-review immediately after any
suspected incident (see `incident-response-policy.md`).
