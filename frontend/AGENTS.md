# Frontend

These instructions apply to `frontend/` and everything under it. They add to the repository root [AGENTS.md](../AGENTS.md). Read both.

Test function titles and comments follow the root file.

The app already uses React Router in library mode (`react-router-dom`). Vite does not choose the URL. The router does. Keep this router. Do not add a file-based router.

## Structure

This layout is [decision 0006](../specs/decisions/0006-frontend-application-structure.md).

New files follow the tree below. When a change edits a file that sits outside this tree, move that file into the tree as part of the same change. Leave files the change does not touch where they are.

```text
src/
  app/
    provider.tsx
    router.tsx
    routes/
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

Stop at about two or three levels under `src`. `features/tournament/components/registration/form/fields/item.tsx` is too deep. Flatten it.

Import from `src` with the `@/` alias, for example `@/features/auth/components/sign-in-form`. The alias is set in `tsconfig.app.json`, `vite.config.ts`, and `vitest.config.ts`. A new import does not climb with `../../../`. An existing relative import stays until the file that contains it is edited.

Do not add a barrel file that re-exports a folder. An `index.ts` that only republishes the public files of a folder is still a barrel. Vite tree shaking is the reason it stays out.

Shared code may be used by a feature. A feature may be used by a route. A feature does not import another feature, and it does not import `src/app`. A shared component, hook, util, or `src/lib` module does not import a feature or a route. If two features need the same piece, move that piece up to the shared folder. If a screen needs two features, the route composes them.

When frontend lint configuration is next changed, add an import restriction that fails those crossings. Until that rule exists, new code still follows the direction above.

### `src/app/provider.tsx`

The provider wraps the whole tree with clients every screen needs. A query client belongs here once TanStack Query is added. The provider does not declare a URL, and it does not render a screen.

### `src/app/router.tsx`

The router is the URL map. It is the only place that connects a path to a route module. React Router already does this job.

### Route

A route module lives in `src/app/routes/`. One module is one screen, or a layout around several screens. A layout route renders `<Outlet />` so those screens share a frame. The route reads the URL and composes features. It does not own the form, the request, or the validation.

### Feature

A feature is one product area, such as `auth` or `tournament`. It lives in `src/features/<name>/`. It owns the components, hooks, API calls, and types that exist only for that area. Add only the subfolders that area uses. Those subfolders are `api/`, `components/`, `hooks/`, `stores/`, `types/`, `utils/`, and `assets/`.

### Component inside a feature

A component in `src/features/<name>/components/` is UI for that feature only. Another feature does not import it. When a second feature needs the same UI, move the component to `src/components`.

### `api/`

`src/features/<name>/api/` holds the request functions for that feature, and the query hooks that call them once TanStack Query is added. This is the service layer. Do not add a `services/` folder.

### Component outside a feature

`src/components` holds UI used by more than one feature. A button or a field that only one feature renders stays inside that feature. Do not sort these files into atoms, molecules, and organisms.

### Hook outside a feature

`src/hooks` holds a hook used by more than one feature. A hook used by one feature stays in `src/features/<name>/hooks/`.

### `src/lib`

`src/lib` holds a configured client that the rest of the app calls, such as the fetch wrapper or, later, the query client setup. Endpoints do not live here. They live in the feature `api/` folder.

### `src/config`

`src/config` holds environment values and other globals the app reads. It does not render UI, and it does not call the API.

### `src/utils`

`src/utils` holds a plain function with no React and no knowledge of one feature, when more than one feature uses it. A function that only one feature uses stays in that feature.

### Tests

A test file sits beside the source it checks. `src/features/auth/components/sign-in-form.test.tsx` sits next to `sign-in-form.tsx`. The folder lists both. A missing test is visible there, and moving the component moves the test.

Use a `.test.ts` or `.test.tsx` suffix. Do not add a `__tests__` folder. Do not add a `frontend/tests` tree that mirrors `src`. Do not use a `.spec` suffix.

`src/testing` holds helpers, mocks, and generators that more than one test uses. Production code does not import `src/testing`.

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
