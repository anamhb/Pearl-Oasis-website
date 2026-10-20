# Our Story — scroll-driven frame sequence (`/public/video-frames-P2`)

## What changed

| File | Change |
| --- | --- |
| `src/components/sections/WelcomeStory.jsx` | The static interior photograph was replaced by a pinned, scroll-driven frame sequence built from `public/video-frames-P2` (56 frames, `ezgif-frame-001` … `-056`, 1280×720). The two-column layout became a full-width stage: the frame fills the section (contained, never cropped) with the existing story copy overlaid bottom-left. |
| `src/components/3d/EntranceExperience.jsx` | `handleEnterClick` now honours `data-scroll-align="top"`. Sections that reserve header space internally land flush with the viewport top instead of being pushed another header-height down. |

`App.jsx` is untouched (`<WelcomeStory />` takes no props). The old image import and the `imageSrc` prop (never passed) were removed; the PNG asset is left in place, just no longer referenced.

## How it works

* **Structure:** `section#story` → track (`height: 100vh + 56 × 2.5vh = 240vh`) → `sticky top-0 h-screen` stage → `<img>` + scrims + copy.
* **Pinning:** the stage is `position: sticky; top: 0`, so it stays fixed while the 240vh track scrolls past, then unpins and the next section moves up normally. No scroll libraries, no GSAP.
* **Frame index:** `progress = clamp01(-track.getBoundingClientRect().top / (track.offsetHeight - innerHeight))`, `index = round(progress × 55)`. At 800×582 that is 815px of pinned travel (~14.6px per frame), 140vh of pinning.
* **Header clearance:** the stage has `pt-[103px]` (the fixed header height) so the entire frame sits below the navbar rather than under it.
* **Rendering:** a single `<img>` whose `src` is swapped imperatively from the scroll handler. Only one bitmap is ever decoded, so this costs a fraction of the hero canvas (which retains all 56 `Image` objects). Frames are cache-warmed in idle batches of 6 via `fetch`, so swaps are instant without holding 56 decoded bitmaps.
* **Fit:** `object-contain` — the full 16:9 frame is always fully visible, letterboxed against the `#090a0c` page colour. No crop, no zoom.
* **Progress hairline:** a 1px gold line at the bottom of the stage, `scaleX(progress)`, written directly to the DOM.

## Verified live (Chromium, dev server `localhost:3002`, 800×582)

| Measurement | Value |
| --- | --- |
| Track height | 1397px (240vh) |
| Pinned travel | 815px |
| Stage | `sticky`, `top: 0`, `padding-top: 103px`, 582px tall |
| Frame area | 794×479 → painted 794×447 (full width, whole frame) |
| Copy block | 365px tall, y 177→542, fully inside the stage |
| Horizontal overflow | none |
| Console errors | 0 |

Frame mapping observed by driving the scroll position (measurement shim, since the window cannot be scrolled while hidden):

| progress | frame |
| --- | --- |
| 0.00 | `ezgif-frame-001.jpg` |
| 0.10 | `ezgif-frame-007.jpg` |
| 0.33 | `ezgif-frame-019.jpg` |
| 0.66 | `ezgif-frame-037.jpg` |
| 0.99 | `ezgif-frame-055.jpg` |
| 1.00 | `ezgif-frame-056.jpg` |

`naturalWidth` = 1280 for every frame checked, i.e. the images really load and paint.

**Navigation:** the hero's "Enter Restaurant" now reports `scrollTo({ top: 1299 })`, and `#story`'s absolute top is `1299` — the section lands flush with the viewport top, so the first frame starts exactly 103px below the navbar with no empty band. The navbar's own `#story` anchor behaves the same way natively.

`npx tsc --noEmit` clean, `npm run build` ✓ (2.47s).

## Notes / limitations

* **Aspect mismatch:** a 16:9 frame in a non-16:9 viewport is letterboxed with page-coloured bands (e.g. 16px top/bottom at 800×582, ~90px at 1440×900, ~260px top/bottom on a 390×844 phone). That is the price of "complete view"; switching `object-contain` to `object-cover` fills the stage but crops the frame.
* **Copy over footage:** the copy overlays the lower-left of the stage with two gradient scrims. At 800×582 it covers roughly the lower 60% of the frame; on a tall desktop the footage dominates more.
* **Header inset is hardcoded** as `103px` in the stage's `pt-[103px]`; it matches the fixed header, which is a constant height across breakpoints.
* **Pin length** is `2.5vh` per frame (140vh). One constant, `STORY_SCROLL_VH_PER_FRAME`, changes it.
* The copy is unchanged from the previous version: same eyebrow, heading and three paragraphs.
