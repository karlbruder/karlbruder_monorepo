# 0008: Shared files and archived content

**Created**: 2026-11-04
**Last updated**: 2026-11-18

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Sources | Product-owner decisions during [issue #69](https://github.com/karlbruder/karlbruder_monorepo/issues/69), including shared file metadata, reusable archives and the ArchivedFile name. Request to record the rationale on 4 November 2026 |

## Context

Registration uploads need private object storage. A payment proof belongs to a registration. Tournament policy versions must also be retained. Shared file metadata lets both workflows use storage without making other capabilities depend on tournament records.

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

A `TournamentDocument` belongs to a tournament. A `TournamentDocumentVersion` links one published version to an `ArchivedFile`. Rules and cancellation policies each have a distinct purpose. Staff uploads create new versions, and tournament visibility rules govern access to earlier versions. The model permits documents without a policy purpose. Publishing general resources is not yet implemented.

Issue #88 is transitioning policy configuration from external links and text to uploaded documents. Registration records the version IDs from the displayed policy snapshot. Earlier acceptances retain their original evidence. The coordinated cutover removes the legacy fields.

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
rules. An application-owned archive also keeps a copy when content originated
outside the application.

Terraform enables versioning on the application S3 bucket. ArchivedFile does not
store an S3 version ID, and archive storage and downloads do not select a specific
object version. The archive mechanism does not use Object Lock.
Fresh keys distinguish archived objects, but do not stop an authorized storage writer
from replacing or deleting bytes at a key. Database operators can correct references. The stored digest records the captured content. It does not lock
an object or automatically verify every download. Configured bucket versioning
does not establish a verified recovery process. Storage-level protection and
recovery remain separate operational concerns.

## Alternatives and consequences

- Keeping metadata on each domain document duplicates storage fields and clients.
  Shared StoredFile removes that duplication without centralizing domain policy.
- A tournament-owned policy archive would force future legal-policy records to
  depend on tournaments or duplicate archival mechanics.
- A general document-management system would need version families, publication,
  editing and permissions that have no current shared requirement. Those stay out.
- Shared records add joins and require explicit domain associations. This is the
  cost of reusable storage metadata with real foreign keys and clear ownership.
- The database function and trigger prohibition is recorded in [decision 0010](0010-database-functions-trigger-and-procedures.md).

## References

[Data storage](../platform/data-storage.md),
[registration](../tournaments/registration.md),
[file models](../../backend/app/core/files/models.py),
[archive helper](../../backend/app/core/files/archiving.py).
