# Frontend

These instructions add to the root [AGENTS.md](../AGENTS.md) for `frontend/` and its descendants. [Decision 0006](../specs/decisions/0006-frontend-application-structure.md) records the rationale. Open it when that rationale affects the task.

## Design and ownership

Organize code by capability and reason for change. Before editing a module, identify its responsibility, callers, and state owner. Moving files alone does not resolve mixed responsibilities.

Keep short helpers beside their only caller. Extract a module for a distinct responsibility, demonstrated reuse, or behavior that benefits from focused tests. Do not split by line count or create a hook, provider, type file, or component for every function or JSX section. Similar markup alone does not justify sharing. Prefer concrete feature components over generic components with many mode flags.

Local state belongs with the component's job. Pass specific values and callbacks rather than a whole application context. Use `children` or slots for composition across features.

## Files and imports

| Location | Owns |
| --- | --- |
| `src/app/provider.tsx` | Application-wide provider composition |
| `src/app/router.tsx` | URL-to-route mapping |
| `src/app/routes/` | Screen composition, URL inputs, navigation, and route layouts |
| `src/features/<name>/` | One product area, such as `auth` or `tournament` |
| `src/components/` | Shared UI, without atoms/molecules/organisms categories |
| `src/hooks/` | Shared hooks |
| `src/lib/` | Configured clients, such as Supabase and Query |
| `src/config/` | Environment values and globals, without UI or API calls |
| `src/utils/` | Shared plain functions without React or feature knowledge |
| `src/testing/` | Reusable test helpers, mocks, and generators |

New files follow this layout. When editing a file outside it, move the file and its tests into the layout. Leave untouched files where they are.

Inside a feature, use only the needed `api/`, `components/`, `hooks/`, `stores/`, `types/`, `utils/`, and `assets/` folders. Create folders with their first file. Keep modules flat within those folders. `app/routes/auth/` is valid. `features/tournament/components/registration/form/fields/item.tsx` is too deeply nested.

- Use kebab-case folders and filenames, such as `sign-in-form.tsx` exporting `SignInForm`. Rename an edited or moved PascalCase file. Leave untouched filenames alone.
- Use direct `@/` source imports, such as `@/features/auth/components/sign-in-form`. Do not add folder barrels or re-export-only `index.ts` files.
- The alias is configured in `tsconfig.app.json`, `vite.config.ts`, and `vitest.config.ts`. ESLint rejects relative source imports. Replace them in edited files without expanding the task to untouched files.

## Dependency direction

Shared modules may be imported by features. Features may be imported by application routes and providers.

- A feature imports neither another feature nor `src/app`.
- Shared modules import neither features nor application routes.
- Move code into a shared folder when multiple features need it. Keep feature-specific code with its feature.
- A route composes features. For example, it can read auth state and pass values or an auth component to tournament UI. Tournament code must not import auth hooks. Do not move auth code into shared folders to evade this boundary.
- Production code must not import `src/testing`.

Preserve the `import/no-restricted-paths` enforcement in `eslint.config.js`. When changing a boundary rule, verify a forbidden import and a permitted import. Do not disable enforcement to make a move pass.

## Routes, providers, and UI

Keep React Router in library mode (`react-router-dom`). Do not add file-based routing or replace it with TanStack Router. `app/router.tsx` is the only URL-to-route map.

| Role | File and export example | Responsibility |
| --- | --- | --- |
| Screen route | `sign-in-route.tsx`, `SignInRoute` | URL inputs, page frame, feature composition, navigation callbacks |
| Layout route | `authenticated-layout.tsx`, `AuthenticatedLayout` | Shared routing behavior around an `Outlet` |
| Visual frame | `auth-page-frame.tsx`, `AuthPageFrame` | Presentation around `children`, without URL or access logic |
| Form | `sign-in-form.tsx`, `SignInForm` | Inputs, submission, and errors |
| Feature panel | `password-reset-panel.tsx`, `PasswordResetPanel` | Related loading, error, and form states |
| Provider | `auth-session-provider.tsx`, `AuthSessionProvider` | One named state scope |

Names describe responsibilities and agree with filenames. Follow the [application vocabulary](../specs/taxonomy.md#application-vocabulary), including `TournamentRegistrationForm`. Prefer concrete names over `Manager`, `Container`, or `Content`. Keep useful React names such as `AppProvider` and `AppRouter`.

A route may consume a feature query hook. Requests, form state, and validation stay in the feature. A small route composing `AuthPageFrame` and `SignInForm` is useful. Do not add a forwarding `SignInPage` with the same props. Simple screens may own their presentation without a separate feature.

`AuthenticatedLayout` checks session restoration and redirects guests before rendering `<Outlet />`. Keep this check out of individual protected screens. Recovery screens may still need expired-link states. Backend authorization remains mandatory.

A frame belongs to its feature while only that feature uses it. Several routes using `AuthPageFrame` does not make it shared UI.

`AppProvider` composes providers and creates the query client once per mounted tree. It does not map URLs, render screens, or combine unrelated state. Auth session state and its provider belong in `features/auth`. Language preferences are shared. Use specific hooks such as `useAuthSession` and `useLanguage`, not a catch-all `AppContext`.

Mount providers at the lowest common ancestor of their consumers. Global mounting does not change feature ownership. Keep a provider with its owning UI code. A context and consumer hook may share a non-JSX module, with the provider separate for Fast Refresh. Extract a state hook when its lifecycle warrants it, without requiring three files per context.

## Feature requests and forms

`features/<name>/api/` owns request functions and query or mutation hooks. It is the service layer. Do not add `services/` or a repository layer that only forwards arguments. Feature endpoints stay here, outside shared clients in `src/lib`.

API modules may adapt the configured Supabase client. Routes own navigation. Keep request types beside their functions until a separate feature type module clarifies ownership.

Keep controlled fields and submission feedback near the form. Separate meaningful notices, summaries, and panels when that improves readability. For large forms, extract payload parsing, validation, or request-error mapping into feature utilities before introducing a universal form framework. Preserve input values, duplicate-submit protection, errors, translations, and success behavior.

## Libraries and state

Add a library only for an existing need. Do not add related packages automatically.

| Library | When to use it |
| --- | --- |
| TanStack Query | Server data needing loading, error, refresh, or reuse across screens. Feature `api/` hooks call existing fetch functions |
| Zustand | Client-only state read in distant places. Feature stores live in that feature's `stores/`. Stores used by multiple features live in shared code |
| React Hook Form | A form whose own state is difficult to follow |
| Zod | Helpful client checks, added with React Hook Form. Examples include required fields, email shape, and matching passwords |

Keep local fields in the form and Supabase session state in auth hooks. Do not duplicate Query data in Zustand. Store an ID and let Query load its record. The backend owns tournament rules, capacity, dates, registration eligibility, and final validation.

Do not add Axios, Yup, or Tamagui. Query can use `fetch`, and this application is web only. Add Tailwind, shadcn, or another component kit only in a visual-system task.

## Tests and review

- Colocate tests with source and move them together. Use `.test.ts` or `.test.tsx`, without `__tests__/`, a mirrored `frontend/tests/` tree, or `.spec` suffixes.
- Put routing integration tests beside the route or router, rather than feature components that cannot import `src/app`.
- Test visible form behavior and submitted payloads. Test guards for loading, guest redirects, session loss, and preserved destinations. Do not test component names or every extracted helper's existence.
- Retain meaningful regression coverage during refactors. Add coverage for changed or previously uncovered boundaries.

Review responsibilities, naming, dependency direction, and state ownership as well as file placement. A passing suite or directory migration alone does not establish a complete refactor. Report changes and remaining work. Follow root verification rules, suggest a Conventional Commit message at each completed checkpoint, and leave staging and committing to the developer.
