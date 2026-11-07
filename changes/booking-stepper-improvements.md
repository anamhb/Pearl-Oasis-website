# Booking Stepper Improvements — People → Date → Time → Details → Submit

Improves the existing `/book-a-table` page (from `changes/dedicated-booking-stepper.md`)
using the Qissa/resOS booking journey as interaction inspiration. The page, route,
stepper component, and WhatsApp submission path were **reworked in place** — no second
booking page was created, no dependencies were added, and no unrelated sections changed.

Pearl Oasis's visual identity is unchanged: dark background (`#090a0c`), gold accents
(`#d4af37` / `#e0b84c`), Cinzel labels, serif-luxury headings, existing button styles.

## Updated stepper flow

| # | Step | Heading | Controls | Blocks Continue when |
|---|------|---------|----------|----------------------|
| 1 | **People** | Who Is Dining? | Total guests +/− counter; Kids / Male / Female +/− counters; live status line | total outside 1–20, or breakdown ≠ total |
| 2 | **Date** | Choose Your Date | Today card, Tomorrow card, "Choose another date" card + native date input; selected-date readout | no date chosen, or date in the past |
| 3 | **Time** | Choose a Seating Time | Circular buttons for the 10 configured slots; selected-time readout | no time selected |
| 4 | **Details** | Your Details | Name\*, Phone Number\*, Special Requests (optional) textarea | name missing/too short, phone missing/invalid |
| 5 | **Submit** | Review & Submit | Summary cards (Party, Reservation, Guest Details, Special Requests) with Edit jumps; **CONFIRM TABLE REQUEST** | re-validates steps 1–4 and jumps to the first invalid step |

The progress indicator shows all five steps with three states: completed (filled gold
circle + check, clickable to edit), active (gold ring + gold caption), upcoming (muted).
The gold track fill advances 0 → 20 → 40 → 60 → 80 % as steps complete.

## 1. People step — numeric selector + guest composition

- Dropdown removed. The **total** is a prominent serif number between − and +
  circle buttons (`aria-label="Decrease/Increase total guests"`), with an inline
  hint: *Minimum 1 · maximum 20 guests* (`GUEST_MIN` / `GUEST_MAX` in `booking.js`).
- **Guest composition**: Kids, Male, Female — each a counter (+/−, min 0). On mobile
  the rows stack label-left / controls-right; on desktop they sit in 3 columns.
- A live `role="status"` line under the counters reports sync state:
  - gold ✓ `All N guests assigned`
  - amber `N guest(s) not assigned yet`
  - red `Breakdown exceeds the total by N guest(s)`

### Validation rules

- Continue is blocked unless **Kids + Male + Female === Total**. The `role="alert"`
  message states exactly what to fix ("assign the remaining N guests" /
  "remove N guest from the breakdown") and focus moves to the composition block.
- Changing the total **never mutates the counters** — previously entered counts are
  preserved; the status line immediately shows the resulting gap or excess. (E.g.
  total 2 → 3 leaves the 2 assigned guests untouched and asks for 1 more.)
- **+** on a counter is disabled while the breakdown already equals the total, so
  overshoot can only happen by lowering the total — and the red status + blocked
  Continue guide the guest back to sync.
- Defaults: total **2**, Kids 0 / Male 1 / Female 1 (in sync, so the flow is not
  blocked on arrival).

## 2. Date step — Today / Tomorrow / calendar

- Three equal cards: **Today** (sunrise icon), **Tomorrow** (sun icon), **Choose
  another date** (calendar icon). Each shows its short date ("Fri 6 Nov"), the
  selected card gets a gold border + tint + check mark, and a `role="status"` line
  below shows the full readable date ("Monday, 16 November 2026").
- Today/Tomorrow use the visitor's **local** date (`getTodayDateString` /
  `getTomorrowDateString`).
- "Choose another date" opens a native `<input type="date">` row (`min` = today,
  `[color-scheme:dark]`); picking a quick card hides it again. The input also opens
  automatically if Continue is pressed with no date.
- Past dates: blocked by the picker's `min` **and** by validation ("Date cannot be
  in the past").
- The date is preserved across all Back/Continue/stepper navigation.
- **Changing the date clears the previously selected seating time** (`handleDateChange`)
  — a time belongs to the date it was picked for (mirrors the resOS URL structure,
  where time is bound to the date). Re-picking the same date keeps the time.

## 3. Time step — circular slots

- All **10 configured `TIME_SLOTS`** render as circular buttons (clock + meridiem,
  service name kept in the full slot string). Layout is a balanced responsive grid:
  5 × 2 on all widths — circles size to their grid cell (`w-full max-w-12`, i.e.
  ≤ 48 px) on mobile and 64 px at `sm+`, so they never overflow or leave a ragged row.
- Selected state: gold border, gold tint, soft ring, slight scale-up; hover lifts
  the circle and warms the border (`transition-all`). Single selection only
  (`aria-pressed`); a readout below shows *Selected seating time: 7:30 PM (Dinner)*.
- **No availability claims**: the project has no live availability source, so no
  slot is marked disabled and no wording implies real-time availability — these are
  the restaurant's configured service slots.

## 4. Details step — simplified

- Exactly three fields: **Name \***, **Phone Number \***, **Special Requests or
  Dietary Requirements (Optional)** — single-column, comfortable spacing, gold
  uppercase labels, validation messages under each field (`role="alert"`).
- **Email address removed** from the step, the form state, validation, summary,
  dialog, and WhatsApp message.
- Phone validation: required, ≥ 7 digits. All values preserved on Back/forward.

## 5. Submit step — new final step

Reached only through validated Details. Contains:

- **Your Party** card — Total Guests, Kids, Male, Female (+ Edit → step 1)
- **Reservation** card — Date (formatted), Seating Time (+ Edit → step 2)
- **Guest Details** card — Name, Phone Number (+ Edit → step 4)
- **Special Requests** card — only when notes were given
- The "this is a booking *request*, not confirmed until the team replies" notice,
  the cancellation-policy note, **Back**, and the prominent
  **CONFIRM TABLE REQUEST** button.

There is no payment step and no payment handling anywhere — the reference's final
"pay" page was used for final-step design/interaction only.

## WhatsApp submission

`buildTableBookingMessage()` (in `src/utils/whatsapp.js`) now produces:

```
🏛️ *Pearl Oasis — Table Booking Request*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hello! I would like to request a table at Pearl Oasis.

*Total Guests:* 4
*Kids:* 2
*Male:* 1
*Female:* 1
*Reservation Date:* Saturday, 7 November 2026
*Seating Time:* 6:45 PM (Dinner)
*Guest Name:* Ada Lovelace
*Telephone:* 0300 1234567
*Special Requests:* Window table, please   ← only when given

Please note: this is a booking request, not an automatically confirmed reservation.
My table is confirmed only once the restaurant replies to this message.

Thank you.
```

- URL-encoded via `encodeURIComponent` and opened with the existing
  `wa.me/<number>?text=…` helper using `VITE_WHATSAPP_NUMBER`
  (fallback unchanged: `923327515538`). No number was invented or changed.
- The guest must press Send; the fallback dialog repeats the
  "request, not confirmation" wording and offers Launch WhatsApp.

## Navigation & behavior

- Order is fixed: People → Date → Time → Details → Submit. Upcoming steps are not
  clickable; only completed steps can be jumped back to; forward movement happens
  exclusively through validated Continue clicks.
- One `formData` object in the parent component preserves every value across step
  changes; there are **no page reloads** (same SPA router as before).
- Failed re-validation focuses the first invalid field (input, or the step's
  focusable group block for counter/date/time steps); successful step changes focus
  the new heading; transitions use the existing `booking-step-panel` fade-rise
  animation (already registered in the reduced-motion block).

## Responsive & accessibility

- Centered `max-w-3xl` container; desktop uses multi-column layouts (composition
  cards, summary cards), mobile stacks everything with full-width Back/Continue.
- No horizontal overflow at 390 px (verified `scrollWidth ≤ 390` on every step).
- Tap targets ≥ 44 px: counters (44), date cards (≥ 64), time circles (≥ 48 at
  390 px), all action buttons.
- Labels/`aria-label`s on every control, `aria-pressed` on selectable cards and
  circles, `aria-current="step"` on the active stepper item, `role="status"` for
  live composition/date/time readouts, `role="alert"` for validation messages,
  `aria-invalid`/`aria-describedby` on inputs, focus-visible gold rings throughout,
  Escape-closing dialog with focus restore.

## Files changed

| File | Change |
|------|--------|
| `src/components/sections/BookATablePage.jsx` | Reworked 3-step → 5-step flow; numeric people step, date cards, time circles, simplified details, submit summary, updated stepper geometry, validation & focus logic |
| `src/utils/booking.js` | Added `GUEST_MIN`, `GUEST_MAX`, `getTomorrowDateString`, `formatShortDate`; removed now-unused `GUEST_OPTIONS`, `getGuestOptionLabel`, `DINING_AREAS` |
| `src/utils/whatsapp.js` | Message rebuilt for the new data shape (breakdown added; email and dining area removed) |
| `changes/booking-stepper-improvements.md` | This document |

**Dining Area** was removed from the flow (user-confirmed): the new five-step journey
has no slot for it — Details contains only name/phone/requests and the submit summary
list omits it — so the reservations host can ask for the seating preference during
WhatsApp confirmation. `router.js`, `App.jsx`, `Navigation.jsx`, `Footer.jsx`,
`index.css`, and all other sections are untouched by this change.

## Testing

`npm run lint` (tsc --noEmit) — **pass**; `npm run build` (vite build) — **pass**
(the existing chunk-size warning is unrelated).

Headless-Chrome CDP journey test against `vite preview` (SPA fallback verified):
**94/94 checks passed, zero console errors or page exceptions.**

| # | Required scenario | Result |
|---|-------------------|--------|
| 1 | Increase/decrease total guest count | Pass — increments, decrements, clamp at 1 and 20, disabled states |
| 2 | Change Kids/Male/Female counts | Pass — per-category counters, full-bundle + disabled |
| 3 | Composition always matches total | Pass — gap/overage status line, blocked Continue with exact error text, focus handling |
| 4 | Select Today | Pass — pressed state, readable date, error cleared |
| 5 | Select Tomorrow | Pass — pressed state, Today deselected |
| 6 | Select another date via calendar | Pass — card opens input, custom card pressed, readout shown |
| 7 | Past dates cannot be selected | Pass — `min` = today + validation error, Continue blocked |
| 8 | Select time with circular buttons | Pass — 10 circles, pressed state, readout, required before Continue |
| 9 | Date change clears invalid previous time | Pass — all circles unselected after date change |
| 10 | Details preserved when navigating back | Pass — Back through all four steps keeps counters, date, time, name, phone, notes; forward re-validates |
| 11 | Final booking summary | Pass — total + breakdown, formatted date, time, name, phone, notes; no email/dining rows |
| 12 | WhatsApp message generation | Pass — URL-encoded, `wa.me/923327515538`, every field present, request wording, no email/dining |
| 13 | Full flow desktop + mobile | Pass — desktop 1280×900 and mobile 390×844 journeys incl. dialog, focus, Escape, stepper states, overflow and tap-target checks |
| 14 | Lint + production build | Pass (both) |

Also verified: stepper jump-back from Submit, upcoming-step skip prevention, cross-page
`/#story` anchor regression, fresh state on re-entry, and screenshots of every step on
desktop and mobile (People, Date, calendar-open, Time, Details, Submit, dialog).
