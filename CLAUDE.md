# Deutli platform (deutli-app, formerly Gateway2Deutsch / g2d-app)

German B1 exam-prep platform. Pilot inside a German academy in Pakistan (100+ students).
Owner: Malik Ali (designer, not a developer — explain decisions in plain words, short).

## How Malik wants you to work (read first, always follow)
1. **Think like a senior product UX/UI (and AI) designer before building.** For every request, first ask: is it needed, is this the right place, how prominent should it be, how often does this case really happen? Give a 2–4 line verdict, and if you disagree or see a risk (e.g. selling something that doesn't exist yet), say so before coding.
2. **Change only what was asked.** Don't bundle extra layout, width, spacing or copy changes. Before every commit, diff against the previous version and check each changed line belongs to the request.
3. **Be proactive with suggestions, not changes.** When touching a screen, list the top 3–5 small UX tweaks you notice (placement, unclear disabled states, smart defaults, redundant text, tap targets) and wait for a yes.
4. **Check every visual change on screen before pushing.** Run the dev server (`.claude/launch.json`, name `deutli-dev`), render the component in a temporary `src/app/zz-preview-*` route (delete it before committing), and take screenshots at 1440px and 390px (also 1366×700 for long forms). Never push a screen you haven't looked at.
5. **Follow the design language exactly.** Use the `deutli-skills` skill, existing tokens and components. Never use browser-default form controls (checkbox, radio, select): use the styled pattern (sr-only input + styled span, or shadcn Select). Keep one rule per screen (e.g. all onboarding headings centred).
6. **Deutli is for learners worldwide, not only Pakistan.** Never assume Pakistan/Urdu in defaults or copy; take defaults from the user's device or answers (browser language, device time zone).
7. **Keep replies short and plain.** Malik is a designer, not a developer: a few clear lines, no walls of text.
8. **Never make careless mistakes.** Re-read the request, check the result, and only then report.
9. **Student feature = check the other roles too.** Whenever a student-side feature is built or changed, always ask: does a teacher, an academy/school admin or Deutli admin need to see, manage or get notified about it (results, content, settings, limits, reports)? If yes, build that side in the same step or list it clearly and ask. Malik may forget to ask; checking is your job. Say in the verdict what each role gets (or "nothing needed").

## Product direction (from 22 Nov 2026): read before planning any feature
**Who we sell to now.** German-language schools, academies and individual German teachers. They bring their own students. Deutli replaces the platform they would otherwise build themselves, or the mix of WhatsApp groups, Zoom links and shared drives. Individual learners can still sign up on their own (Free/Pro); keep that working.

**How it works (same idea as straiv.io).** Straiv sells software to hotels, and the hotel's guests use it under the hotel's own branding. Deutli does the same: a school or teacher takes a Deutli subscription, and their students use it looking like the school's own software (logo, colours, font). Sales line: "You don't need to build a platform for your students. Take a Deutli subscription and put your branding on it."

**A solo teacher is an academy of one.** Every teacher belongs to an academy. A teacher with no school gets a personal academy (`academies.kind = 'teacher'`), a school is `kind = 'school'`. One model for branding, batches, billing and permissions. Already in the database: `academies`, `profiles.academy_id`, `private.current_user_academy_id()`, and the reserved `live_classes.academy_id`.

**First customer:** the pilot academy in Pakistan (100+ students). Rule 6 still applies: nothing Pakistan-specific in defaults.

### Who does what
| Audience | What they do in Deutli |
|---|---|
| Student | Joins with a teacher/school code or QR. Sees timetable, homework, notes, recordings and tests of their batches. Takes mock exams, practises, books 1:1 lessons. Pays for Pro on their own only if they are not covered by a school. |
| Teacher | Runs batches, uploads material and papers, makes chapter tests, runs live classes without re-sending links, sees students' mock results and writing, offers 1:1 lessons. |
| School / academy admin | Invites teachers, adds students in bulk, sees attendance and results across batches, sets branding, manages the subscription. |

### Suggested build order (Malik confirms each step; small commits as always)
0. Organisation layer: `academies` gets `kind`, `slug`, branding columns; teacher gets a personal academy; every new table carries `academy_id` with RLS.
1. EUR pricing (see Pricing and currency). Payments are live, so do this early.
2. Join code and QR at signup.
3. Branding, phase 1 (name, logo, colour on the student app and signup). This is the sales hook.
4. Batches with announcements.
5. Materials and homework, shared between batches.
6. Recording link per class and one saved room link per teacher (small).
7. Teacher sees students' mock results.
8. Private papers per batch.
9. Chapter tests.
10. Student timetable per teacher.
11. 1:1 lessons.
12. School admin dashboard (bulk CSV upload, attendance %, reports; fees later).

## Teacher tools: what to build
Status on 22 Nov 2026. "Built" is checked against the code and git log, not guessed.
1. **Join with a code or QR.** Table `join_codes` (code, academy_id, teacher_id, optional batch_id, active). Link `https://app.deutli.com/signup?join=CODE` and a QR of it (make the QR on the server). The signup form also has an optional "Teacher or school code" field. After signup the student is attached to the teacher, the batch and the academy, and sees that academy's branding. Existing students can enter a code under Account ("Join a teacher or school"). Teacher can switch a code off or make a new one. Rate-limit code tries with `check_rate_limit` (it already exists). The old 6-letter `profiles.teacher_code` (used for writing checks) should become one of these codes, not a second system.
2. **Batches instead of WhatsApp groups.** `batches` (academy_id, teacher_id, name, level, exam, dates) and `batch_members`. A batch page for the teacher: students, schedule (`live_classes.batch_id`), material, homework, tests, papers, recordings, announcements. Announcements are posts, not a chat, and notify members by email. Student sees "My batches".
3. **Homework, notes and files.** `materials` (kind: homework | notes | file | link, title, text, due date, file in a private bucket) and `material_batches` (many-to-many). Sharing to another batch = adding a row, so there is one copy. Only members of a batch get signed links.
4. **Chapter tests taken on the platform.** `tests`, `test_questions` (multiple choice, true/false, fill-in-the-blank), `test_attempts`. Correct answers stay server-only like `mock_paper_keys`. Timer, autosave and result screens follow the mock exam player. Teacher sees results per test and per student. Do not copy code from the old My_CrSys repo (SQL injection, default password); only the feature idea.
5. **Teacher sees students' mock results.** Page `/teacher/students/[id]`: attempts per paper, score per skill, writing feedback, readiness. A teacher sees only their own students (RLS). Partly built: `/teacher/students` lists students and writing checks, but not mock results.
6. **Class link saved once.** Built: the Zoom link is stored per class and given to students only in the join window (`getJoinLink`), classes can repeat weekly. To add: one default room link in the teacher profile that new classes start with.
7. **Private papers.** `mock_papers` gets `owner_id` and `visibility` (`public` | `batches` | `academy`) plus `paper_batches`. Students see public papers and the papers shared with their batches. Teachers upload with the same form as the admin one. Answer keys stay server-only. The teacher must tick "I own this paper or have the right to use it"; add a report button.
8. **Lecture recording.** `live_classes.recording_url`, YouTube links only (youtube.com, youtu.be), shown with a privacy-friendly embed (youtube-nocookie, click to load) to registered students and batch members after the class. Teacher can add it any time.
9. **Timetable.** Student page "My timetable" grouped by teacher, and on a teacher's profile "Your classes with this teacher". Reuse the day strip and the `.ics` calendar link.
10. **1:1 lessons.** A 1:1 lesson is a live class with one seat (`kind = '1to1'`). Teacher sets length, price in EUR and free slots; student books one. First version: the price is agreed and paid outside Deutli. Payment and teacher payouts are NOT in scope yet; ask Malik first.
11. **Teacher profile and class ratings.** Built.
12. **Reminders.** Built: email for a class starting within the hour and for Pro ending (pg_cron every 10 minutes through `/api/cron/reminders`, one row per email in `email_log`). To add: homework due, test open, new announcement. WhatsApp reminders are NOT started (they need a paid WhatsApp Business account); do not begin without asking.
13. **Attendance.** Partly built: the teacher ticks Present on a class. To add: attendance % per student per batch.

## White-label (school branding)
- `academies` gets: `slug` (unique), `display_name`, `logo_path`, `primary_color`, `accent_color`, `font_key`, `show_powered_by` (decide with Malik if it can be switched off on a higher plan).
- Branding shows on: signup and login (the join code or `?academy=slug` decides), the student app shell, emails (logo and name), certificates, teacher and admin shell. Deutli branding stays when a user has no academy. The marketing site is not affected.
- Use CSS variables. Every colour in the app must come from the tokens, so the school colour can replace the purple gradient. First audit for hard-coded hex colours and fix them. Check contrast (WCAG AA 4.5:1) when the school picks a colour and refuse colours that fail.
- Fonts: a short list of approved fonts loaded with `next/font` and hosted by us. Never load Google Fonts from Google's servers (German data protection). No free font upload at first.
- Logo: PNG, WebP or JPG, max 1 MB, in a storage bucket. No SVG upload unless it is cleaned first.
- Who edits: the academy admin (a solo teacher edits their own). A live preview before saving.
- Phase 1: slug in the signup link, academy decides the brand after login. Phase 2: `schoolname.deutli.com`. Phase 3: the school's own domain. Do phase 1 first.

## Pricing and currency
- **EUR is the base currency everywhere.** Store prices as integer cents (`price_eur_cents`). Today `plans.price_pkr`, `orders.amount_pkr`, `pkr()` in `src/lib/pro/data.ts` and `STRIPE_CURRENCY` (default `pkr`) are all PKR. Migrate to EUR; keep `amount_pkr` on old orders for history.
- **Card (Stripe):** always charge in EUR (`STRIPE_CURRENCY=eur`). Stripe and the customer's bank do the conversion, we receive the EUR price.
- **Other currencies are only a display of the same EUR price.** Table `fx_rates` (currency, `per_eur`, updated_at), set by an admin on `/admin/payments`. Example: EUR 7 a month shows as about PKR 2,100 (rate 300), rounded to the nearest 10. Show the rate ("about PKR 2,100, 1 EUR = 300 PKR"). The student picks the currency; default from the device language and time zone, never assumed.
- **Bank, Easypaisa, JazzCash:** the student sees the PKR amount to send. The order stores `amount_eur_cents`, `pay_currency`, `pay_amount` and `fx_rate` locked at order time, so the admin checks the transfer against that amount. The company still gets the EUR price.
- **Tax:** when the country changes, only tax changes, never the net price. Tax is not built. Ask Malik before adding it (German VAT, Stripe Tax). Until then show prices as they are and say nothing about tax.
- **Student plans:** the website draft is EUR 12 a month and EUR 84 a year (EUR 7 a month). Confirm final prices with Malik. Plans stay one-time payments that do not renew.
- **Teacher and school plans (decided 22 Nov 2026 for the MVP; Malik can change every number later in `/admin/payments`).** Monthly, excluding VAT. Yearly = pay for 10 months. Source and reasoning: project doc `deutli/teacher-school-pricing-research.md`.
  | Plan (`kind`) | EUR / month | PKR / month (south_asia region) | Limits |
  |---|---|---|---|
  | Teacher Free (`teacher`) | 0 | 0 | 1 teacher, 5 active students |
  | Teacher (`teacher`) | 19 | 2,900 | 1 teacher, 30 active students, logo + one colour, "Powered by Deutli" shown |
  | School Starter (`school`) | 49 | 7,500 | 5 teachers, 100 active students, logo, colours, font, batches, reports |
  | School Pro (`school`) | 99 | 14,900 | 15 teachers, 300 active students, own subdomain, "Powered by Deutli" removed |
  | Institute | from 249 | on request | 300+ students, sold by hand |
  Extra active students: EUR 0.40 or PKR 120 per student per month. Founding offer: the first 10 teachers or schools get 50% off for 12 months (a `discount_percent` and `discount_until` on the academy, set by an admin).
- **Regional price.** Table `plan_prices` (plan_id, `region` = `global` | `south_asia`, currency, `amount_minor`). `global` is EUR. `south_asia` is a fixed PKR price (not the EUR price converted). The region comes from the billing country the customer gives (list kept in admin, start with Pakistan) and the payment method, never from the IP alone. Bank, JazzCash and Easypaisa belong to `south_asia`.
- **Active student** = a student who did at least one assigned activity (class, homework, test, mock exam) in the calendar month. Count it per academy per month. At 80% of the limit show a notice to the owner; at the limit block adding new students with a clear "upgrade" message. Never lock students who are already in.
- **"Powered by Deutli"** shows on Free and Teacher plans and can only be switched off on a plan that has the feature `remove_branding` (School Pro and above). Check it on the server.
- **Open decision, do not build yet:** whether school plans include Pro mock exams for their students. Ask Malik.
- The website (other repo) must show the same EUR prices with the currency toggle.

## Workspaces, roles and who pays (decided 22 Nov 2026)
- **A workspace is a row in `academies`** (`kind` = `teacher` | `school`). It owns the students, batches, materials, papers, branding and the plan. The workspace is what gets billed, not the teacher.
- **Members:** table `academy_members` (academy_id, user_id, `role` = `owner` | `admin` | `teacher`). One user can be a member of several workspaces, like a freelancer on Upwork who also works inside an agency. A student belongs to one workspace at a time for now (`profiles.academy_id`).
- **Teacher profile and ratings belong to the person, not the workspace.** The public profile can show "Teaches at <academy>". Do not move ratings when a teacher changes workspace.
- **A small teacher grows into a school without rebuilding.** Upgrade = change the same academy's `kind` and plan. Students, join codes, batches and material stay. The owner can then invite teachers.
- **When a teacher leaves a school:** the students and everything made inside the school stay with the school. His own personal workspace and its students stay with him.
- **Who pays:** the workspace owner. Students keep the free and Pro student plans unless Malik decides school plans include Pro.
- **Marketplace (students finding teachers on Deutli) is phase 2, not built.** If it comes, take a commission only on students Deutli brings, clearly below Preply's 18 to 33%.
- **Phase 1, the first customers are set up by Malik by hand** (concierge): an admin creates the workspace, assigns the owner and the plan, and sets the founding discount. No self-service checkout for teacher or school plans yet. Do not change the live student payment flow (PKR, Stripe) while doing this.

## German schools: data protection (check before the first school goes live)
- Hosting region of the Supabase project (EU) and a data processing agreement (AVV/DPA) for schools.
- Students under 16: parental consent. Say clearly when AI processes their writing and send only what the task needs.
- Fonts, maps, videos and tracking: no third-party requests before consent. Account deletion already exists; schools also need to delete or export a student on request.
- This is a checklist for Malik and a lawyer, not legal advice. Ask before building any of it.

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
- Every new table that holds school or teacher data carries `academy_id` and has RLS scoped to it. A teacher sees only their own students; a student sees only the content of their own batches. Latest migration when this was written: `20261120000032_email_reminders.sql`.

## Design
Always use the `deutli-skills` skill (.claude/skills/deutli-skills) for any screen.
Full-screen screens (Daily Practice reader, word practice): the close ✕ always sits at the right edge of the top bar.
Brand source of truth: Deutli Figma file https://www.figma.com/design/4pD07O1cSsoPm5yTw6czDG/Deutli (dark navy UI, purple gradient, owl mascot). Figma wins over older notes.

## UI polish & motion (add beauty, never break the existing design)
Goal: make Deutli feel premium and alive with small, high-quality motion components (glowing card borders, cursor glow, count-up numbers, soft reveals), while keeping the current look, layout and features exactly as they are.

### Order of authority (when rules clash)
1. Security rules and working functionality
2. Deutli Figma file + `deutli-skills` skill + existing design tokens (colors, fonts, spacing, radius)
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
- `main` is production (Vercel deploys it to app.deutli.com). Do not push to `main` directly once the test project exists; work on a branch (`feature/<short-name>`), open a pull request, check the Vercel preview, then merge.
- Until the test project and branch protection are set up, keep commits small and run the Definition of Done below before every push.
- Small commits, one feature or fix each. Never push broken builds. Never push secrets. Check `git status` before committing.

## Environments (decided 23 Nov 2026)
- One database design for all roles (multi-tenant with `academy_id` and RLS). Never split the database by role. Split by environment instead: a **live** Supabase project (`epawkdeosmuvczpsyoru`) and a **test** project `deutli-test` (Malik creates it; `docs/test-project-setup.sql` builds it; keys go in `.env.local`, never in chat).
- Every migration runs on the test project first, then on live. Test accounts (admin, student, teacher) are listed in Claude's memory file `deutli-test-accounts`, not in the repo. Never type passwords for Malik; he logs in himself in the browser pane.

## Definition of Done (follow before every push, even if nobody asks; full list in the `deutli-skills` skill)
1. Every changed line belongs to the request. 2. Student feature: say what teacher, school admin and Deutli admin get. 3. UI: screenshots at 1440px and 390px. 4. `npm run check` and `npm run build` green. 5. Security-touching change: security review plus RLS check. 6. Database change: migration file, test project first, then live. 7. Branch, pull request, preview, then merge. 8. Test the feature myself in the browser pane as each role it touches (console, network, saving, empty states); Malik gives design feedback only, he does not test. 9. Tell Malik plainly what changed, what I tested and what is unchecked.

## Quality routine (set up 23 Nov 2026, keep it running)
- On every pull request: `.github/workflows/ci.yml` runs `npm run check` (typecheck, lint, tests, `scripts/guard.sh`) and `npm run build`.
- Weekly: Supabase security advisor, `docs/live-db-check.sql`, `npm audit`; report to Malik in a few lines. If the weekly task is not scheduled, offer to schedule it.
- Known legacy items the guard allows and that should be replaced when touched: raw `<select>` in `paper-upload-form.tsx`, `practice-forms.tsx`, `exam-player.tsx`.

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

Direction changed on 22 Nov 2026 (see "Product direction"): pilot feature 3 (batches, timetable, attendance) becomes the teacher tools, and feature 4 (fees, installments) moves to the school tools, later.

## Status
- [x] Project setup + design tokens
- [x] Login, signup, password reset, logout
- [x] Role-based redirect + student dashboard (UI with sample data)
- [x] Account page `/dashboard/account` (name, email shown, phone, password change with current password, meaning languages, time zone) + sidebar user menu (Account, Log out). Profile photo: private bucket `avatars` (folder per user id, any logged-in user may view via signed links), `profiles.avatar_path`; the browser crops/shrinks to 256px JPEG before upload; `src/lib/account/`. Google sign-in copies the Google photo once into the profile photo if there is none (`src/lib/account/google-photo.ts`, called from `/auth/confirm`; `profiles.google_photo_checked_at`, migration 28, already run, so a removed photo never comes back). Shows the connected Google account (photo, name, email) (Google-only users see "No password set", no Edit). Students can delete their account (type DELETE; `deleteMyAccount`, needs `SUPABASE_SECRET_KEY`): photo, unpaid orders and the login are removed, everything else cascades; paid orders are kept with `user_id = null` (legal retention, migration 27, already run). Terms/Privacy/Impressum links sit at the bottom of the Account page (moved from the user menu). Email change: Account → Email → Edit sends a confirmation link (`requestEmailChange`; link → `/auth/confirm?type=email_change&next=/dashboard/account`; template `supabase/templates/change-email.html`, to paste in Supabase); the page shows "Waiting for you to confirm …" while `new_email` is pending. Not yet: plan/payments (comes with Fees).
- [x] Onboarding `/onboarding`, only for new signups (the signup confirmation link goes there; accounts that existed on 2026-11-12 were marked done; students without `profiles.onboarded_at` are sent there from the dashboard; `?again=1` to redo). 4 steps (since 2026-11-17): languages (two dropdowns with flags → `profiles.languages`, + English; small "Not you? Log out" on this step only), certificate goals, exam + exam date, worries (several → `profiles.focus_skills`) + email-tips checkbox (unticked). The old "plan" step was removed: the plan is the dashboard "Your focus" card (`src/components/dashboard/focus-card.tsx`, one line + link per worry, `next`/`start` in options.ts) and the tips moved to the exam skill pages ("How to tackle it"). Options/plan texts in `src/lib/onboarding/options.ts`. Dashboard countdown uses `profiles.exam_date`. Logout goes to /login. The marketing site (www.deutli.com, other repo) should link its Sign up button to https://app.deutli.com/signup.
- [x] My B1 Exam `/dashboard/exam` (menu item with sub-menu Reading / Listening / Writing / Speaking → `/dashboard/exam/[skill]`): mock exams shown as book covers (`src/components/exam/exam-cover.tsx`, owl + big "B1", light lower half, stamp), detail page `/dashboard/exam/mock/[examId]`. Skill pages show the real format of the student's own exam (`profiles.exam`): parts, time, questions, points, pass rule. Formats live in `src/lib/exam/catalog.ts` (`getExamFormat`): Goethe B1 (ÖSD B1 is the same exam) and telc B1 (from the official Übungstest; Sprachbausteine sits on the Reading page). DTZ / other / no exam fall back to Goethe with a note — DTZ format still to add. The mock list shows uploaded papers first (real, from the admin panel), then sample covers (8 city names) that have no paper yet; the first mock is free. Not built yet: part practice, premium unlock, DTZ and non-B1 formats. Old `/dashboard/course` redirects here. The separate "Mock exams" menu item was removed.
- [x] Daily Practice (menu name: "Improve Accent") (listen → listen and read → speak along): student page `/dashboard/daily-practice`, full-screen reader `/practice/[trackId]` with audio player, admin upload `/admin/daily-practice`. Real data (tables `practice_sets`, `practice_tracks`, `practice_log`, private bucket `practice-audio`).
- [x] Mock papers (real papers solved online): admin `/admin/mock-papers` (upload PDF in the browser, pages become JPEGs in private bucket `mock-papers`, optional audio, paste answer key, publish). Student player `/exam/take/[slug]` (paper pages, answer sheet, section timers, audio, autosave), result `/dashboard/exam/mock/[slug]/result`. Tables `mock_papers`, `mock_paper_keys` (admins only; grading uses the secret key), `mock_attempts` (migration 20261114000013, already run). Code: `src/lib/papers/`, `src/components/exam/exam-player.tsx`. telc B1 format only; writing is saved but not marked yet. First paper: telc Übungstest 1 as "Hamburg" (free). Answers are marked on the server with the secret key (needs `SUPABASE_SECRET_KEY` on Vercel); the answer pages of the PDF are never uploaded. The admin picks the PDF page of each part and pastes the answer key (parsed by `parseAnswerKey` in `src/lib/papers/template.ts`). `/exam` is a protected route prefix. Open: confirm the MP3 (file name said uebungstest_4) matches Übungstest 1.
- [x] Advanced settings `/dashboard/settings` (sidebar user menu): choose exam (Goethe / telc / ÖSD at A1–C2, DTZ, other) saved in `profiles.exam` (ids like `goethe_b2`; code in `src/lib/exam/choice.ts`, `src/lib/settings/actions.ts`). For the MVP the menu and exam pages stay on B1 (level-based menu code is commented out in `src/app/dashboard/layout.tsx` and `exam/page.tsx`); onboarding still only offers B1 exams.
- [x] Menu: "Improve Accent" (was Daily Practice, same URL), "My B1 Exam" with timer icon, no "Mock exams" item.
- [x] Dashboard readiness card uses real mock exam results (`src/lib/papers/readiness.ts`): Lesen, Sprachbausteine, Hören; Schreiben and Sprechen "not marked yet". The homework feedback card is still sample data.
- [x] Mock covers: owl on 7 tone gradients (navy, violet, teal, indigo, plum, forest, ocean); admin can set the colour and an optional cover photo per paper (`mock_papers.tone`, `cover_path`, migrations 13 and 14, already run).
- [x] Live classes (2026-11-18, migration 29, already run). Student: `/dashboard/classes` (menu item "Classes", under My B1 Exam): two-week day strip with dots, skill filter, "All classes / My classes" tabs, Register -> Registered -> Join (opens 10 min before, in a new tab); detail `/dashboard/classes/[id]` (syllabus, teacher card, seats, add to calendar `.ics`, 1-5 star rating after it starts); teacher profile `/dashboard/teachers/[id]` ("Teaching now" = courses with upcoming classes, worked out from the classes, rating shown only from 3 ratings). Teacher: `/teacher/classes` (upcoming/past, new class with "repeat weekly", edit, registrants with Present tick, cancel) and `/teacher/profile` (photo, headline, bio, what they teach, languages). Admin: `/admin/classes` (all classes, create for any teacher). Tables `live_classes`, `live_class_links` (the Zoom link: only teacher/admin can read; students get it from the server action `getJoinLink`, only when registered and in the join window), `class_registrations` (written only by the server; seats are taken by the function `register_for_class` which locks the class row), `teacher_profiles`. Times are saved as UTC and shown in each user's own time zone (`zonedToUtc` etc. in `src/lib/time.ts`). Code: `src/lib/classes/`, `src/components/classes/`. Dashboard shows a "Your next class" card (Join button when it opens; a "Join a live class" prompt if the student has none but classes exist; hidden if no classes). Not built yet: WhatsApp reminders (the email reminder for a class starting within the hour is built), waiting list, Pro-only classes (free for now), admin editing of teacher profiles, academy filtering (`live_classes.academy_id` is reserved).
- [~] UI polish pass, started 2026-11-14: Border Beam + Number Ticker on the readiness card, Blur Fade reveals on dashboard cards and exam covers, exam countdown ticks up (components in `src/components/magicui/`, `motion` installed, reduced motion respected). Still to do: Magic Card on card grids, tabs indicator, accordions, vocabulary/account/admin screens. Original item: audit dashboard, exam, vocabulary, account and admin screens; add Border Beam to one featured card per screen, Magic Card glow to card grids, Number Ticker to real stats, Blur Fade reveals. Marketing site gets the bigger effects in its own repo.
- [~] AI UI pass, started 2026-11-14: the only AI touchpoint today is word translation (`src/lib/translate/word.ts`, shown in `src/components/practice/word-box.tsx`): it now shows a sparkle + shimmer "AI is translating…" and an "AI" badge on translated meanings. Still to do: daily limit counter ("7 of 10 left"), "Correct it" and "This is wrong" actions, and the whole homework/writing AI flow once it exists. Original item: list every AI touchpoint, then add thinking states, streamed results, "AI" badges, AI-vs-teacher blocks, correction/feedback actions, friendly limits and error states.

- [x] Built since 19 Nov (taken from the git log, not from earlier notes; correct this line with exact details when you touch these areas): Plans page and Upgrade page (Free vs Pro, Stripe opens directly, Pro is a one-time payment that does not renew, German consumer-law checkout texts), Account plan section and Pro renewal banner, Support page and admin Feedback inbox, emails with Resend, reminder emails (Pro ending, class starting within the hour), database rate limiter, admin sidebar menu, A2/B1/B2 vocabulary lists under Pro.
- [ ] GO-LIVE PHASE 1 (22 Nov 2026, build this first, small commits, push to `main` as usual): (a) migration: `academies.kind`, `slug`, `owner_id`, `plan_id`, `show_powered_by`, `discount_percent`, `discount_until`; `academy_members`; `plans.kind`, `max_students`, `max_teachers`, features; `plan_prices`; RLS on all of them; give every existing teacher a personal academy; existing students untouched. (b) seed the plans and prices from "Pricing and currency". (c) admin page `/admin/academies`: create a workspace, pick the owner by email, assign plan, founding discount, see active students against the limit. (d) teacher page shows workspace name, plan, active students against the limit. (e) join code and QR (build order step 2). Do NOT migrate student prices to EUR yet (build order step 1) and do not touch live checkout. Phase 1b after this: branding phase 1 (step 3), the school selling hook.
- [x] Build order steps 0 to 12 built on 22 Nov 2026 (migrations 33 to 43, all to be run in the Supabase SQL editor in order): workspaces and plans (33, 34), join codes and QR (35), EUR pricing with fx_rates (36; a plan only switches to EUR when its EUR price is set in /admin/payments), branding phase 1 (37; `src/lib/branding`, `/teacher/branding`), batches and announcements (38), materials and homework (39), recording link and saved room link (40), 1:1 lessons (41), private papers (42), chapter tests (43), student timetable, teacher sees a student (`/teacher/students/[id]`), school page `/teacher/school` (bulk CSV invites need the Supabase "Invite user" email template). Not started: tax, WhatsApp reminders, `schoolname.deutli.com`, payment and payouts for 1:1, AI marking of homework.
- [ ] NEW DIRECTION (22 Nov 2026), in the suggested order, details in "Product direction", "Teacher tools", "White-label" and "Pricing and currency":
  - [ ] 0 Organisation layer: `academies.kind` and `slug`, personal academy for solo teachers, `academy_id` and RLS on new tables
  - [ ] 1 EUR pricing with PKR (and other currency) display from `fx_rates`; Stripe always in EUR; bank/wallet shows the equivalent amount
  - [ ] 2 Join with a code or QR at signup (and under Account for existing students)
  - [ ] 3 Branding phase 1: name, logo, colour, approved font; contrast check; replace hard-coded colours with tokens
  - [ ] 4 Batches and announcements
  - [ ] 5 Materials and homework, shared between batches
  - [ ] 6 Recording link per class; one saved room link per teacher
  - [ ] 7 Teacher sees students' mock results
  - [ ] 8 Private papers per batch
  - [ ] 9 Chapter tests
  - [ ] 10 Student timetable per teacher
  - [ ] 11 1:1 lessons (payment and payouts not in scope)
  - [ ] 12 School admin dashboard: bulk CSV upload, attendance %, reports; fees later

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

