# Backend

## Scope

These instructions apply to `backend/` and everything under it. They add to the repository root [AGENTS.md](../AGENTS.md). Read both. The root file still owns product boundaries, issue workflow, and repository wide rules.

The backend owns domain rules, authorization, and database access. Supabase Auth owns identity. Domain rows live in PostgreSQL `public`. Leave Supabase managed `auth` objects alone.

New code follows this file. Leave existing code that still breaks these rules in place. Refactor it when the task asks for that refactor, or when the current task allows a small local cleanup that does not rewrite a working chunk of code.

## Domain packages

Group the API by application domain. Each domain is one Python package directly under `backend/`.

A domain package holds the code that belongs to that area.

- `models.py` holds that domain's tables and relationships, when it has any.
- `schemas.py` holds request and response models.
- `router.py` holds HTTP routes.
- `services.py` holds business logic.
- `exceptions.py` holds errors that belong to that domain.

`tournaments/` is a domain package. `auth/` is a domain package too. The current `auth.py` module is the old placement. New auth code goes in the `auth` package. Membership and inventory, when they are built, get their own packages. They stay out of `tournaments/`.

The verified user, the guest identity, token checks, and auth errors belong to `auth`. Other domains import those pieces. They do not grow their own copy.

A domain may split a large flow into another module inside the same package, as `tournaments/signups.py` does today. That module still belongs to the domain. It does not become a second place for route handlers.

## Shared code

The backend root is for infrastructure other domains import. That includes `main.py` and `database.py`. New domain tables go in the domain package. They do not go in a root `models.py`.

Avoid circular imports between domain packages. If two packages need the same helper, put the shared piece in a root module that does not import those packages back.

## Configuration

Settings come from environment variables. Settings that more than one domain reads live in `settings.py`. Settings that only one domain uses live in that package. Keep secrets out of source. The current auth settings in `settings.py` are the old placement.

## Routers

A route reads the path, query, and body, applies the access rules below, calls a service, and returns the response. Permission decisions, domain calculations, and database writes stay in the service.

## Route access

Every route declares authentication, authorization, and throttling where the route is defined. A reader should see all three without opening the service.

Authentication uses the dependencies from the auth domain. Today those dependencies live in `auth.py`. After the auth package exists, import them from there.

- `get_current_user` for a route guests may call. The dependency still runs. An invalid token is rejected.
- `require_authenticated_user` for a route that needs a verified account.
- `require_admin` for a route limited to guild staff.

Authorization is the rule for what that caller may do. A valid token only proves identity. Role, ownership, and visibility are separate checks. Keep the dependency on the route so the requirement stays visible. Put the check in the service when it depends on domain data.

Throttling is declared on the route as well. Each route names the limit that applies to it, including a route that is intentionally open. The backend does not have a shared limiter yet. Introduce one shared dependency for the whole API, then attach that dependency on each route. Do not add a separate limiter inside a single handler.

Guild staff are admins and have full application access. There are no event specific admin assignments. Keep the existing `regular_user`, `guild_member`, and `admin` boundaries. Read the role only from the verified token's Auth managed `app_metadata.karlbruder_role`.

## Schemas

A schema checks shape and field consistency. Domain decisions stay in the service, called from the route.

## Services

Business logic lives in `services.py`. New rules go there from the start. A service does not accept a FastAPI `Request` or `Response`.

Query code stays in the service. Do not add a selector layer unless a developer has already split a read path for a real reason.

Name service and domain methods with a verb that states the action. `create_signup` tells the reader what happens. `signup` does not. Noun only names hide the action. Private helpers follow the same rule. A wrapper still needs a verb, because the name is how the next reader finds the behavior.

Keep a service focused on one workflow. Add a type hint where it makes the contract obvious.

## Models

A model defines the table, its constraints, and small derived properties. Cross table decisions belong in the service.

Prefer a `UniqueConstraint` or `CheckConstraint` when the database can enforce the rule. Models inherit from `database.Base`. Keep the integer primary keys this project already uses. The Supabase user id is a reference column. It is not a local user table, and new models do not need a UUID or audit base class.

## API errors

Raise a domain exception from the service. Map it to an HTTP status in the route. Keep one error shape for the API.

Put the exception in the domain that owns it. Tournament errors live in `tournaments/exceptions.py`. Auth errors live in `auth/exceptions.py`. A shared base used only to keep that HTTP shape can stay at the root, where other domains import it. The current root `exceptions.py` is the old placement.

## Migrations

Alembic owns schema changes. Never edit a revision that is already on `master`. You may edit a revision that exists only on the current branch. That means `git diff master` shows the file as added.

## Queries and caching

Stay with the simple query. Use `selectinload` or `joinedload` in the service when a relationship would otherwise query once per row. Use the pagination the tournament list already has.

Warn and ask before a larger optimization. Do not add an index, `lru_cache`, or Redis for a small gain. PostgreSQL does not index the referencing side of a foreign key for you. Ask before adding an index.

Production is one Compose stack on a single EC2 instance. Gunicorn can still run more than one worker in that container, so a process local cache does not cover every worker. Do not add Redis until a shared cache is actually needed.

## Workers and external calls

If a job could stall the API process, say so and ask before adding a worker or a queue. Do not choose the worker or the queue on your own.

Outbound S3 and SES calls, when they exist, sit behind a small client. Tests mock that client.

## Tests

`backend/tests/` follows the same tree as the domain packages, so a test is easy to find from the code it covers.

A test for `backend/tournaments/` lives in `backend/tests/tournaments/`. A test for `backend/auth/` lives in `backend/tests/auth/`. The current `backend/tests/test_auth.py` matches the old `auth.py` module. Shared fixtures for a package live in that package's `conftest.py`.

Name the test file after the behavior it covers, for example `test_tournament_signups.py`. The test tree mirrors packages. It does not need a twin file for every source file. Tests stay under `backend/tests/`.

Run tests from the repository root with `compose.test.yml`. That stack publishes no host ports. Give the run its own Compose project name so it does not collide with another agent.

```sh
docker compose -f compose.test.yml -p kb-test-<name> run --rm backend pytest -x
docker compose -f compose.test.yml -p kb-test-<name> down -v
```

Pass a narrower pytest command when you only need part of the suite. That command replaces the service command, so keep `-x` in it. Rebuild the test image when dependencies change. Run Ruff in the same stack with `ruff check .` in place of the pytest command. Fix the first failure before continuing.

Test each behavior once, in the layer that owns it. Service tests cover the branches of the business rule. Route tests cover status codes, auth, and that the route calls the service. Schema tests cover field shape. Do not repeat the same case in all three.

New or changed logic needs its branches covered. Authentication and tournament registration are the critical areas. A bug there blocks sign in or accepts a bad signup. Cover the edge cases and the failure cases. Payment proofs and safety notes join that list when they exist.

Tests should create and read rows in the database. Mock calls that leave the process, such as the Supabase key fetch, and later S3 or SES.

When code is removed, update or delete its tests. One test that shows the behavior is gone is enough. If the test diff is several times the code diff, cut it back to the tests that would catch a likely regression.

## Python style

Format strings with f-strings. Prefer `f"{name}"` over `str.format` and over `%` formatting.

Raise a specific exception when a call fails. Catch an exception only when this function can handle that exact type. If this layer cannot finish the job, raise again so the failure stays visible. A broad `except` that swallows the error hides it. This is Python. A swallowed exception does not come back later on its own.

A leading underscore marks a function as private to its module. Leave it private. If a test needs to call that function, it is part of the public surface. Remove the underscore and name it as a public function.

Do not disable a Ruff rule without a short reason next to the exception.

## Writing

Write docs, docstrings, comments, and Markdown for a person who is skimming.

Use short sentences. Start a new sentence when the next idea begins. Join ideas with a comma, a period, or a new paragraph. Skip semicolons. Skip a dash used to splice two clauses into one sentence.

Say what the code does, who it is for, and what the reader should do next. Leave out filler.

## Readability

Write a flow once, and pass in what differs. Use one name for one concept in the same change.

Keep behavior together. A one line helper used in one place is noise when the code is already obvious. Leave that code inline.

Extract a helper in two cases. It is used more than once, or a single use is hard to read and the name makes that spot clear. Keep that helper next to its caller. Do not split obvious code into small functions for their own sake. The goal is code that is easy to read and easy to maintain.
