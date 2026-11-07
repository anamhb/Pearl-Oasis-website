# People Stepper UI Refinement — Heading Removal + Inline "More" Expansion

Refines **only the People step** of the existing `/book-a-table` page. The Date, Time,
Details, and Submit steps, the stepper, the routing, and the WhatsApp submission path
are untouched. JavaScript/JSX only, no new dependencies, nothing committed.

Pearl Oasis's identity is preserved: dark background, gold accents (`#d4af37` /
`#e0b84c`), Cinzel labels, serif-luxury numerals, existing circle/popup styles.

> This document **supersedes the More-dropdown parts** of
> `changes/people-stepper-circular-selector.md`; everything else in that document
> (popup rules, prefill/clamp algorithm, validation, summary/WhatsApp) remains accurate.

## What changed at a glance

| Requirement | Before | After |
|------|--------|-------|
| Card heading | `<h3>Guest Composition</h3>` above the composition card | **Removed** — confirmed card shows only Edit + stats |
| Card paragraph | "Choose your party size above — a popup will ask…" prompt | **Removed** — unconfirmed state renders no composition section at all |
| More behavior | Click opened a **dropdown** (absolute panel, 13–30 pills, outside/Escape dismissal) | Click **expands 13–30 inline** into the same circular grid; click again collapses |
| More styling | Full-width (`col-span`), rounded pill with border, gold border on hover | **No border/outline**, content-sized, subtle light background on hover/press only over its own content |
| Selection → popup | Circles and dropdown options opened the popup | Unchanged — **every circle 1–30** opens the popup; counters/validation/state unchanged |

## 1. Heading and paragraph removed

- The `Guest Composition` heading and its descriptive prompt paragraph are gone from
  the "Who Is Dining?" card. The step description above the selector still explains
  the popup flow, so no guidance is lost.
- **Unconfirmed state:** the composition section renders nothing (no empty box).
- **Confirmed state:** a compact card with a right-aligned **✎ Edit** row and the
  Total / Kids / Male / Female stat grid — nothing else.
- The section wrapper (`${formId}-composition`, `role="group"`, focus target) still
  renders whenever a composition exists *or* the defensive `errors.composition`
  message fires, so validation focus/aria targets remain intact.
- The **popup keeps its own "Guest Composition" title** (requirement 4: the popup
  behavior is preserved; only the step-level heading was removed).

## 2. More button expands inline (dropdown removed)

Order of items in the grid (same `grid-cols-4 sm:grid-cols-6` circles, same spacing):

```
collapsed:  [1] … [12] [More]                     → 13 items
expanded:   [1] … [12] [13] … [30] [More]         → 31 items
```

- The **More toggle always trails the visible sizes**, so the numbers read
  1 → 30 contiguously with no menu-style interruption.
- The toggle is a plain disclosure button: `aria-expanded`, chevron rotates
  `180°` while expanded, and the label swaps **"More" → "Less"** (and back on
  collapse). Pressing it again collapses 13–30;
  any confirmed selection is preserved either way.
- Expanding appends `MORE_GUEST_SIZES` (13–30) as **the same circular buttons**
  (`guestSizeClassName`, `aria-label="Party size N"`, `aria-pressed`) inside the
  same grid — identical design, spacing, and tap size on desktop and mobile.
- State: `sizesExpanded` (renamed from `moreMenuOpen`). Removed with the dropdown:
  the absolute menu markup, `moreMenuRef` / `moreButtonRef`, the outside-pointer +
  Escape dismissal effect, `moreOptionClassName`, the `relative` grid anchor, and
  `aria-haspopup` / `aria-controls`.

## 3. More button styling

`moreToggleClassName` rewritten:

- **No border / outline at rest** — all `border-*` classes removed. The
  `focus-visible` gold outline is kept deliberately: it only appears for keyboard
  users and removing it would break the focus indicator (accessibility).
- **Content-sized:** `justify-self-start` + `px-3` + `whitespace-nowrap` — the
  button hugs its own "More · 13–30 · ⌄" content (~half the grid width at most,
  versus the old 100% `col-span` pill). Never full-width.
- **Hover/press background:** `hover:bg-white/10 active:bg-white/20` — a subtle,
  light tint painted only over the button's own content area.
- **Selected state** (confirmed total > 12): gold text (`#e0b84c` → `#f2dc8a` on
  hover) replaces the old gold border, since the border is gone.

## 4. Preserved functionality

- Selecting any size (1–12 or expanded 13–30) opens the **Guest Composition popup**
  with the same prefill/clamp rules; counters, remaining math, confirm gating,
  edit/cancel/Escape/scrim behavior, and focus restoration are unchanged.
- Closing without confirming never mutates state; re-selecting an equal total edits
  the confirmed composition; a new total carries the breakdown over (clamped).
- Confirmed composition, `formData`, summary rows, and the WhatsApp message
  (`total / Kids / Male / Female`) are byte-identical to before.
- Steps 2–5, stepper navigation, and the "Select your party size and confirm…"
  step-1 validation (focus → selector) are untouched.
- Expanded circles work at both widths: 4-column mobile grid, 6-column desktop,
  ≥44 px tap targets, no horizontal overflow.

## Files changed

| File | Change |
|------|--------|
| `src/components/sections/BookATablePage.jsx` | Removed card heading + prompt; `sizesExpanded` state; inline 13–30 circle map; borderless content-sized More toggle; deleted dropdown markup, menu refs, and dismissal effect; `moreOptionClassName` removed, `moreToggleClassName` rewritten |

Untouched: `src/utils/booking.js`, `src/utils/whatsapp.js`, all other steps/components.

## Verification

- `npm run lint` (tsc --noEmit) ✅ — `npm run build` ✅
- Headless-Chrome CDP journey test: **103/103 checks passed, zero console errors**.
  New/updated checks include:
  - no `Guest Composition` heading inside the form; prompt text absent; no
    composition section before the first confirmation;
  - collapsed → 13–30 absent; expand → `aria-expanded=true`, all 18 circles appear
    in the same grid, DOM order `1…30 + More`, class-identical to circles 1–12;
  - More has zero border classes, width ≤ 60% of the grid, real-pointer hover paints
    a background and it clears on pointer-out (CDP `Input.dispatchMouseEvent`);
  - expanded circle 17 opens the popup with total 17; cancel keeps total 8 + focus
    returns to circle 17; collapse hides 13–30 without losing the confirmation;
  - expanded circle 15 → carried breakdown 2/4/2 → confirm 9/4/2 → summary +
    `wa.me` breakdown unchanged; stepper journey and fresh re-entry unchanged;
  - mobile: More ≥44 px tall, content-sized, expanded circles 20/30 ≥44×44, no
    horizontal overflow, bottom-sheet popup intact.
- Screenshots visually verified at 1280 px and 390 px:
  `ps-more-expanded-desktop/mobile`, `ps-people-confirmed-desktop/mobile`,
  `ps-popup-desktop-centered`, `ps-popup-mobile-bottom-sheet`,
  `ps-submit-summary-desktop`, `ps-submit-dialog-desktop`.

## Not committed

No `git commit` / `git push` was performed; all changes are in the working tree.
