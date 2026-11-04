# Backend

These instructions add to the root [AGENTS.md](../AGENTS.md) for `backend/` and its descendants. New code follows these boundaries. Refactor existing code only when requested or when a small local cleanup fits the task. Leave unrelated code in place.

Read [authentication and access](../specs/identity/authentication-and-access.md) when changing who may call a route or see a record. Other spec reading follows the root instructions.

## Ownership and structure

Before editing, identify the module's responsibility, callers, and data owner. Preserve working behavior as a regression baseline, while checking whether its boundaries are correct. Moving files or renaming functions alone does not finish a refactor.

Keep short helpers beside their only caller. Extract a module for a distinct responsibility, meaningful reuse, or behavior that benefits from focused tests. Do not create a file per function, impose line-count limits, or split every service into a package.

| Location | Owns |
| --- | --- |
| `app/main.py` | FastAPI creation, middleware, and documentation configuration |
| `app/api/` | Router assembly, exception handlers, health checks, metadata, and shared HTTP helpers |
| `app/core/db/` | Shared model base, engine factories, and session scopes |
| `app/<domain>/` | Domain rules, data access, errors, and models |
| `app/core/` | Shared infrastructure and mechanisms |
| `config/` | Shared process and infrastructure settings |
| `tests/` | Tests mirroring source ownership |

Alembic and the Dockerfile stay at the backend root. Domain tables belong to their owning domain. Future membership and inventory get their own domain packages when that work is in scope.

Each domain uses these modules as needed:

| Module | Responsibility |
| --- | --- |
| `router.py` | HTTP adaptation |
| `schemas.py` | Request and response contracts |
| `services.py` or `services/` | Business rules and persistence workflows |
| `models.py` or `models/` | Tables, relationships, and constraints |
| `exceptions.py` | Domain errors |

Create folders with their first file. Split models or services into packages when separate table concepts or workflow topics improve navigation. Never keep both `services.py` and `services/`, or both `models.py` and `models/`, at the same import path. Avoid another `services/` layer inside an infrastructure capability.

Use snake_case modules and packages. A `models/` package has one mapped class per module, such as `tournament_registration.py` exporting `TournamentRegistration`. Follow the [application vocabulary](../specs/taxonomy.md#application-vocabulary).

Name functions by action and subject, such as `create_tournament_registration`, and predicates as questions, such as `is_minor_at_tournament_start`. Private helpers need not repeat the domain prefix. Prefer concrete names over `Manager`, `Handler`, or `Utils`.

Import submodules directly when that clarifies ownership. `__init__.py` may expose a small intentional API, including mapped classes and public service entry points. Keep business logic out of it. Do not re-export every helper or hide circular imports. Python does not inherit the frontend's no-barrel rule.

## Dependency direction and shared capabilities

- `app/api/` assembles domain routers and maps domain errors to HTTP. It owns no business rules, domain models, or persistence workflows. Domain services and models do not import API assembly. Routers call services. Services do not import routers.
- Services may use their domain's schemas, models, and helpers, plus auth identity types and core infrastructure.
- Core does not import domain services, models, or routers. Pass required values into it.
- For another domain's behavior, use a deliberate public service contract. Do not call its router or scatter writes to its tables. Keep the dependency one-way.
- Share database sessions, authentication, and storage clients rather than duplicating them within domains.
- Fix runtime cycles by clarifying ownership. `TYPE_CHECKING` and deferred annotations address type-only references. Shared domain constants or value types may live in a small module within that domain.

`core/files` owns `StoredFile`, `ArchivedFile`, storage operations, and `archive_file`. Consumers own document associations, purpose, validation, access, retention, and current-version selection. Core may provide bounded reads and signature detection without imposing tournament upload policy. Tournament registration windows and minor eligibility stay in tournaments. See [decision 0008](../specs/decisions/0008-shared-files-and-archives.md) when its rationale or reuse examples matter.

Payments owns generic `Payment` and `Refund` facts and exposes persistence services to consumers. Tournaments owns payment settings, proof reviews, registration payment/refund associations, full-refund rules, and deadlines. Core and payments do not import consumers or hold their foreign keys. See [decision 0009](../specs/decisions/0009-shared-payments-and-domain-associations.md).

## HTTP and schemas

Routers declare paths, methods, auth and session dependencies, request/response schemas, and status codes. They extract transport context, call services, and map results or domain errors to the established API contract.

Keep queries, commits, record-access decisions, and domain calculations in services. Pass the verified actor and explicit values, such as a client address rather than a FastAPI `Request`. A domain may split routes by API area while keeping one assembly router.

Use explicit response schemas to prevent private-field leaks. Preserve routes, status codes, error shapes, and pagination during structural refactors. Do not introduce response envelopes as a side effect.

Schemas validate types, required fields, formats, and consistency within submitted values. An end date before a submitted start date is a schema check. Whether registration is open or an actor may change a record is a service decision. Validators do not query databases, fetch remote settings, or authorize callers. Services may accept validated schemas without an identical intermediate DTO.

## Services and transactions

- Use plain functions unless a class owns meaningful state or dependencies. Focus each module on one workflow or related rule family. For example, `tournament_registrations.py` owns registration workflows and `tournament_local_dates.py` owns tournament-local calendar rules.
- Accept explicit inputs and return domain results or raise domain errors. Do not accept FastAPI `Request` or `Response`, use `Depends`, or raise HTTP exceptions.
- Keep queries in services. Add repository, selector, manager, or service-class layers only for an actual workflow need.
- Enforce record ownership, visibility, eligibility, and other invariants in the workflow service, including calls outside HTTP.
- FastAPI lifespan creates and disposes sync and async database resources. Domain workflows currently use sync sessions. Import factories and session helpers from `app/core/db/`. Do not initialize engines on import.
- The top-level workflow owns commit and rollback. Helpers use its session without creating another session or committing partway through. Preserve locking and atomicity.
- Translate known database conflicts into domain errors. Do not treat every `IntegrityError` as a duplicate. Unexpected failures remain visible.
- Group related constants and functions. Use type hints to clarify contracts and update docstrings when responsibilities move.

## Models and errors

Models define tables, constraints, and small derived properties. Cross-table decisions belong in services. Prefer `UniqueConstraint` and `CheckConstraint` where applicable. Service checks provide useful rejection reasons but do not replace constraints protecting concurrent writes.

Mapped domain models inherit `app.core.db.base.BaseModel`, with integer primary keys and shared timestamps. Keep columns ordered `id`, `created_at`, `updated_at`, then domain fields in both metadata and migrations. A Supabase user ID is a reference column, not a local user table. Do not add UUID identity columns or soft deletion by default. Export mapped classes through `models/__init__.py` so Alembic can register them. File moves do not justify changing table names, columns, or constraints.

Services raise domain errors without FastAPI types or HTTP codes. Keep exception definitions with their owner. Map them to HTTP in `app/api/exception_handlers.py` and register handlers in `app/main.py`. Core errors describe storage or transport failures. Domain errors describe business rejection. Do not expose raw database or storage exceptions to clients.

## Route access

`app/auth/` owns identity types in `models.py`, token and role services in `services.py`, FastAPI dependencies in `dependencies.py`, auth routes in `router.py`, and domain errors in `exceptions.py`. HTTP mappings belong to `app/api/exception_handlers.py`. Health routes and connectivity checks belong to `app/api/health/`. Auth tests live in `tests/auth/`.

Attach one visible auth dependency to each route:

| Dependency | Access |
| --- | --- |
| `get_current_user` | Guests allowed, invalid tokens rejected |
| `require_authenticated_user` | Verified accounts |
| `require_admin` | Guild staff |

Read roles only from verified Auth-managed `app_metadata.karlbruder_role`. Keep `regular_user`, `guild_member`, and `admin`. Root instructions define staff scope. A valid token proves identity. Services still enforce record-level access and eligibility.

Throttling is not implemented. Do not add it during unrelated work. When introduced, put shared HTTP throttling helpers in `app/api/` and use a dependency attached to every route, including open routes, rather than a limiter inside one handler.

## Configuration

Read environment variables through settings, not `os.getenv` calls in routers or services. Keep environment selection in bootstrap configuration and secrets out of source. Read [local development](../specs/platform/local-development.md) for local/test settings beyond these rules, or [data storage](../specs/platform/data-storage.md) when changing where domain rows live.

- Shared process, database, and infrastructure settings belong in `config/`, even with one current consumer. Domain-only behavior settings belong to their domain.
- Required settings fail validation at startup, including domain-local settings. Moving settings must not defer failures until a request.
- `config/base.py` has no defaults for required deployment values. Required Pydantic fields already reject missing values. Validators enforce additional value constraints, such as Supabase URL shape. Do not repeat validation in services or routes.
- Fixed technical defaults, such as the driver and PostgreSQL port 5432, may live on the base class. Deployment-specific hosts, database names, users, passwords, and buckets do not get shared production defaults.
- `LocalSettings` may default the Compose domain database, but not the hosted Supabase Auth database. `TestSettings` may use the test database for the Auth diagnostic because that stack has no hosted Supabase.
- `AwsSettings` does not invent database connection values. Secrets Manager fills values left unset by the environment. `SECRET_NAME` and `AWS_REGION` are required at startup. Local/test defaults stay in their environment classes.

## Known implementation gaps

These existing paths and behaviors are migration gaps, not precedents for new boundaries:

- Auth settings still live in `config/`. Moving them into auth requires preserving startup validation and environment-specific defaults. Leave them there during unrelated work.
- Tournament routers still contain queries and record-access decisions. New workflows belong in services.
- `config/env.py` supplies an AWS region fallback. A settings change must reconcile it and its tests with the explicit-region requirement above. Do not silently adopt the fallback as policy.

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
| `app/tournaments/router.py` | `tests/tournaments/test_router.py` |
| `config/aws.py` | `tests/config/test_aws_settings.py` |

Core file tests belong in `tests/core/files/`. Tournament upload-policy tests belong in `tests/tournaments/services/test_registration_uploads.py`. Move source and meaningful tests together.

This does not require a test file per module. Workflow integration tests may stay at the domain test root, such as `tests/tournaments/test_tournament_registrations.py`. Direct service tests belong under `services/`. Preserve accurate descriptive filenames.

- Put detailed business cases in service tests. Route tests cover HTTP contracts, auth dependencies, error mapping, and field visibility. Schema tests cover input shape. Keep meaningful integration coverage. A mocked route-to-service call alone does not establish correct API behavior.
- Cover changed branches, edge cases, and failures, especially auth, registration, payment proofs, and safety-note visibility. Remove obsolete tests while preserving coverage for retained behavior.
- Put fixtures in the narrowest applicable `conftest.py`. Keep single-module helpers local. Do not duplicate assertions just to populate extracted test files.
- `db_session` runs automatically. Request it explicitly only for tests that read or write rows. Routes already receive it. Do not add engines, SQLite databases, or replacement session fixtures.
- The pytest session creates its test engine and migrates the Compose database to head. Each test uses a transaction that rolls back afterward. Do not create another database from tests.
- Mock calls leaving the process, including Supabase key fetches, S3, and future backend SES calls. Follow root naming and docstring rules.

Run from the repository root with a unique Compose project name:

```sh
docker compose -f compose.test.yml -p kb-test-<name> run --rm backend pytest -x
docker compose -f compose.test.yml -p kb-test-<name> down -v
```

The stack publishes no host ports. Use a narrower pytest selection when appropriate, keeping `-x`. Fix the first failure before continuing. Rebuild when dependencies change. Run Ruff in the same stack by replacing `pytest -x` with `ruff check .`. See the [backend README](README.md#tests-and-lint) for make targets.

## Python style and review

- Use f-strings rather than `str.format` or `%` formatting.
- Raise specific exceptions. Catch only types the function can handle. Otherwise let the failure propagate.
- A leading underscore means module-private. Test through public workflows where practical. Tests alone do not justify making a helper public.
- Keep related behavior together. Write a flow once and pass what differs. Use one name per concept. Extract a local helper when reuse or a clarifying name improves readability.
- Give a short reason beside any Ruff rule suppression.

Review responsibilities, naming, dependency direction, and rule ownership alongside file placement. Report changes and remaining work. Follow root verification rules, suggest a Conventional Commit message at each completed checkpoint, and leave staging and committing to the developer.
