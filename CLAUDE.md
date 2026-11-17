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

## UI polish & motion (add beauty, never break the existing design)
Goal: make Deutli feel premium and alive with small, high-quality motion components (glowing card borders, cursor glow, count-up numbers, soft reveals), while keeping the current look, layout and features exactly as they are.

### Order of authority (when rules clash)
1. Security rules and working functionality
2. Deutli Figma file + `g2d-ui` skill + existing design tokens (colors, fonts, spacing, radius)
3. This section

This section only ADDS effects on top of what exists. It never replaces Deutli's colors, fonts, layout, copy, icons, the owl, or shadcn/ui components.

### How to work (every time you touch a screen)
1. **Audit first.** Before adding anything, read the screen's code and list what's on it: cards, stats, lists, buttons, tabs, progress bars, empty states. Say in 2–3 plain lines what you'd enhance and why.
2. **Match a pattern to an effect** using the table below. Pick only what makes the screen clearer or more delightful. Never add an effect just because it exists.
3. **Keep the component's job the same:** same props, data, links, server/client split and accessibility. Wrap or decorate; don't rewrite.
4. **Use Deutli colors.** Every effect takes its colors from the existing tokens (navy background, purple gradient). Never hard-code the library's default colors (orange, pink etc.).
5. **Check it:** `npm run build`, no console errors, mobile (375px) and desktop, keyboard focus still visible, `prefers-reduced-motion` turns the motion off.
6. Commit as its own small step (e.g. "UI: border beam on readiness card").

### Where the components come from (open source, MIT — free to use)
Same libraries as on 21st.dev. Use their real source code, don't guess it:
- Magic UI — demos https://magicui.design/docs/components · code https://github.com/magicuidesign/magicui/tree/main/apps/www/registry/magicui
- Kokonut UI — demos https://kokonutui.com · code https://github.com/kokonut-labs/kokonutui/tree/main/components/kokonutui
- Browse ideas on https://21st.dev/community/components (many components there come from these libraries; if a 21st.dev component is locked behind sign-up, rebuild the same effect from its preview, don't copy locked code)

Install rules:
- Copy the file into `src/components/magicui/` or `src/components/kokonutui/`, keep the library's license/author comment at the top, and only change what's needed to fit (imports, Deutli colors).
- Add only the packages it needs (usually `motion` → import from `motion/react`, plus `clsx` / `tailwind-merge` via the existing `cn()` helper). Don't add a second animation library.
- Tailwind check: if the project is on Tailwind v4, any animation tokens that use `var(--duration)` / `var(--speed)` MUST go in `@theme inline { … }` (in plain `@theme` they silently become "no animation"). On Tailwind v3, add the keyframes/animation to `tailwind.config` instead. Copy the keyframes from the component's docs page.
- Components with motion are client components (`"use client"`). Keep pages as server components and only wrap the small part that animates, so auth/data loading stays on the server.

### Pattern → effect (use these)
| If the screen has… | Use | Notes |
|---|---|---|
| A **hero/featured card** (readiness, next mock exam, "continue where you left off", plan upgrade) | **Border Beam** (Magic UI) — a gradient light that travels around the card edge | ONE per screen. Parent needs `relative` + same radius; add `overflow-hidden` to the beam root. Colors: Deutli purple → violet/blue. Duration 8–10s. |
| An **important form or highlight card** (login/signup card, contact, premium offer, AI feedback result) | **Shine Border** (Magic UI) — soft gradient shine moving along the border | The effect in the Rayvens "Start a project" card. Use `shineColor` = Deutli purple shades. |
| **Regular cards in a grid** (mock exam list, skill cards, vocabulary sets, admin tiles) | **Magic Card** (Magic UI) — glow that follows the cursor | Gradient mode with Deutli purple. Wrap the existing card content; keep the card's own padding/radius. Desktop only feels it — fine. |
| **Numbers** (score, readiness %, words learned, streak, countdown days, attendance) | **Number Ticker** (Magic UI) — counts up when visible | Only for real numbers. Keep units/labels. |
| **Lists / cards appearing** (dashboard cards, word list, results) | **Blur Fade** (Magic UI) — soft blur + fade + rise | Stagger 40–80ms per item, play once. Don't delay content users need immediately by more than ~300ms. |
| **Small labels / badges** ("New", "Free", "Due today", section eyebrows) | **Animated Shiny Text** (Magic UI) | Sparingly — 1–2 per screen. |
| **Main call-to-action** (Start mock, Upgrade, Continue practice, marketing CTAs) | **Shimmer Button** (Magic UI) | One per screen. Keep it a real `<button>`/`<Link>` with the same handler/href; shadcn variants stay for normal buttons. |
| **Secondary CTA** | **Interactive Hover Button** (Magic UI) | Make a link version if it navigates. |
| **Tabs / segmented filters** (vocabulary tabs, exam skills) | Sliding highlight with `motion` `layoutId` | Keep shadcn Tabs logic and keyboard support; only animate the active indicator. |
| **Accordions / FAQ** | Animated height + rotating plus icon (`motion` `AnimatePresence`) | Keep `aria-expanded`. |
| **Progress** (exam readiness, lesson progress, timers) | Progress bar filled with the Deutli purple gradient + spring animation | Never animate a timer in a way that hides the real time left. |
| **Celebrations** (lesson finished, mock passed, streak) | Short confetti/scale pop (≤ 1s) | Only on real achievements, never on errors. |
| **Marketing site only** ([www.deutli.com](https://www.deutli.com), other repo): hero, logo/feature strips, page headers, footer | Shape Hero / Background Paths (Kokonut), Marquee, Word Rotate, Text Animate, Flickering Grid, Orbiting Circles (Magic UI) | **Not inside the app.** These are big showpieces; the app should feel calm and fast. |

### AI features — find them, then give them a proper "AI" interface
Deutli uses AI (e.g. word meanings by Claude Haiku in `src/lib/translate/word.ts`, and the pilot feature where AI checks homework and writing and a teacher confirms). Each AI feature should look and feel clearly AI-powered, honest and trustworthy.

**Step 1: find every AI touchpoint.** Search the code for AI calls (`ANTHROPIC_API_KEY`, `@anthropic-ai/sdk`, `ai` / AI SDK, `src/lib/translate/`, any "ai", "feedback", "grade", "generate" functions) and list for Malik in plain words: where the AI runs, what the student or teacher sees, and what happens while it's working or if it fails.

**Step 2: upgrade each touchpoint with AI-specific components** (same audit → propose → small-commit flow as above):
| AI moment | Use | Notes |
|---|---|---|
| AI is working ("thinking", translating, checking writing) | Shimmer skeleton in the shape of the result + a small "AI is checking…" label with a sparkle icon (Lucide `Sparkles`) and Animated Shiny Text | Never a blank screen or bare spinner. Show progress steps if the task takes > 3s ("Reading your text → Checking grammar → Writing feedback"). |
| AI result appears (feedback, translation, explanation) | Text that streams in or types in (AI SDK streaming if available, or Magic UI **Typing Animation**/**Text Animate**), inside a card with **Shine Border** in Deutli purple | Stream real output; don't fake typing on text that's already there for more than ~1s. |
| Label that something is AI-made | Small badge "AI" / "AI suggestion" with **Animated Gradient Text** (Magic UI) | Always label AI content. Students must know what came from AI vs. their teacher. |
| AI vs. teacher (homework/writing pilot) | Two clearly separated blocks: "AI feedback" (purple, sparkle) and "Teacher's decision" (solid, teacher's name/avatar, ✓ confirmed / ✎ changed) | The teacher's decision always looks final and more important than the AI's. |
| Corrections in student writing | Inline highlights (mistake → correction) with a tooltip "why", grouped by type (grammar, word order, spelling) | Readable in English/Urdu explanations; keep German text LTR. |
| How data flows (marketing site / onboarding "how it works") | Magic UI **Animated Beam** (student → AI → teacher) | Explainer visuals only, not inside working screens. |
| Actions on AI output | Buttons: "Explain more", "Try again", "This is wrong" (feedback), "Correct it" (for translations) | Every AI output can be corrected or reported; corrections are saved. |
| Limits | Friendly counter, e.g. "7 of 10 AI translations left today" + what happens at 0 (dictionary still works) | Matches the existing `translation_usage` limit. Never let a limit look like an error. |
| AI errors / timeouts | Plain message + retry, and keep whatever the student typed | Never lose student work because the AI failed. |

More AI-specific UI ideas: **AI Elements** by Vercel (shadcn-based components for message, response, reasoning, loader, suggestions) — https://ai-sdk.dev/elements · Magic UI components above. Use them only where they fit Deutli's style.

**AI functionality rules (always):**
- AI calls run on the server only; keys never reach the browser. Check the user's role and limits on the server before calling the AI.
- Use the smallest model that does the job well; cache results that can be reused (like `word_dictionary`) so the same thing is never paid for twice.
- Validate AI output with zod before saving or showing it; if it doesn't match, retry once, then show a friendly error.
- Show AI help as guidance, not truth: for grades, the teacher confirms; for exam scores, say clearly what was AI-estimated.
- Don't send more student data to the AI than the task needs. No personal details in prompts unless required.
- Log AI usage per student (count, not content) so limits and costs stay visible to admins.

### Motion rules
- Motion must help: show what changed, what's important, or that something worked. If it only decorates, keep it subtle or drop it.
- Speeds: taps/hover 150–250ms · reveals 400–600ms · ambient (beam, shine, gradients) slow, 8s+.
- Springs for UI state (stiffness 300–400, damping 25–34). Animate only transform, opacity and filter — never width/height/top (except an accordion's height via motion).
- Full-screen focus screens (Daily Practice reader, word practice, mock exam player): almost no decorative motion — only feedback (correct/wrong, saved, progress). Students are concentrating.
- Respect `prefers-reduced-motion`: ambient effects off, reveals show instantly.
- Performance: no more than one continuous effect (beam/shine) visible per screen on mobile; no canvas backgrounds in the app; check the page still feels instant on a mid-range Android phone (most students are on phones in Pakistan).

### Beautiful AND functional (always)
- Every screen has real states: loading (skeleton in the card's shape), empty (owl + one clear next step), error (plain message + retry), success.
- Text contrast ≥ 4.5:1 on the dark navy; glows and gradients never sit behind body text.
- Touch targets ≥ 44px; visible focus ring; icons have labels; decorative layers are `aria-hidden` + `pointer-events-none`.
- Urdu/Hindi text keeps its `urdu` / `devanagari` utilities; animated text must not break RTL.
- No horizontal scroll at 375 / 768 / 1024 / 1440 — wide glows and beams need an `overflow-hidden` parent.
- Never invent numbers, reviews or user counts to make a card look fuller; use real data or the existing sample data.
- After adding effects to a screen, tell Malik in plain words what was added and where (e.g. "Readiness card now has a moving purple border; scores count up").

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
- [x] Account page `/dashboard/account` (name, email shown, phone, password change with current password, meaning languages, time zone) + sidebar user menu (Account, Log out). Profile photo: private bucket `avatars` (folder per user id, any logged-in user may view via signed links), `profiles.avatar_path`; the browser crops/shrinks to 256px JPEG before upload; `src/lib/account/`. Not yet: email change (needs a tested confirm-email flow), plan/payments (comes with Fees), delete account.
- [x] Onboarding `/onboarding`, only for new signups (the signup confirmation link goes there; accounts that existed on 2026-11-12 were marked done; students without `profiles.onboarded_at` are sent there from the dashboard; `?again=1` to redo). 4 steps (since 2026-11-17): languages (two dropdowns with flags → `profiles.languages`, + English; small "Not you? Log out" on this step only), certificate goals, exam + exam date, worries (several → `profiles.focus_skills`) + email-tips checkbox (unticked). The old "plan" step was removed: the plan is the dashboard "Your focus" card (`src/components/dashboard/focus-card.tsx`, one line + link per worry, `next`/`start` in options.ts) and the tips moved to the exam skill pages ("How to tackle it"). Options/plan texts in `src/lib/onboarding/options.ts`. Dashboard countdown uses `profiles.exam_date`. Logout goes to /login. The marketing site (www.deutli.com, other repo) should link its Sign up button to https://app.deutli.com/signup.
- [x] My B1 Exam `/dashboard/exam` (menu item with sub-menu Reading / Listening / Writing / Speaking → `/dashboard/exam/[skill]`): mock exams shown as book covers (`src/components/exam/exam-cover.tsx`, owl + big "B1", light lower half, stamp), detail page `/dashboard/exam/mock/[examId]`. Skill pages show the real format of the student's own exam (`profiles.exam`): parts, time, questions, points, pass rule. Formats live in `src/lib/exam/catalog.ts` (`getExamFormat`): Goethe B1 (ÖSD B1 is the same exam) and telc B1 (from the official Übungstest; Sprachbausteine sits on the Reading page). DTZ / other / no exam fall back to Goethe with a note — DTZ format still to add. The mock list shows uploaded papers first (real, from the admin panel), then sample covers (8 city names) that have no paper yet; the first mock is free. Not built yet: part practice, premium unlock, DTZ and non-B1 formats. Old `/dashboard/course` redirects here. The separate "Mock exams" menu item was removed.
- [x] Daily Practice (menu name: "Improve Accent") (listen → listen and read → speak along): student page `/dashboard/daily-practice`, full-screen reader `/practice/[trackId]` with audio player, admin upload `/admin/daily-practice`. Real data (tables `practice_sets`, `practice_tracks`, `practice_log`, private bucket `practice-audio`).
- [x] Mock papers (real papers solved online): admin `/admin/mock-papers` (upload PDF in the browser, pages become JPEGs in private bucket `mock-papers`, optional audio, paste answer key, publish). Student player `/exam/take/[slug]` (paper pages, answer sheet, section timers, audio, autosave), result `/dashboard/exam/mock/[slug]/result`. Tables `mock_papers`, `mock_paper_keys` (admins only; grading uses the secret key), `mock_attempts` (migration 20261114000013, already run). Code: `src/lib/papers/`, `src/components/exam/exam-player.tsx`. telc B1 format only; writing is saved but not marked yet. First paper: telc Übungstest 1 as "Hamburg" (free). Answers are marked on the server with the secret key (needs `SUPABASE_SECRET_KEY` on Vercel); the answer pages of the PDF are never uploaded. The admin picks the PDF page of each part and pastes the answer key (parsed by `parseAnswerKey` in `src/lib/papers/template.ts`). `/exam` is a protected route prefix. Open: confirm the MP3 (file name said uebungstest_4) matches Übungstest 1.
- [x] Advanced settings `/dashboard/settings` (sidebar user menu): choose exam (Goethe / telc / ÖSD at A1–C2, DTZ, other) saved in `profiles.exam` (ids like `goethe_b2`; code in `src/lib/exam/choice.ts`, `src/lib/settings/actions.ts`). For the MVP the menu and exam pages stay on B1 (level-based menu code is commented out in `src/app/dashboard/layout.tsx` and `exam/page.tsx`); onboarding still only offers B1 exams.
- [x] Menu: "Improve Accent" (was Daily Practice, same URL), "My B1 Exam" with timer icon, no "Mock exams" item.
- [x] Dashboard readiness card uses real mock exam results (`src/lib/papers/readiness.ts`): Lesen, Sprachbausteine, Hören; Schreiben and Sprechen "not marked yet". The homework feedback card is still sample data.
- [x] Mock covers: owl on 7 tone gradients (navy, violet, teal, indigo, plum, forest, ocean); admin can set the colour and an optional cover photo per paper (`mock_papers.tone`, `cover_path`, migrations 13 and 14, already run).
- [~] UI polish pass, started 2026-11-14: Border Beam + Number Ticker on the readiness card, Blur Fade reveals on dashboard cards and exam covers, exam countdown ticks up (components in `src/components/magicui/`, `motion` installed, reduced motion respected). Still to do: Magic Card on card grids, tabs indicator, accordions, vocabulary/account/admin screens. Original item: audit dashboard, exam, vocabulary, account and admin screens; add Border Beam to one featured card per screen, Magic Card glow to card grids, Number Ticker to real stats, Blur Fade reveals. Marketing site gets the bigger effects in its own repo.
- [~] AI UI pass, started 2026-11-14: the only AI touchpoint today is word translation (`src/lib/translate/word.ts`, shown in `src/components/practice/word-box.tsx`): it now shows a sparkle + shimmer "AI is translating…" and an "AI" badge on translated meanings. Still to do: daily limit counter ("7 of 10 left"), "Correct it" and "This is wrong" actions, and the whole homework/writing AI flow once it exists. Original item: list every AI touchpoint, then add thinking states, streamed results, "AI" badges, AI-vs-teacher blocks, correction/feedback actions, friendly limits and error states.

## Notes for the next session
- Time zones (2026-11-17, migration 26): `profiles.time_zone` (IANA). Detected once from the device by `TimeZoneSync` (dashboard, teacher, onboarding, admin shell) via `saveDetectedTimeZone` (never overwrites a saved one); students change it on Account (`setMyTimeZone`). Server code uses `user.timeZone`, `todayIn(tz)` and `todayForUser()` (`src/lib/time.ts`, `src/lib/auth/dal.ts`); Pakistan time only as the fallback before detection. Never hard-code Asia/Karachi again.
- Next.js 16: `src/proxy.ts` (was middleware). cacheComponents is off on purpose (auth reads cookies per request).
- Supabase keys are read only on the server at runtime (`src/lib/supabase/env.ts`); auth runs in server actions (`src/app/(auth)/actions.ts`).
- Always check user + role with `requireUser()` from `src/lib/auth/dal.ts` in protected pages.
- Dashboard: the readiness card is real (mock results); the dashboard is all real data now: readiness, writing feedback (latest exam), mock exam card (first free paper + last score), saved words, practice streak. Sample cards for homework, speaking club and continue learning were removed; Homework, Speaking club and Ask a teacher show a "Soon" pill in the menu (`src/lib/sample-data.ts` only holds the menu items). `/dashboard/upgrade` collects "I want Pro" requests in `pro_requests` (no payment or price yet; admins read them at `/admin/pro-requests`).
- Database changes can be applied from here with the Supabase tools (`apply_migration`) after writing the migration file; if the permission check blocks it, say so and give the file to Malik to run in the Supabase SQL editor.
- Open to-dos: mark writing (AI + teacher), premium unlock for papers, exam formats for other levels (A1–C2) and DTZ, level choice in onboarding, turn the level-based menu back on after the MVP, real data for the other dashboard cards.
- Daily Practice code: `src/lib/practice/` (data, server actions, plan logic), `src/components/practice/`, `src/components/admin/`. Audio goes from the admin's browser straight to Supabase Storage with a one-time signed upload link (files are too big for server actions); students get 3-hour signed links. Admins may open `/dashboard/daily-practice` and `/practice/*` too. Not yet tested with a real audio upload on the live site.
- Saved words: in the practice reader, selecting text shows "Save word"; saved words are marked in every text and listed at the top of "Today's words" on the dashboard. Table `vocabulary_words` (word, `translations` jsonb by language code e.g. {"en": "...", "ur": "..."}, `dictionary_form`, context sentence, track_id; one row per user + word). After saving, meanings are filled in automatically in the student's languages by Claude Haiku (`src/lib/translate/word.ts`, needs `ANTHROPIC_API_KEY` and `SUPABASE_SECRET_KEY` on Vercel). Each word is AI-translated once and kept in the shared table `word_dictionary` (only the server writes it, via `src/lib/supabase/admin.ts`); max 10 AI translations per student per day (their own time zone), counted in `translation_usage` by the function `use_translation` (dictionary hits are free and not counted); the student can correct them. Vocabulary page `/dashboard/vocabulary` (table with tabs All/Due today/Marked/Learned, search, 25 per page, listen/mark/remove) and full-screen practice `/vocabulary/practice?set=due|marked|all|learned` (word cards, "choose the correct translation", end summary), built from the Figma file Premium-3 (vocabulary screens) in the app's dark style. Spaced repetition: columns box (0–5), due_on (student's time zone), starred, right/wrong counts; rules in `src/lib/vocabulary/srs.ts`. Pronunciation = browser speechSynthesis (de-DE). Not built yet: the "sort the letters" and "listen and choose" exercises.
- Level vocabulary (A1/A2/B1), built 2026-11-17: table `level_words` (level, position, topic_id → `level_topics` (level, position, name, translations; migration 25, already run; the old text column `topic` is unused), german, word_key, article, plural, translations jsonb, examples jsonb with "de" + translations; migration 24, already run). Admin uploads via `/admin/dictionary` with "Also add to a level list" (or a `level` column); CSV columns `topic`, `example_de`, `example_en`/`example_de_en`, `example_ur` are read (`src/lib/dictionary/csv.ts`). Words go into `word_dictionary` too, so they are free meanings when students select words. Vocabulary page `?list=a1|a2|b1`: "continue" card (next lesson = 10 unseen words of the first unfinished topic; words without topic are grouped in sets of 50), topic chips, table tabs Marked/All/Due/Learning/Learned (default Marked if any, else All, 50 per page), filter-icon column picker (remembered per list in the browser; meaning columns = the student's own languages, missing meanings filled free from `word_dictionary`; phones/tablets show labelled lines, the table grid starts at 1024px). Practice `/vocabulary/practice?list=a1&set=learn|due|marked|learning|learned&topic=`: learn = intro cards then a quiz; progress is a normal `vocabulary_words` row (`source = 'level'`, matched by German word), so leaving mid-lesson resumes at the next unanswered word. "My words" shows only `source = 'reading'`. Code: `src/lib/vocabulary/levels.ts`, `src/components/vocabulary/vocab-table.tsx`. Lookup rule: selected words are looked up in `word_dictionary` first (also without article/punctuation, `src/lib/dictionary/keys.ts`); only languages still missing go to Claude Haiku.
- A1 topics loaded 2026-11-17: 25 topics in `level_topics` (German name + English in translations), in a beginner-friendly order chosen by us (Begrüßung first, Grammatik und Funktionswörter last; Malik can reorder). All 861 A1 words linked by `topic_id`.
- der/die/das game (2026-11-17): `/vocabulary/play/articles?list=a1&topic=` (or no list = My words nouns from `dictionary_form`). 10 random nouns per round (words met first, weakest first, then new ones), tap the article, then full form + plural + a grammar tip when a reliable rule fits (`src/lib/vocabulary/articles.ts`). Answers via `recordArticleAnswer`: counts right/wrong; a wrong article makes the word due today; it never changes the review step (that is about the meaning); unstarted words aren't saved. Entry: "Games" card on the level view, "der, die, das game" button on My words. Next games planned: listen and choose, swipe cards, type it, plural choice. `/vocabulary` is now a protected prefix.
- Admin word dictionary: `/admin/dictionary` uploads a CSV (german, article, plural, en, ur, hi…; template in `public/templates/`) into `word_dictionary` with source='sheet'. Sheet meanings win over AI; the plural gets its own entry. Code: `src/lib/dictionary/`. Students' saved words fill missing languages from the dictionary when shown (free).
- Languages: `profiles.languages` (1–3 codes, default {en}); list + RTL/font helpers in `src/lib/languages.ts` (Urdu = Nastaliq via `urdu` utility, Hindi = `devanagari` utility). Students can change it from the word box ("Languages"); onboarding (separate work) should ask for these and write the same column via `setMyLanguages` in `src/lib/practice/actions.ts`.
- Daily Practice content must be original or licensed. Do not upload publisher transcripts/audio (e.g. Klett "Linie 1") for other users.
- Setup steps for Supabase/Vercel: `docs/SETUP.md`.
- Live app: https://app.deutli.com (custom domain on Vercel; g2d-app.vercel.app also works). www.deutli.com is the marketing website (repo maliik-ali/Deutli-Website).
- Supabase project ref: epawkdeosmuvczpsyoru. Supabase Site URL and Vercel SITE_URL must both be https://app.deutli.com.
- Writing feedback (Schriftlicher Ausdruck) on the result page, 3 cases (migrations 15 and 16, already run): (1) student WITH a teacher (`profiles.teacher_id`) or sent with a teacher code: no AI, only the message "your teacher will check this email"; submitting creates a `writing_reviews` row (source 'assigned') for the teacher. (2) STANDALONE student: AI estimate (`src/lib/writing/`, swappable model in `src/lib/ai/provider.ts` via AI_PROVIDER/AI_MODEL/AI_BASE_URL/AI_API_KEY, default Claude Haiku; LanguageTool as free grammar hints; max 2 AI checks per exam) plus an offer "Ask for a teacher check" (open request, source 'offer', any teacher can take it; price/payment not built yet). (3) Referred student: enters the teacher's 6-letter code (`profiles.teacher_code`, shown on /teacher) -> email goes to that teacher and the teacher becomes their teacher. Teacher screens: `/teacher` (code, to check, open requests, checked) and `/teacher/review/[id]` (3 criteria 0-15 + comment); the teacher's score is final and replaces the AI estimate. Admin screen `/admin/teachers` (make someone a teacher, give students their teacher, search by name; actions in `src/lib/teachers/actions.ts`). Not built yet: test assignment by a teacher, email/notification to teachers and students, payment for offered teacher checks, AI test with real emails (`npm run test:writing`), writing_task box in the mock paper admin form, dashboard readiness card still says Schreiben "not marked yet".
- Pro payments: plans, `payment_accounts`, `orders` and `profiles.pro_until` (migration 20261115000020; all writes from the server with the secret key). Student flow `/dashboard/upgrade` -> `/dashboard/upgrade/checkout?plan=` (pick card or "Pakistani banks & wallets") -> `/dashboard/upgrade/order/[id]` (our account details, reference code, student enters the transaction ID). Admin `/admin/payments`: set plans and accounts, approve or reject (approve sets `pro_until`). `hasPro(user)` in `src/lib/auth/dal.ts` unlocks premium papers. Card payments use Stripe Checkout (`src/lib/pro/stripe.ts`, `startCardPayment` in `src/lib/pro/actions.ts`); the webhook `/api/stripe/webhook` checks signature, amount and currency, then `fulfilOrder` (`src/lib/pro/fulfil.ts`) turns Pro on. Needs env `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `STRIPE_CURRENCY` (default pkr); without the key the card option shows "Soon" (`cardReady()`). Setup: docs/SETUP.md section G. No card data is ever stored. KuickPay (bank bill payment) is not connected; the bank/wallet option is manual for now.

