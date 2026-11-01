# Frontend

These instructions apply to `frontend/` and everything under it. They add to the repository root [AGENTS.md](../AGENTS.md). Read both.

Test function titles and comments follow the root file.

## Libraries

Add a library only when the app has the problem that library solves. Do not add the rest of a family because one package was useful.

- TanStack Query, which is React Query, when a screen loads server data that another screen also needs, or when a page needs loading, error, and refresh without a hand-rolled effect. Keep the existing fetch functions. Query hooks call them.
- Zustand when a value is read in several distant places, did not come from the API, and is not the Supabase session. Leave the session in the existing auth hook.
- React Hook Form when a form's own state is hard to follow. The backend still validates.
- Zod for client checks that help the person filling the form, such as a required field, an email shape, or two passwords that must match. Add it with React Hook Form. Do not add Yup. Do not copy tournament rules, capacity, dates, or who may register into the client schema. The backend owns those rules.
- Keep React Router. Do not replace it with TanStack Router.
- Do not add Axios. Query can call `fetch`.
- Do not add Tamagui. This application is web only.
- Do not add Tailwind, shadcn, or another component kit unless the task is about the visual system.

Keep local form fields in the form. Do not copy an API payload into Zustand while Query also holds it. Store an id on the client and let Query load the record.
