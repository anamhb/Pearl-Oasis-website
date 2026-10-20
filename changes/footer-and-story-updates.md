# Footer (logo, EXPLORE, hours, contact) + Our Story image

Scope: the footer section and the single image in the Our Story section (`#story`).
Nothing else was touched — navbar logo/animation, hero/entrance, menu, testimonial
stack, reservation section, layout and animations are unchanged.

## Files changed

| File | Change |
| --- | --- |
| `src/components/brand/BrandWordmark.jsx` | `Crest3D` and `BrandWordmark` accept `animate` (default `true`). With `animate={false}` the crest is rendered once (and on resize) and **no animation-frame loop is started**. Navbar call site unchanged, so its rotation is untouched. |
| `src/components/sections/Footer.jsx` | New logo (same asset/treatment as the navbar, static crest); EXPLORE reduced to 4 links; opening hours replaced with the 3 requested service periods; address replaced; phone replaced by a `tel:` link; email row, `Mail` icon import and `PearlOasisFullLogo` import removed. |
| `src/components/sections/WelcomeStory.jsx` | Only line 2: the image import now points at `../../assets/images/Warm Modern Restaurant Interior.png` (`displayImage` = that asset, `imageSrc` prop still honoured). |
| `changes/footer-and-story-updates.md` | This report. |

No new dependencies, no other file changed.

## 1. Footer logo and brand name

The navbar logo is `BrandWordmark` = `logo-text.png` (cursive gold "Pearl Oasis"
wordmark) plus the 3D crest (`PO-logo.glb`) sitting above the "l" of "Pearl".
The footer previously rendered a *different* logo (`PearlOasisFullLogo` → SVG
`PearlOasisEmblem` + script-font text). The footer now renders the same
`BrandWordmark` component, so it uses the identical asset and brand treatment —
but with the crest's animation disabled:

```jsx
<div className="flex items-start">
  <BrandWordmark animate={false} />
</div>
```

`Crest3D` only calls `startLoop()` when `animate` is true (the model's single
render inside `resize()` is the static frame, and `preserveDrawingBuffer: true`
keeps it). The navbar keeps its default (`animate` = true) and still spins.

## 2. EXPLORE links

Exactly four links, in the requested order, pointing at sections that exist:

| Link | Target | Section |
| --- | --- | --- |
| Our Story | `#story` | `WelcomeStory` |
| Featured Dishes | `#signature` | `SignatureDishes` |
| Menu | `#menu` | `MenuExperience` |
| Testimonials | `#experience` | `Testimonials` |

Plain hash links, matching the existing convention (and the navbar's own
targets). `html { scroll-behavior: smooth }` is unchanged, so the movement is
smooth. No extra links in that column.

## 3. Opening hours

The previous two placeholder rows and the "Monday: Private Salon Bookings Only"
note were replaced by the three requested entries, in the same
icon + title (`text-white font-medium`) + value (`text-neutral-500`) structure:

- **Daily Hours** — Mon – Sun: 2:00 PM – 11:00 PM
- **Lunch and Afternoon Service** — Mon – Sun: 2:00 PM – 5:00 PM
- **Dinner and Evening Service** — Mon – Sun: 5:00 PM – 11:00 PM

Wording, order and en-dashes are exactly as supplied (verified character by
character).

## 4. Location and contact

- **Address:** `Kohat City Centre, near KDA Gate No. 1, Kohat, Khyber Pakhtunkhwa, Pakistan` — wraps naturally (2 lines at 320, 390, 768 and 1440 px).
- **Phone:** `+92 332 7515538`, now a clickable `tel:+923327515538` link (styled like the other footer links, incl. the gold hover).
- **Email:** completely removed — row, text, `mailto:` target and the `Mail` icon import are all gone; nothing is left in its place (the column keeps its original `space-y-2` / `pt-1` rhythm).

Typography and hierarchy preserved: same `h4` headings ("Explore", "Opening
Hours", "Sanctuary Location"), same `text-xs font-sans` body, same gold icons.

## 5. Our Story image

`src/assets/images/Warm Modern Restaurant Interior.png` exists and is now the
default image of `#story`. `src` renders as
`/src/assets/images/Warm%20Modern%20Restaurant%20Interior.png` (natural size
1086 × 1448) and the `<img>` element itself is untouched — same classes
(`w-full h-auto object-cover object-center max-h-[600px] transition-transform
duration-700 group-hover:scale-[1.02]`), so aspect ratio and responsive
behaviour are unchanged. The old file (896 × 1200) had the same 3:4 ratio, so
rendering is identical in kind: 0.75 ratio up to 768 px, and at 1440 px the
pre-existing `max-h-[600px]` clamp + `object-cover` crop applies exactly as before.

## Verification

### Build / static checks (ran locally)

- `npx tsc --noEmit` → exit 0.
- `npm run build` (vite) → exit 0, 1688 modules transformed; the new asset is
  emitted as `dist/assets/Warm Modern Restaurant Interior-DRRk84nu.png`
  (2,304,396 bytes), which proves the import resolves.

### Browser checks (real Chromium, dev server on `http://localhost:3002`)

| # | Check | Result |
| --- | --- | --- |
| 1 | Footer logo asset vs navbar | Identical: both `src` = `/src/assets/images/logo-text.png`, both natural 636 × 392, both `alt="Pearl Oasis"`. Footer has 1 crest canvas and 0 `svg[aria-label="Pearl Oasis Emblem"]` (old logo gone). |
| 2 | Footer logo static / navbar not | React fiber props: footer `BrandWordmark` = `{animate: false}` → its `Crest3D` = `false`; navbar `BrandWordmark` = `{}` → its `Crest3D` = `true`. |
| 3 | Live rotation behaviour | 6 canvas samples over 2.0 s on the loaded page: footer crest = **1 distinct frame**, navbar crest = **3 distinct frames**. |
| 4 | A/B of the flag itself | Mounted `animate={false}` and `animate={true}` side by side in an rAF-pumped frame: over 8 samples/2.1 s the static one produced **1** distinct frame (identical hash while it re-rendered 12× from the 200 ms safety net) and the rotating one **8** (draws 226 → 378). The static frame was byte-identical to the live footer's frame and to the live navbar's frame 0. |
| 5 | Logo sizing / alignment / clipping | img 129.78 × 80 at the column's left edge, crest 20.75 × 37.75 centred over the "l" and 14.9 px above the wordmark, fully inside the footer (`overflow: visible`). Responsive: 103.8 × 64 / crest 16.6 × 30.2 (320, 390 px) and 129.8 × 80 / crest 20.8 × 37.8 (768, 1440 px). |
| 6 | EXPLORE links | 4 links, exact order/text, `#story` / `#signature` / `#menu` / `#experience`, all targets present. Clicking each landed precisely on that section (scrollY = 1299 / 2707 / 3660 / 8061 = each section's document top, section at viewport top). |
| 7 | Opening hours text | All three titles and all three time ranges present exactly (U+2013 en-dashes), old placeholder text absent, each line fits on one line with no clipping at 320/390/768/1440. |
| 8 | Address / phone / email | Address and `+92 332 7515538` present; `tel:` = `tel:+923327515538`; footer contains 0 `@`, 0 `mailto:` links, 0 `.lucide-mail` icons. |
| 9 | Our Story image | Rendered `src` = the new asset, natural 1086 × 1448, `complete: true`, class list unchanged, no distortion (0.75 ratio at 320/390/768 px). |
| 10 | Layout / console | No horizontal overflow at 320/390/768/1440 or on the loaded page (documentElement scrollWidth === clientWidth); after a fresh reload the console holds only the standard React DevTools info line: **0 errors, 0 warnings**. |

### Not verified (stated plainly, not claimed)

- **No pixel/screenshot confirmation.** `browser.screenshot` fails with
  "Screenshot needs a visible tab" — the desktop window is occluded — so the
  footer/logo/hours/photo were verified structurally and behaviourally (DOM,
  computed values, canvas pixels, geometry), not by looking at a rendered image.
- **The smooth-scroll animation itself.** In this occluded window the page is
  driven at ~1 frame/s, so a smooth scroll cannot complete. Link correctness was
  verified by clicking each link with the CSS animation temporarily bypassed
  in-page (`documentElement.style.scrollBehavior`, no file change, restored to
  `smooth` immediately after) — the browser navigated to the right section every
  time, and `scroll-behavior: smooth` is still what is computed on `<html>`.

## Deliberate non-changes / possible follow-ups

1. The `<img>` for Our Story still carries `alt="Pearl Oasis Restaurant Entrance
   in Kohat"`, the caption badge still reads "Grand Entrance / Kohat Sanctuary",
   and there is a code comment "Left Column: Restaurant Entrance Image". The
   brief was to replace *only* the image, so these were left untouched — they now
   describe a photo the section no longer shows.
2. The same `<img>` keeps its pre-existing `onError` fallback to
   `/images/restaurant-entrance.jpg`. It only fires if the bundled asset genuinely
   fails to load (the import is build-verified), so it is dead code in practice —
   left in place rather than changing unrelated behaviour.
3. The footer's bottom line still says "Culinary and address details are editable
   placeholders"; with a real address and phone in the footer that sentence is now
   stale, but it was not part of the request.
4. `PearlOasisFullLogo` and `PearlOasisWordmark` in `BrandAssets.jsx` no longer
   have any importer (the footer was the only one). The exports were left in the
   file instead of deleting public components.
5. The phone number was made clickable (`tel:`) — permitted by the brief ("if the
   phone number is clickable, use the correct `tel:` link") and a mobile win; it
   keeps the existing type/size and only adds the footer's standard gold hover.
