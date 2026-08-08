# Data retention policy (DRAFT)

**Status:** Draft. Not adopted. Retention periods below are placeholders
based on common HIPAA-adjacent practice (varies by jurisdiction and
record type) — the Privacy & Security Officer should confirm actual
legal requirements for wherever this organization operates before
treating any period here as final.

## What this app currently does (as-built, not policy)

No automated deletion or retention enforcement exists in the codebase
today. Every record (patients, visit records, lab results, invoices,
audit logs, WhatsApp message records) persists indefinitely once created.
This document is the starting point for deciding what retention *should*
be, which would then need to be built (scheduled deletion jobs, or a
manual purge process) — it isn't describing something already
implemented.

## Draft retention periods (needs confirmation, not yet enforced)

| Data category | Draft retention period | Rationale (draft) |
|---|---|---|
| Clinical records (`VisitRecord`, `LabOrderItem`, `ImagingOrder`, `Vitals`, `Prescription`) | Minimum required by applicable medical-records law (commonly 7+ years, sometimes longer for minors) — **confirm the real figure for this jurisdiction before relying on this** | Medical record retention laws typically outlive typical "delete after inactivity" defaults |
| Financial records (`Invoice`, ledger entries) | Per applicable tax/financial record-keeping law (commonly 6-7 years) | Standard financial audit trail requirement |
| `AuditLog` entries | At least as long as the clinical records they document access to, since they're the evidence trail for those records | An audit log that expires before the record it documents defeats its purpose |
| `WhatsAppMessage` records (delivery metadata, not the document content itself — documents are generated fresh per send, not stored long-term as `GeneratedDocument` rows beyond what's needed for redelivery) | Shorter — this is operational/delivery metadata, not the clinical record itself | Lower sensitivity than the underlying document |
| `LoginAttempt` rows (rate-limiting) | Short (days, not years) — only needed for the 15-minute rate-limit window itself | Pure operational data with no clinical or business retention value; currently has no cleanup job, which is a minor unbounded-growth issue worth fixing regardless of the compliance angle |
| Database backups (`scripts/backup-db.sh`, `.github/workflows/backup.yml`) | A bucket lifecycle policy should expire old backups after a defined window (e.g. 30-90 days of daily backups, longer-interval backups kept longer) — not yet configured | Indefinite backup accumulation is both a cost problem and a compliance surface (more copies of PHI sitting around than necessary) |
| Data for patients who request deletion (if/when a "right to erasure"-style request is received) | Needs a defined process — not yet built | Applicable under DPDP and similar frameworks; conflicts with medical-record retention minimums need a documented resolution (e.g. anonymize rather than delete where law requires keeping the clinical record) |

## Open items before this is real policy, not draft

- [ ] Confirm actual legal retention minimums for the organization's
      jurisdiction(s) with legal counsel.
- [ ] Decide and document the resolution between "patient requests
      deletion" and "law requires keeping the clinical record."
- [ ] Build the retention enforcement (scheduled deletion/anonymization
      jobs) once periods are confirmed — none exists today.
- [ ] Configure a bucket lifecycle rule for old backups.
- [ ] Add a cleanup job for expired `LoginAttempt` rows (operational
      hygiene, not itself a compliance requirement).
