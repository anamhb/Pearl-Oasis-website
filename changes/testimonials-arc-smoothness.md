# Testimonials arc: smooth tween, lighter updates, mobile video

Date: 2026-10-27

Section: `#experience`, "Words of Appreciation".

This revision changes the carousel's motion and update path, plus the background
video source for phones. The heading, five placeholder entries, disclosure, arc
geometry, card surfaces, arrows, keyboard controls, drag/swipe, autoplay,
live-region content and `#experience` anchor are unchanged. No dependency was
added.

## Root causes

1. **The old motion had no fixed end.** It moved a fraction of the remaining
   distance every frame (`1 - exp(-delta * 10)`), so it started fast, crawled
   through the last few pixels and only stopped when the distance was below
   `0.001`. Its state commit was tied to card boundaries rather than a defined
   end.
2. **The render loop owned React state.** `render()` checked the rounded card
   every frame and called `setActiveIndex` whenever it changed, so React
   re-rendered the section at card boundaries during the animation instead of
   letting the frame loop write straight to the DOM.
3. **Card props changed on every parent render.** The card ref was an inline
   arrow function and the selection callback was recreated each render, so the
   five cards could not be memoized reliably.
4. **Height-only resizes re-measured the arc.** The resize path measured on any
   `resize` event. Mobile browser chrome changing height could therefore
   schedule unnecessary geometry work even though the stage width had not moved.
5. **The CSS had no transform/opacity transition conflict, but the video layer
   was not fully explicit.** Card transitions were already limited to
   `border-color` and `box-shadow`; there was no `transition: all` and no
   transform/opacity transition to remove. The film already had
   `pointer-events: none`; the video itself did not, and the film was not
   explicitly promoted with `translateZ(0)`.
6. **Phones loaded the desktop video.** The section used one 3,835,991-byte
   source with no poster. A phone had to fetch and decode that desktop source
   before the background could show a frame.

## What changed

### Motion and state

- `DURATION_MS = 650` and `easeInOutCubic` replace the exponential easing.
- `tweenRef` holds `{ from, to, start }`. `startAnimation()` cancels any active
  frame, starts from the current rendered position, sets the start timestamp on
  the first frame, interpolates over 650ms, writes the exact target on the final
  frame, then commits the active index.
- `render()` writes each card's transform, opacity, visibility, z-index, pointer
  events and cursor directly to the DOM. It also toggles the static
  `testimonial-card--active` / `testimonial-card--side` classes based on the
  rounded position. It no longer calls `setActiveIndex`.
- `commitActive()` updates `activeIndex` only when the rounded position differs
  from the committed index. It runs when a tween completes, on an immediate
  reduced-motion move, and when a non-animated drag settlement ends.
- The card element now has the static class `testimonial-card`. React owns that
  class string; `render()` owns the active/side additions.
- `TestimonialCard` is wrapped in `memo`. The parent passes a stable
  `setCardRef`; each card builds a stable ref callback and a stable click
  callback. `handleSelect` is a stable callback backed by a latest-ref, so the
  cards do not receive a new selection function on every render.
- `lastInnerWidthRef` is initialized before the first `measure()` and is updated
  by the resize handler. A resize with an unchanged `window.innerWidth` returns
  without scheduling measurement; an actual width change updates the ref and
  schedules it. `measure()` also records the current width so a height-only
  resize cannot queue a second measurement.
- The existing unmount cleanup cancels the animation and measurement frames and
  detaches drag listeners.

### CSS

- `.testimonial-film` keeps `pointer-events: none` and gains
  `transform: translateZ(0)` for layer promotion.
- `.testimonial-film__video` gains `pointer-events: none`.
- The card keeps its existing `border-color` / `box-shadow` transition. The
  transform and opacity written by the carousel remain outside that transition.
  No blanket `transition: none` was added, because there was no conflicting
  transform or opacity transition to disable.
- The existing `touch-action: pan-y`, `will-change: transform, opacity`,
  `backface-visibility: hidden`, card sizes, arc geometry and reduced-motion
  rules are unchanged.
- `.testimonial-card--side` overrides only `background-color` and
  `background-image`; the active class is a marker over the base card surface.
  The class changes do not alter padding, border width, font size, filter or
  backdrop-filter.

### Video

- Desktop source is unchanged:
  `.../video/upload/v1792900563/Burger_layers_assemble_together_20261025085531.mp4`
- Mobile source is the same video transformed to 720px wide with automatic
  quality:
  `.../video/upload/w_720,q_auto/v1792900563/Burger_layers_assemble_together_20261025085531.mp4`
- Posters are Cloudinary first-frame images derived from that existing video,
  not local files:
  - Desktop: `.../video/upload/so_0,w_1280,q_auto/...jpg`
  - Mobile: `.../video/upload/so_0,w_720,q_auto/...jpg`
- A `matchMedia('(max-width: 767px)')` listener selects the mobile or desktop
  source. The video is keyed by the selected source, so a source swap remounts
  the element with the matching poster. The playback effect listens for
  `canplay` and `loadeddata` so a newly swapped source retries `play()` after it
  can decode.
- The video remains `muted`, `loop`, `playsInline`, `preload="metadata"`,
  `tabIndex={-1}`, without controls, inside the `aria-hidden` film. It remains
  behind the heading and cards.

## Files changed

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | Fixed 650ms tween, DOM-first rendering, `commitActive()`, memoized cards and stable callbacks, width-aware resize guard, responsive video/poster selection, playback retry, cleanup. |
| `src/index.css` | Film layer promotion, explicit non-interactive video, comment clarifying that only border/shadow transition. Existing card surfaces and transitions preserved. |
| `changes/testimonials-arc-smoothness.md` | This report. |
| `changes/evidence/testimonials-arc-smoothness-verification.json` | Raw browser measurements. |
| `changes/evidence/testimonials-arc-smoothness-390.png` | 390 x 844 section capture. |
| `changes/evidence/testimonials-arc-smoothness-1440.png` | 1440 x 900 section capture. |
| `changes/evidence/testimonials-arc-smoothness-320.png` | 320 x 700 section capture. |

No other section was edited. The pre-existing modified files under
`src/components/3d/`, `MenuExperience.jsx`, `SignatureDishes.jsx`,
`changes/testimonials-fullwidth-video.md` and the existing untracked evidence
were left alone. Nothing was committed or pushed.

## Measured animation timing

The tween constant is 650ms. In the headless run, the first animation frame
started after the click, so wall-clock measurements include that scheduling
delay:

| Check | Result |
| --- | --- |
| Single next click | Visual active/side classes crossed at 5,086.9ms against a 4,687.9ms click (399ms); progress text and live region changed once, at 5,422.8ms (735ms). The theoretical midpoint is 325ms, so the first frame started roughly 74ms after the click in this run. |
| Interrupted move | Second next click came 228.9ms after the first. The card transforms 45ms after the second click were identical to the transforms captured just before it (`maxTranslationDelta: 0`). The final active card was the third card (index 2, progress `03`) after the second tween; progress/live changed once, at 728.5ms after the second click. No second loop or overshoot was observed. |
| Settled state | Card transforms were unchanged 300ms after the final read (`postSettleDelta: 0`). |
| Reduced motion | Next click committed progress and live region in 16.5ms; the card classes crossed at the same time; the video was paused. |

The live region and progress counter never updated during the first interrupted
tween. The active/side classes are allowed to cross at the midpoint because they
are the per-frame visual state; the committed index is deliberately later.

## Browser verification

Environment: headless Chrome through raw CDP, device scale factor 1. Desktop
1440 x 900, mobile 390 x 844, narrow 320 x 700, and landscape 844 x 390. Mobile
viewports had touch emulation enabled. The test launch used
`--autoplay-policy=no-user-gesture-required` so video playback could be observed
without a gesture; muted autoplay under a normal browser policy was not
separately tested.

### Interaction and layout

| Test | Result |
| --- | --- |
| Next arrow, 390px | Active 0 to 1; progress `01` to `02`; live region updated once at completion. |
| Previous arrow from first card | Active 0 to 4; progress `05`; wraps across the first card. |
| Next arrow from last card | Active 4 to 0; progress `01`; wraps across the last card. |
| Side-card click | Active 0 to 1; progress `02`; active class moved to card index 1. |
| Keyboard ArrowRight / ArrowLeft | Active 0 to 1 to 0; progress `02` then `01`. |
| Mouse drag left 150px | Active 0 to 1; progress `02`. |
| Touch swipe left 150px | Active 0 to 1; progress `02`. |
| Vertical touch swipe over arc | Page scrolled 165px (`6060` to `5895`); active card stayed put; computed `touch-action: pan-y`. |
| Autoplay, 4.7s idle | Active 0 to 1; one step. |
| Hover pause, 4.1s | Active stayed 1; no step. |
| Height-only resize, 390 x 844 to 390 x 760 | `0` arc style mutations; no measurement scheduled. |
| Width resize, 390 x 760 to 430 x 760 | `1` arc style mutation; measurement ran. |
| Horizontal overflow | None at 320, 390, 844 or 1440; document scroll width did not exceed the viewport (the 1440 viewport measured 1434 because of the scrollbar). |
| Section position used for verification | 75.7px at 390, 76.1px at 1440, 76.5px at 320, 75.9px at 844 landscape; this verification scroll used a 76px offset. The `#experience` id and `scroll-margin-top: 6.5rem` were not changed. |
| Reduced motion | Next moved 0 to 1 in 16.5ms; card transitions are disabled by the existing media query; video paused. |

### Video checks

| Check | Result |
| --- | --- |
| Mobile source selected at 390 x 844 | `currentSrc` is the `w_720,q_auto` URL; decoded size `720 x 404`; `readyState: 4`; `paused: false`; `error: null`. |
| Mobile poster | `poster` is the `so_0,w_720,q_auto` URL; browser resource entry decoded `30,861` bytes. HTTP HEAD: `200 image/jpeg`, `30,861` bytes. |
| Desktop source selected at 1440 x 900 | `currentSrc` is the unchanged original URL; decoded size `1280 x 720`; `readyState: 4`; `paused: false`. |
| Desktop poster | `poster` is the `so_0,w_1280,q_auto` URL; HTTP HEAD: `200 image/jpeg`, `56,291` bytes. |
| Source switch | 390 mobile source; 844 x 390 desktop source; back to 390 mobile source. The source and poster swapped with the video remount. |
| Mobile transfer size | HTTP HEAD: mobile video `901,814` bytes, desktop video `3,835,991` bytes. The mobile transform is about 76.5% smaller. |
| Decorative/interaction | `muted: true`, `loop: true`, `controls: false`, `playsInline: true`, `pointer-events: none`. |
| Behind cards | Film `z-index: 0`, stage/carousel above it; card hit test at the active card center returns an element inside the card, and a hit test outside the card returns `.testimonial-arc` or `.testimonial-stage`, never `.testimonial-film`. |
| Layout contribution | Film is `position: absolute`; measured film heights were 747px against a 748px section at 390, 800px against 801px at 1440, and 781px against 782px at 320. The film does not add flow height. |
| Console | One 404 for `http://127.0.0.1:3000/favicon.ico`; no Testimonials exception. The favicon is a pre-existing page-level omission, not from this section. |

## Checks

- `npm run lint` (`tsc --noEmit`) passed.
- `npm run build` passed. The only warning is the existing chunk-over-500kB
  warning.
- `git diff --check` found no whitespace errors; Git only reported the existing
  LF/CRLF notices for the working-copy files.
- No commit or push was made.

## Design direction and Delivery Gate (scoped)

Reading this as: restaurant experience section for diners, in a dark cinematic
editorial style, dial ENERGY 2 / RHYTHM 2 / MOTION 2. The existing section
already carries this direction; this revision preserves it rather than
introducing a new visual language.

This gate is scoped to the changed surface. Items outside it are marked N/A,
not PASS. Unchanged existing content was not re-audited.

| Gate | Result | Evidence |
| --- | --- | --- |
| R-02, no em dash | PASS | No em dash in the new report, code comments or changed UI text. |
| R-03, mobile responsiveness | PASS | No horizontal overflow at 320, 390, 844 or 1440; cards and text stayed inside the stage. |
| R-17 / R-36, no invented numbers or claims | PASS | No statistics or performance/security claims added. |
| R-18 / R-38, testimonials and placeholders | PASS | All five entries remain explicitly labeled placeholders with the existing disclosure. |
| R-23, visual assets | PASS | The poster is a first-frame transform of the existing video; no logo, avatar or person was created. |
| R-24, navigation | N/A | No navbar or navigation item changed. |
| R-25, contrast | N/A | No text or color changed; contrast was not re-measured. |
| R-26, interactive elements | PASS | Next, previous, side-card clicks, keyboard, drag and swipe all changed the active card. |
| R-27, UI states | N/A | Static carousel with labeled placeholders; no data fetch. |
| R-28, FAQ | N/A | No FAQ in this section. |
| R-32, keyboard | PASS | ArrowRight and ArrowLeft moved the carousel; existing focus CSS was preserved. |
| R-33, source patching | PASS | The feature is written in `Testimonials.jsx` and `index.css`; no patch script. |
| R-34, themes | N/A | No theme toggle or theme change in this revision. |
| R-35, verify before delivery | PASS | `npm run lint`, `npm run build` and the click-through table above. |
| R-37, design direction | PASS | Existing direction inherited; Design Read stated above. |
| R-01 / R-07 / R-09 / R-10 / R-13 / R-22, decorative defaults | N/A | No new gradient, background pattern, badge, glass, glow or illustration. |
| R-04, icons | PASS | Existing chevrons are the carousel controls; the quote mark labels the testimonial. |
| R-06, typography | PASS | Existing type scale and typeface unchanged. |
| R-08, arrows | PASS | The chevrons are functional previous/next controls, not decoration. |
| R-12, shadow | PASS | Existing card elevation is unchanged. |
| R-14, feature cards | PASS | Active/side hierarchy already differentiates the cards; this revision preserves it. |
| R-19, animation | PASS | Motion is the carousel's navigation; it has a stated UX purpose and a fixed duration. |
| Liveliness | PASS | Active card is the focal point; whitespace, gold accent and arc motif are unchanged; dials are explicit. |
| C-1 / R-31, intentionality | PASS | The motion, video and layer changes each have a written reason in this report. |
| C-2, functional completeness | PASS | Every control tested has a real result. |
| C-3, content-driven section | PASS | The section is the existing guest-review experience; no template section was added. |
| C-4, resilience | PASS | Tested at four widths, keyboard, reduced motion and touch scrolling. |
| C-5, evidence over claims | PASS | Placeholders remain labeled; no fabricated proof was added. |
| R-05 / R-11 / R-15 / R-16 / R-20 / R-21 / R-29 / R-30, layout and identity | PASS / N/A | No new layout, radius, CTA, buzzword, theme, palette or clone behavior was introduced. |

## Limitations and unverified behavior

- Browser verification was headless Chrome only. Safari, Firefox, physical iOS
  and Android devices, and a real screen reader were not run. Touch evidence
  uses synthesized touch/pointer events.
- The video playback check used Chrome's autoplay-policy override. The element is
  muted and `playsInline`, but a physical phone's autoplay policy was not tested
  without the override.
- The 844 x 390 landscape viewport is above the 768px breakpoint, so it selects
  the desktop source and poster. This is the intended width-based behavior; a
  phone held in landscape will fetch the desktop file. A narrower breakpoint or a
  coarse-pointer query could keep the mobile source in landscape, but that would
  be a separate policy decision.
- The poster is a Cloudinary first-frame transformation of the existing video,
  not a pre-existing local image. It was verified over HTTP and in the browser.
  If a local poster asset is required, one still needs to be supplied.
- No frame-rate/FPS profiling or physical-device performance trace was run. The
  verification covers the fixed tween timing, absence of transform jumps on
  interruption, stable settled frames, and the interaction paths above.
- The `#experience` anchor and fixed-header offset were not re-tested in this
  revision; their id and CSS were left untouched.
- The 404 favicon and the existing `changes/testimonials-fullwidth-video.md`
  edit are outside this revision and were left untouched.
