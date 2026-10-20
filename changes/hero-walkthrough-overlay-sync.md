# Hero — one continuous scroll-driven walkthrough (entrance → dining room)

Supersedes the previous autoplaying-video approach in this file. The hero is scroll-driven
again, and the two halves of the walk now live in **one** frame sequence, one pinned stage and
one progress value.

## Black screen at the end — root cause and fix

The folder holds **299** frames (`ezgif-frame-001` … `ezgif-frame-299`), not 300. The component
still used `FRAME_COUNT = 300`, so the last step of the scroll asked for
`/video-frames-final/ezgif-frame-300.jpg`. That file no longer exists; the dev server answers with
its SPA fallback — `200 text/html` (index.html) — which cannot be decoded as an image, so the
`<img>`'s bitmap was discarded and the stage's `#090a0c` background showed through: the black
screen at 100 % progress.

(`dist/video-frames-final/` still contains a 300th frame from an earlier build, which is how the
count went from 300 to 299 without any code noticing.)

Fix:

1. `FRAME_COUNT` is now **299**, so `round(progress × 298)` tops out at index 298 →
   `ezgif-frame-299.jpg`, the real last frame.
2. The index is clamped to `0 … FRAME_COUNT - 1` before it is used.
3. Frame rendering is double-buffered: two stacked `<img>` layers alternate, and the next frame
   only replaces the visible one once it has decoded. This was necessary because a single `<img>`
   stops painting the moment its `src` changes (measured: luma 0 during the swap) — so any slow
   request showed a blank card.
4. A failed request (`onerror`) leaves the current frame on screen instead of clearing it, and
   allows the next scroll to retry. A missing/renamed frame can therefore never black out the hero.

## Overlay visibility pass — the frames were being crushed

The stage stacked four darkening layers over footage that already averages 82–118 luma out of 255.
At the edges the combined alpha reached ≈91 %, and a solid `#090a0c` block covered the top 96 px
(below the 103 px header, so almost all of it was visible). The frame was effectively readable only
in a small central window, at 60 % of its own brightness.

| Layer | Before | After |
| --- | --- | --- |
| Flat tint | `bg-black/40` | `bg-black/10` |
| Full-height gradient | `black/60 → transparent → black/80` | removed |
| Vignette | `transparent 35% → rgba(9,10,12,0.85)` | `transparent 58% → rgba(9,10,12,0.40)` |
| Text scrim (entrance) | — | **new**: ellipse `48% 38%` at centre, `0.36 → 0.20 → transparent` (80 %); fades out with the entrance copy |
| Text scrim (dining) | — | **new**: bottom-anchored band `h-19rem`, ellipse `62% 78%` at `50% 48%`, `0.50 → 0.30 → transparent` (86 %); fades in with the dining copy |
| Top blend | `h-48`, solid `#090a0c` to ~96 px, gone by 192 px | `h-32`, `0.92 → 0.50 → 0` (58 %), gone by 128 px |
| Bottom fade | part of the full-height gradient (80 %) | `h-[36%]`, `0.62 → 0.18 → 0` |

The bottom fade is now its own short gradient, so the lower half of the frame is no longer
darkened. All five layers keep `pointer-events-none`; the two frame `<img>` layers were given
`pointer-events-none` as well, so only the copy layers can receive clicks.

Measured by compositing the real frames with the before/after stacks in a canvas (800×582,
`object-cover`, mean luma over eight sample points):

| Frame | Raw | Before | After |
| --- | --- | --- | --- |
| 001 (entrance) | 118.9 | 40.7 | **75.5** |
| 100 | 82.2 | 34.8 | **58.3** |
| 162 (dining cut) | 68.9 | 25.2 | **46.4** |
| 220 | 105.8 | 36.3 | **72.0** |
| 299 (final) | 99.2 | 39.4 | **64.1** |

At the exact centre the composite is deliberately left as bright as before (41.9→43.8,
24.9→27.1, 71.0→71.9): that is where the copy sits, and the scrim is what keeps it legible. The
gain is over the rest of the frame — edges, corners, top and bottom — where the old stack was
between 70 % and 91 % black. A visual before/after composite confirmed the doors, floor, wall
lights, tables, chafing dishes and food are clearly recognisable in both phases.

## Dining copy moved to the bottom of the stage

"The Grand Dining Hall" and "Continue to Our Story & Menus" used to sit dead centre, exactly where
the frame was most interesting. They now sit in the lower band of the pinned stage, so the hall,
the tables and the food are unobstructed through the whole dining half of the walk.

* Container: `justify-center` → `justify-end`, bottom padding `pb-10 / sm:pb-12 / md:pb-16`
  (40 / 48 / 64 px). Heading, wording, typography, CTA target and the 20 px entry offset are
  unchanged; only the anchor moved.
* The entrance scroll cue ("UNFOLD THE STORY" + mouse) used to occupy exactly that bottom strip.
  It now clears out over the first 20 % of the dissolve (`opacity = 1 - mix / 0.2`), long before
  the dining heading is readable, so the two "continue" affordances are never legible at once.
* Each phase now carries **its own** contrast scrim instead of one centre scrim doing both jobs:
  the centre ellipse is tied to `1 - mix`, the bottom band to `mix`, both written in the same
  `update()` pass as the frames and the copy opacity. So the middle of the frame is left clear
  as soon as the entrance copy is gone, and the bottom band is clear while the entrance copy is up.
* The bottom band is pinned to the bottom edge in px (the copy is positioned in px, not %), so it
  stays behind the copy at every viewport height — a percentage-anchored ellipse drifted away from
  the text on tall screens.
* Both new layers are `pointer-events-none`; the CTA hit test is unchanged.

Measured positions (dining phase at rest):

| Viewport | Copy block | Gap below block | Share of stage height |
| --- | --- | --- | --- |
| 800×582 | 397 → 518 px | 64 px | bottom 68 → 89 % |
| 390×844 | 728 → 804 px | 40 px | bottom 86 → 95 % |

What sits above the copy — the tables, the booths, the chafing dishes — is no longer covered by
either the text or the scrim: the centre sampling band (y 150–330) measures 60–128 luma across
frames 162→299, i.e. the footage at its own brightness.

### Contrast behind the moved copy

Composited over the real frames at 800×582 with the dining stack (`mix = 1`). Gold script sampled
against `#d4af37`-family luminance (170), label against `#ffd875` (225); large text needs 3:1,
the 12 px label needs 4.5:1.

| Frame | Script background | Script contrast | Label background | Label contrast |
| --- | --- | --- | --- | --- |
| 162 | 75.1 | **3.8 : 1** | 83.1 | **5.9 : 1** |
| 200 | 22.9 | **7.7 : 1** | 16.6 | **14.5 : 1** |
| 220 | 22.7 | **7.7 : 1** | 70.1 | **7.2 : 1** |
| 260 | 82.0 | **3.4 : 1** | 66.4 | **7.6 : 1** |
| 299 | 80.1 | **3.5 : 1** | 61.5 | **8.2 : 1** |

The last frames are the hardest case: the walk ends on a close-up of the chafing dishes, so the
copy sits over warm, bright food. The band keeps them at ≥3.4:1 instead of the ≈1.8:1 they would
have had over the un-scrimmed footage — and because the band ends by 86 % of its radius, the
bottom corners and the whole upper frame stay at their un-scrimmed brightness.

## What changed and why

| File | Change |
| --- | --- |
| `src/components/3d/EntranceExperience.jsx` | Rebuilt as a scroll-driven frame sequence over the merged frame set (299 frames on disk). Removed the `<video>`, `play()`, `currentTime` sync, autoplay, loop and the 100vh-only structure. |
| `src/components/sections/WelcomeStory.jsx` | The independent `video-frames-P2` scroll animation was removed; the section keeps all of its copy and is now a static two-column editorial block with the original interior still. |
| `changes/hero-walkthrough-overlay-sync.md` | This report. |

No other file changed. `App.jsx`, `Navigation.jsx`, `#entrance`, `#story`, the fixed 103 px header
and every CTA destination are untouched.

`public/video-frames-final/pearl-oasis-walkthrough.mp4` (created for the previous attempt) is **not
referenced anywhere** and is never requested by the page. It was left on disk rather than deleted;
it can be removed without affecting anything.

There is no Git repository in the project (`git rev-parse` fails), so the earlier implementation
could not be restored from history. The scroll behaviour was reconstructed from the project's own
existing pattern — a tall track, a `sticky top-0 h-screen` stage, `getBoundingClientRect()`
progress, `<img>` frame swapping and idle-time cache warming — which is exactly what
`WelcomeStory`/`MenuExperience` used before this change.

## The single timeline

| Constant | Value | Meaning |
| --- | --- | --- |
| `FRAME_COUNT` | 299 | `public/video-frames-final/ezgif-frame-001…299.jpg`, 1920×1080 |
| `SCROLL_VH_PER_FRAME` | 0.765 vh | 299 × 0.765 = 228.7 vh of pinned travel |
| Track height | `100 + 228.7` = **328.7 vh** | 1913 px at an 800×582 viewport |
| `DINING_ROOM_FRAME` | **161** (0-based; 1-based 162) | first dining-room frame |
| `TRANSITION_HALF_WIDTH` | 0.04 progress | ±~53 px of scroll around the cut |

Progress is `-track.getBoundingClientRect().top / (track.offsetHeight - innerHeight)`, clamped to
0…1. Frame index is `round(progress × 298)`, so progress 0 → frame 001 and progress 1 → frame 299.

The 0.765 vh figure is not arbitrary: the original 56-frame entrance hero travelled 2.2 vh per
frame (≈123 vh). The merged set samples the same footage ≈4.2× more densely, so 161 frames ×
0.765 vh ≈ 123 vh — the entrance now takes exactly as much scrolling as it used to, and the
dining room adds ≈105 vh on top rather than resetting anything.

Measured mapping (synthetic scroll, 800×582):

| Progress | Frame | Content A | Content B |
| --- | --- | --- | --- |
| 0.00 | 001 | 1.00 | 0.00 |
| 0.10 | 031 | 1.00 | 0.00 |
| 0.25 | 076 | 1.00 | 0.00 |
| 0.50 | 150 | 1.00 | 0.00 |
| **0.5403 (boundary)** | **162** | **0.50** | **0.50** |
| 0.5585 | 168 | 0.16 | 0.84 |
| 0.65 | 195 | 0.00 | 1.00 |
| 0.80 | 239 | 0.00 | 1.00 |
| 1.00 | **299** | 0.00 | 1.00 |
| back to 0.00 | 001 | 1.00 | 0.00 |

## Boundary

Frame 162 (1-based) was confirmed before this change by matching the two source sequences against
the merged set (Part 1 matches merged 1→159, Part 2 starts at merged 163), by the largest
inter-frame difference in the whole sequence (161→162) and visually (frame 161 is still outside
the glass doors, 162 is inside the hall). That boundary is reused verbatim.

## Synchronisation and transition

Both the frame and the copy come from the same `progress` value in the same `update()` call:

* **Frames** — the index is only written when it changes, so scrolling in either direction simply
  sets the earlier/later source. The previous frame stays painted until the next decodes, so there
  is never a blank card.
* **Copy** — `mix = smoothstep(clamp01((progress - (boundary - 0.04)) / 0.08))`.
  Entrance layer: `opacity 1 - mix`, `translateY(-14px × mix)`.
  Dining layer: `opacity mix`, `translateY(20px × (1 - mix))`.
  Pointer events follow the dominant layer (`mix < 0.5` → entrance, otherwise dining), so an
  invisible overlay can never swallow a click.
* The dissolve is centred on frame 162, so the dining copy is already half-in at the exact cut and
  fully in ~53 px later — never both headings at full strength, never a hard swap.
* Scroll events are coalesced into one rAF pass; the listener re-posts on every event (instead of
  early-returning on a pending frame) so it cannot wedge if the browser skips a frame.
* `prefers-reduced-motion` keeps the frames (the user drives them) but swaps the copy abruptly
  with no translate.

## Loading / performance

* Two stacked `<img>` layers alternate (double buffer) — never all 299 decoded bitmaps in memory
  (299 × 1920×1080 would be ≈2.5 GB). The hidden layer holds the incoming frame, the visible one
  holds the last good frame.
* The first 12 frames are fetched immediately; the remaining 287 trickle in during idle time in
  batches of 6 via `requestIdleCallback`, so normal scrolling rarely waits on the network.
* No `<video>`, no autoplay, no timers, no `currentTime`, no MP4 request.
* `object-cover` + `object-center`: the 16:9 frame fills the stage without stretching; on the
  800×582 test viewport it renders 794×582.
* Cleanup removes the scroll/resize/media-query listeners, cancels the pending rAF and stops the
  warm-up loop.

## Verification

| Check | Result |
| --- | --- |
| `<video>` elements on the page | **0** (no mp4 requested) |
| Hero frame loaded | `ezgif-frame-001.jpg`, natural 1920×1080, `object-fit: cover` |
| Track height / stage | 1913 px, stage `position: sticky`, `top: 0px`, 582 px tall |
| Frame mapping | 0→001, 0.10→031, 0.25→076, 0.50→150, 0.5403→162, 0.65→195, 0.80→239, **1.00→299** |
| End of animation | visible frame `ezgif-frame-299.jpg`, natural 1920×1080, sampled luma 100.5 (not black) |
| Requests for `ezgif-frame-300` | **none** |
| Failed-frame guard | with the hidden layer pointed at a missing file, the visible frame kept painting (luma 104.9) and the next scroll recovered |
| Backward scroll | frame 001 and content A restored |
| Copy mix | 1.00/0.00 → 0.50/0.50 at the cut → 0.00/1.00 |
| Pointer events | A `auto` while dominant, B `none`; reversed after the cut |
| Overlay layers | 6 decorative layers, all `pointer-events: none`; frame `<img>` layers also `pointer-events: none` |
| Overlay stack (computed) | tint `rgba(0,0,0,0.10)`; entrance scrim `0.36/0.20/0` (centre); dining scrim `0.50/0.30/0` (bottom band); vignette `0.40` from 58 %; bottom fade `36 %`; top blend `128 px` |
| Phase scrims | progress 0 → entrance 1.00 / dining 0.00; 0.54 → 0.51 / 0.49; 0.70 → **0** / **1** (exact complements of the copy opacity) |
| Dining copy position | 800×582: block 397→518 px, 64 px above the bottom; 390×844: 728→804 px, 40 px above the bottom; always inside the viewport |
| Entrance cue clearance | cue fades `1 → 0.24 → 0` at progress 0 → 0.52 → 0.54 (gone before the dining heading passes 50 % opacity) |
| CTA hit test (entrance) | `document.elementFromPoint` on the button centre → `BUTTON` / "Enter Restaurant" |
| CTA hit test (dining) | centre → `SPAN` / "The Grand Dining Hall", inside the CTA button (clickable) |
| Frame brightness | mean luma 40.7→75.5 (001), 25.2→46.4 (162), 39.4→64.1 (299) against the old stack |
| Mobile 390×844 (iframe) | header 87 px, heading/paragraph/button all inside the viewport, no horizontal overflow, overlays still full-height; dining block 728→804 px, scrim band 540→844 px behind it |
| "Enter Restaurant" target | 1810 = `#story` top (1913) − header (103) |
| Our Story section | 568 px tall, copy intact, no `sticky`/animation children |
| Horizontal overflow | none |
| Console errors | 0 |
| `npx tsc --noEmit` | clean |
| `npm run build` | ✓ |

### Test limitation

The harness keeps the browser tab hidden, and Chromium freezes both programmatic scrolling
(`window.scrollTo` stays at 0) and rendering in hidden tabs. Frame/copy synchronisation was
therefore verified by stubbing `getBoundingClientRect()` on the track and dispatching `scroll`
with a synchronous `requestAnimationFrame`, at ten progress positions in both directions. The
Our Story image is `loading="lazy"` and stays unrequested in a hidden tab; its URL was verified
directly (`200`, 1086×1448) and will load normally when scrolled into view.

Because a screenshot was not possible (tab hidden), overlay brightness and legibility were checked
by reproducing the CSS stack in a canvas over the real frames at 800×582 and rendering before/after
composites — with and without the hero copy drawn over them. Those composites are the source of the
luma table above, not luminance estimates.

A real visual pass — scrolling the whole hero in a visible window — is still worth doing by hand.
