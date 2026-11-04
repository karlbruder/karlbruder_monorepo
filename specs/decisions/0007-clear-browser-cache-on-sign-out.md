# 0007: Clear the browser cache on sign-out

**Created**: 2026-11-03
**Last updated**: 2026-11-03

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Recorded | 3 November 2026 |
| Sources | Product-owner direction on 3 November 2026, during review of issue #59 |

## Context

The registration page keeps tournament and payment responses in the browser query cache. A shared browser can still show the previous account's registration after that person leaves, because the backend already sent that response to them. Partitioning every private query by account, and clearing one account's entries on every identity change, adds client machinery the product does not need.

Expired and invalid Supabase access tokens are rejected by the API as HTTP 401. HTTP 403 means the signed-in person is not allowed to perform that action. A non-admin who opens an admin route is the current case.

## Decision

Sign-out clears the whole browser query cache. The client does not keep a separate cache entry per account.

An API response of HTTP 401 signs the current user out. That covers an expired or invalid access token. HTTP 403 does not sign the user out. A direct upload to object storage is not an API response, so a storage failure does not sign the user out either.

Backend authorization remains the check that decides what a request may return.

## Consequences

- After sign-out, the next person on that browser loads fresh data.
- Switching accounts without signing out is outside this rule. The normal path is sign-out, then sign-in.
- A 401 ends the session even when the person did not click sign-out. Protected screens can show the existing session-expired return to sign-in.
- A 403 stays an authorization failure for the current session.
