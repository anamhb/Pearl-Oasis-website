# Site refinements — nav, hero, Our Story, removed sections, tighter spacing

Date: 2026-10-18
Scope: six requested edits. No redesign of unrelated areas; no new dependencies.

## 1. Navbar links

- `src/components/ui/Navigation.jsx`
  - "Ambience" (→ `#spaces`) replaced by **"Testimonial"** (→ `#experience`).
  - "Press" link removed (it also pointed at `#experience`, so it was a duplicate).
  - Applied to **both** the desktop nav and the mobile drawer.
  - Result (both menus): Our Story, Featured Dishes, Menu, Testimonial (+ "Order Now").

Because `#spaces` was the only thing pointing at the removed ambience section, nothing links to it any more.

## 2. Hero eyebrow wording

- `src/components/3d/EntranceExperience.jsx`
  - `HAUTE CUISINE & ROBATA EMBERS` → **`FINE DINING & FLAME-GRILLED CUISINE`**
  - Same classes/tracking/colour, so the hero layout is untouched.
  - Easy to swap for another line if you prefer (e.g. "Fine Dining & Warm Hospitality").

## 3. Pale line between the navbar and the hero while scrolling

Cause found by measuring the hero canvas pixels: the header ends in a **fully transparent**
gradient (`from-black/80 via-black/40 to-transparent`), and the entrance footage has bright
highlights (ceiling lights) passing through the top band. Where the header stops being opaque,
those highlights showed as a pale seam for the seconds the relevant frames were on screen.

Fix — `src/components/3d/EntranceExperience.jsx` (new scrim next to the existing hero overlays):

```
<div className="absolute inset-x-0 top-0 h-48 pointer-events-none bg-gradient-to-b from-[#090a0c] via-[#090a0c] to-transparent" />
```

plus the safety net in `src/index.css`:

```
html { background-color: #08090a; }
```

The scrim is solid page-colour over the first 96 px (i.e. the whole header height, 104–120 px)
and fades out by 192 px, so header and hero meet in a smooth dark gradient instead of a hard
edge. It is placed **before** the `z-20` hero content, so the headline/eyebrow are not dimmed.

Correctness held by a DOM sweep: no light DOM element exists anywhere in the top 230 px at any
scroll position, so the seam was footage, not a stray border.

## 4. "Our Story" section

- `src/components/sections/WelcomeStory.jsx`
  - Section padding `py-24 sm:py-32` → **`py-14 sm:py-16`**.
  - Image is now **shrink-wrapped** (`w-fit mx-auto` frame) and scaled by height
    (`h-auto w-auto max-w-full max-h-[60vh] object-contain`) instead of `w-full … object-cover`.
    The whole photograph is visible in the viewport with no further scrolling, and it is never
    cropped (rendered ratio === natural ratio 0.75).
  - Frame corners: `rounded-xl rounded-tl-none rounded-br-none` → the **top-left and bottom-right
    corners are square** (flush with the gold corner accents), the other two stay rounded.
  - The "Grand Entrance / Kohat Sanctuary" caption card is **removed**.
  - The three heritage tags ("Authentic Pakistani Heritage", "Refined Chinese Specialties",
    "Artisan Fast Food") are **removed**; the now-unused `lucide-react` import was dropped.
  - Heading, paragraphs, ambient glows, corner accents and hover effect are unchanged.

Measured (image rendered size / does it fit above the fold / section height):

| viewport | nav | image | ratio kept | image fits | section + nav ≤ viewport |
|---|---|---|---|---|---|
| 1440×900 | 120 | 405×540 | yes | yes | 671+120 = 791 ✓ |
| 1366×768 | 120 | 346×461 | yes | yes | 592+120 = 712 ✓ |
| 1280×720 | 120 | 324×432 | yes | yes | 563+120 = 683 ✓ |
| 1280×662 | 120 | 298×397 | yes | yes | 562+120 (image itself still fits) |
| 390×844 | 104 | 334×445 | yes | yes | stacked layout |
| 360×640 | 104 | 288×384 | yes | yes | stacked layout |

No horizontal overflow at any of those sizes.

## 5. Removed sections

- `src/App.jsx`: `InteriorExperience` ("Sanctuary of Light & Shadow", `#spaces`) and
  `ReservationSection` ("Reserve Your Experience", `#reservations`) removed from the render
  tree and from the imports.
- The two component files were **left on disk** (unused, not imported, therefore not bundled) so
  nothing is destroyed — say the word if you want them deleted.
- Follow-on fix: the full-menu modal's "Reserve Table & Order" button pointed at `#reservation`
  (a broken link even before this change — the section id was `#reservations`). It now dials
  `tel:+9233277515538`, matching the footer. Change it back if you'd rather have something else.

## 6. Section spacing

Outer vertical padding reduced everywhere, so the empty band between two sections drops from
~256 px to ~128 px (content-to-content):

| section | before | after |
|---|---|---|
| Our Story | `py-24 sm:py-32` (96/128) | `py-14 sm:py-16` (56/64) |
| Featured Dishes | `py-20 sm:py-28` (80/112) | `py-12 sm:py-16` (48/64) |
| Menu — desktop header | `pt-12 pb-6` | `pt-8 pb-5` |
| Menu — mobile | `py-16 sm:py-20` | `py-12 sm:py-14` |
| Testimonials | `py-28` (112) | `py-14 sm:py-20` (56/80) |
| Footer | `pt-20 pb-12` | `pt-14 pb-10` |

Not touched on purpose: the 3D entrance walkthrough's own length (223 vh) and the menu's 360 vh
pinned-reveal track — those are scroll-driven animations, not empty gaps. Reducing them would
change the two effects you asked for earlier.

## Verification performed

- `npx tsc --noEmit` → exit 0.
- `npm run build` → succeeds (`✓ built`), 1688 modules, same asset list.
- Live DOM checks through the dev server (`http://localhost:3002`) at 1440×900, 1366×768,
  1280×720, 1280×662, 390×844, 360×640, using same-origin iframes so real media queries apply:
  - nav link labels/hrefs correct; no "Ambience"/"Press" nav items left;
  - `#entrance`, `#story`, `#signature`, `#menu`, `#experience` present;
    `#spaces` and `#reservations` gone;
  - story: image `complete`, natural 1086×1448, ratio preserved; computed radii
    `tl: 0px, br: 0px, tr: 12px, bl: 12px`; no "Grand Entrance", no heritage tags in the text;
  - paddings/gaps as tabulated above; footer `pt 56 / pb 40`;
  - no horizontal overflow anywhere; console: 0 errors, 0 warnings.
- The hero scrim was checked against the **actual canvas pixels**: with the top 96 px fully
  covered, the brightest highlight measured in that band (max luminance 199–241/255) becomes a
  flat 10/255; at the header's lower edge the reduction is ~233 → 42.

## Not verified (honest limitations)

- **No visual/screenshot check.** `browser.screenshot` fails in this environment ("Screenshot
  needs a visible tab" — the desktop window is occluded), so nothing here was confirmed by
  looking at rendered pixels. Everything above is numeric/DOM measurement.
- The scrim's final appearance is modelled arithmetically from the measured canvas pixels plus
  the gradient's alpha profile — a good approximation, not a photographic proof. If the top of
  the hero now looks too dark on your screen, the fix is one number: `h-48` (deeper) or `h-40`
  with `from-[#090a0c]/90` (lighter).
- Corner radius was verified via computed styles, not by eye.

## Round 2 — follow-up on the pale line, navbar height, image size

The line was reported as still present after round 1, so the diagnosis was redone from scratch.

**What the measurements ruled out.** With a `requestAnimationFrame` pump installed (the occluded
test window throttles frames, which had made earlier samples stale) the hero canvas was swept at
one scroll position every 20 px from 80 to 1300 px. In the visible band *below* the header
(rows 122–260) the longest contiguous bright run found anywhere was **64 px** — no full-width
bright line exists in the footage below the header. The genuinely line-like rows
(contiguous runs of 123–333 px) sit at rows ~46–92, i.e. **behind** the header, where they are
covered. So the footage was not the cause.

**Actual cause.** The scrolled header carried three things that can produce a 1 px light seam at
the element's edge in Chrome, all at once: `backdrop-blur-md` (a `backdrop-filter` on a
`position: fixed`, full-width element — its compositor layer edge is the classic "white line
under the sticky header" artifact), a 90 %-transparent background (bright footage could shine
through at the bottom edge), and `transition-all` animating the padding (the header resized
120 → 112 px while scrolling).

**Fix** — `src/components/ui/Navigation.jsx`:

```
fixed top-0 left-0 right-0 z-50 pt-5 pb-0.5 border-b
transition-[background-color,border-color,box-shadow] duration-300
  scrolled  -> bg-[#090a0c] border-[#2a261c] shadow-2xl      (opaque, no blur)
  at top    -> bg-gradient-to-b from-black/80 via-black/40 to-transparent border-transparent
```

- no `backdrop-filter` anywhere in the navbar;
- the scrolled panel is **fully opaque** page colour, so nothing behind it can ever shine
  through at its bottom edge;
- geometry is now constant (no padding change, border present in both states), so the header
  cannot resize while scrolling.

The hero top scrim from round 1 is kept as a second line of defence (it also guarantees the
region immediately under the header is never bright).

Verified in the live DOM at scrollY 600 with the scrolled class applied:
`backdrop-filter: none`, `background-color: rgb(9,10,12)`, height **103 px** — identical to the
height at scrollY 0.

**Navbar height** (request: shorter, without touching the 3D crest or the wordmark):

| | before | after |
|---|---|---|
| header at top of page | 120 px | **103 px** |
| header scrolled | 112 px | **103 px** |
| logo image | 130 × 80 px (≥640) / 104 × 64 px (<640) | **unchanged** |
| crest top inside header | 5.1 px | **5.1 px** |

The limit is physical: the 3D crest is absolutely positioned and overflows **15 px above** the
logo image (`CREST_STYLE` puts its bottom tip on the "l" ascender), so the top padding cannot go
below ~15 px without clipping the crest against the top of the viewport. The headline logo box
is 80 px tall and was left exactly as it was, so the saving comes entirely from the padding —
the upper padding stays at 20 px and the lower padding drops from 20 px to 2 px (the wordmark
PNG itself carries ~15 px of transparent space below the letters).

**Our Story image** (request: bigger width *and* height) — `max-h-[60vh]` → `max-h-[70vh]`,
still height-driven and uncropped, so both dimensions grow together (+17 % each):

| viewport | before | after | ratio kept | image fully visible |
|---|---|---|---|---|
| 1440×900 | 405 × 540 | **473 × 630** | yes | yes (630 ≤ 900−103) |
| 1366×768 | 346 × 461 | **403 × 538** | yes | yes (538 ≤ 768−103) |
| 1280×720 | 324 × 432 | **378 × 504** | yes | yes |
| 800×582 | 284 × 378 | **306 × 407** | yes | yes |
| 390×844 | 334 × 445 | **334 × 445** | yes | yes (width-bound, already max) |

At 1440×900 the picture now fills 473 px of its 496 px column. It stays uncropped
(rendered ratio === natural 0.75) and no horizontal overflow appears at any tested size.

Round-2 checks: `npx tsc --noEmit` → exit 0; `npm run build` → succeeds; console 0 errors and
0 app warnings (the only warning is `getImageData`/`willReadFrequently`, raised by this
measurement script, not by the site).

Note on the test environment (not a site bug): in the occluded test window Chrome throttles
scroll-event delivery to roughly one per second, so a "scrolled state" reading can look stale
unless an rAF pump or a synthetic `scroll` event is used. The measurements above used both.

## Round 3 — wider story image (supersedes the round-2 image table)

Request: increase the **width** of the image in the second section.

Because the picture is portrait (1086×1448, ratio 0.75) and must stay uncropped, its width
can only grow if its height cap grows or if its column gets wider. Two changes, both in
`src/components/sections/WelcomeStory.jsx`:

- height cap `max-h-[70vh]` → **`max-h-[80vh]`** (height keeps driving the width, so the
  width rises by the same ~14 %);
- the image column `lg:col-span-5 xl:col-span-5` → **`lg:col-span-6 xl:col-span-6`**
  (and the text column `7` → `6`; the text block is 433 px tall, far shorter than the
  picture, so the section height is still driven by the image). Without this the old
  496 px column would have clipped the new 540 px width at 1440.

Measured in the live DOM (nav height 103 px):

| viewport | round-2 width | **now** | height | column | ratio kept | image fully visible |
|---|---|---|---|---|---|---|
| 1920×1080 | 486 | **606** (column-bound) | 808 | 608 | yes | yes (808 ≤ 977) |
| 1440×900 | 473 | **540** | 720 | 608 | yes | yes (720 ≤ 797) |
| 1366×768 | 403 | **461** | 614 | 584 | yes | yes (614 ≤ 665) |
| 1280×720 | 378 | **432** | 576 | 541 | yes | yes (576 ≤ 617) |
| 1024×768 | — | **411** (column-bound) | 548 | 413 | yes | yes |
| 800×582 | 306 | **349** | 466 | 714 | yes | yes (466 ≤ 479) |
| 390×844 | 334 | **334** (already full column) | 445 | 336 | yes | yes |

Width is up ~14 % at every desktop size (and ~24 % at 1920), height grows with it, the
picture is still never cropped, and there is no horizontal overflow at any tested size.
It also still fits above the fold everywhere (the image's height stays under
viewport − 103 px); only the section's own padding overflows on 720–768 px-tall screens,
which the user prioritised below image size.

Checks: `npx tsc --noEmit` → exit 0; `npm run build` → ✓ built in 2.07 s; console 0 errors
and 0 app warnings.

## Round 4 — tighter gaps (story columns, menu paragraph → cards)

### Our Story: gap between image and text

The image is height-bound and centred inside its 6/12 column, so the visible gap was
**column slack + grid gap**: 97 px at 1440, 118 px at 1280, 64 px at 1920/1024.

- grid `gap-12 lg:gap-16` → **`gap-8`** (32 px, both axes, every breakpoint);
- the shrink-wrapped frame gets **`lg:mr-0`** (with `mx-auto` still in place below `lg`), so
  at desktop the picture sits flush against the 32 px gutter instead of floating in its column.

Measured frame-edge → text-edge: **32 px** at 1920, 1440, 1280 and 1024 (was 64 / 97 / 118 / 64).
Below `lg` (stacked) the vertical gap is now 32 px (was 48 px). Image sizes are unchanged
(540×720 at 1440, 432×576 at 1280; 622×829 at 1920 where the slightly wider column now
binds), ratio still exactly 0.75, no horizontal overflow.

### Menu: gap between the intro paragraph and the cards

On desktop the intro sits in normal flow and the cards live inside a `100vh` sticky child
that centres its content, so the gap was intrinsic: `intro padding + stage top padding +
half the leftover slack` → **342 px at 1080-tall, 252 at 900, 186 at 768, 162 at 720,
119 at 582** (measured).

Two changes in `MenuExperience.jsx`:

- intro `pb-5` → **`pb-2`** (20 → 8 px), and the mobile intro `mb-8` → **`mb-5`**;
- the desktop pinned track is pulled up under the intro by a **bounded, viewport-aware**
  margin: `mt-[min(0px,max(-14vh,calc(340px-50vh)))]`.

The margin is chosen so the pull is exactly "whatever space exists between the intro and
where the cards sit while pinned, minus 24 px", capped at 14vh and clamped to 0 on short
screens. Because the pull acts on the track in normal flow, it changes the **entry** gap
only — the pinned composition stays exactly where it was (content top 322 px at 1080,
232 at 900, 142 at 720, verified) and the cards never move above the fixed navbar.

| viewport | paragraph → cards before | **after** | pinned content top (unchanged) |
|---|---|---|---|
| 1920×1080 | 342 | **179** | 322 |
| 1440×900 | 252 | **130** | 232 |
| 1280×720 | 162 | **130** | 142 |
| 1024×768 | 186 | **130** | 166 |
| 800×582 | 119 | **107** (pull clamps to 0; only the padding gain) | 99 |

At 800×582 the cards already sit 4 px under the navbar while pinned (pre-existing), so no
pull is applied there — that is the geometric floor: the 100vh pinned stage cannot put the
cards higher without hiding the first row behind the fixed 103 px navbar.

Checks: `npx tsc --noEmit` → exit 0; `npm run build` → ✓ built in 9.41 s; no horizontal
overflow at 1920/1440/1280/1024/800/390.

## Round 5 — story image spacing balanced

Round 4 right-aligned the picture to kill the text gap, which moved it *off* the left side
(the left space grew from 34 px to 68 px inside its column). Round 5 replaces "flush to the
gutter" with a **balanced** placement:

- the shrink-wrapped frame is centred in its column again (`mx-auto`, no `lg:mr-0`),
- it is then nudged right by **half the gutter** — `lg:translate-x-4` (16 px) — which is
  exactly what makes the space on the left equal the space on the right.

Measured (space from the column's left edge vs. space from the frame to the text):

| viewport | left space | text gap | balance delta |
|---|---|---|---|
| 1920×1080 | 16 | 16 | 0 |
| 1440×900 | 57 | 57 | 0 |
| 1280×720 | 78 | 78 | 0 |
| 1024×768 | 16 | 16 | 0 |

The delta is 0 at every desktop size: the image now sits with the same breathing room on
both sides. Below `lg` (stacked) nothing is nudged — the image is simply centred and the
vertical gap is 32 px. Image sizes, 0.75 ratio, above-the-fold visibility and the absence of
horizontal overflow are all unchanged.

Trade-off stated honestly: the two spaces are now equal, so on a mid-size screen they are
57 px each — the left is wider than the 34 px of round 3 and the right is wider than the
32 px of round 4, but neither side is lopsided any more. The only way to shrink *both* is a
larger picture (the height cap is the binding limit), which is a one-line change if wanted.

## Round 6 — hero frames zoomed out (REVERTED)

A contain-fit + blurred-ambient-fill version of `computeFrameRect()` was implemented here and
then reverted at the user's request. The hero is back to the original **cover** fit with the
dynamic focal pan: `scale = Math.max(boxW/srcW, boxH/srcH)`, `focusY` interpolating 0.35 → 0.48
with scroll, `progressRef` restored, no ambient layer.

Verified after the revert at 800×582: the canvas is sharp in every band (per-band detail
8.7–16.5, i.e. no blurred surround), the cover fit is 1035×582 (77% of the frame width visible,
matching the pre-change measurement exactly), loader gone, 0 console errors, no horizontal
overflow. `npx tsc --noEmit` clean and `npm run build` ✓.

For the record, the reverted approach and why it was tempting: cover is the *minimum* scale that
fills the hero, so the perceived "zoom" was the crop a 16:9 frame needs on a differently shaped
hero (77% width visible at 800×582, 90% at 1440×900, 26% on a portrait phone). Showing the whole
frame therefore required filling the remainder with a blurred copy of the same frame, which is
what the user rejected.

## Round 7 — hero frames slightly dimmed + "Enter Restaurant" now actually navigates

Two small changes, both in `EntranceExperience.jsx`.

1. **Video frames dimmed a little.** The canvas got `opacity-90`. The hero container behind it
   is `bg-[#090a0c]`, so the footage now blends 10% toward the page colour — a gentle dim that
   leaves the frames' own contrast intact. Nothing else in the stack (gradients, vignette, text,
   loader) changed.

2. **"Enter Restaurant" navigation was genuinely broken — this was a real bug, not a tweak.**
   The button sits inside the primary hero content layer, whose class list carried
   `pointer-events-none` in its static part *and* `pointer-events-auto` in its `scrollProgress < 0.25`
   branch. Both classes end up in the DOM, and Tailwind emits `pointer-events-none` after
   `pointer-events-auto`, so the computed value on that layer was **`none`** — measured live:
   `wrapperPointerEvents: "none"`. Clicks never reached the button.
   Fix: `pointer-events-auto` added to the button itself (a descendant `auto` re-enables the
   subtree). Measured after: button `pointer-events: auto`, and `document.elementFromPoint()` at
   the button's centre now returns the `BUTTON` instead of the layer.
   (Not changed: the redundant `pointer-events-none`/`auto` pair on that layer. It is latent
   confusion, but removing the static `none` would make the full-hero overlay catch clicks, so
   the minimal fix was preferred. Say the word if you want it tidied.)

   The handler was also switched from `scrollIntoView({ behavior: 'smooth' })` to an explicit
   target that subtracts the fixed header, because `scrollIntoView` lands the section's top at
   y=0 — i.e. **behind** the 103px navbar, which would have hidden the "Sanctuary of Hospitality"
   eyebrow. Verified by intercepting the call: clicking the button now calls
   `window.scrollTo({ top: 1459.39, behavior: 'smooth' })`, and the story section's document top
   is 1562 with a 103px header — exactly section top minus header.

Checks: `npx tsc --noEmit` clean, `npm run build` ✓ (5.26 s), 0 console errors / 0 app warnings
after a fresh reload. Caveat: this sandbox blocks programmatic scrolling (window.scrollY stays 0)
and screenshots, so the scroll target was verified numerically by intercepting `window.scrollTo`
rather than by watching the page move.

## Round 8 — hero frames dimmed further

`opacity-90` → **`opacity-75`** on the hero canvas (same single-class change as Round 7, one step
further). The footage now blends 25% toward the `#090a0c` hero background.

Verified live after a fresh reload: canvas `opacity: 0.75`, hero background `rgb(9, 10, 12)`,
canvas painted, no horizontal overflow, 0 console errors; the "Enter Restaurant" fix from
Round 7 is unaffected (still `pointer-events: auto` and hit-testable).
`npx tsc --noEmit` clean, `npm run build` ✓ (8.36 s).

## Round 9 — hero frames raised back up (0.75 was too dark)

`opacity-75` → **`opacity-95`**. 0.75 read as too dark, so the frames are now only 5% blended
toward the `#090a0c` background — essentially full brightness with just a touch of softening
(the "little bit" from the original request).

Verified live after a fresh reload: canvas `opacity: 0.95`, hero `rgb(9, 10, 12)`, canvas painted,
no horizontal overflow, 0 console errors, "Enter Restaurant" still hit-testable.
`npx tsc --noEmit` clean, `npm run build` ✓ (1.63 s).

Opacity history for this canvas: 1.0 (original) → 0.90 → 0.75 → **0.95 (current)**.

## Round 10 — hero frames back to full opacity

`opacity-95` → the class removed, i.e. **opacity 1.0**. The dimming experiment is fully undone;
the hero footage renders exactly as it originally did.

Verified live after a fresh reload: canvas opacity `1`, canvas class back to
`absolute inset-0 w-full h-full block outline-none bg-[#090a0c]`, sampled painted pixels are at
full strength (e.g. rgb(255, 239, 180) on the lit signage), "Enter Restaurant" still hit-testable,
no horizontal overflow, 0 console errors. `npx tsc --noEmit` clean, `npm run build` ✓ (1.63 s).

Net effect of rounds 7–10 on the hero: the only surviving change is the **"Enter Restaurant"
navigation fix** (pointer-events + explicit scroll target). Opacity is back to 1.0.

## Follow-ups you may want (not done, not requested)

- The second Our Story paragraph still reads "…authentic Pakistani heritage, refined Chinese
  specialties, and artisan fast food…" in prose. Only the tag pills were removed, to avoid
  wrecking the sentence. Say the word and I'll reword it.
- The story image `alt` still says "Pearl Oasis Restaurant Entrance in Kohat".
- Code comment file name in `InteriorExperience.jsx`/`ReservationSection.jsx` is now dead code.
- Footer social icons still use the placeholder `href="#social"`, and the footer bottom line still
  says "Culinary and address details are editable placeholders".
- Testimonials scroll length (~4.3 viewports for 5 sticky cards) is inherent to the stack
  animation; it is not empty space but it is a long scroll if you want it shortened.
