# Backend

These instructions extend root [AGENTS.md](../AGENTS.md). Follow these boundaries for new code. Refactor existing code only when requested or as a small local cleanup. Use the [README](README.md) for setup and diagnostics.

Read [authentication and access](../specs/identity/authentication-and-access.md) when changing who may call a route or see a record. Other spec reading follows the root instructions.

## Ownership and structure

Before editing, identify responsibility, callers, and data ownership. Preserve behavior during structural refactors and check boundaries as well as file placement.

Keep short helpers beside their only caller. Extract for distinct responsibility, meaningful reuse, or focused testing. Do not split by line count or create a file per function.

| Location | Owns |
| --- | --- |
| `app/main.py` | FastAPI creation, database lifespan, middleware, and documentation configuration |
| `app/api/` | Router assembly, exception handlers, health checks, metadata, and shared HTTP helpers |
| `app/core/db/` | Shared model base, engine factories, and session scopes |
| `app/<domain>/` | Domain rules, data access, errors, and models |
| `app/core/` | Shared infrastructure and mechanisms |
| `config/` | Shared process and infrastructure settings |
| `tests/` | Tests mirroring source ownership |

Alembic and the Dockerfile stay at the backend root. Each domain owns its tables. Add membership and inventory packages only when that work is in scope.

Each domain uses these modules as needed:

| Module | Responsibility |
| --- | --- |
| `router.py` | HTTP adaptation |
| `schemas.py` | Request and response contracts |
| `services.py` or `services/` | Business rules and persistence workflows |
| `models.py` or `models/` | Tables, relationships, and constraints |
| `exceptions.py` | Domain errors |

Create folders with their first file. Split models or services when separate concepts improve navigation. Never keep a module and package at the same import path. Avoid another `services/` layer inside infrastructure.

Use snake_case modules and packages. A `models/` package has one mapped class per module, such as `tournament_registration.py` exporting `TournamentRegistration`. Follow the [application vocabulary](../specs/taxonomy.md#application-vocabulary).

Name functions by action and subject, such as `create_tournament_registration`, and predicates as questions, such as `is_minor_at_tournament_start`. Private helpers need not repeat the domain prefix. Prefer concrete names over `Manager`, `Handler`, or `Utils`.

`__init__.py` may expose a small public API, including mapped classes and service entry points. Keep business logic out. Do not re-export every helper or hide cycles. Prefer direct submodule imports when they clarify ownership.

## Dependency direction and shared capabilities

- `app/api/` assembles routers and maps domain errors to HTTP. It owns no business rules, domain models, or persistence workflows. Domain services and models do not import API assembly. Routers call services. Services do not import routers.
- Services may use their domain's schemas, models, and helpers, plus auth identity types and core infrastructure.
- Core does not import domain services, models, or routers. Pass required values into it.
- For another domain's behavior, use a deliberate public service contract. Do not call its router or scatter writes to its tables. Keep the dependency one-way.
- Share database sessions, authentication, and storage clients rather than duplicating them within domains.
- Fix runtime cycles by clarifying ownership. `TYPE_CHECKING` and deferred annotations address type-only references. Shared domain constants or value types may live in a small module within that domain.

`core/files` owns `StoredFile`, `ArchivedFile`, storage operations, and `archive_file`. Consumers own document associations, purpose, validation, access, retention, and current-version selection. Core may provide bounded reads and signature detection without imposing tournament upload policy. Tournament registration windows and minor eligibility stay in tournaments. See [decision 0008](../specs/decisions/0008-shared-files-and-archives.md) when its rationale or reuse examples matter.

Payments owns generic `Payment` and `Refund` facts and exposes persistence services to consumers. Tournaments owns payment settings, proof reviews, registration payment/refund associations, full-refund rules, and deadlines. Core and payments do not import consumers or hold their foreign keys. See [decision 0009](../specs/decisions/0009-shared-payments-and-domain-associations.md).

## HTTP and schemas

Routers declare paths, methods, auth and session dependencies, request/response schemas, and status codes. They extract transport context, call services, and map results to response schemas. Shared exception handlers map domain errors to HTTP.

Keep queries, commits, record access, and calculations in services. Pass the verified actor and explicit values, such as a client address rather than `Request`. Split routes by API area when useful, with one assembly router.

Use explicit response schemas to prevent private-field leaks. Preserve routes, status codes, error shapes, and pagination during structural refactors. Do not introduce response envelopes as a side effect.

Schemas validate types, required fields, formats, and consistency between submitted values, such as rejecting an end date before the start date. Services decide registration windows and actor permissions. Validators do not query databases, fetch settings, or authorize. Services may accept schemas without a duplicate DTO.

## HTTP route design

Prefer resource URLs and standard HTTP methods. Use lowercase, hyphenated segments,
plural collections, and identifiers after collections. Use query parameters for
filtering and pagination. Preserve established lookup identifiers.

Paths express public domain concepts, not package structure. A domain namespace
groups collections. A parent ID scopes them to one record:

- `/api/staff/tournaments/payment-reviews`: reviews across tournaments.
- `/api/staff/tournaments/{tournament_id}/payment-reviews`: reviews for one tournament.

Nest only when the parent defines scope. Keep nesting shallow. Do not repeat the
domain when it already names the resource, as in `/api/tournaments/{tournament_id}`.

Use `/api/staff/` for staff-only endpoints, with visible `require_admin` on each.
Guest-accessible and signed-in endpoints use `/api/` with explicit auth dependencies.
Prefixes do not authorize callers. Do not duplicate a method/path by role.
Shared endpoints may return the caller's permitted projection.

Assembly routers only include child routers, without endpoints or prefixes.
Endpoint-owning routers declare their full `/api/` or `/api/staff/` prefix and use
relative decorator paths. Group routes in `routers/anonymous.py`,
`routers/authenticated.py`, and `routers/staff.py` as needed. Anonymous allows both
guests and signed-in users.

| Method | Use | Idempotent by method semantics |
| --- | --- | --- |
| GET | Read a resource or collection | Yes |
| POST | Create a resource or execute a custom action | No guarantee |
| PATCH | Update supplied fields | No guarantee |
| PUT | Replace the complete representation | Yes |
| DELETE | Remove a resource | Yes |

GET has no request body or domain side effects. Logging and metrics are allowed.
Prefer PATCH for partial updates. Idempotence concerns repeated effects, not
identical responses. See [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2)
and [PATCH semantics](https://www.rfc-editor.org/rfc/rfc5789.html#section-2).

Prefer resource operations over verbs such as `/createRegistration`. Model workflows
as resources when clients need their identity, state, or history. Do not invent a
resource solely to avoid a verb. Validation and side effects alone do not require
an action route.

When standard resource operations do not express the intent, use a custom action.
State-changing actions use POST to `<resource-path>/<action>`, with identifiers
before a short verb phrase. For example, a resend command could use
`POST <registration-path>/resend-confirmation`. Use a collection path only for
collection-wide actions. Document inputs, results, and retry behavior.

Services enforce lifecycle rules, capacity, authorization, and required notifications
for both resource operations and actions. Field updates must not bypass these rules.

Apply these rules to new or explicitly redesigned routes. Preserve existing paths,
identifiers, and trailing slashes until migration is scoped. Update callers, tests,
and owning API documentation together. Routing cleanup does not authorize database
identity changes or API versioning.

## Services and transactions

- Use functions unless a class owns meaningful state or dependencies. Group related workflows or rules, such as `tournament_registrations.py` and `tournament_local_dates.py`.
- Accept explicit inputs and return domain results or raise domain errors. Do not accept FastAPI `Request` or `Response`, use `Depends`, or raise HTTP exceptions.
- Keep queries in services. Add repository, selector, manager, or service-class layers only for an actual workflow need.
- Enforce record ownership, visibility, eligibility, and other invariants in the workflow service, including calls outside HTTP.
- FastAPI lifespan creates and disposes sync and async database resources. Domain workflows currently use sync sessions through `app.core.db.get_session`. Scripts own their engines and session scopes. Do not initialize engines on import or copy lifespan-owned resources into module-level aliases.
- The top-level workflow owns commit and rollback. Session scopes close without committing. Helpers use the caller's session without creating another session or committing partway through. Preserve locking and atomicity.
- Translate known database conflicts into domain errors. Do not treat every `IntegrityError` as a duplicate. Unexpected failures remain visible.
- Group related constants and functions. Use type hints to clarify contracts and update docstrings when responsibilities move.

## Models and errors

Models define tables, constraints, and small derived properties. Services own cross-table decisions. Use `UniqueConstraint` and `CheckConstraint` where applicable. Service checks do not replace constraints protecting concurrent writes.

Mapped domain models inherit `app.core.db.base.BaseModel`, with integer primary keys and shared timestamps. Keep columns ordered `id`, `created_at`, `updated_at`, then domain fields in both metadata and migrations. SQLAlchemy updates `updated_at`. Direct SQL writers must maintain it themselves. A Supabase user ID is a reference column, not a local user table. Do not add UUID identity columns or soft deletion by default. Export mapped classes from a `models/` package through its `__init__.py` and keep Alembic model imports complete. File moves do not justify schema changes.

Keep errors with their owner, without FastAPI types or HTTP codes. Core errors describe infrastructure failures. Domain errors describe business rejection. Map errors in `app/api/exception_handlers.py` and register handlers in `app/main.py`. Never expose raw database or storage exceptions.

## Route access

`app/auth/` owns identity types, token verification, roles, route dependencies, and `GET /api/users/me`. Its `User` and `AnonymousUser` are identity values, not database tables. Supabase owns account creation and credentials.

Declare access dependencies on the endpoint or on its router. An authenticated
router can use `dependencies=[Depends(require_authenticated_user)]` to protect all
its endpoints. Handlers needing the verified identity use the `AuthenticatedUser`
type alias. Router-level dependencies enforce access but do not pass their return
values to handlers. FastAPI reuses the dependency result within the request.
Keep `require_admin` explicit on staff endpoints.

Choose the dependency for the required access:

| Dependency | Access |
| --- | --- |
| `get_current_user` | Guests allowed, invalid tokens rejected |
| `require_authenticated_user` | Verified accounts |
| `require_admin` | Guild staff |

Read roles only from verified Auth-managed `app_metadata.karlbruder_role`. Keep `regular_user`, `guild_member`, and `admin`. Root instructions define staff scope. A valid token proves identity. Services still enforce record-level access and eligibility.

Health, metadata, and generated documentation endpoints are public and have no auth dependency. Preserve those contracts during structural changes. See the [README](README.md#diagnostics) for diagnostic routes and limits.

Throttling is not implemented. Do not add it during unrelated work. When introduced, put shared HTTP throttling helpers in `app/api/` and use a dependency attached to every route, including open routes, rather than a limiter inside one handler.

## Configuration

Use settings, not `os.getenv` in routers or services. Bootstrap selects the environment. Read [local development](../specs/platform/local-development.md) for local/test settings or [data storage](../specs/platform/data-storage.md) when changing data placement.

- Shared process, database, and infrastructure settings belong in `config/`, even with one current consumer. Domain-only behavior settings belong to their domain.
- Validate required settings at startup, including domain-local settings. Do not defer failure until a request.
- `config/base.py` has no defaults for required deployment values. Required Pydantic fields already reject missing values. Validators enforce additional value constraints, such as Supabase URL shape. Do not repeat validation in services or routes.
- Fixed technical defaults, such as the driver and PostgreSQL port 5432, may live on the base class. Deployment-specific hosts, database names, users, passwords, and buckets do not get shared production defaults.
- `LocalSettings` may default the Compose domain database, but not the hosted Supabase Auth database. `TestSettings` may use the test database for the Auth diagnostic because that stack has no hosted Supabase.
- `AwsSettings` does not invent database connection values. Secrets Manager fills values left unset by the environment. `SECRET_NAME` and `AWS_REGION` are required at startup. Local/test defaults stay in their environment classes.

## Known implementation gaps

These existing paths and behaviors are migration gaps, not precedents for new boundaries:

- Auth settings still live in `config/`. Moving them into auth requires preserving startup validation and environment-specific defaults. Leave them there during unrelated work.
- Tournament routers still contain queries and record-access decisions. New workflows belong in services.

## Migrations, queries, and external calls

Alembic owns schema changes. Never edit a revision already on `master`. A branch-only revision may be edited when `git diff master` shows it as added. Read [migration notes](../docs/database-migrations.md) before applying, resetting, or repairing migrations.

Keep queries simple. Use service-level `selectinload` or `joinedload` to avoid per-row relationship queries. Preserve tournament-list pagination.

Ask before adding an index or cache, including `lru_cache` or Redis. PostgreSQL does not automatically index foreign-key reference columns. A process-local cache does not cover all API workers.

If work could stall the API, explain the concern and ask before adding a worker or queue. Outbound calls, including S3 and future backend SES integration, go through small clients that tests mock. Read [architecture](../specs/architecture.md) when changing an integration.

## Tests and verification

Tests live under `backend/tests/`, mirroring source ownership:

| Source | Test location |
| --- | --- |
| `app/tournaments/services/tournament_local_dates.py` | `tests/tournaments/services/test_tournament_local_dates.py` |
| `app/tournaments/models/tournament_registration_document.py` | `tests/tournaments/models/test_tournament_registration_document.py` |
| `app/tournaments/routers/staff.py` | `tests/tournaments/test_payment_proof_reviews.py` |
| `config/aws.py` | `tests/config/test_aws_settings.py` |

Core file tests belong in `tests/core/files/`. Tournament upload-policy tests belong in `tests/tournaments/services/test_registration_uploads.py`. Move source and meaningful tests together.

This does not require a test file per module. Workflow integration tests may stay at the domain test root, such as `tests/tournaments/test_tournament_registrations.py`. Direct service tests belong under `services/`. Preserve accurate descriptive filenames.

- Service tests cover business cases. Route tests cover HTTP contracts, auth dependencies, error mapping, and field visibility. Schema tests cover input shape. Preserve integration coverage. A mocked service call alone does not verify API behavior.
- Cover changed branches, edge cases, and failures, especially auth, registration, proofs, and safety-note visibility. Remove obsolete tests without losing retained-behavior coverage.
- Put fixtures in the narrowest applicable `conftest.py`. Keep single-module helpers local. Do not duplicate assertions just to populate extracted test files.
- `db_session` runs automatically and routes receive it through a dependency override. Request the fixture explicitly when a test uses its session. Reuse this setup for domain tests. Do not add SQLite databases or replacement session fixtures. Database lifecycle and factory tests may create resources to test their behavior, using the same Compose database and disposing resources afterward.
- The pytest session creates its test engine and migrates the Compose database to head. Each test uses a transaction that rolls back afterward. Do not create another database from tests.
- Mock calls leaving the process, including Supabase key fetches, S3, and future backend SES calls. Follow root naming and docstring rules.

Run from the repository root with a unique Compose project name:

```sh
docker compose -f compose.test.yml -p kb-test-your-name run --rm backend pytest -x
docker compose -f compose.test.yml -p kb-test-your-name down -v
```

The stack publishes no host ports. Use a narrower pytest selection when appropriate, keeping `-x`. Fix the first failure before continuing. Rebuild when dependencies change. Run Ruff in the same stack by replacing `pytest -x` with `ruff check .`. See the [backend README](README.md#tests-and-lint) for make targets.

## Python style and review

- Use f-strings rather than `str.format` or `%` formatting.
- Raise specific exceptions. Catch only types the function can handle. Otherwise let the failure propagate.
- A leading underscore means module-private. Test through public workflows where practical. Tests alone do not justify making a helper public.
- Keep related behavior together. Write a flow once and pass what differs. Use one name per concept. Extract a local helper when reuse or a clarifying name improves readability.
- Give a short reason beside any Ruff rule suppression.

Report changes, verification, and remaining work. Suggest a Conventional Commit message at each checkpoint. Leave staging and committing to the developer.
