# Privacy & Security Officer — role definition (DRAFT)

**Status:** Draft. Nobody is currently assigned this role. Every other
document in this folder assumes this role exists and is filled — none of
them are self-enforcing.

## Why this role has to exist before the rest of the program works

HIPAA-style programs (and ABDM/DPDP-equivalent frameworks) require a named
individual accountable for privacy and security decisions — not a
committee, not "the engineering team," one person who can be pointed to.
Every other document in this folder — the risk register, the incident
response policy, the retention policy — has a step that says "the Privacy
& Security Officer decides/approves/is notified." Without someone actually
holding the role, those steps are no-ops.

## Responsibilities (draft scope)

- Owns and periodically reviews `COMPLIANCE.md` and this policy folder.
- Final decision-maker on the risk register (`risk-register.md`) — accepts,
  mitigates, or transfers each risk; reviews it at least quarterly or
  after any incident.
- Point of contact named in the incident response policy — the person who
  gets called first when a breach is suspected, and who decides whether it
  meets the threshold for regulatory notification.
- Approves new subprocessors before they touch PHI (see
  `subprocessor-agreements.md`) and tracks which BAAs/DPAs are signed vs.
  outstanding.
- Reviews staff role/access grants (`Role` assignments — see
  `access-control-policy.md`) on a regular cadence, not just at
  onboarding.
- Signs off before real patient data flows through a newly-enabled
  integration (e.g. before flipping `WHATSAPP_PROVIDER=meta` into
  production with real message templates).

## Who this could be

Not an engineering decision — needs someone with organizational authority
(a founder, a compliance hire, or a contracted privacy consultant for a
smaller org). Can be a part-time or fractional responsibility early on,
but must be a named individual, not a role left unfilled "for now."

## Open items

- [ ] Name the person.
- [ ] Give them access to whatever this org uses for tracking (this repo,
      a ticketing system, etc.) so the responsibilities above are
      actionable, not aspirational.
- [ ] Set the review cadence referenced above (quarterly is a reasonable
      default, not a requirement).
