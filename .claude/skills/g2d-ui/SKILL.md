---
name: g2d-ui
description: Use whenever building or changing any Deutli (formerly Gateway2Deutsch / G2D) platform or website screen, so the UI follows the Deutli design system and looks modern.
---

# Deutli UI skill

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
