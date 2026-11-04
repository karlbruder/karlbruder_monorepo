# 0008: Shared files and archived content

**Created**: 2026-11-04
**Last updated**: 2026-11-04

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Sources | Product-owner decisions during [issue #69](https://github.com/karlbruder/karlbruder_monorepo/issues/69), including shared file metadata, reusable archives and the ArchivedFile name. Request to record the rationale on 4 November 2026 |

## Context

Registration uploads and linked tournament policies both need private object
storage. They have different meanings. A payment proof belongs to a registration.
A captured rules document represents the content offered for acceptance.

Keeping all metadata in a registration document would make other capabilities
depend on tournaments. Keeping policy captures in tournaments would create the
same problem for future terms of service and privacy policies.

## Decision

Keep both records and their storage mechanisms in `app/core/files/`. An archive
is a file capability, so it does not need a separate core documents package.

| Record | Responsibility |
| --- | --- |
| StoredFile | Identify a stored object and retain its storage key, original name, media type, size and creation time |
| ArchivedFile | Reference a StoredFile and retain its SHA-256, archive time and optional source/final URLs as preserved content evidence |
| Domain association | Explain what a file means, who can access it, which validation rules apply and how it participates in a workflow |

`archive_file` stores caller-validated bytes under a fresh key and returns an
archive record. It does not choose a policy purpose, authorize a user or commit a
database transaction. The consuming workflow persists the result and owns cleanup
if its database transaction fails.

A normal upload does not automatically need an ArchivedFile. Create an archive
when preserving a content version is part of the requirement. A source URL is
optional because uploaded content can also become an archive.

## Tournament use today

TournamentRegistrationDocument links StoredFile to a registration and its purpose,
such as `payment_proof` or `parental_consent_form`. Tournament workflows enforce
allowed formats, size limits, submission history and owner/staff access.

Tournament configuration captures linked rules and cancellation policies before
offering them for acceptance. Tournament owns the URL-fetch safeguards and its
current archive references. RegistrationAcceptance retains those archive IDs,
exact inline text, declarations and choices. The form reads authorized preserved
copies through expiring attachment links, with in-place link renewal.

Inline policy text remains text in the acceptance snapshot. It does not need to
be converted into a file. ArchivedFile preserves uploaded or fetched bytes when
there is an actual document to retain.

## Future use

A future legal-policy capability could accept an admin upload, validate it and
call the same archive helper. Its own records would identify terms of service or
privacy policy, select the current version and link an acceptance to an exact
archive. Older archives would remain available under that capability's access
and retention rules.

Membership or inventory could reference StoredFile through their own domain
associations. They would not create tournament registration documents. These
examples explain the boundary and do not introduce those features now.

Dependencies run from a consuming domain to core files. The core files capability never imports
that domain and contains no polymorphic owner ID, universal document-purpose enum
or generic file-access endpoint. A file ID alone grants no access.

## Why application archives still exist with object storage

Object storage holds the bytes. Application records explain which captured bytes
a person accepted, when they were captured and how domain records reference them.
A bucket version alone does not supply those application relationships or access
rules. Copying a linked document also avoids depending on the original publisher
to keep serving the content that was accepted.

This design does not implement S3 versioning or Object Lock. ArchivedFile does
not store an S3 version ID. Fresh keys and database guards preserve the application's
references, but do not stop an authorized storage writer from replacing or deleting
bytes at a key. The stored digest records the captured content. It does not lock
an object or automatically verify every download. Storage-level protection and
recovery remain separate operational choices.

## Alternatives and consequences

- Keeping metadata on each domain document duplicates storage fields and clients.
  Shared StoredFile removes that duplication without centralizing domain policy.
- A tournament-owned policy archive would force future legal-policy records to
  depend on tournaments or duplicate archival mechanics.
- A general document-management system would need version families, publication,
  editing and permissions that have no current shared requirement. Those stay out.
- Shared records add joins and require explicit domain associations. This is the
  cost of reusable storage metadata with real foreign keys and clear ownership.
- Database evidence protection is explained separately in [decision 0010](0010-database-evidence-guards.md).

## References

[Data storage](../platform/data-storage.md),
[registration](../tournaments/registration.md),
[file models](../../backend/app/core/files/models.py),
[archive helper](../../backend/app/core/files/archiving.py),
[tournament policy capture](../../backend/app/tournaments/services/tournament_policies.py).
