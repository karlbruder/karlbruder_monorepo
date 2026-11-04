# Frontend

These instructions apply to `frontend/` and everything under it. They add to the repository root [AGENTS.md](../AGENTS.md). Read both.

Keep React Router in library mode (`react-router-dom`). Do not add a file-based router.

## Design principles

Organize code by capability and reason for change. Before editing a module, identify its role, callers, and state. Preserve working behavior as a regression baseline. Moving a screen into `features/` does not resolve mixed responsibilities.

Use the smallest design that makes a change easy to understand. Keep a short helper beside its only caller. Extract a module when it has a distinct responsibility, meaningful reuse, or behavior that benefits from focused tests. Do not create a hook, provider, type file, or component for every function. Do not impose a line-count limit or split every JSX section into a file.

A component can have local state. The question is whether that state belongs to the component's job. Similar markup alone does not justify a shared abstraction. Prefer explicit feature components over a generic component controlled by many mode flags.

## Structure

This layout is [decision 0006](../specs/decisions/0006-frontend-application-structure.md).

New files follow the tree below. When a change edits a file that sits outside this tree, move that file into the tree as part of the same change. Leave files the change does not touch where they are.

```text
src/
  app/
    provider.tsx
    router.tsx
    routes/
      authenticated-layout.tsx
      home-route.tsx
      auth/
      tournament/
  features/
    auth/
      api/
      components/
      hooks/
    tournament/
      api/
      components/
  components/
  hooks/
  lib/
  config/
  testing/
  utils/
```

Create a folder when the first file needs it. Do not add an empty folder to match the picture.

Name a folder and a file in kebab-case. `sign-in-form.tsx` is the file. `SignInForm` is the component inside it. A change that edits or moves a PascalCase file renames that file. Leave the other PascalCase files until a change touches them.

The illustrated `app/routes/auth/` and `features/tournament/components/` paths are valid. Keep modules flat within those folders. `features/tournament/components/registration/form/fields/item.tsx` adds unnecessary nesting. Flatten it.

Import from `src` with the `@/` alias, for example `@/features/auth/components/sign-in-form`. The alias is set in `tsconfig.app.json`, `vite.config.ts`, and `vitest.config.ts`. A new import does not climb with `../../../`. An existing relative import stays until the file that contains it is edited.

Import a module directly. Do not add a barrel file that re-exports a folder, including an `index.ts` that only republishes its public modules. Direct imports make dependencies visible and avoid barrel indirection.

Shared code may be used by a feature. A feature may be used by a route. A feature does not import another feature, and it does not import `src/app`. A shared component, hook, util, or `src/lib` module does not import a feature or a route. If two features need the same piece, move that piece up to the shared folder. If a screen needs two features, the route composes them.

`eslint.config.js` enforces these boundaries with `import/no-restricted-paths`. Preserve that enforcement. When changing a boundary rule, verify both a forbidden import and a permitted import. Do not disable the rule to make a move pass.

An application route may read auth state and pass the required values or an auth component through props to the tournament feature. The tournament feature must not import auth hooks directly. Do not move auth-specific code into a shared folder merely to bypass that restriction.

### `src/app/provider.tsx`

`AppProvider` composes application-wide providers. It creates the query client once for its mounted tree. It does not declare URLs, render screens, or collect all application state into one object.

A context transports state without changing its owner. Keep auth session state and its provider in `features/auth`. Language preferences are shared. Use specific hooks such as `useAuthSession` and `useLanguage`, not a catch-all `AppContext`.

A provider component belongs with its owning UI code. A context and consumer hook may share a non-JSX hook module, with a separate provider component when needed for Fast Refresh. A separate state hook is useful when the lifecycle is substantial. This is not a requirement to create three files for every context.

Mount each provider at the lowest common ancestor of its consumers. A feature provider can be mounted by `AppProvider` when the whole application needs it. Global mounting does not make its implementation shared code.

### `src/app/router.tsx`

The router is the URL map. It is the only place that connects a path to a route module. React Router already does this job.

### Route

A route module lives in `src/app/routes/`. A screen route reads URL inputs, chooses the page frame, composes feature UI, and handles navigation after feature callbacks. It can consume a feature query hook. The request implementation, form state, and validation remain in the feature.

Small route modules are expected. `SignInRoute` composing `AuthPageFrame` and `SignInForm` is useful because it owns URL and navigation decisions. Avoid adding another `SignInPage` whose only job is to forward the same props. A simple screen can render its own presentation without creating a feature for it. The application home is an example.

A layout route may have no path of its own. `AuthenticatedLayout` checks session restoration and redirects guests before rendering `<Outlet />` for its children. It belongs in `app/routes` because it controls route access. It is not a form or a destination screen. Keep that check in the layout instead of repeating it in every protected screen. Recovery screens can still need their own expired-link states.

A visual frame accepts `children` and arranges presentation. `AuthPageFrame` belongs in the auth feature while only auth screens use it. It does not read the URL or guard access. A feature frame does not become shared merely because several routes use it.

These guards control navigation and visible UI. Backend authorization remains mandatory.

### Names that explain the role

Use these local conventions consistently. They are not file-based routing rules.

| Role | File and export example | Responsibility |
| --- | --- | --- |
| Screen route | `sign-in-route.tsx`, `SignInRoute` | URL inputs and screen composition |
| Layout route | `authenticated-layout.tsx`, `AuthenticatedLayout` | Shared routing behavior around an `Outlet` |
| Visual frame | `auth-page-frame.tsx`, `AuthPageFrame` | Presentation around `children` |
| Form | `sign-in-form.tsx`, `SignInForm` | Inputs, submission, and errors |
| Feature panel | `password-reset-panel.tsx`, `PasswordResetPanel` | Related loading, error, and form states |
| Provider | `auth-session-provider.tsx`, `AuthSessionProvider` | One named state scope |

Name components by responsibility and make filenames agree. Follow the [application vocabulary](../specs/taxonomy.md#application-vocabulary), including `TournamentRegistrationForm` for tournament participation. Prefer concrete names over `Manager`, `Container`, or `Content`. Keep useful React names such as `AppProvider` and `AppRouter`.

### Feature

A feature is one product area, such as `auth` or `tournament`. It lives in `src/features/<name>/`. It owns the components, hooks, API calls, and types that exist only for that area. Add only the subfolders that area uses. Those subfolders are `api/`, `components/`, `hooks/`, `stores/`, `types/`, `utils/`, and `assets/`.

### Component inside a feature

A component in `src/features/<name>/components/` belongs to that feature. Move genuinely shared UI to `src/components` when another feature needs it.

Prefer composition through `children`, slots, and callbacks when a screen combines features. Pass the values a child needs, not a whole application context object. Keep controlled form fields and submission feedback near the form. Keep independently meaningful success notices, summaries, and panels separate when that makes the flow easier to read.

A large form may need separate payload parsing, field validation, or request-error mapping in its feature utilities. Extract those responsibilities before inventing a universal form framework. Preserve input values, duplicate-submit protection, errors, translations, and success behavior during the split.

### `api/`

`src/features/<name>/api/` holds the request functions and query or mutation hooks for that feature. This is the service layer. Do not add a `services/` folder.

A feature API module can adapt the configured Supabase client. Keep transport details here and UI navigation in the route. Do not add another service or repository layer that simply forwards the same arguments. Request types may stay beside their functions until a separate feature type module makes ownership clearer.

### Shared modules

Keep components, hooks, and utilities beside their feature until more than one feature needs them.

| Folder | Responsibility |
| --- | --- |
| `src/components` | Shared UI. Do not sort it into atoms, molecules, and organisms |
| `src/hooks` | Hooks used by multiple features |
| `src/lib` | Configured clients, such as Supabase and Query. Endpoints stay in feature `api/` folders |
| `src/config` | Environment values and globals. No UI or API calls |
| `src/utils` | Shared plain functions with no React or feature knowledge |

### Tests

A test file sits beside its source, such as `sign-in-form.test.tsx` beside `sign-in-form.tsx` in `src/features/auth/components/`. Move them together. Test titles and comments follow the root instructions.

Use a `.test.ts` or `.test.tsx` suffix. Do not add a `__tests__` folder. Do not add a `frontend/tests` tree that mirrors `src`. Do not use a `.spec` suffix.

`src/testing` holds helpers, mocks, and generators that more than one test uses. Production code does not import `src/testing`.

Place a routing integration test beside the route or router it exercises. Do not put it beside a feature component if it must import `src/app`. Test forms for their visible behavior and submitted payloads. Test guards for loading, guest redirects, session loss, and preserved destinations. Do not test component names or the existence of every extracted helper.

When refactoring, retain meaningful regression coverage and add tests for changed or previously uncovered boundaries. A passing suite does not by itself establish that the new ownership is clear.

## Libraries

Add a library only when the app has the problem that library solves. Do not add the rest of a family because one package was useful.

- TanStack Query, which is React Query, when a screen loads server data that another screen also needs, or when a page needs loading, error, and refresh without a hand-rolled effect. Keep the existing fetch functions. Query hooks call them from the feature `api/` folder.
- Zustand when a value is read in several distant places, did not come from the API, and is not the Supabase session. Leave the session in the existing auth hook. A store used by one feature lives in that feature's `stores/` folder. A store used by more than one feature lives in a shared module.
- React Hook Form when a form's own state is hard to follow. The backend still validates.
- Zod for client checks that help the person filling the form, such as a required field, an email shape, or two passwords that must match. Add it with React Hook Form. Do not add Yup. Do not copy tournament rules, capacity, dates, or who may register into the client schema. The backend owns those rules.
- Keep React Router. Do not replace it with TanStack Router.
- Do not add Axios. Query can call `fetch`.
- Do not add Tamagui. This application is web only.
- Do not add Tailwind, shadcn, or another component kit unless the task is about the visual system.

Keep local form fields in the form. Do not copy an API payload into Zustand while Query also holds it. Store an id on the client and let Query load the record.

## Refactor checkpoints

Review responsibility, naming, dependency direction, and state ownership as well as file placement. Report what changed and what remains, without calling a directory migration a complete internal refactor. Use the root verification rules and include a suggested Conventional Commit message at the end of each completed step. The developer stages and commits.

## Reference philosophy

[Bulletproof React's Vite example](https://github.com/alan2207/bulletproof-react/tree/master/apps/react-vite/src), its [structure guidance](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md), and the [AdeptDev article](https://www.adeptdev.io/blogs/react-folder-structure-best-practices) are background examples. [Decision 0006](../specs/decisions/0006-frontend-application-structure.md) records the chosen layout. Follow the local rules above rather than copying an external template or dependency list.
