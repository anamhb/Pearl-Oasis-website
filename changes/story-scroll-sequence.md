# Our Story — scroll-scrubbed kitchen sequence

The second section (`#story`) used to be a static two-column editorial block: copy on the left, one
still interior photograph in a rounded card on the right. It is now a pinned, full-bleed frame
sequence that scrubs on scroll, with the section's copy overlaid on the footage in two beats.

Only `src/components/sections/WelcomeStory.jsx` changed. `App.jsx`, the hero, the nav, the header,
the menu sections and the footer are untouched, and `#story` still sits exactly where it was in the
page flow (immediately after the hero, before `SignatureDishes`).

## The sequence

| Item | Value |
| --- | --- |
| Frames | `public/video-frames-second/ezgif-frame-001…056.jpg` — 56 files |
| Size | 1280 × 720, 26–113 KB each, ≈2 MB for the set |
| Frame at progress 0 → 1 | `001` → `056`, index `round(progress × 55)` |
| Scroll per frame | 2 vh |
| Track height | `100 + 56 × 2` = **212 vh** (1484 px at 1000×700, 1789 px at 390×844) |
| Pinned travel | 112 vh (784 px at a 700 px viewport) |

The stage is `sticky top-0 h-screen` inside that track, so the section pins the moment its top
reaches the viewport and stays pinned for the whole sequence; the last frame is reached exactly as
the track ends, and only then does the page continue scrolling into the menu.

The frames are **full-bleed** — `object-cover object-center` across the whole stage, not a column
on the right. The 16:9 source is cropped on the sides at narrower aspect ratios, never stretched.

## Copy: two beats, both persistent

The text is no longer stacked above the footage. It is overlaid on it, driven by the same progress
value as the frames:

| Beat | Content | Window | After |
| --- | --- | --- | --- |
| 1 — left | "Sanctuary of Hospitality" eyebrow, "Our Story", first paragraph | in as the section comes up the viewport (`(innerHeight − trackTop) / 0.45 × innerHeight`), plus `0.02 → 0.12` of the scrub | stays until the section releases |
| 2 — bottom right | flavour paragraph (+ the sanctuary closing line) | `0.46 → 0.62` of the scrub | stays until the section releases |

Beat 1 starts fading in while the section is still rising (it is at 0.63 when the track top is
500 px below the viewport top and fully in by 350 px), so it is already in place — not blinking in
late — when the stage pins. Beat 2 comes in roughly halfway through, so the first half of the
sequence is watched with only the left copy and the second half carries both.

Both blocks are `pointer-events-none`, have no interactive content, and are placed with flex
containers so the reveal transform never fights the layout transform.

### Type scale

The copy was deliberately enlarged after the first pass, so it reads as an editorial statement
rather than a caption. Both sides now use the **same scale and the same italic treatment** — the
mismatch (right side larger and upright) read as a mistake rather than a hierarchy:

| Text | Mobile | ≥ 640 px | ≥ 1024 px | Style |
| --- | --- | --- | --- | --- |
| Eyebrow | 11 px | 14 px | 14 px | Cinzel, uppercase |
| "Our Story" | 36 px | 48 px | 60 px | upright |
| First paragraph | 16 px | 18 px | 20 px | italic |
| Flavour paragraph | 16 px | 18 px | 20 px | italic |
| Closing line | 16 px | 18 px | 20 px | upright, muted |

The closing line keeps the size but drops the italic and uses the dimmer `#c2baac`, so it reads as
a coda without breaking the parity. Block widths are `max-w-[21rem] / md / xl` on the left and
`21rem / lg / xl` on the right.

Measured layout (no overlap at any progress):

| Viewport | Left block | Bottom-right block | Gap | Header clearance |
| --- | --- | --- | --- | --- |
| 1000×700 | y 128 → 364, x 32 → 480 | y 469 → 660, x 450 → 962 | 105 px | 25 px below the 103 px header |
| 768×1024 | y 128 → 364, x 32 → 480 | y 793 → 984, x 218 → 730 | 429 px | 25 px below the 103 px header |
| 1280×800 | y 144 → 374, x 80 → 656 | y 533 → 744, x 618 → 1194 | 159 px | 41 px below the 103 px header |
| 390×844 | y 112 → 311, x 20 → 356 | y 618 → 812, x 28 → 364 | 307 px | 25 px below the 87 px header |

The blocks overlap horizontally on wide screens (the right block reaches past the left block's
edge) but never vertically, so no text ever sits on top of other text. The right block is measured
at rest; while it is still hidden it sits 18 px lower (the entry transform), which stays inside
its own bottom padding and never reaches the next section.

The third paragraph ("Pearl Oasis is a sanctuary for families…") was not in the requested split;
it is kept as the closing line under the flavour paragraph rather than deleted, so no copy from the
old section is lost. Say the word if it should go.

## Readability

The footage is already dark (mean luma 48–70), so the grade is light: a 10 % flat tint, a left wash
(`0.66 → 0.34 → 0` across 78 % of the width), a bottom-right ellipse (`62 % × 48 % at 100 % 100 %`,
`0.70 → 0.34 → 0`), and the same 128 px top blend the hero uses under the header. Nothing covers
the middle of the frame — the chef and the flame stay at their own brightness.

Measured by compositing the real frames with the actual CSS stack (1000×700, `object-cover`),
sampling the two copy blocks:

| Frame | Left block luma | Left contrast | Right block luma | Right contrast |
| --- | --- | --- | --- | --- |
| 001 | 29.9 | **13.6 : 1** | 54.6 | **9.3 : 1** |
| 014 | 32.4 | **13.2 : 1** | 52.1 | **9.7 : 1** |
| 028 | 34.6 | **12.9 : 1** | 43.9 | **10.9 : 1** |
| 042 | 42.7 | **11.6 : 1** | 68.3 | **7.6 : 1** |
| 056 | 54.5 | **9.8 : 1** | 55.9 | **9.2 : 1** |

Text is `#f0e9dd` / `#ece4d7` (luma ≈ 232 / 227) with the same drop shadows the hero uses; the
brightest specular highlights behind letter gaps peak at 1.2–2.4 : 1, which the shadow carries.

## Loading

* All 56 frames are warmed on mount (`new Image()`), 2 MB in total, so the scrub is not waiting on
  the network.
* Two stacked `<img>` layers double-buffer the swap: the next frame loads hidden and only replaces
  the visible layer once it has decoded. A failed request keeps the current frame and retries on
  the next scroll — the stage can never go blank.
* No `<video>`, no autoplay, no timers; the sequence advances only with scroll position.
* Scroll/resize listeners are coalesced into one rAF pass, and both listeners plus the pending rAF
  are removed on unmount.
* `prefers-reduced-motion` keeps the scrub (the user drives it) and swaps the copy reveals with no
  translate.

## Verification

| Check | Result |
| --- | --- |
| Frame count on disk | 56 (`001`…`056`), all `200 image/jpeg`, 26–113 KB |
| Frame mapping | 0→001, 0.05→004, 0.12→008, 0.30→018, 0.46→026, 0.55→031, 0.62→035, 0.80→045, **1.00→056** |
| Stage | `position: sticky`, `top: 0`, height = viewport; track 212 vh |
| Section height | 1484 px at 1000×700; 1789 px at 390×844 |
| Copy reveal | left 0 → 0.63 → 1.00 as the track clears 700 → 500 → 350 px; right 0 → 0.16 at p 0.50 → 1.00 at p 0.62 |
| Copy overlap | none (105 px gap at 1000×700, 159 px at 1280×800, 307 px at 390×844) |
| Copy parity | left and right paragraphs both 16 / 18 / 20 px, both italic; closing line same size, upright and muted |
| Copy under header | left block starts 25 px below the fixed header (41 px at 1280×800) |
| `<video>` elements | 0 |
| Console errors | 0 |
| `npx tsc --noEmit` | clean |
| `npm run build` | ✓ (8.8 s; the old interior PNG is no longer imported, so it drops out of the bundle) |

### Test limitation

The harness keeps the browser tab hidden, so Chromium freezes programmatic scrolling and rendering.
The pin/scrub was therefore verified by stubbing `getBoundingClientRect()` on the track and
dispatching `scroll` with a synchronous `requestAnimationFrame` at nine positions, plus real
`offsetHeight` / computed-style checks of the sticky stage. Brightness and legibility were checked
by reproducing the CSS stack in a canvas over the real frames and rendering a composite with the
copy drawn on top. A real scroll-through in a visible window is still worth doing by hand.

## Files

| File | Change |
| --- | --- |
| `src/components/sections/WelcomeStory.jsx` | Rewritten: static two-column block + interior still → 212 vh sticky track, full-bleed scroll-scrubbed 56-frame sequence, two-beat overlaid copy, local scrims, double-buffered images. |
| `changes/story-scroll-sequence.md` | This report. |

`src/assets/images/Warm Modern Restaurant Interior.png` is no longer referenced by any component.
It is still on disk and can be deleted if the file is not wanted.

## 2026-10-20 — responsive follow-up

The two-beat copy is unchanged on desktop and portrait phones. On landscape
phones (and on 320px-wide screens, where the narrow column wraps into many more
lines) the beats were overlapping; they are compacted below 560px of height or
below 360px of width via `.story-beat--primary` / `.story-beat--secondary` in
`src/index.css`. The second frame layer also gained the `src` it was missing.
Measurements are in `changes/responsive-audit.md`.
