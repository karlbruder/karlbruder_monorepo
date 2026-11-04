# Backend

## Scope

These instructions apply to `backend/` and everything under it. They add to the repository root [AGENTS.md](../AGENTS.md). Read both. The root file owns product boundaries, ownership, the issue workflow, and repository-wide rules, including how to name a test function. This file does not copy those.

Open [authentication and access](../specs/identity/authentication-and-access.md) when the task changes who may call a route or see a record. The route and service rules in this file are enough for other backend work.

New code follows this file. Leave existing code that still breaks these rules in place. Refactor it when the task asks for that refactor, or when the current task allows a small local cleanup that does not rewrite a working chunk of code. Do not retrofit a new rule onto old code while doing unrelated work.

Existing code is not proof that a boundary is correct. Known migration gaps:

- Auth still lives in `app/auth.py`, with identity types in `app/models.py` and settings in `config/`. Its tests live in `tests/test_auth.py`. Move these coherently when auth restructuring is in scope. Do not add an `app/auth/` package alongside `app/auth.py` and rely on import resolution to choose one.
- Tournament routers still contain catalog/registration queries and record-access decisions. Those are legacy boundaries, not examples for new workflows.
- Root `app/exceptions.py` still contains auth HTTP errors. Move domain errors to their owner when that work is in scope.
- `config/env.py` still supplies an AWS region fallback. That does not fulfill the explicit-region requirement below. A settings change must reconcile that behavior and its tests, not silently treat the fallback as the intended rule.

## Design principles

Organize code by the capability it owns and the reason it changes. Folder placement supports that ownership. Renaming a function without fixing boundaries does not finish a refactor.

Before editing a module, identify its role, its callers, and the data it owns. Keep working behavior as a regression baseline. Do not assume that the existing names, boundaries, or abstractions are worth keeping.

Use the smallest design that makes a change easy to understand. Keep a short helper beside its only caller. Extract a module when it has a distinct responsibility, meaningful reuse outside one workflow, or behavior that benefits from focused tests. Do not create a file for every function. Do not impose a line-count limit or split every service into a package on sight.

Cross-domain infrastructure belongs in `app/core/`. `app/core/files/` owns StoredFile metadata and shared storage operations. `app/core/documents/` owns immutable ArchivedDocument snapshots with optional source URLs. Domain-specific document associations, version selection, access decisions, file-type allowlists and size limits stay with the consuming domain. Domain rules stay in the domain package. Storage can own bounded reads and file-signature detection. The capability that accepts an upload owns its allowed types and size policy, unless the same policy is explicitly shared. Do not make one feature's policy universal merely by putting it in core. Tournament registration windows and minor eligibility belong in `tournaments/`.

## Structure

This is an example of ownership, not a required file inventory. New code belongs in the package that owns its behavior. Keep existing paths during unrelated work. A scoped restructure moves imports and tests together.

```text
backend/
  app/
    main.py
    database.py
    core/
      files/
        models.py
        storage.py
        content_types.py
    tournaments/
      models/
        tournament.py
        tournament_registration.py
      services/
        tournament_registrations.py
        registration_uploads.py
        tournament_local_dates.py
      router.py
      schemas.py
      exceptions.py
  config/
    base.py
    local.py
    test.py
    aws.py
  tests/
    core/
      files/
        test_models.py
        test_storage.py
    tournaments/
      models/
        test_tournament_registration_document.py
      services/
        test_registration_uploads.py
        test_tournament_local_dates.py
      test_tournament_registrations.py
      test_router.py
      test_schemas.py
    config/
      test_aws_settings.py
```

Create a folder when the first file needs it. A small domain can use `models.py` and `services.py`. Split them into packages when separate table concepts or service topics make navigation clearer. Never keep both `services.py` and `services/` for the same import path. The same rule applies to `models`.

Module and package names use snake_case. Within a `models/` package, use one mapped model class per module and name it after the table concept, such as `tournament_registration.py` and `TournamentRegistration`.

Within `services/`, group one workflow or related rule family per module. Avoid nesting another `services/` inside an infrastructure capability. A folder name should identify an owner or useful grouping, not repeat a layer name.

Use names that distinguish account sign-up from tournament registration. `create_tournament_registration` states the action and subject. Do not repeat the domain prefix in every private helper when the module already makes it clear. Name predicates as questions, such as `is_minor_at_tournament_start`.

Import a submodule directly when that makes ownership clearer. A package `__init__.py` may expose a small, intentional API, such as model classes or public service entry points. Keep business logic out of it. Do not automatically re-export every helper or use exports to hide circular imports. Python packages do not inherit the frontend's no-barrel rule.

## Domain packages

Group the API by application domain. Each domain is one Python package directly under `backend/app/`.

- `models.py` or `models/` holds the domain's tables and relationships.
- `schemas.py` holds request and response models.
- `router.py` holds HTTP routes.
- `services.py` or `services/` holds business logic and persistence workflows.
- `exceptions.py` holds errors that belong to that domain.

`tournaments` and `auth` are application domains. Membership and inventory, when they are built, get their own packages. They stay out of `tournaments/`.

The verified user, the guest identity, token checks, and auth errors belong to `auth`. Other domains import those pieces. They do not grow their own copy.

Self-contained means the domain owns its rules, data access, errors, and tests. It does not mean duplicating database sessions, authentication, or storage clients.

Dependency direction is explicit:

- `main.py` wires routers and application infrastructure. Domain modules do not import the assembled application.
- Routers call services. Services may use their domain's schemas, models, and helpers, plus auth identity types and core infrastructure. Services do not import routers.
- Core infrastructure does not import domain services, models, or routers. Pass required values to core instead.
- When one domain needs another's behavior, call a deliberate public service contract. Do not call its router or scatter writes to its tables across the caller. Keep that dependency one-way. Move only genuinely shared mechanisms into core.
- TournamentPaymentSettings, PaymentProofReview and registration payment/refund associations belong to tournaments. Payments owns generic Payment and Refund facts. Consuming domains depend on payment persistence services. Shared payments/core modules do not import those domains or hold their foreign keys. Domain rules such as full refunds and deadlines stay with their associations.

A domain may split its router by API area when it becomes difficult to navigate. Keep one domain router as the assembly point. Route handlers still belong to the HTTP layer, not services or model modules.

### Router

`router.py` adapts HTTP to the domain. It declares paths, methods, auth and session dependencies, request schemas, response schemas, and status codes. It extracts transport context, calls a service, and translates the outcome into the existing API contract.

Keep queries, transaction commits, record ownership checks, and domain calculations out of route handlers. Pass the verified actor and required values to the service. For example, pass a client address string instead of a FastAPI `Request`.

Use explicit response schemas so private model fields do not leak. Preserve the API's established status codes, error shape, and pagination format. Do not add a new response envelope or change routes as a side effect of reorganizing files.

### Schemas

`schemas.py` defines request and response contracts. Validate types, required fields, formats, and consistency within the submitted values. An end date preceding a submitted start date is a schema check. Whether registration is open today or the actor may change a stored record is a service decision.

Schema validators do not query the database, fetch settings from remote services, or authorize the caller. A service may accept a validated schema directly. Do not create an identical DTO solely to add another layer.

### Services

Business logic lives in the domain service layer, whether it is one module or a package. New workflows start there.

- A service does not accept a FastAPI `Request` or `Response`, use `Depends`, or raise an HTTP exception. Accept explicit inputs and return domain results or raise domain errors.
- Query code stays in the service. Avoid automatic repository, selector, manager, or service-class layers. Add one only when an actual workflow needs that boundary.
- Name service functions for their action or result. `create_tournament_registration` tells the reader what happens. `register` does not. Plain functions are sufficient unless a class has meaningful state or dependencies to own.
- Keep each service module focused on one workflow or one rule family. Add a type hint where it makes the contract obvious.
- Group related constants and functions together in the same module. Revise docstrings when responsibility moves.
- The workflow service owns domain authorization and invariants. Calling it outside HTTP must not bypass record ownership, visibility, or eligibility rules.
- Make transaction ownership clear. The top-level workflow owns the commit and rollback boundary. Helpers use the supplied session and do not commit partway through a larger workflow. Do not create a second session inside a helper. Preserve locking and atomicity during refactors.
- Translate known database conflicts into domain errors. Do not label every `IntegrityError` as a duplicate. Unexpected failures must remain visible.

### Models

- A model defines the table, its constraints, and small derived properties. Cross-table decisions belong in the service.
- Prefer a `UniqueConstraint` or `CheckConstraint` when the database can enforce the rule. Service checks give useful rejection reasons, but do not replace constraints needed to protect concurrent writes.
- Models inherit from `database.Base`. Keep the integer primary keys this project already uses.
- The Supabase user id is a reference column. It is not a local user table. New models do not need a UUID or audit base class.
- A models package exposes its mapped classes through `models/__init__.py`. Keep model registration available to Alembic when moving files. Do not change table names, columns, or constraints merely to match a Python filename.

### Names that explain the role

Use these local conventions consistently.

| Role | Example | Responsibility |
| --- | --- | --- |
| Route module | `router.py` | HTTP entry for the domain |
| Request model | `RegistrationCreate` in `schemas.py` | Validated input shape |
| Service module | `tournament_registrations.py` | One registration or catalog workflow |
| Date and timezone rules | `tournament_local_dates.py` | Calendar dates in tournament local time |
| Model module | `tournament_registration_document.py` | One table mapping |
| Core file helper | `content_types.py` | Reusable file-signature detection, not tournament upload policy |

Prefer a concrete name over `Manager`, `Handler`, or `Utils` when those names hide the responsibility.

## Shared code

- Application code lives in `backend/app`, including `main.py` and `database.py`.
- `app/core/` holds infrastructure other domains share, such as file metadata, storage clients and file-signature detection. Core exceptions describe storage and transport failures. Domain exceptions describe business rejection.
- Shared process and infrastructure settings live in `backend/config`. Domain-only settings belong to their owner, as described below. Alembic, tests, and the Dockerfile stay at the backend root.
- New domain tables go in the domain package. They do not go in `app/models.py`.
- Fix circular runtime dependencies by clarifying ownership. `TYPE_CHECKING` and deferred annotations help with type-only references. They do not repair a runtime cycle. A pure constant or value type used by schemas and services can live in a small module within the same domain.

## Configuration

Settings come from environment variables. Keep secrets out of source. Open [local development](../specs/platform/local-development.md) when the task changes local or test settings beyond the rules below. Open [data storage](../specs/platform/data-storage.md) when the task changes where domain rows are stored.

- Shared environment, database, and infrastructure settings live in `config/`, even if one domain is currently their only caller. A setting that configures only a domain's behavior belongs in that domain. Auth settings are an existing migration gap, not a reason to move them during an unrelated task.
- Read environment variables through the settings boundary. Routers and services consume validated settings or explicit arguments, not their own `os.getenv` calls. Keep environment selection in the bootstrap configuration.
- A domain-local settings class must participate in startup validation when that domain needs it. Moving a setting into a package must not postpone a required-value failure until the first request.
- `config/base.py` holds the shared settings class. A setting the process cannot run without has no default there. Pydantic raises while it builds settings, at startup.
- Do not add a validator whose only job is to reject a missing value. A required field already does that. Validators may enforce value constraints, such as the permitted shape of a Supabase project URL.
- Do not check again when a service starts or when a route runs. That code uses the value.
- `LocalSettings` may default the Compose domain database. It does not default the Auth database. That connection is hosted Supabase, including during local development.
- `TestSettings` may point the Auth diagnostic at the test database, because that stack has no hosted Supabase.
- `AwsSettings` does not invent a host, database name, user, or password. Secrets Manager fills only what that environment left unset. `SECRET_NAME` and `AWS_REGION` are required. Startup fails when either is missing.
- A fixed technical choice may have a default on the base class. The database driver is one. The PostgreSQL port is another, and it defaults to 5432. Deployment-specific hosts, database names, users, passwords, and bucket names do not get shared production defaults. Local and test defaults stay in their environment classes.

## Route access

A route reads the path, query, and body, applies the rules below, calls a service, and returns the response. Permission decisions, domain calculations, and database writes stay in the service.

Declare who may call the route by attaching one auth dependency. A reader should see that dependency on the route. Today those dependencies live in `app/auth.py`. New auth dependencies go in the `auth` package.

- `get_current_user` for a route guests may call. The dependency still runs. An invalid token is rejected.
- `require_authenticated_user` for a route that needs a verified account.
- `require_admin` for a route limited to guild staff.

Read the role only from the verified token's Auth-managed `app_metadata.karlbruder_role`. Keep the existing `regular_user`, `guild_member`, and `admin` values. The root file owns the staff boundary.

A valid token only proves identity. When the decision depends on domain data, such as ownership or visibility, the service makes that decision. The route still declares which dependency applies.

Throttling is not implemented. Do not add a limiter while doing unrelated work. When a limiter is introduced, add one shared dependency for the whole API and attach it on each route, including a route that is intentionally open. Do not put a limiter inside a single handler.

## API errors

Raise a domain exception from the service. Map it to an HTTP status in the router or a registered HTTP exception handler. Keep one error shape for the API.

Put a domain exception in the domain that owns it. Tournament errors live in `tournaments/exceptions.py`. Auth errors live in `auth/exceptions.py`.

Domain errors describe the rejection without FastAPI types or HTTP status codes. The router or a registered HTTP exception handler maps them to the established response shape. Keep domain-specific mappings with the owning domain, and register handlers from application setup when needed.

The existing `BaseAPIException` subclasses FastAPI `HTTPException`. It is an HTTP adapter, not the base for new service errors. It may remain in `app/exceptions.py` for transport concerns. Leave older errors there until a task moves them. Do not return raw database or storage exceptions to clients.

## Migrations

Alembic owns schema changes. Never edit a revision that is already on `master`. You may edit a revision that exists only on the current branch. That means `git diff master` shows the file as added. Open the [migration notes](docs/migrations.md) when applying, resetting, or repairing a migration.

## Queries and caching

- Stay with the simple query. Use `selectinload` or `joinedload` in the service when a relationship would otherwise query once per row.
- Use the pagination the tournament list already has.
- Ask before adding an index, `lru_cache`, Redis, or any other cache. PostgreSQL does not index the referencing side of a foreign key for you. More than one worker can serve the API, so a process-local cache does not cover every request.

## Workers and external calls

If a job could stall the API process, say so and ask before adding a worker or a queue. Do not choose the worker or the queue on your own.

Outbound S3 and SES calls, when they exist, sit behind a small client. Tests mock that client. Open [architecture](../specs/architecture.md) when the task adds or changes that integration.

## Tests

Tests live in `backend/tests/`, separate from production code. Mirror the ownership and package path of the code under test:

| Source | Test location |
| --- | --- |
| `app/tournaments/services/tournament_local_dates.py` | `tests/tournaments/services/test_tournament_local_dates.py` |
| `app/tournaments/models/tournament_registration_document.py` | `tests/tournaments/models/test_tournament_registration_document.py` |
| `app/tournaments/router.py` | `tests/tournaments/test_router.py` |
| `config/aws.py` | `tests/config/test_aws_settings.py` |

Apply the same mapping to core modules. Shared file tests live in `tests/core/files/`. Registration upload-policy tests live in `tests/tournaments/services/test_registration_uploads.py`. Move source and meaningful tests together.

The mirror does not require one test file for every source file. A workflow integration test can stay at the domain test root, such as `tests/tournaments/test_tournament_registrations.py`, when it exercises several modules through the API. Direct service tests belong under `tests/tournaments/services/`. Preserve established descriptive test filenames when their scope is accurate.

Shared fixtures belong in the narrowest applicable `conftest.py`. Keep a helper inside its test module when only that module needs it. Move relevant tests with a service or model extraction in the same change. Do not duplicate the same assertions in every new file merely to populate the tree.

Follow the root rule for test names and docstrings. Name the behavior and expected result. Add one short description only when the name does not explain the check.

Run backend tests from the repository root with `compose.test.yml`. Do not switch to host `poetry run pytest` for the same run. The stack publishes no host ports. Give the run its own Compose project name so it does not collide with another agent. Open the [backend README](README.md#tests-and-lint) when you need the `make` targets. The command below is enough to run pytest.

```sh
docker compose -f compose.test.yml -p kb-test-<name> run --rm backend pytest -x
docker compose -f compose.test.yml -p kb-test-<name> down -v
```

Pass a narrower pytest command when you only need part of the suite. That command replaces the service command, so keep `-x` in it. Rebuild the test image when dependencies change. Run Ruff in the same stack with `ruff check .` in place of the pytest command. Fix the first failure before continuing.

- Put detailed business-rule cases in service tests. Route tests verify the HTTP contract, auth dependencies, error mapping, and response-field visibility. Schema tests cover input shape. Keep a few meaningful integration tests across these boundaries. A mock assertion that a route called a service is not enough to establish correct API behavior.
- New or changed logic needs its branches covered. Authentication and tournament registration are the critical areas. Cover the edge cases and the failure cases. Payment proofs and safety notes join that list when they exist.
- `db_session` already runs for every test. Do not add a database engine, a SQLite database, or another session fixture. Request `db_session` only when that test itself reads or writes rows. Routes already receive it.
- The pytest session migrates the Compose database to head. Each test gets its own transaction, and that transaction rolls back when the test ends. Do not create another database from the test suite.
- Mock calls that leave the process, such as the Supabase key fetch, and later S3 or SES.
- When code is removed, update or delete obsolete tests. Keep coverage for behavior that remains. Judge tests by the regression they would catch, not by their line count relative to the implementation diff.

## Python style

- Format strings with f-strings. Prefer `f"{name}"` over `str.format` and over `%` formatting.
- Raise a specific exception when a call fails. Catch an exception only when this function can handle that exact type. If this layer cannot finish the job, raise again so the failure stays visible.
- A leading underscore marks a function as private to its module. Test its behavior through the public workflow where practical. A test alone does not make a helper public. Extract and expose it only when it has a useful independent contract.
- Do not disable a Ruff rule without a short reason next to the exception.

## Readability

- Write a flow once, and pass in what differs. Use one name for one concept in the same change.
- Keep behavior together. Leave a one-line helper inline when the code is already obvious.
- Extract a helper when it is used more than once, or when a single use is hard to read and the name makes that spot clear. Keep that helper next to its caller.

## Refactor checkpoints

Review responsibility, naming, dependency direction, and which layer owns a rule, not only file placement. Report what changed and what remains. Do not call a directory migration a complete internal refactor. Use the root verification rules. Include a suggested Conventional Commit message at the end of each completed step. The developer stages and commits.
