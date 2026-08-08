# Policy drafts

**Every document in this folder is a draft.** None of these are adopted,
approved, or in effect — they are starting points for the business/legal
side of compliance work that engineering cannot complete alone (see
`COMPLIANCE.md`'s "Everything organizational" section). Each still needs:

- Review and sign-off by someone with legal/regulatory authority to adopt
  it on the organization's behalf.
- A named owner (see `privacy-security-officer-role.md` — the role has to
  be assigned to an actual person before these policies mean anything).
- Adaptation to the organization's actual legal entity, jurisdiction, and
  business practices — these drafts are scoped to what's inferable from
  the codebase, not to specifics only the business knows (registered
  entity name, actual office address, applicable law beyond "HIPAA/DPDP/
  ABDM-style" generalities, retention periods that reflect real legal
  requirements rather than the current technical implementation).

## What's here

| File | Covers |
|---|---|
| `privacy-security-officer-role.md` | The role that needs to be assigned to a real person before the rest of this program has an owner |
| `risk-register.md` | A starter risk register, seeded from the concrete technical gaps already tracked in `COMPLIANCE.md`'s "Deferred" section |
| `subprocessor-agreements.md` | Every third-party service this app's code sends data to, and what agreement (BAA/DPA) each one needs before real patient data flows to it |
| `incident-response-policy.md` | Draft: what happens when a breach/incident is suspected |
| `data-retention-policy.md` | Draft: how long PHI and related records are kept, and the deletion process |
| `access-control-policy.md` | Draft: who gets which `Role`, how access is granted/revoked, review cadence |
| `patient-privacy-notice.md` | Draft: the patient-facing notice describing what data is collected and how — this app has no patient-facing interface (patients only receive documents via WhatsApp; see `ARCHITECTURE.md`), so this notice needs a real distribution channel decided (e.g. sent as the first WhatsApp message, printed at intake) before it does anything |

## Not here

Formal third-party certification (SOC 2, ABDM empanelment, or equivalent)
is an audit engagement with an external firm, not a document — it happens
*after* the above is adopted and the technical controls in `COMPLIANCE.md`
are in place, not instead of them.
