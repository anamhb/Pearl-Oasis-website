# Dedicated /book-a-table Page with 3-Step Booking Stepper

## Overview

Replaced the single-page Table Booking form on the landing page with a dedicated **`/book-a-table`** route featuring a three-step booking stepper (Reservation Details → Guest Information → Review), inspired by the step-flow structure of the reference resOS booking experience (per-step headlines, numbered progress, back/next navigation — flow inspiration only; no Qissa branding, logo, or content was copied). Confirmation still submits through WhatsApp click-to-chat, and the landing page now ends after Testimonials.

---

## 1. Routing (no new dependency)

The project has **no router library** and none was added. A ~90-line history-API module provides the two routes:

- **[`src/utils/router.js`](src/utils/router.js)**
  - `useRoutePath()` — `useSyncExternalStore` over `window.location.pathname` (normalized for trailing slashes), re-rendering on `popstate` and a custom `pearloasis:routechange` event dispatched by `pushState`.
  - `navigate(to)` — client-side navigation; no-op when the target already is the URL.
  - `interceptInternalLinkClicks()` — document-level **bubble-phase** click handler. It takes over only links whose pathname differs from the current one (landing ↔ `/book-a-table`, and `/#section` links clicked from the booking page). Same-page hash links remain owned by the existing Lenis `AnchorScroll` (capture phase, SmoothScroll.jsx); external hosts, `tel:`, `mailto:`, `target="_blank"` and `download` links keep native behaviour. A same-path link without a hash is swallowed so it can never trigger a full reload of the current page.

- **[`src/App.jsx`](src/App.jsx)** renders `<BookATablePage />` for `/book-a-table` and the landing sections (minus the old form) for everything else. `Footer` and `Navigation` render on both routes.

- **Deep links**: Vite's SPA fallback serves `index.html` for `/book-a-table` in dev and `vite preview` (verified). Static hosting needs a rewrite of unknown paths to `index.html` (e.g. Netlify `_redirects`: `/* /index.html 200`, Nginx `try_files $uri /index.html`).

- **Scroll on route change**: a `useLayoutEffect` jumps to the top (or to the URL hash target, honouring the site's `scroll-margin-top`). Lenis caches its scroll limit and only re-measures on `ResizeObserver` (next frame), so the jump is preceded by a synchronous `lenis.resize()` — without it, navigating from the short booking page to the taller landing page clamps the scroll to the booking page's limit. (Found and fixed via CDP instrumentation; see Testing.)

---

## 2. The booking page & stepper

**Component**: [`src/components/sections/BookATablePage.jsx`](src/components/sections/BookATablePage.jsx)

```
[eyebrow: TABLE RESERVATIONS]
Book a Table                          ← h1 (Cormorant), short welcome copy

①──────────②──────────③              ← numbered stepper (labels on all sizes)
 Reservation   Guest     Review       ← completed = gold check, current = gold ring,
 Details     Information              upcoming = muted; gold track fills as you go
┌────────────────────────────────┐
│ STEP 1 OF 3                    │
│ <step heading>                 │  ← panel remounts per step (key={step}),
│ [fields / summary]             │    CSS fade-and-rise transition
│ [Back]            [Continue]   │
└────────────────────────────────┘
```

- **Step 1 — Reservation Details**: 2×2 desktop grid (stacked on mobile): Party Size dropdown, Date picker (`min` = today, plus a `Date cannot be in the past` validation fallback), Seating Time (lunch/afternoon/dinner/late slots), Dining Area (Grand Dining Hall, Family Dining Lounge, Chef's Robata Counter, Private Wine Salon). Required fields start **empty** with placeholder options so validation is meaningful; Continue is blocked until all four pass.
- **Step 2 — Guest Information**: Full Name\* (full width), Email\* | Telephone\*, optional Special Requests textarea. Same validation rules as the old form (name ≥ 2 chars, email regex, phone ≥ 7 digits). Back + Continue.
- **Step 3 — Review Your Booking**: two summary cards side-by-side on desktop (Reservation Details / Guest Details), stacked on mobile, each with an **Edit** button that jumps back to its step; a Special Requests card appears only when notes were given; a gold notice states that confirming sends a *request*, not a confirmation; cancellation policy note; **CONFIRM TABLE REQUEST** button.

**State & transitions**
- One `formData` state object lives in the page component, so every field survives Back/stepper jumps/review edits without persistence code.
- The panel is keyed by step (`key={step}`), so it remounts and replays `.booking-step-panel` (a 0.4s rise-and-fade defined in [`src/index.css`](src/index.css), disabled under `prefers-reduced-motion`).
- One `<form onSubmit>` routes by current step: Continue (steps 1–2) or Confirm (step 3). Enter works per step; nothing reloads the page.
- Validation blocks progression, shows `role="alert"` messages under the field, and moves focus to the first invalid input.
- On step change, focus moves to the new step heading (`tabIndex={-1}`); if a failed re-validation on review sends the guest back, focus lands on the invalid field instead (via a pending-focus ref).
- Stepper: `<nav aria-label="Booking progress">` + `<ol>`, `aria-current="step"` on the active item; **completed** steps are buttons (`Edit step N: …`) that jump back — forward movement is only possible through validated Continue clicks. The gold track is drawn behind the circles and transitions its width.

---

## 3. Navbar, footer & landing cleanup

- **[`src/components/ui/Navigation.jsx`](src/components/ui/Navigation.jsx)** — all four **BOOK A TABLE** / **Table Booking** entry points (desktop nav link, desktop gold CTA, mobile drawer link, mobile gold CTA) now point to `/book-a-table`. Gold styling, hover states, `min-h-11` tap targets and the mobile drawer close-on-click are unchanged. Section links became `/#story`, `/#signature`, `/#menu`, `/#experience`, `/#entrance` so they work from both routes (same-page clicks are still smooth-scrolled by Lenis; cross-page clicks are handled by the router).
- **[`src/components/sections/Footer.jsx`](src/components/sections/Footer.jsx)** — the Book a Table link points to `/book-a-table`; the other Explore links became `/#…` for the same reason. Everything else untouched.
- **Removed**: `src/components/sections/TableBooking.jsx` (the landing-page form) and `src/components/sections/ReservationSection.jsx` (its unused compat re-export). `<TableBooking />` is gone from `App.jsx`; the landing page now ends with Testimonials → Footer. No other landing section was modified.

---

## 4. WhatsApp request flow

Shared helpers (extracted from the old form):

- **[`src/utils/booking.js`](src/utils/booking.js)** — `TIME_SLOTS`, `DINING_AREAS`, `GUEST_OPTIONS`, `getGuestOptionLabel()`, `getTodayDateString()`, `formatReservationDate()` (local-timezone safe; "Friday, 20 November 2026").
- **[`src/utils/whatsapp.js`](src/utils/whatsapp.js)** — `buildTableBookingMessage()`, `getTableBookingWhatsAppUrl()`.

Message sent on confirm (URL-encoded into `https://wa.me/<number>?text=…`):

```text
🏛️ *Pearl Oasis — Table Booking Request*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hello! I would like to request a table at Pearl Oasis.

*Guest Name:* Lord Sterling Hayes
*Email:* sterling.hayes@pearl-oasis.com
*Telephone:* +44 20 7946 0912
*Party Size:* 2 Guests
*Reservation Date:* Friday, 20 November 2026
*Seating Time:* 7:30 PM (Dinner)
*Dining Area:* Grand Dining Hall
*Special Requests:* Window table, anniversary celebration   ← only when given

Please note: this is a booking request, not an automatically confirmed reservation.
My table is confirmed only once the restaurant replies to this message.

Thank you.
```

- **Before opening WhatsApp**: the whole booking (steps 1 + 2) is re-validated; if anything became invalid the guest is returned to the owning step with focus on the field.
- `window.open(url, '_blank', 'noopener,noreferrer')` runs synchronously inside the submit path (popup-blocker safe). The fallback dialog (**Request Ready for WhatsApp** / *Status: Pending Restaurant Confirmation*) repeats the summary and states: this is a **request**, the guest must press **Send**, and the table is confirmed only once the restaurant replies. It offers **Launch WhatsApp** (plain `<a href>` fallback) + **Close**, closes on Escape, and returns focus to the confirm button.
- Number resolution unchanged: `VITE_WHATSAPP_NUMBER` → fallback `923327515538` (documented in `.env.example`). No number was invented.

---

## 5. Accessibility & responsiveness

- Labels wired with `htmlFor`/`id` (React `useId`), `aria-required`, `aria-invalid`, `aria-describedby` pointing at each `role="alert"` error, `aria-current="step"` in the stepper, dialog with `role="dialog" aria-modal="true" aria-labelledby`.
- Keyboard: Enter submits the current step, Back/Edit/stepper buttons are real `<button>`s, Escape closes the dialog, focus is managed on step change and dialog open/close, gold `focus-visible` outlines on every interactive element.
- Responsive: centred `max-w-3xl` container; 2-column grids collapse to one column below `sm`; action rows stack (Back above primary button, full width) on phones; stepper labels wrap under their circles; all tap targets ≥ 44px (`min-h-11`); no horizontal overflow (verified `scrollWidth === 390` at 390×844).

---

## 6. Testing

| Check | Result |
| --- | --- |
| `npm run lint` (`tsc --noEmit`) | ✅ clean |
| `npm run build` | ✅ built, exit 0 |
| Dev server (`/book-a-table`) | ✅ 200, `index.html` + SPA fallback |
| `vite preview` (`/book-a-table`) | ✅ 200, built asset served |
| Headless-Chrome CDP journey test (51 assertions) | ✅ 51/51, no console errors or page exceptions |

Journey test covered: landing has no booking form → nav CTA routes SPA → h1/stepper state → `min=today` + past-date validation → empty step-1 blocks with 4 errors + focus → fill/advance → invalid email blocks with focus → Back preserves step 1 data → Continue returns with step 2 data → completed stepper step is clickable → review shows label/date/contact, no empty Special Requests → Edit jumps back, notes preserved → Confirm opens `wa.me/923327515538?text=…` containing every field + the request-not-confirmed wording → dialog copy/focus → Escape closes and restores focus → `/#story` link returns to the landing SPA and actually lands on `#story` (the Lenis `resize()` fix) → re-entry resets the stepper → 390px viewport: no overflow, ≥44px buttons, visible stepper captions.

Screenshots verified desktop (step 1, review, dialog) and mobile at 390×844 (clean step 1, validation errors, stacked review) — stepper alignment, states, stacked cards, and error placement all render as designed.

---

## 7. Files

**Created**
- `src/components/sections/BookATablePage.jsx` — page + stepper + steps + dialog
- `src/utils/router.js` — two-route history router + link interceptor
- `src/utils/booking.js` — booking constants, labels, date helpers
- `src/utils/whatsapp.js` — message builder + wa.me URL builder
- `changes/dedicated-booking-stepper.md` — this document

**Modified**
- `src/App.jsx` — routing, scroll-on-route-change, `<TableBooking />` removed
- `src/components/ui/Navigation.jsx` — 4 booking links → `/book-a-table`, section links → `/#…`
- `src/components/sections/Footer.jsx` — 1 booking link → `/book-a-table`, section links → `/#…`
- `src/index.css` — `booking-step-in` keyframes + `.booking-step-panel`, registered in the reduced-motion block

**Deleted**
- `src/components/sections/TableBooking.jsx`
- `src/components/sections/ReservationSection.jsx`

**Unchanged**: all other landing sections, `SmoothScroll.jsx`, footer content, `.env.example`, dependencies (none added).
