---
name: clean-craft
description: Enforces professional, human-crafted UI/UX design (Anti-AI-Slop) with restrained color, disciplined spacing, and accessible, user-friendly interaction patterns. Framework-agnostic — apply to any web project (React, Vue, Angular, Next.js, plain HTML/Tailwind, .NET Razor, etc.) when building or reviewing UI, regardless of the specific product. Use whenever writing, editing, or reviewing frontend code, components, layouts, or styling.
license: MIT
metadata:
  author: engineering-standards
  version: "2.0"
---

# Clean-Craft: Universal UI/UX Standards

A framework-agnostic rulebook for building interfaces that look and feel human-designed: restrained color, disciplined spacing, predictable interaction, and no decoration that doesn't earn its place. Apply this to every project — dashboards, admin/back-office tools, marketing pages, forms, mobile web — regardless of stack. When a project's own design brief or design system conflicts with a rule here, the brief wins; these are defaults for when nothing more specific has been decided.

The goal is not "minimal" for its own sake — it's **efficient**: every pixel of color, radius, shadow, and spacing should communicate something (hierarchy, state, grouping), not decorate.

---

## PART 0: The Anti-AI-Slop Instinct

Before writing any UI code, actively check the design against the patterns AI-generated interfaces default to. These are tells, not choices — they show up regardless of what the product actually is:

- **Loud, saturated color used decoratively.** Neon gradients, glowing/colored shadows (`shadow-blue-500/50`), rainbow accent chips, multiple saturated brand colors fighting on one screen.
- **Uniform excessive rounding.** Every card, button, and input at the same large radius (`rounded-2xl`/`rounded-3xl`) regardless of size or role — the "bubble UI" look.
- **The SaaS-card kit.** Content chopped into identical rounded cards, one soft grey shadow under everything, gradient washes used as background decoration rather than meaning.
- **Template chrome that appears no matter the subject:** ALL-CAPS tracked-out eyebrow labels above every heading; meta strings joined with " · "; a "→" tacked onto every button/link; a monospace font used for labels with no data reason.
- **Nested-box hell.** A bordered+shadowed card containing a bordered+shadowed panel containing bordered+shadowed rows — visual noise instead of one clear container.
- **Motion everywhere.** Fade-and-slide-up on every section on load, hover transitions on every single card — busy rather than purposeful.
- **Layout inefficiency in both directions.** Either cramming content edge-to-edge with no breathing room, *or* the opposite mistake of oversized empty margins/whitespace that pushes real content below the fold and wastes screen real estate. Both are "not designed," just in different directions.

If a screen exhibits three or more of these, stop and simplify before continuing. Spend visual boldness in exactly one place per screen (one accent color, one focal element) and keep everything else quiet.

---

## PART 1: Color Discipline

- **One accent, used sparingly.** Pick a single primary accent color for actions/focus/selection. Everything else is neutral (grays/slate). Do not introduce a second saturated color unless it carries distinct meaning (e.g., red = destructive, green = success, amber = warning) — and even then, keep those semantic colors muted, not neon.
- **No decorative color.** Color always signals something: state, hierarchy, interactivity. If removing a color wouldn't change what the user understands, remove it.
- **Contrast over saturation.** Prefer a calmer, slightly desaturated accent with strong contrast against the background over a loud, high-chroma one. Aim for WCAG AA contrast (4.5:1 body text, 3:1 large text/UI components) at minimum.
- **Neutral base palette.** Backgrounds and surfaces use a neutral gray/slate scale (or the project's existing neutral scale). Avoid tinted grays that read as a "mood" (e.g., warm cream `#F4F1EA` + terracotta accent, or near-black `#0B0B0B` + acid-green) unless the brief specifically calls for that identity.
- **Dark mode is a palette swap, not an afterthought.** If dark mode exists, invert lightness while keeping the same hue relationships and contrast targets — don't just drop opacity on the light-mode colors.

---

## PART 2: Border-Radius Scale Discipline

Radius communicates the *role* of an element, not personal taste. Never assign radius randomly or uniformly. Use a scale tied to component size/function:

| UI Component | Typical value | Usage |
|---|---|---|
| Inputs, buttons, form controls | `6px` (`rounded-md`) | Crisp, functional controls |
| Content cards, tables, panels | `8–10px` (`rounded-lg`) | Containers for content |
| Modals, dialogs, drawers | `12px` (`rounded-xl`) | Floating/overlay surfaces |
| Status tags, avatars, icon-only buttons, notification badges | fully round (`rounded-full`) | Only for genuinely circular/pill elements |

🚫 Avoid large uniform radii (`rounded-2xl`/`rounded-3xl`) on cards, tables, or panels — this is the single most common "AI-generated" tell. Radius should increase with elevation/floatiness, not with a desire to look "friendly."

---

## PART 3: Borders, Shadows & Elevation

- **Crisp 1px borders over heavy shadows.** Use a thin, neutral border (`border border-slate-200` light / `border-slate-800` dark) to define edges. Reach for shadow only to indicate elevation (something floats above the page), not as default styling for every box.
- **Restrained elevation.** Default to a subtle shadow (`shadow-sm`) for resting cards; a slightly stronger one (`shadow-md`) only on hover/active/floating states (dropdowns, modals, tooltips).
- 🚫 No `shadow-2xl` on static content, no colored/glow shadows, no glassmorphism/blur decoration unless the brief explicitly asks for that aesthetic.

---

## PART 4: Nesting & Composition

- **Avoid nested-box hell.** A card inside a card inside a row, each with its own border + shadow, reads as noise. Pick one of:
  - **Surface tint**: outer container gets `border + shadow-sm`; inner groupings just change background tint (e.g., `bg-slate-50`) with no border/shadow of their own.
  - **Dividers**: for a list of same-type rows inside one container, use `divide-y` between rows instead of individually boxing each row.
- Only one "boundary style" (border, shadow, or background shift) should separate any two adjacent levels of nesting — never stack two or three at once.

---

## PART 5: Spacing, Layout Efficiency & Multi-line Text

- **Breathing room scales with content.** More text/content → more padding, not less. Never use `py-1`/`py-2` on a container holding multi-line or variable-length text.
- **Block layout for dynamic/multi-line text.** Never combine `flex items-center` with `min-h-[...]` on a container whose text can wrap or contain line breaks — Flexbox vertical-centering will crush padding as content grows, pinning the first/last line to the box edge. Instead, let the box flow as normal block layout and fix padding directly (minimum `px-4 py-3.5` / `p-4`).
- **Respect literal line breaks.** When rendering text that contains `\n` (notes, descriptions, database fields), add `whitespace-pre-line` alongside `break-words` so line breaks and wrapping render as authored, instead of collapsing everything onto one line or relying on manually inserted `<br>` tags.
- **Symmetrical margins.** The left edge of text should align consistently across every wrapped line in a block; don't let one side of a container end up tighter than the other because of a layout primitive fighting with the content (e.g., `items-center` compressing top/bottom differently as height grows).
- **Layout must earn its whitespace.** Don't pad a page with huge empty margins "for cleanliness" if it pushes essential content below the fold — that is inefficiency in the other direction. Whitespace should separate and group content, not just take up space.
- **Density matches the domain.** Consumer marketing pages can be airy; data-dense back-office/admin tools (inventories, dashboards, tables) should prioritize scanability and information density over generous whitespace — don't apply a marketing-page spacing scale to a data grid.

---

## PART 6: Form Controls & Interactive Elements

- **No unsolicited icons.** Don't add icon libraries into inputs/buttons that weren't requested — icons that aren't perfectly aligned or sized are a common source of visual sloppiness.
- **Numeric inputs:** always hide native spinner arrows via CSS (`appearance-none` + the `::-webkit-outer/inner-spin-button` reset, plus `-moz-appearance: textfield` for Firefox) before centering text — otherwise `text-center` will look off-center because the browser reserves space for the arrows. Use a fixed height (`h-8`/`h-9`) rather than large vertical padding to vertically center single/double-digit values precisely.
- **Badges/counters inside buttons or tabs:** never build a circle with `px-… py-…` — it will collapse into an oval under flex pressure. Fix `width`/`height` equal (e.g., `w-4 h-4` or `w-5 h-5`), pair with `inline-flex items-center justify-center shrink-0`, and drop `leading-none` (let flex centering handle vertical alignment instead).
- **Custom radio/checkbox visuals:** if a selected row/card needs a highlighted background or custom selected-state styling, reset the native control with `appearance-none` and build the selected indicator yourself (e.g., `checked:ring-inset`, `peer-checked:` on sibling elements) — don't leave native browser focus rings/outlines fighting with a custom highlight, producing a doubled/squashed-looking circle.
- **Every interactive element needs a visible focus state** (for keyboard users) — removing `outline` without replacing it with an equally visible custom focus style is not acceptable.
- **Tap targets ≥ 44×44px** on anything touch-interactive; don't shrink primary actions below this on mobile viewports.

---

## PART 7: Tables & Column Alignment

- Header alignment must match the data type below it:
  - Text, names, codes, identifiers → left-aligned (`text-left`), header left-aligned.
  - Numbers, currency, quantities, totals → right-aligned (`text-right`), header right-aligned (so digits line up for scanning).
  - Badges/status/icons → centered (`text-center`).
- Keep this consistent across every column in a table — a table with mismatched header/data alignment is one of the fastest ways to look unpolished.

---

## PART 8: Modals, Drawers & Footer Actions

- A modal/drawer footer that combines a helper note with action buttons should separate them clearly: `flex items-center justify-between gap-4 flex-wrap` — helper text left, action buttons grouped right. Don't let them visually run together.
- Primary action is visually dominant (filled/accent button); secondary/cancel actions are lower-emphasis (outline or ghost button). Never give two competing actions equal visual weight.

---

## PART 9: Motion

- Motion should answer a user action (opening, expanding, confirming, loading) — not decorate the page on load.
- One orchestrated moment beats scattered effects. Avoid fade-and-slide-up entrances stacked on every section, and avoid hover transitions applied uniformly to every card just because it's easy to add.
- Attention-grabbing animation (pulsing badges, blinking indicators) should run slow and soft: **2–3s, `ease-in-out`**, not a fast/jarring blink. Respect `prefers-reduced-motion`.

---

## PART 10: Typography

- One or two type families max; if two, make their roles (display vs. body) clearly distinct rather than visually similar.
- Default line length under ~80 characters for body text.
- Avoid the generic tells: bolding/coloring a single word inside a headline for emphasis, ALL-CAPS labels, and adding a small uppercase "eyebrow" label above headings that doesn't carry real information.
- Establish a clear type scale (a handful of sizes/weights used consistently) rather than ad hoc font sizes scattered per component.

---

## PART 11: The 5 Essential UI States

Every component that loads or displays data should explicitly handle:

1. **Idle** — data loaded and displayed normally.
2. **Loading** — prefer a skeleton placeholder that mirrors the eventual layout over a bare spinner, especially for content-heavy views.
3. **Empty** — no data yet; explain what belongs here and, where relevant, offer an action to create the first item.
4. **Error** — explain what went wrong in plain language and offer a retry action; never surface a raw stack trace or error code to the end user.
5. **Partial / no results (search & filter)** — make clear the search ran and found nothing, distinct from a true empty state, and suggest adjusting filters.

---

## PART 12: Feedback & Overlay Decision Matrix

Match the interruption level of a notification to the importance of the event:

| Pattern | Interruption | Use for | Avoid using for |
|---|---|---|---|
| Modal / Dialog | High — blocks the screen | Confirming destructive/critical actions; flows that need full focus | Simple success confirmations the user must dismiss manually |
| Toast / Snackbar | Low — auto-dismisses | Confirming a successful action ("Saved", "Link copied") | Long messages or raw error text the user needs to read carefully |
| Inline alert / banner | Low — embedded in layout | Section-level status, form validation errors | One-off feedback for a single button press |
| Popover / dropdown | Contextual | Context menus, filters, quick actions anchored to a trigger | Multi-step forms or anything requiring significant input |

---

## PART 13: Engineering Discipline (Scope & Verification)

- **Do exactly what was asked.** Don't add extra widgets, filters, sort controls, or icons that weren't requested — minimal, precise implementation over "helpful" additions.
- **Check dependencies before using them.** Before calling a global (`$`, a UI library, an icon set), verify it's actually loaded/imported in this project — don't assume.
- **Surgical diffs.** Touch only the files/lines relevant to the request; don't opportunistically refactor unrelated code.
- **No unearned confidence.** Don't claim "this will definitely work" or "100% fixed" without having actually run/built/tested it. Describe what the change does and, if untested, say so and suggest what to verify.
- **Responsive and accessible by default**, without being asked: works down to mobile width, visible keyboard focus, adequate color contrast, `prefers-reduced-motion` respected.

---

## Quick Audit Checklist

Before shipping any UI change, scan for:

- [ ] Only one accent color doing real work; no decorative gradients or glow shadows
- [ ] Radius matches the component-size scale (no uniform `rounded-2xl+` everywhere)
- [ ] No nested-box stacking (border+shadow inside border+shadow)
- [ ] Multi-line/dynamic text containers use block layout + `whitespace-pre-line`, not `flex items-center` + `min-h`
- [ ] Numeric inputs have spinner arrows hidden and are genuinely centered
- [ ] Badges/counters use fixed `w-*/h-*` + flex-centering, not padding-based circles
- [ ] Custom radio/checkbox states use `appearance-none` + `peer-checked`/`checked:` styling, no doubled focus rings
- [ ] Table header alignment matches column data type
- [ ] Modal/drawer footers separate helper text from action buttons clearly
- [ ] Animations run slow/soft (2–3s ease-in-out), not fast or jarring
- [ ] All 5 UI states (idle/loading/empty/error/no-results) are handled where data loads
- [ ] Keyboard focus is visible everywhere; tap targets ≥ 44px
- [ ] Nothing was added beyond what was actually requested
