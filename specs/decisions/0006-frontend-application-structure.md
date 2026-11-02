# 0006: Frontend application structure

**Created**: 2026-11-01
**Last updated**: 2026-11-02

| Field | Value |
| --- | --- |
| Status | Accepted direction |
| Sources | Product-owner direction on 1 November 2026. [Bulletproof React project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md). [React folder structure best practices in 2026](https://www.adeptdev.io/blogs/react-folder-structure-best-practices) |

## Context

`frontend/` is a Vite and React application. Vite does not choose URLs. The app already uses React Router in library mode. The current source tree was not built to a feature layout. New work needs one place for a screen, its request, and its UI, without pulling in a cross-platform kit or a second router.

The backend records the same kind of layout rule in `backend/AGENTS.md`. It does not have a separate decision for Python packages. This choice is recorded here because it replaces an open-ended frontend tree and names which libraries stay out until a real need shows up.

## Decision

- New frontend files follow a feature layout. `src/app/` holds `provider.tsx`, `router.tsx`, and `routes/`. `src/features/<name>/` holds one product area. Shared UI, hooks, configured clients, settings, and plain helpers stay in `src/components`, `src/hooks`, `src/lib`, `src/config`, and `src/utils`.
- Keep React Router. Do not add a file-based router, and do not replace this router with TanStack Router.
- A screen route reads the URL and composes a visual frame and feature UI. It owns navigation callbacks. A pathless layout route owns shared route behavior and renders `Outlet`. Request implementations, form state, and validation stay in the feature.
- Imports go one way. Shared code may be used by a feature. A feature may be used by a route. A feature does not import another feature, and it does not import `src/app`. Shared code does not import a feature or a route. Two features that need the same piece move that piece up. A screen that needs two features gets them from the route.
- Import from `src` with the `@/` alias. The alias is configured in `tsconfig.app.json`, `vite.config.ts`, and `vitest.config.ts`. A new import does not climb several folders with `../`. An existing relative import stays until the file that contains it is edited.
- Do not add a barrel file that re-exports a folder, including a short `index.ts` that only republishes that folder. Direct imports expose dependencies without barrel indirection.
- Folder names and file names are kebab-case. The component declared in the file stays PascalCase. A change that edits or moves a PascalCase file renames that file. Leave the other files until a change touches them.
- Keep modules flat inside the illustrated route and feature folders. Avoid further nesting by visual section or field.
- Inside a feature, add `api/`, `components/`, `hooks/`, `stores/`, `types/`, `utils/`, or `assets/` only when the first file needs that folder. `api/` is the service layer for that feature. Do not add a `services/` folder. Do not sort shared UI into atoms, molecules, and organisms.
- A test file sits beside the source it checks and uses a `.test.ts` or `.test.tsx` suffix. Shared test helpers live in `src/testing`. Production code does not import `src/testing`.
- When a change edits a file that sits outside this tree, move that file into the tree as part of the same change. Leave files the change does not touch where they are.
- Add a helper library only when the app has the problem that library solves. TanStack Query is for server data that needs loading, error, refresh, or reuse across screens. Zustand is for client-only state read in several distant places, and not for the Supabase session or a copy of data Query already holds. React Hook Form is for a form whose own state is hard to follow. Zod is for client checks that help the person filling the form, added with React Hook Form. The backend still owns tournament rules, capacity, dates, and who may register.
- Do not add Axios, Yup, Tamagui, Tailwind, shadcn, or another component kit as part of this decision. A visual-system task can reopen Tailwind or a component kit on its own.

Working definitions for each folder live in [frontend/AGENTS.md](../../frontend/AGENTS.md).

## Consequences

Removing a feature should affect its application composition sites, such as routes and provider setup. Shared code and unrelated features should not depend on it. If those modules break too, inspect the boundary.

The existing tree stays until a task touches it. This decision does not require a one-shot move of every current file.

Frontend ESLint now enforces the import direction with `import/no-restricted-paths`. Preserve the rule when changing the structure.

## Foundation refinements on 2 November 2026

The structure was compared with Bulletproof React's current Vite example and the AdeptDev article. Feature ownership and application composition remain the direction. The reference implementations are not templates to copy wholesale.

`frontend/AGENTS.md` now defines local role names and extraction criteria. A screen route uses the `Route` suffix. A route layout uses `Layout`. A visual wrapper uses `Frame`. Forms, notices, panels, and providers name their own behavior. These names make boundaries easier to see without adding forwarding components to every screen.

Contexts follow the owner of their state. Auth remains in the auth feature, even though its provider is mounted application-wide. Language state is shared. The application provider composes these scopes rather than combining unrelated state in a generic context.

Internal refactoring must assess responsibilities as well as filenames. Small local helpers can stay local. Extract distinct behavior and useful UI units. Shared abstractions require demonstrated use, and libraries still require an actual problem. The no-barrel policy remains intentional even though the AdeptDev examples include barrels.

## References

[Architecture](../architecture.md), [frontend/AGENTS.md](../../frontend/AGENTS.md), [Bulletproof React Vite source](https://github.com/alan2207/bulletproof-react/tree/master/apps/react-vite/src).
