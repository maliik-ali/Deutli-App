---
name: g2d-ui
description: Use whenever building or changing any Gateway2Deutsch (G2D) platform or website screen, so the UI follows the G2D design system and looks modern.
---

# Gateway2Deutsch UI skill

Goal: every screen looks like a current, premium SaaS product (Linear / Duolingo-for-adults feel), never like a 2015 admin template.

## Before building
1. If the frontend-design or ui-ux-pro-max skills are installed, load them too.
2. If Malik shared a Figma link and the Figma MCP is connected, read it (get_design_context, get_variable_defs) and use its exact values.
3. Use shadcn/ui components first; only hand-roll when nothing fits.

## Stack conventions
- Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, Lucide icons.
- Design tokens live in one place (CSS variables in globals.css / Tailwind theme). Never hard-code hex values in components.
- Server components by default; client components only for interaction.

## Brand tokens
- Ink (dark surfaces, dark cards): #0D0E1A
- Text: #14151F; muted: #4F5266 / #5B5E70
- App background: #F7F7FB; cards: #FFFFFF; card border: #E6E7EF
- Gold accent (primary CTA, focus progress): #F2B53A; dark-gold text: #8A5A00; light gold fill for active nav: #FFF3D6
- Success (teacher reviewed): green text on pale green pill
- Fonts: Plus Jakarta Sans 700–800 for headings and big numbers; Inter for body and UI (load with next/font).
- Logo badge "G2D": gold square, dark text.

## Layout and style rules (from the approved dashboard)
- Left sidebar (white) with simple text nav; active item = light gold pill. Count badges = small dark pills.
- Content on #F7F7FB; cards with 16–20px radius, 1px #E6E7EF border, no heavy shadows.
- Generous spacing: 24px card padding, 16–24px gaps, 8px grid.
- Big confident numbers for key metrics (readiness %), thin rounded progress bars (ink for strong skills, gold for focus skills).
- One primary action per card: gold filled button with dark text; secondary = outline ink button.
- Greeting header with name + exam countdown; stat chips (streak, coins) top right as outlined pills.
- Every screen has loading (skeleton), empty and error states.
- Mobile first: sidebar becomes a sheet/bottom nav below 768px; cards stack to one column.
- Auth pages: split layout — form on the left on white, dark ink panel on the right with a short promise line and a small product preview. Single column on mobile.

## Language and content rules
- German nouns always capitalised and shown with article: "der Kuchen", never "das kuchen".
- Urdu text: dir="rtl", Noto Nastaliq Urdu font, extra line height.
- AI scores are labelled as estimates; teacher confirmation shown clearly ("Teacher reviewed ✓").
- Button labels are plain verbs: "Continue", "Start", "Join", "Create account".
- Times for Pakistan students shown in PKT.
- Error messages say what happened and how to fix it, in plain English.

## Avoid (looks outdated)
Default Bootstrap look, gradients everywhere, heavy drop shadows, 12px body text, centred long text, random icon colours, more than one accent colour, cramped tables.

## After building (required)
1. Run the app and take Playwright screenshots at 1440px and 390px width; look at them.
2. Critique them: hierarchy, spacing, alignment, consistency with the rules above. Fix issues.
3. Accessibility check: contrast (WCAG AA), visible focus states, keyboard navigation, 44px touch targets, labelled form fields.
4. Only then report to Malik, with the screenshot file paths.
