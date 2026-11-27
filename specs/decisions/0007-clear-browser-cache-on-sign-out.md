# 0007: Clear the browser cache on sign-out

**Created**: 2026-11-03
**Last updated**: 2026-11-27

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Recorded | 3 November 2026 |
| Sources | Product-owner direction on 3 November 2026, during review of issue #59 |

## Context

The registration page keeps tournament and payment responses in the browser query cache. A shared browser can still show the previous account's registration after that person leaves, because the backend already sent that response to them. Partitioning every private query by account, and clearing one account's entries on every identity change, adds client machinery the product does not need.

Expired and invalid Supabase access tokens are rejected by the API as HTTP 401. HTTP 403 means the signed-in person is not allowed to perform that action. A non-admin who opens an admin route is the current case.

## Decision

Sign-out and a direct account change cancel queries and clear the whole browser query cache. A token refresh for the same account retains it. The client does not keep a separate cache per account.

An API response of HTTP 401 for the current authenticated session signs the user out. An obsolete account or token response and a guest 401 do not sign out the current user. HTTP 403 does not sign the user out. A direct upload to object storage is not an API response, so a storage failure does not sign the user out either.

Backend authorization remains the check that decides what a request may return.

## Consequences

- After sign-out, the next person on that browser loads fresh data.
- A direct account switch also starts with a cleared cache. Late work from the old session cannot populate the new session's cache.
- A 401 ends the session even when the person did not click sign-out. Protected screens can show the existing session-expired return to sign-in.
- A 403 stays an authorization failure for the current session.
