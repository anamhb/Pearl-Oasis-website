# Mobile performance & testimonial film framing

Scope: Hero, Our Story and Testimonials on phones. Desktop, tablet layout, copy,
palette, card design, animation timing and the video source are unchanged.

> **Update — the testimonial video band was reverted on request.** The portrait
> 16:9 band described in §2.4 is no longer in the code; the film is back to
> full-section `object-cover` on every screen. The Hero, Our Story and crest
> performance work below is unaffected. See
> `changes/revert-mobile-testimonial-video-band.md`.

---

## 0. What the three sections actually are

| Section | Implementation | Continuous work? |
| --- | --- | --- |
| Hero (`EntranceExperience`) | 299 JPEG frames (`public/video-frames-final`, 1920×1080, 15.07 MB), scroll-driven through two stacked `<img>` layers. No `<video>`, no Three.js, no GSAP, no rAF loop. | Only while scrolling (scroll → rAF → one style pass). |
| Our Story (`WelcomeStory`) | 56 JPEG frames (`public/video-frames-second`, 1280×720, 2.0 MB), same two-layer scrub. | Only while scrolling. |
| Testimonials (`Testimonials`) | One Cloudinary `<video>` (1280×720, 8 s, 1.8 MB) behind a CSS-only sticky card deck. Playback already gated by `IntersectionObserver` + `prefers-reduced-motion`. | Video playback only while the section is near. |

There is no scroll hijacking (no Lenis/GSAP smooth scroll) and no WebGL in
either scrub section. The only continuous WebGL on the page is the navbar’s 3D
crest, which the fixed header keeps on screen for the whole hero — see §2.4.

---

## 1. Why it felt laggy (identified from the code, then measured)

### 1.1 Everything was downloaded on every device, immediately

* Hero: `warmBatch(11)` followed by 6 frames per idle callback → **all 299
  frames / 15.07 MB** were queued on first paint, phones included.
* Story: a mount effect created **56 `new Image()` objects**, i.e. the whole
  2 MB sequence, at the same moment.

On a phone this puts the radio, the image cache and the decode queue under load
exactly while the user is scrubbing, and the frame the user is actually looking
at competes with ~20 prefetches for the same (HTTP/1.1, 6-connection) pipe.

### 1.2 Every frame was decoded on the paint path

Both sections revealed a frame from `img.onload`. `onload` means the **bytes**
arrived; the 1920×1080 bitmap (8.3 MB in RGBA) is still decoded when it first
paints, on the main thread. During a scrub that is a synchronous decode per
frame — the classic single-frame stutter on mobile.

### 1.3 Both scroll handlers ran for the whole page

The listeners are global. Scrolling anywhere in the ~16 000 px document ran
both sections’ `update()`, including `track.offsetHeight` (a layout read on a
3.3-viewport element) plus six style writes, even with the stage ten viewports
away. The story’s `schedule()` also posted a new rAF on every scroll event
without checking for a pending one, so a touch burst could run `update()` 4–8
times in the same frame.

### 1.4 The fixed header’s 3D crest never stops rendering

`Crest3D` runs `requestAnimationFrame` forever, with `antialias` and
`preserveDrawingBuffer: true` (a full buffer copy per frame), for a **17×30 px**
canvas. Because the header is fixed, this loop runs during the entire hero on a
phone.

> These are the causes visible in the implementation. No CPU profile was taken
> on a physical phone, so this is “cause identified by inspection + measured
> request counts”, not a flame graph.

---

## 2. Changes

### 2.1 `src/components/3d/EntranceExperience.jsx`

* **Sliding warm-up window on narrow/touch viewports** (`warmWindow`): 4 frames
  behind and 16 ahead of the current frame, refilled as the scrub advances, with
  a `Uint8Array(299)` so nothing is fetched twice. Initial burst is 6 frames
  instead of 11-then-everything. Desktop keeps the original progressive warm-up.
* **Decode before reveal**: `onload` → `img.decode()` → swap. The swap is now a
  compositor-only change. A rejected decode falls back to the old behaviour.
* **Layout values cached** (`measure()` on mount/resize) instead of
  `track.offsetHeight` every scroll frame.
* **IntersectionObserver gate** (`rootMargin: 50%`): once the stage is a
  viewport away, the scroll handler returns without measuring or writing.
* No change to `FRAME_COUNT`, `SCROLL_VH_PER_FRAME`, `DINING_ROOM_FRAME`, the
  dissolve, the copy, or the `prefers-reduced-motion` branch.

### 2.2 `src/components/sections/WelcomeStory.jsx`

* Same windowed warm-up (3 behind / 9 ahead) and decode-before-reveal.
* Mobile warms 8 frames at mount instead of 56; desktop still warms all 56.
* `schedule()` now keeps **one** pending rAF (`if (rafRef.current) return`).
* Cached `offsetHeight` + IntersectionObserver gate, as in the hero.
* Frame order, scrub mapping, copy and reduced-motion behaviour untouched.

### 2.3 `src/components/brand/BrandWordmark.jsx`

* Narrow/touch only: render the crest at **~30 fps** (angle remains time-based,
  `1.35 rad/s`; ~140 samples per turn) and cap the buffer at **1.5× DPR** instead
  of 2×. Desktop still renders every frame at 2×.
* Dropped `preserveDrawingBuffer` (nothing reads the canvas back).
* `resize()` now skips no-op passes at an unchanged size/DPR, so the 10-second
  safety-net interval no longer reallocates the drawing buffer ~50 times.

### 2.4 `src/components/sections/Testimonials.jsx` + `src/index.css`

The clip is 16:9 with the biryani centred and four miniature chefs spread to
either side; the subject spans roughly **22%–75% of the frame width**.

* `object-cover` in a `100vh` portrait wrapper keeps
  `(390/844) / (16/9) = 26%` of the width → x ≈ 37–63% → **the bowl only**.
  `object-position` cannot help: the chefs are outside that slice on *both*
  sides, so no offset can contain them.
* **Portrait phones with ≥701 px of height** now render the film at its natural
  aspect as a band pinned at `top: 5.5rem` (under the 87 px header). 100% of the
  frame width is visible, no stretch, no new asset. The full-height seam
  gradients (112 px each) are replaced by a 12%/12% mask so the band blends into
  the section; the vignette is off in the band.
* The card deck is untouched — same panels, same 50vh centre line, same stagger
  and stacking.
* Landscape phones (844×390) already show the full frame width with the old
  full-height crop, so they are excluded. Tablets (≥768 px) and desktop are
  excluded. 320×568 and 375×667 are excluded: the centred card leaves 6–75 px
  between header and card there, so a band would be invisible; those screens
  keep the previous framing rather than gain a non-functional one.

Measured crop width of the source frame:

| Viewport | Before | After |
| --- | --- | --- |
| 390×844 | 26% | **100%** (band 390×219, 179 px visible above the pinned card = 82%) |
| 375×812 | 26% | **100%** (band 375×211, 155 px visible = 73%) |
| 430×932 | 26% | **100%** (band 430×242, 223 px visible = 92%) |
| 844×390 landscape | 100% | 100% (unchanged) |
| 1440×900 desktop | 90% | 90% (unchanged) |
| 320×568 / 375×667 | 32% | 32% (unchanged, card leaves no room) |

Video source, `object-fit`, `scale-[1.015]`, brightness/saturation/contrast
filters, autoplay gating and `preload="metadata"` are unchanged.

---

## 3. Verification

### 3.1 Actually rendered, scrolled and screenshotted

Headless Chromium 151 (the Chromium bundled with this environment) at exact
device metrics, mobile emulation on for the phone sizes, navigated to the dev
server, then scrolled with `window.scrollTo()` in steps and captured with
`Page.captureScreenshot`. The clip was seeked (`currentTime`) so a real decoded
frame is in every testimonials screenshot.

| Viewport | Result | Evidence |
| --- | --- | --- |
| 390×844 | Hero scrub: frame 001 at the top, then 047 → 109 → 171 → 232 → 299 at y = 300 / 700 / 1100 / 1500 / 2000, every visible layer `naturalWidth 1920`; the sequence clamps on its last frame. Copy still on screen. | `changes/evidence/hero-390x844-scrub.jpg` |
| 390×844 | Our Story scrub advanced to frame 053, then 056 at the end of the track; both copy beats visible. | `changes/evidence/story-390x844.jpg` |
| 390×844 | Film band 384×219 at y 88; bowl **and all four chefs** visible; card stacks over the band’s bottom ~40 px. | `changes/evidence/testimonials-390x844.jpg` |
| 375×812 | Band 369×211, 155 px visible above the card; full composition. | `changes/evidence/testimonials-375x812.jpg` |
| 430×932 | Band 424×242, 223 px visible; full composition. | (same run) |
| 320×568 / 375×667 | Old full-height crop (no mask, no band) — unchanged. | `changes/evidence/testimonials-320x568.jpg` |
| 844×390 landscape | Full-bleed film unchanged; chefs visible on both sides of the card. | `changes/evidence/testimonials-844x390-landscape.jpg` |
| 1440×900 | Desktop testimonials unchanged (full-bleed, no mask, two-column deck). Desktop hero still at frame 001 on load. | `changes/evidence/testimonials-1440x900.jpg` |

A geometry composite of the old vs new crop (real clip frame, measured layout,
placeholder card) is in `changes/evidence/testimonial-crop-before-after.jpg`.

### 3.2 Measured, but not visual

Network/DOM probes from the same renders (same code that the browser executes):

* Hero requests at mount, 390×844: **7** (frame 1 + 6 warmed) instead of the
  whole 299-frame queue.
* Story requests at mount, 390×844: **8** instead of 56. At 1440×900 the story
  still requests **56** — desktop path confirmed unchanged.
* `document.documentElement.scrollWidth` equals `innerWidth` at 320, 375, 390,
  430, 844, 1024 and 1440 → no horizontal overflow introduced.
* Computed styles confirm the band only where intended (`position: sticky`,
  `top: 88px`, `aspect-ratio: 16/9`, mask applied) and none anywhere else.
* No page exceptions in any run; the only console entry is the pre-existing
  `favicon.ico` 404.
* `npx tsc --noEmit` clean; `npm run build` ✓.

### 3.3 Code-reviewed only — not measured on a device

* **Smoothness / FPS on a real phone.** Scrolling here was programmatic, on
  desktop-class hardware, with software rasterisation — it exercises the same
  scroll → rAF → decode → swap path, but it is not a frame-pacing measurement.
  I am **not** claiming the lag is “fixed”; the claim is that the avoidable work
  (15 MB of eager prefetch, per-frame main-thread decode, page-wide scroll work,
  a full-rate WebGL loop in the header) has been removed and that the sequences
  still play through correctly.
* The benefit of `img.decode()` and of the IntersectionObserver gating (no
  metric collected; behaviour verified only as “frames still advance”).
* The 30 fps crest cap (canvas is 17×30 px; visual difference expected to be
  imperceptible, not verified on hardware).
* `prefers-reduced-motion` branches (untouched, but not re-tested this pass).
* iOS Safari (100dvh, `mask-image`), real touch momentum, low-end Android.

---

## 4. Remaining issues / notes

* **375×667 and 320×568 keep the old crop** (bowl, one chef’s edge). The card is
  centred on 50vh and these screens leave 6–75 px above it; showing the full
  composition there would require moving the card deck, which is outside this
  task. Say the word if you want the deck nudged down on short phones.
* On 390×844 the band’s bottom ~40 px sits behind the pinned card (the
  composition is fully readable above it). Taller phones at 430×932 show 92% of
  the band.
* No mobile-resolution copy of the 299-frame hero sequence exists. The other
  folders (`video-frames`, `video-frames-P2`, `video-frames-second`) are
  different sequences at 1280×720, so the hero still uses the 1920×1080 set —
  only the amount fetched at once changed. Generating a 960×540 set would cut
  the bytes roughly in half but adds ~300 files; not done without approval.
* The full desktop hero prefetch is unchanged, so scrolling back to the top
  after a long scroll can briefly keep the last dining-room frame while frame
  001 loads (pre-existing behaviour; the mobile window makes this less likely
  on phones).
* Pre-existing, untouched: footer `href="#social"`, “editable placeholders”
  line, long mobile testimonial deck, menu one-line descriptions, unused
  `InteriorExperience.jsx` / `ReservationSection.jsx` / `pearl-oasis-walkthrough.mp4`.
* Changes are uncommitted; no git repo.
