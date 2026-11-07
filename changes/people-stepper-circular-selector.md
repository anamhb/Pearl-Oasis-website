# People Stepper — Circular Selector (1–12 + More) & Guest Composition Popup

Reworks **only the People step** of the existing `/book-a-table` page. The Date, Time,
Details, and Submit steps, the stepper component, the routing, and the WhatsApp
submission path are untouched. JavaScript only, no new dependencies, nothing committed.

Pearl Oasis's identity is preserved: dark background, gold accents (`#d4af37` /
`#e0b84c`), Cinzel labels, serif-luxury numerals, existing button/counter styles.

> This document **supersedes the People-step section** of
> `changes/booking-stepper-improvements.md`; everything else in that document
> (steps 2–5, stepper behaviour, submission) remains accurate.

## What changed at a glance

| Area | Before | After |
|------|--------|-------|
| Total guests | ± numeric counter (1–20) inline in the step | Circular buttons **1–12** + **More** dropdown **13–30**, in the step |
| Composition | Inline Kids/Male/Female counters + live status line | **Guest Composition popup**, opened by every size selection |
| Proceed rule | Continue blocked while counts ≠ total | Continue blocked until a composition has been **confirmed** in the popup |
| Initial state | Pre-filled `2 = 0 kids + 1 male + 1 female` | **Unconfirmed** (`total 0`), prompt card shown |
| Range | `GUEST_MAX = 20` | `GUEST_MAX = 30` (only consumer was this step) |
| Summary / WhatsApp | total + Kids/Male/Female | unchanged — same fields, same message shape |

## 1. Circular people selector

```
PARTY SIZE                                    Select 1 to 30 guests
[ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ]        ← 6 columns desktop
[ 7 ] [ 8 ] [ 9 ] [10 ] [11 ] [12 ]           4 columns mobile (3 rows)
[        MORE  13–30  ⌄                      full-width pill, after 12 ]
```

- **Circles 1–12**: `aspect-square`, capped at 64 px (≈50 px at 390 px, 64 px ≥ 768 px;
  ≈50 px even at 320 px — always ≥ 44 px tap). Serif numerals, `aria-pressed`,
  `aria-label="Party size N"`.
- **Selected state**: gold border + gold tint + soft gold glow + `scale-105`.
- **Hover** (unselected): border/text turn gold with a 2 px lift.
- **More pill** (`col-span-4 sm:col-span-6`): label `MORE  13–30` + chevron that
  rotates 180° while open; gold-selected whenever the confirmed total is ≥ 13;
  `aria-haspopup="true"`, `aria-expanded`, `aria-controls` (while open).
- **Dropdown**: opens directly under the pill, header *"Larger parties — 13 to 30
  guests"*, then pills **13–30** (5 columns mobile / 6 desktop, `h-11` ≥ 44 px; on
  mobile the panel spans the selector's side padding so pills stay ≥ 44 px wide).
  Selected total shows pressed/gold. Closes on: option select, **Escape** (focus
  returns to the More pill), **outside `pointerdown`**, or re-clicking More.
- **Readout** in the section header: `Select 1 to 30 guests` → `N guests selected`.
- No `<select>` exists anywhere in the flow (spec: no dropdowns for totals).

## 2. Guest Composition popup

**Every** size selection — circle or dropdown option — immediately opens a modal
titled exactly **Guest Composition**.

```
GUEST COMPOSITION                                    ✕
Split {total} guests into kids, male, and female …

TOTAL GUESTS                             15
KIDS          [ − ]  2  [ + ]
MALE          [ − ]  4  [ + ]
FEMALE        [ − ]  2  [ + ]
REMAINING GUESTS                         7
⚠ Assign 7 more guests to confirm

[ CONFIRM GUEST COMPOSITION ]  [ CANCEL ]
```

### Rules

- **Counters** can never go negative (`−` disabled at 0) and can never exceed the
  selected total (`+` disabled once Kids + Male + Female = total), so *Remaining
  Guests* is always ≥ 0 and no category can outrank the party size.
- **Remaining Guests** recalculates live, with a `role="status"` hint:
  amber *Assign N more guest(s) to confirm* / gold ✓ *All guests assigned*.
- **CONFIRM GUEST COMPOSITION** is enabled **only** when the counts equal the total;
  it saves total + counts atomically, clears any stale step-1 error, closes, and
  restores focus to the control that opened the popup.
- **Close without confirming** — ✕, Cancel, **Escape**, or tapping the scrim —
  keeps the previously confirmed composition untouched.
- **Changing the total** reopens the popup with the *new* total:
  - re-picking the confirmed number = **edit** (exact counts prefilled);
  - a different number carries the old counts over, clamped (each ≤ new total, then
    trimmed from the largest group) so nothing is silently lost — e.g. confirmed
    `8 = 2/4/2`, selecting 4 prefills `2/1/1` with 0 remaining.
- **Edit** button (Pencil, top-right of the card) reopens the popup with the
  confirmed composition at any time.

### Presentation

- **Desktop (≥ 640 px)**: centered modal, `max-w-md`, gold border.
- **Mobile**: bottom sheet — grab handle, rounded top (and floating bottom corners),
  full-width stacked buttons — anchored 16 px above the bottom edge.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → title; focus moves into
  the panel **once on open** (not on every count change); Escape closes via the same
  path as Cancel; `data-lenis-prevent` matches the existing confirmation dialog.

## 3. Step state & validation

- The popup is the **only writer** of the composition. The form starts
  unconfirmed (`totalGuests = 0`), so the step shows a prompt card:
  *"Choose your party size above — a popup will ask you to split the group…"*
- After confirming, the step displays the saved composition:

  ```
  GUEST COMPOSITION                            ✎ EDIT
  ┌─────────────┬──────┬──────┬────────┐
  │ TOTAL GUESTS│ KIDS │ MALE │ FEMALE │   4 stats (2×2 mobile / 4×1 desktop)
  │      15     │  9   │  4   │   2    │   gold serif values
  └─────────────┴──────┴──────┴────────┘
  ```
- **Continue** on step 1 without a confirmed composition shows
  `Select your party size and confirm the guest composition` (`role="alert"`) and
  moves focus to the party-size group; a defensive breakdown-mismatch message
  remains as a safety net behind the popup's own gating.
- Stepper navigation, Continue/Back, the submit re-validation jump, and every other
  step behave exactly as before; going back and forward preserves the confirmed
  composition like all other field values.

## 4. Summary & WhatsApp message (unchanged shape)

The submit summary and the WhatsApp message keep reading the same four fields, so
they automatically reflect the popup-confirmed values. Example (15 guests):

```
🏛️ *Pearl Oasis — Table Booking Request*
…
*Total Guests:* 15
*Kids:* 9
*Male:* 4
*Female:* 2
*Reservation Date:* Friday, 6 November 2026
*Seating Time:* 7:30 PM (Dinner)
*Guest Name:* Sara Khan
*Telephone:* 03001234567
```

Sent to `https://wa.me/<VITE_WHATSAPP_NUMBER>` (fallback `923327515538`),
URL-encoded, request-worded — the guest presses Send; the restaurant confirms.

## Files changed

| File | Change |
|------|--------|
| `src/components/sections/BookATablePage.jsx` | Circular selector + More dropdown, Guest Composition popup (state, prefill/clamp, focus & Escape/pointer handling), composition card, step-1 validation message |
| `src/utils/booking.js` | `GUEST_MAX` 20 → 30 (+ comment: circles cover 1–12, More covers 13–max) |
| `changes/people-stepper-circular-selector.md` | this document |

Not modified: `src/utils/whatsapp.js`, steps 2–5 markup/logic, `router.js`,
`App.jsx`, `index.css`, navigation/footer; no dependencies added.

## Testing

- `npm run lint` (`tsc --noEmit`) — **pass**
- `npm run build` (`vite build`) — **pass**
- Headless-Chrome CDP journey test
  (`C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\people-stepper-test.mjs`,
  pure CDP, no dependencies): **95/95 checks, zero console errors / page exceptions**

| Requested scenario | Result |
|--------------------|--------|
| Guest selection 1–12 | each circle opens the popup titled *Guest Composition* with the matching total; selection highlights the circle; cancels leave the step unconfirmed |
| More (13–30) | dropdown shows exactly 18 options `13…30`; selecting 15/17 opens the popup with that total; pressed state shown for 13–30 selections; toggle `aria-expanded` toggles; closes on Escape / outside pointer / option select |
| Composition validation | confirm disabled until sum = total; `−` disabled at 0; `+` disabled at total; extra clicks cannot exceed the total; leftover-guest hint updates; focus/validation message on failed Continue |
| Editing a confirmed composition | Edit reopens prefilled; broken sum disables confirm; **Cancel preserves** the saved counts; a valid edit replaces them |
| Changing the total | new total prefills carried-over counts with the correct remaining gap; confirming moves the highlight; Escape / scrim close keep the old total |
| Final summary + WhatsApp | summary shows 15 / 9 / 4 / 2 + name, phone, date, time; `wa.me` URL decodes to the same breakdown; request-not-confirmation wording; dialog repeats it |
| Desktop responsiveness | no horizontal overflow; dropdown fully inside the panel (regression check for the clipping bug found via screenshots); popup centered in the overlay |
| Mobile responsiveness (390 × 844) | no horizontal overflow; circles / More / pills / confirm button all ≥ 44 px; bottom-sheet geometry (anchored, centered); 4-column layout |
| Stepper integrity | 5 steps, no forward skipping, data preserved across Edit-jump + back/forward, fresh re-entry resets to the prompt state |

Screenshots (headless Chrome, in the same temp folder): `ps-people-confirmed-desktop.png`,
`ps-more-menu-desktop.png`, `ps-popup-desktop-centered.png`,
`ps-submit-summary-desktop.png`, `ps-submit-dialog-desktop.png`,
`ps-menu-mobile.png`, `ps-popup-mobile-bottom-sheet.png`,
`ps-people-confirmed-mobile.png`.

### Notes

- Screenshots may show a thin gold ring around a previously clicked circle: that is
  the component's `:focus-visible` state after **programmatic** focus in the headless
  tests — real mouse clicks do not show it.
- `GUEST_MAX` moved to 30 because the More dropdown must offer 13–30; the constant's
  only consumers are this step's validation and the dropdown range.
