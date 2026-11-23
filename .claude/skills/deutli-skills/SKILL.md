---
name: deutli-skills
description: Use whenever building or changing any Deutli (formerly Gateway2Deutsch / G2D) screen or feature. Holds the design system, the code-quality rules and the Definition of Done that every change must pass before it is pushed.
---

# Deutli skills (design system, code rules, Definition of Done)

Goal: every screen looks like a current, premium SaaS product (Linear / Duolingo-for-adults feel), never like a 2015 admin template.

## Before building
1. If the frontend-design or ui-ux-pro-max skills are installed, load them too.
2. If Malik shared a Figma link and the Figma MCP is connected, read it (get_design_context, get_variable_defs) and use its exact values.
3. Use shadcn/ui components first; only hand-roll when nothing fits.

## Stack conventions
- Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, Lucide icons.
- Design tokens live in one place (CSS variables in globals.css / Tailwind theme). Never hard-code hex values in components.
- Server components by default; client components only for interaction.

## Brand tokens (Deutli, from the Figma file — Figma wins over these notes)
Figma: https://www.figma.com/design/4pD07O1cSsoPm5yTw6czDG/Deutli
- Brand name: Deutli (formerly Gateway2Deutsch). Logo: blue-purple owl mascot (`public/deutli-owl.png`) + "Deutli" wordmark.
- Dark theme: background #081028, cards #0B1739, raised panels #12245C, borders #343B4F.
- Text: white #FFFFFF; muted/grey #AEB9E1; readable link purple #A79FFF.
- Primary: purple #7161FF; primary buttons use the gradient #7F25FB → #CB3CFF (`bg-brand-gradient`) with white text.
- Secondary: cyan #00C2FF (`brand-cyan`), used for strong progress bars and small accents; magenta #CB3CFF (`brand-magenta`).
- Success (teacher reviewed): #39FFAC text on #0E3B33 pill.
- Token names `gold`/`ink` in code are kept for compatibility: `gold` = brand purple, `ink` = raised navy panel.
- Fonts: "AOK Buenos Aires" (Figma brand font, licensed — add its web files to use it); Figtree is the fallback until then. Inter only for small UI labels if needed.

## Layout and style rules (from the approved dashboard)
- Left sidebar (card navy) with simple text nav; active item = soft purple pill. Count badges = small navy pills.
- Content on #081028; cards with 16–20px radius, 1px #343B4F border, no heavy shadows.
- Generous spacing: 24px card padding, 16–24px gaps, 8px grid.
- Big confident numbers for key metrics (readiness %), thin rounded progress bars (cyan for strong skills, purple for focus skills).
- One primary action per card: purple gradient button with white text; secondary = outline button.
- Greeting header with name + exam countdown; stat chips (streak, coins) top right as outlined pills.
- Every screen has loading (skeleton), empty and error states.
- Mobile first: sidebar becomes a sheet/bottom nav below 768px; cards stack to one column.
- Auth pages: split layout — form on the left on navy, raised navy panel on the right with a short promise line and a small product preview. Single column on mobile.

## Language and content rules
- German nouns always capitalised and shown with article: "der Kuchen", never "das kuchen".
- Urdu text: dir="rtl", Noto Nastaliq Urdu font, extra line height.
- AI scores are labelled as estimates; teacher confirmation shown clearly ("Teacher reviewed ✓").
- Button labels are plain verbs: "Continue", "Start", "Join", "Create account".
- Times for Pakistan students shown in PKT.
- Error messages say what happened and how to fix it, in plain English.

## Avoid (looks outdated)
Default Bootstrap look, gradients everywhere (only primary buttons use the brand gradient), heavy drop shadows, 12px body text, centred long text, random icon colours, more than one accent colour, cramped tables.

## After building (required)
1. Run the app and take Playwright screenshots at 1440px and 390px width; look at them.
2. Critique them: hierarchy, spacing, alignment, consistency with the rules above. Fix issues.
3. Accessibility check: contrast (WCAG AA), visible focus states, keyboard navigation, 44px touch targets, labelled form fields.
4. Only then report to Malik, with the screenshot file paths.

## Code rules (Malik should never have to repeat these)
- Clean code, small files, one job per component. Reuse what exists before writing something new: `Button`, `Input`, `Select`, `Popover`, `Calendar`, `DatePicker`/`TimePicker` (`src/components/ui/date-picker.tsx`), `UserMenu`, `AccountView`, `AdminShell`, `Card`.
- Never use browser-default controls: no `type="date"`/`time`/`datetime-local`, no raw `<select>`. Checkbox and radio use the sr-only input + styled span pattern. (`npm run check` fails on date/time inputs and new raw selects.)
- A control that opens a portal (Popover, Select) must not sit inside a `<label>`: use `<label htmlFor>` plus a separate control.
- Responsive by default with proper CSS grid/flex, no fixed widths that cause horizontal scroll, touch targets 44px. Check 390px and 1440px.
- Teacher, admin and student areas share patterns (same user menu, same Account page, same cards). If one role has it, the others get it or a clear reason why not.
- Colours come from tokens, never hard-coded hex (except where a library needs a literal, e.g. the colour picker).
- Server checks the role and ownership on every write. Secrets stay on the server. New tables carry `academy_id` and RLS.

## Definition of Done (run this list before every push, no exceptions, do not wait to be asked)
1. Re-read the request. Does every changed line belong to it? (`git diff`)
2. Student feature? Say what the teacher, school admin and Deutli admin get, or "nothing needed".
3. UI changed? Screenshot at 1440px and 390px on a temporary `zz-preview-*` route, then delete it.
4. `npm run check` is green (typecheck, lint, tests, guard script for native controls and secrets). `npm run build` passes.
5. Touches login, payments, files, roles or database access? Run the security review (`/security-review`) and check RLS: every table has RLS on and a policy.
6. Database change? Write a migration file, run it on the TEST project first, then live. Never run an untested migration on live.
7. Work on a branch, open a pull request, check the Vercel preview. Merge to `main` only when 1 to 6 are done.
8. After it is live (or on the preview), open the feature in the browser pane as each role it touches and click through it: no console errors, no failed network calls, data saves and shows, empty states work. Malik can only give design feedback, so testing is my job. If I am not signed in, ask Malik to sign in in the pane (never type passwords), then test.
9. Tell Malik in plain words what changed, what I tested and what is still not checked.

## Routine (also automatic, see CLAUDE.md "Quality routine")
- Every pull request: GitHub Action runs `npm run check` and `npm run build`.
- Every week: Supabase security advisor, `docs/live-db-check.sql`, `npm audit`, then a short report to Malik.
