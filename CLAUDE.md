# Gateway2Deutsch platform (g2d-app)

German B1 exam-prep platform. Pilot inside a German academy in Pakistan (100+ students).
Owner: Malik Ali (designer, not a developer — explain decisions in plain words, short).

## Stack
- Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, Lucide icons
- Supabase: Postgres database, Auth, Storage. Use the official `@supabase/ssr` package and follow Supabase's current Next.js server-side auth guide.
- Hosting: Vercel, connected to this GitHub repo (every push deploys automatically)
- Validation: zod. Forms: react-hook-form.

## Roles
student · teacher · academy_admin · super_admin
Stored in `public.profiles.role`. Students sign up themselves. Teachers and academy admins are invited/promoted by an admin — never chosen in the public signup form.

## Security rules (never break these)
- Row Level Security ON for every table, with explicit policies. No table without policies.
- Never trust the role from the browser; check it on the server (server components, server actions, route handlers).
- The Supabase secret/service-role key is only used in server code and never prefixed NEXT_PUBLIC_.
- Never commit `.env*` files. Keep `.env.example` up to date with variable names only.
- Protect app routes on the server; redirect logged-out users to /login.
- Database changes only via SQL migration files in `supabase/migrations/`.

## Design
Always use the `g2d-ui` skill (.claude/skills/g2d-ui) for any screen.

## Git workflow (do this automatically)
- After each working step (builds with `npm run build`, no lint errors), commit with a clear message and `git push` to `main`.
- Small commits, one feature or fix each. Never push broken builds.
- Never push secrets. Check `git status` before committing.

## Pilot features (8 weeks)
1. AI checks homework and writing, teacher confirms or overrides, student sees both
2. Timed B1 mock exam, all 4 skills (start with 1 mock)
3. Batches, timetable and attendance
4. Fees, installments and balances
5. Playbook PDF sales with free preview and discount code

## Status
- [x] Project setup + design tokens
- [x] Login, signup, password reset, logout
- [x] Role-based redirect + student dashboard (UI with sample data)

## Notes for the next session
- Next.js 16: `src/proxy.ts` (was middleware). cacheComponents is off on purpose (auth reads cookies per request).
- Supabase keys are read only on the server at runtime (`src/lib/supabase/env.ts`); auth runs in server actions (`src/app/(auth)/actions.ts`).
- Always check user + role with `requireUser()` from `src/lib/auth/dal.ts` in protected pages.
- Dashboard uses sample data from `src/lib/sample-data.ts`.
- Setup steps for Supabase/Vercel: `docs/SETUP.md`.
- Live site: https://g2d-app-ali-3548.vercel.app (Supabase project ref epawkdeosmuvczpsyoru). Supabase Site URL + redirect URL are set to it.
