# Backend

## Scope

These instructions apply to `backend/` and everything under it. They add to the repository root [AGENTS.md](../AGENTS.md). Read both. The root file owns product boundaries, ownership, the issue workflow, and repository-wide rules, including how to name a test function. This file does not copy those.

Open [authentication and access](../specs/identity/authentication-and-access.md) when the task changes who may call a route or see a record. The route and service rules in this file are enough for other backend work.

New code follows this file. Leave existing code that still breaks these rules in place. Refactor it when the task asks for that refactor, or when the current task allows a small local cleanup that does not rewrite a working chunk of code. Do not retrofit a new rule onto old code while doing unrelated work.

Current code that predates these rules:

- `app/auth.py` is the old auth module. New auth code goes in the `auth` package. Leave `app/auth.py` in place until a task moves it.
- Auth settings still live in `config/`. A setting only one domain reads belongs in that package.
- Root `exceptions.py` still holds older domain errors. New domain errors go in the owning domain. API errors below says where the shared HTTP base stays.
- `backend/tests/test_auth.py` matches the old auth module. New auth tests go in `backend/tests/auth/`.

## Domain packages

Group the API by application domain. Each domain is one Python package directly under `backend/app/`.

- `models.py` holds that domain's tables and relationships, when it has any.
- `schemas.py` holds request and response models.
- `router.py` holds HTTP routes.
- `services.py` holds business logic.
- `exceptions.py` holds errors that belong to that domain.

`app/tournaments/` and `auth/` are domain packages. Membership and inventory, when they are built, get their own packages. They stay out of `tournaments/`.

The verified user, the guest identity, token checks, and auth errors belong to `auth`. Other domains import those pieces. They do not grow their own copy.

A domain may split a large flow into another module inside the same package, as `tournaments/signups.py` does. That module still belongs to the domain. It does not become a second place for route handlers.

## Shared code

- Application code lives in `backend/app`, including `main.py` and `database.py`.
- Settings live in `backend/config`. Alembic, tests, and the Dockerfile stay at the backend root.
- New domain tables go in the domain package. They do not go in `app/models.py`.
- Avoid circular imports between domain packages. Put a shared helper in an `app` module that does not import those packages back.

## Configuration

Settings come from environment variables. Keep secrets out of source. Open [local development](../specs/platform/local-development.md) when the task changes local or test settings beyond the rules below. Open [data storage](../specs/platform/data-storage.md) when the task changes where domain rows are stored.

- Settings that more than one domain reads live in `config/`. Settings that only one domain uses live in that package.
- `config/base.py` holds the shared settings class. A setting the process cannot run without has no default there. Pydantic raises while it builds settings, at startup.
- Do not add a validator whose only job is to reject a missing value. A required field already does that.
- Do not check again when a service starts or when a route runs. That code uses the value.
- `LocalSettings` may default the Compose domain database. It does not default the Auth database. That connection is hosted Supabase, including during local development.
- `TestSettings` may point the Auth diagnostic at the test database, because that stack has no hosted Supabase.
- `AwsSettings` does not invent a host, database name, user, or password. Secrets Manager fills only what that environment left unset.
- A fixed technical choice may have a default on the base class. The database driver is one. The PostgreSQL port is another, and it defaults to 5432. A host, database name, user, and password do not get a default.

## Routers

A route reads the path, query, and body, applies the access rules below, calls a service, and returns the response. Permission decisions, domain calculations, and database writes stay in the service.

## Route access

Declare who may call the route by attaching one auth dependency. A reader should see that dependency on the route. Today those dependencies live in `app/auth.py`. New auth dependencies go in the `auth` package.

- `get_current_user` for a route guests may call. The dependency still runs. An invalid token is rejected.
- `require_authenticated_user` for a route that needs a verified account.
- `require_admin` for a route limited to guild staff.

Read the role only from the verified token's Auth-managed `app_metadata.karlbruder_role`. Keep the existing `regular_user`, `guild_member`, and `admin` values. The root file owns the staff boundary.

A valid token only proves identity. When the decision depends on domain data, such as ownership or visibility, the service makes that decision. The route still declares which dependency applies.

Throttling is not implemented. Do not add a limiter while doing unrelated work. When a limiter is introduced, add one shared dependency for the whole API and attach it on each route, including a route that is intentionally open. Do not put a limiter inside a single handler.

## Schemas

A schema checks shape and field consistency. Domain decisions stay in the service, called from the route.

## Services

- Business logic lives in `services.py`. New rules go there from the start.
- A service does not accept a FastAPI `Request` or `Response`.
- Query code stays in the service. Do not add a selector layer unless a developer has already split a read path for a real reason.
- Name service and domain methods with a verb that states the action. `create_signup` tells the reader what happens. `signup` does not. Private helpers follow the same rule.
- Keep a service focused on one workflow. Add a type hint where it makes the contract obvious.

## Models

- A model defines the table, its constraints, and small derived properties. Cross-table decisions belong in the service.
- Prefer a `UniqueConstraint` or `CheckConstraint` when the database can enforce the rule.
- Models inherit from `database.Base`. Keep the integer primary keys this project already uses.
- The Supabase user id is a reference column. It is not a local user table. New models do not need a UUID or audit base class.

## API errors

Raise a domain exception from the service. Map it to an HTTP status in the route. Keep one error shape for the API.

Put a domain exception in the domain that owns it. Tournament errors live in `tournaments/exceptions.py`. Auth errors live in `auth/exceptions.py`.

One shared base may stay in the app-root exceptions module so every domain can return that same HTTP shape. That module is only for the shared base. New domain errors do not go there. Leave older domain errors that already live in that module until a task moves them.

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

`backend/tests/` follows the same tree as the domain packages. A test for `backend/app/tournaments/` lives in `backend/tests/tournaments/`. Shared fixtures for a package live in that package's `conftest.py`.

Name the test file after the behavior area it covers, for example `test_tournament_signups.py`. The tree mirrors packages. It does not need a twin file for every source file. Tests stay under `backend/tests/`.

Name each test function the way the root file describes. Add a docstring only when that function name is a step list or only a spec ID.

Run backend tests from the repository root with `compose.test.yml`. Do not switch to host `poetry run pytest` for the same run. The stack publishes no host ports. Give the run its own Compose project name so it does not collide with another agent. Open the [backend README](README.md#tests-and-lint) when you need the `make` targets. The command below is enough to run pytest.

```sh
docker compose -f compose.test.yml -p kb-test-<name> run --rm backend pytest -x
docker compose -f compose.test.yml -p kb-test-<name> down -v
```

Pass a narrower pytest command when you only need part of the suite. That command replaces the service command, so keep `-x` in it. Rebuild the test image when dependencies change. Run Ruff in the same stack with `ruff check .` in place of the pytest command. Fix the first failure before continuing.

- Test each behavior once, in the layer that owns it. Service tests cover the branches of the business rule. Route tests cover status codes, auth, and that the route calls the service. Schema tests cover field shape.
- New or changed logic needs its branches covered. Authentication and tournament registration are the critical areas. Cover the edge cases and the failure cases. Payment proofs and safety notes join that list when they exist.
- `db_session` already runs for every test. Do not add a database engine, a SQLite database, or another session fixture. Request `db_session` only when that test itself reads or writes rows. Routes already receive it.
- The pytest session migrates the Compose database to head. Each test gets its own transaction, and that transaction rolls back when the test ends. Do not create another database from the test suite.
- Mock calls that leave the process, such as the Supabase key fetch, and later S3 or SES.
- When code is removed, update or delete its tests. One test that shows the behavior is gone is enough. If the test diff is several times the code diff, cut it back to the tests that would catch a likely regression.

## Python style

- Format strings with f-strings. Prefer `f"{name}"` over `str.format` and over `%` formatting.
- Raise a specific exception when a call fails. Catch an exception only when this function can handle that exact type. If this layer cannot finish the job, raise again so the failure stays visible.
- A leading underscore marks a function as private to its module. Leave it private. If a test needs to call that function, it is part of the public surface. Remove the underscore and name it as a public function.
- Do not disable a Ruff rule without a short reason next to the exception.

## Readability

- Write a flow once, and pass in what differs. Use one name for one concept in the same change.
- Keep behavior together. Leave a one-line helper inline when the code is already obvious.
- Extract a helper when it is used more than once, or when a single use is hard to read and the name makes that spot clear. Keep that helper next to its caller.
