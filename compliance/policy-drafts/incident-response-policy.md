# Incident response policy (DRAFT)

**Status:** Draft. Not adopted. Needs review by whoever holds the Privacy
& Security Officer role (`privacy-security-officer-role.md`) and
adaptation to the organization's actual legal obligations (breach
notification deadlines vary by jurisdiction — HIPAA's 60-day rule and
India's DPDP Act have different requirements; this draft doesn't pick one
for you).

## What counts as an incident

Any of the following, suspected or confirmed:

- Unauthorized access to, or disclosure of, patient data (PHI).
- Loss or theft of a device, credential, or backup containing PHI.
- A security vulnerability in the application that could have exposed PHI
  (even if there's no evidence it was exploited).
- A subprocessor (see `subprocessor-agreements.md`) reports a breach that
  could involve this organization's data.
- Unusual account activity flagged by the automated audit alerting
  (`lib/auditAlerts.ts` — SUPER_ADMIN grants, bulk report exports, or
  20+ patient chart views by one user in an hour) that isn't explained by
  known legitimate work.

## Response steps (draft)

1. **Contain.** If the cause is known and ongoing (e.g. a compromised
   account), stop it first — disable the account (`updateStaffStatus`),
   rotate the relevant secret, or take the affected system offline if
   necessary. Don't wait for full investigation to stop active harm.
2. **Notify the Privacy & Security Officer immediately.** They're the
   single point of contact and the one who decides next steps, including
   whether the incident meets the threshold for regulatory notification.
3. **Preserve evidence.** Don't delete logs, audit records, or the
   affected data/system state before it's been reviewed — `AuditLog`
   entries and the structured logs from `lib/logger.ts` are the primary
   evidence trail; make sure they aren't lost to a log-rotation window
   before someone's looked at them.
4. **Investigate scope.** What data, how many patients/records, what time
   window. `AuditLog` (who viewed/exported what) and `WhatsAppMessage`
   delivery records are the most likely sources of truth for this app
   specifically.
5. **Notify affected parties and regulators if required.** Timeline and
   requirements depend on jurisdiction and the nature of the breach — this
   is a legal decision, not an engineering one; the Privacy & Security
   Officer should involve legal counsel here.
6. **Remediate.** Fix the root cause — this might mean a code fix, a
   credential rotation, a process change, or a subprocessor conversation.
7. **Post-incident review.** Add or update a row in `risk-register.md` if
   the incident revealed a risk that wasn't already tracked, or update the
   likelihood/mitigation of an existing row.

## Who to contact

**Not yet filled in** — depends on `privacy-security-officer-role.md`
being assigned to a real person first.
