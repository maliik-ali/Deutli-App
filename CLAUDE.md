# Deutli platform (deutli-app, formerly Gateway2Deutsch / g2d-app)

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
Full-screen screens (Daily Practice reader, word practice): the close ✕ always sits at the right edge of the top bar.
Brand source of truth: Deutli Figma file https://www.figma.com/design/4pD07O1cSsoPm5yTw6czDG/Deutli (dark navy UI, purple gradient, owl mascot). Figma wins over older notes.

## Git workflow (do this automatically)
- After each working step (builds with `npm run build`, no lint errors), commit with a clear message and `git push` to `main`.
- Small commits, one feature or fix each. Never push broken builds.
- Never push secrets. Check `git status` before committing.

## Progress dashboard (do this automatically, without being asked)
Malik tracks the build in the dashboard "Deutli Build Progress": https://claude.ai/artifact/Ni2FFAVK82AdfZ8KDtHbLs
At the end of every session that finished or added work, update it:
1. Download the two data files (Artifact tool, `action: "read"`, `path` = the file's `/_blob/<id>` from `datasets/roadmap` and `datasets/changes` in its store).
2. `roadmap.json` = `{rows: [{area, item, status: "Done" | "To do" | "Waiting on you", done_on: "YYYY-MM-DD" | null, pilot_feature: bool}]}`. Mark finished items "Done" with the commit date, add new items (features built, new to-dos, setup steps only Malik can do). Keep item names short and plain.
3. `changes.json` = `{rows: [{date, changes, lines_added, lines_removed}], meta}`, rebuilt from `git log origin/main --date=short --shortstat` (commits and lines per day).
4. Upload each file as a new asset (`asset: true`), `update` the dataset's `source.url`, `updated` and `edit` (with `if_version`), then delete the old asset. Don't change the page unless asked.
5. Tell Malik in one line what moved (e.g. "+3 finished, 2 new to-dos").

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
- [x] Account page `/dashboard/account` (name, email shown, phone, password change with current password, meaning languages, time zone PKT) + sidebar user menu (Account, Log out). Profile photo: private bucket `avatars` (folder per user id, any logged-in user may view via signed links), `profiles.avatar_path`; the browser crops/shrinks to 256px JPEG before upload; `src/lib/account/`. Not yet: email change (needs a tested confirm-email flow), plan/payments (comes with Fees), delete account.
- [x] Onboarding `/onboarding`, only for new signups (the signup confirmation link goes there; accounts that existed on 2026-11-12 were marked done; students without `profiles.onboarded_at` are sent there from the dashboard; `?again=1` to redo). 5 steps: languages (two dropdowns → `profiles.languages`, + English), certificate goals, exam + exam date, worries (several → `profiles.focus_skills`), plan for each worry + email-tips opt-in. Options/plan texts in `src/lib/onboarding/options.ts`. Dashboard countdown uses `profiles.exam_date`. Logout goes to /login. The marketing site (www.deutli.com, other repo) should link its Sign up button to https://app.deutli.com/signup.
- [x] Daily Practice (listen → listen and read → speak along): student page `/dashboard/daily-practice`, full-screen reader `/practice/[trackId]` with audio player, admin upload `/admin/daily-practice`. Real data (tables `practice_sets`, `practice_tracks`, `practice_log`, private bucket `practice-audio`).

## Notes for the next session
- Next.js 16: `src/proxy.ts` (was middleware). cacheComponents is off on purpose (auth reads cookies per request).
- Supabase keys are read only on the server at runtime (`src/lib/supabase/env.ts`); auth runs in server actions (`src/app/(auth)/actions.ts`).
- Always check user + role with `requireUser()` from `src/lib/auth/dal.ts` in protected pages.
- Dashboard uses sample data from `src/lib/sample-data.ts`.
- Daily Practice code: `src/lib/practice/` (data, server actions, plan logic), `src/components/practice/`, `src/components/admin/`. Audio goes from the admin's browser straight to Supabase Storage with a one-time signed upload link (files are too big for server actions); students get 3-hour signed links. Admins may open `/dashboard/daily-practice` and `/practice/*` too. Not yet tested with a real audio upload on the live site.
- Saved words: in the practice reader, selecting text shows "Save word"; saved words are marked in every text and listed at the top of "Today's words" on the dashboard. Table `vocabulary_words` (word, `translations` jsonb by language code e.g. {"en": "...", "ur": "..."}, `dictionary_form`, context sentence, track_id; one row per user + word). After saving, meanings are filled in automatically in the student's languages by Claude Haiku (`src/lib/translate/word.ts`, needs `ANTHROPIC_API_KEY` and `SUPABASE_SECRET_KEY` on Vercel). Each word is AI-translated once and kept in the shared table `word_dictionary` (only the server writes it, via `src/lib/supabase/admin.ts`); max 10 AI translations per student per Pakistan day, counted in `translation_usage` by the function `use_translation` (dictionary hits are free and not counted); the student can correct them. Vocabulary page `/dashboard/vocabulary` (table with tabs All/Due today/Marked/Learned, search, 25 per page, listen/mark/remove) and full-screen practice `/vocabulary/practice?set=due|marked|all|learned` (word cards, "choose the correct translation", end summary), built from the Figma file Premium-3 (vocabulary screens) in the app's dark style. Spaced repetition: columns box (0–5), due_on (PKT), starred, right/wrong counts; rules in `src/lib/vocabulary/srs.ts`. Pronunciation = browser speechSynthesis (de-DE). Not built yet: the "sort the letters" and "listen and choose" exercises.
- Admin word dictionary: `/admin/dictionary` uploads a CSV (german, article, plural, en, ur, hi…; template in `public/templates/`) into `word_dictionary` with source='sheet'. Sheet meanings win over AI; the plural gets its own entry. Code: `src/lib/dictionary/`. Students' saved words fill missing languages from the dictionary when shown (free).
- Languages: `profiles.languages` (1–3 codes, default {en}); list + RTL/font helpers in `src/lib/languages.ts` (Urdu = Nastaliq via `urdu` utility, Hindi = `devanagari` utility). Students can change it from the word box ("Languages"); onboarding (separate work) should ask for these and write the same column via `setMyLanguages` in `src/lib/practice/actions.ts`.
- Daily Practice content must be original or licensed. Do not upload publisher transcripts/audio (e.g. Klett "Linie 1") for other users.
- Setup steps for Supabase/Vercel: `docs/SETUP.md`.
- Live app: https://app.deutli.com (custom domain on Vercel; g2d-app.vercel.app also works). www.deutli.com is the marketing website (repo maliik-ali/Deutli-Website).
- Supabase project ref: epawkdeosmuvczpsyoru. Supabase Site URL and Vercel SITE_URL must both be https://app.deutli.com.
