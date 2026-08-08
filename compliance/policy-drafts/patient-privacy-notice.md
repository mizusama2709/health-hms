# Patient privacy notice (DRAFT)

**Status:** Draft language only. Not reviewed by legal, not published
anywhere, and — importantly — **not yet wired to any distribution
channel**. This app has no patient-facing interface by explicit product
decision (patients receive invoices, prescriptions, consultation
summaries, and lab reports via WhatsApp only, with no login or portal —
see `ARCHITECTURE.md`), which means there's currently no natural moment in
the product where a patient would see this notice. That has to be decided
before this document does anything:

- Sent as the first WhatsApp message when a patient's number is first
  registered?
- Printed and handed to the patient at in-clinic intake (a process step,
  not a code change)?
- Both?

## Draft notice text

> **[Organization name] — how we handle your information**
>
> When you visit [organization name], we collect and store health
> information about you — your visit notes, diagnoses, prescriptions, lab
> results, imaging records, vitals, and billing information — in order to
> provide your care and manage your treatment.
>
> **How we share documents with you.** We send your invoices,
> prescriptions, consultation summaries, and lab reports to you over
> WhatsApp, as a secure download link. These links expire after a limited
> time for your security. We do not use any other app or portal to share
> your health information with you.
>
> **Who can see your information.** Only clinical and administrative
> staff involved in your care and billing can access your records, and
> every access is logged. We do not sell your information or share it
> with advertisers.
>
> **Third parties we work with.** We use WhatsApp (Meta) to deliver
> documents to you, and [storage provider name] to securely store imaging
> files and backups. [Add any other subprocessor from
> `subprocessor-agreements.md` that touches patient data.]
>
> **How long we keep your information.** [Fill in once
> `data-retention-policy.md` periods are confirmed.]
>
> **Your rights.** [Fill in based on applicable law in this
> jurisdiction — e.g. right to access your records, right to request
> correction, and (subject to legal record-keeping requirements) right to
> request deletion.]
>
> **Questions or concerns.** Contact [Privacy & Security Officer contact
> info, once named].

## Open items before this can be published

- [ ] Legal review of the language above.
- [ ] Fill in every bracketed placeholder.
- [ ] Decide the distribution channel (see above) and, if it's the first
      WhatsApp message, that's a small code change once decided — not yet
      built.
- [ ] Translate if the patient population needs a language other than
      English.
