# Phase 1 performance improvements

Date: 2026-10-27

Scope: targeted Phase 1 work only. No hero video, frame count, scroll distance, image-prefetch algorithm, section height, layout, menu, testimonial, footer, or design changes. No Lenis, GSAP, or new dependencies.

## Files changed

| File | Change |
| --- | --- |
| `src/components/sections/SignatureDishes.jsx` | Pauses/resumes the dish orbit `requestAnimationFrame` loop based on stage visibility; preserves animation phase; cleans up the observer and frame. |
| `src/components/ui/Navigation.jsx` | Coalesces scroll handling into one rAF and only updates React state when the `> 80px` threshold changes; wires the existing `pauseWhenOffscreen` prop to the navbar crest. |
| `changes/evidence/phase1-runtime.json` | Headless runtime evidence for the pause/resume and header checks. |
| `changes/phase-1-performance.md` | This document. |

No CSS changes were required.

## 1. SignatureDishes orbit loop

File: `src/components/sections/SignatureDishes.jsx`

### What changed

- Added `visibleRef` and `pausedAtRef` alongside the existing `rafIdRef` and `startTimeRef`.
- Added an `IntersectionObserver` on the dish stage (`containerRef`) with `rootMargin: '200px 0px'`. The 200px margin is a pre-warm band: the loop resumes just before the stage enters, so the first visible frame is not a restart at the edge.
- Seeded visibility from the stage's current `getBoundingClientRect()` so the first observer callback being asynchronous cannot leave the loop running while the stage is offscreen.
- Split the loop into `startLoop()`, `stopLoop()`, `pause()`, and `resume()`:
  - `pause()` cancels the pending frame and records `performance.now()`.
  - `resume()` shifts `startTimeRef` by the paused duration, so the orbit continues from the same phase instead of jumping forward by the time spent offscreen.
  - `startLoop()` refuses to run when the stage is not visible.
  - `animate()` checks `cancelled` and `visibleRef` before scheduling the next frame.
- Added a `cancelled` flag so a frame already executing during effect cleanup cannot schedule another frame from the old closure.
- Cleanup now cancels the frame and disconnects the observer.
- If `IntersectionObserver` is unavailable, the original always-on behavior is kept.
- The reduced-motion branch is unchanged in behavior: it still places every dish at its station with no loop, and now also clears `pausedAtRef`.

### What did not change

- Cycle duration (`8.4s`), stagger, entrance/exit windows, orbit geometry, dish DOM, transforms, opacity, z-index values, and the central logo.
- The section height, layout, heading, and CSS classes.
- The decorative `.animate-spin-slow` ring. It is a separate CSS compositor animation; the existing reduced-motion rule disables it. Pausing it offscreen would require a visibility class toggle and would reset its phase, so it was left alone.

## 2. Navigation scroll state

File: `src/components/ui/Navigation.jsx`

### What changed

- Added `scrolledRef` to cache the last `isScrolled` boolean.
- Scroll events are coalesced into one `requestAnimationFrame`.
- `syncScrolled()` only calls `setIsScrolled` when `window.scrollY > 80` actually changes. The previous handler called the state setter on every scroll event.
- The initial state is synced once on mount, which also handles restored/deep-linked scroll positions.
- The pending frame is cancelled on unmount.
- The threshold remains exactly `> 80`, and the existing header classes and 300ms transition are unchanged.

### What did not change

- Header appearance, navigation links, mobile menu, focus handling, and responsive behavior.
- The header still reads `window.scrollY` once per animation frame while scrolling. That read is cheap; the saving is the removal of redundant React state writes.

## 3. Navbar BrandWordmark crest

Files involved: `src/components/ui/Navigation.jsx` (one-line prop), `src/components/brand/BrandWordmark.jsx` (existing implementation, not modified).

### What changed

- The navbar now uses the existing `pauseWhenOffscreen` prop: `<BrandWordmark pauseWhenOffscreen />`.
- The `Crest3D` implementation already gates its loop on `animate`, `prefers-reduced-motion`, visibility, and model readiness, and it already disconnects its `IntersectionObserver` on cleanup.

### Important limitation

The navbar header is `position: fixed` (`Navigation.jsx`), so the crest canvas is always inside the viewport. The observer therefore reports it visible at every scroll position. The pause path is wired, but it does not pause the navbar crest in the current layout.

Measured in the runtime check: the crest loop (`tick`) produced 60, 59, and 60 callbacks in the three 1.5s windows (top, signature section, back to top), while the canvas stayed at `top: 5px`, `bottom: 43px` in every position. A real offscreen pause would require hiding the header, freezing a visible logo, or changing the header from fixed — all of which would change the existing design/behavior, so it was not done.

## 4. CSS

File inspected: `src/index.css`

- `index.css:105-107` defines `.animate-spin-slow`.
- `index.css:119-133` already disables `.animate-spin-slow` and other decorative animations under `prefers-reduced-motion: reduce`.
- No CSS edits were needed.

## Validation

### Lint

```text
npm run lint
> tsc --noEmit
```

Passed with no output.

### Production build

```text
npm run build
✓ 1685 modules transformed.
✓ built in 19.93s
```

The build succeeded. The only warning was the pre-existing chunk-size warning (`index-*.js` 901.28 kB, gzip 242.08 kB), which is unrelated to this phase.

### Runtime check

Method: headless Chrome via CDP at 1440×900. After load, `window.requestAnimationFrame` was wrapped and callbacks were counted by function name: `animate` for the SignatureDishes orbit and `tick` for the crest. Each window was 1500ms. The page was scrolled instantly (CSS smooth behavior overridden to `auto`) and allowed to settle for 900ms before each window.

Evidence: `changes/evidence/phase1-runtime.json`

Key results:

| Position | `animate` callbacks | `tick` callbacks |
| --- | ---: | ---: |
| Top (signature offscreen) | 0 | 60 |
| Signature stage visible | 59 | 59 |
| Back to top | 0 | 60 |

- The dish loop stopped while offscreen and resumed while visible. This is a measured pause/resume result, not an FPS or CPU improvement claim.
- Dish transforms changed while the stage was visible, so the orbit is still visually running.
- Header threshold check: at `scrollY 0` the header had `bg-gradient-to-b` and `border-transparent`; at `scrollY 100` it had `bg-[#090a0c]` and the scrolled border/shadow classes; back at `0` it returned to the gradient. Behavior is unchanged.
- Navbar canvas rect was `top: 5`, `bottom: 43`, `height: 38` at both the top and the signature section, confirming the fixed-header limitation above.

No FPS, CPU, memory, network, or long-task profile was captured. No physical device, Safari, or Firefox was tested. The absolute callback rate is headless-Chrome-throttled; only the relative on/off counts are meaningful.

## Remaining performance issues

These were identified in the read-only inspection and are intentionally untouched in Phase 1:

1. **Hero video seeking** — `EntranceExperience.jsx` seeks the remote Cloudinary MP4 from scroll progress. This remains the dominant scroll-time cost.
2. **Story frame loading/decoding** — `WelcomeStory.jsx` still loads and decodes JPEG frames during the scrub. The frame count, pool, and prefetch algorithm are unchanged.
3. **Navbar crest cannot pause offscreen** — the fixed header keeps its canvas visible; the new prop is inert in this layout.
4. **Decorative dish ring** — the CSS `.animate-spin-slow` ring keeps animating while the signature stage is offscreen. It is a compositor-only transform and is disabled under reduced motion. Pausing it would require a visibility class and would reset its phase.
5. **SignatureDishes resize cost** — `updateStageSize` still creates a new `stageSize` object on every resize, which re-renders the section and re-creates the orbit effect. This is a resize cost, not a scroll-loop cost.
6. **Dish layer promotion** — the dish wrappers keep `will-change: transform` while paused, so their compositor layers stay promoted. Removing it offscreen would require a visibility class toggle; it was left alone to avoid changing the visual setup.
7. **Testimonial background video** — the remote burger film still decodes while the testimonial section is near the viewport.
8. **Navigation scroll read** — the handler still reads `window.scrollY` once per frame while scrolling, though state updates now only happen at the threshold crossing.

## Not implemented, and why

- **A real navbar-crest offscreen pause:** the navbar is fixed and always visible. Pausing it on viewport intersection cannot trigger. Hiding the header or freezing the visible logo would change existing behavior/design.
- **Pausing the decorative CSS ring offscreen:** it would require a React state/class toggle, would reset the ring's rotation phase on re-entry, and is not the continuous rAF loop identified in the inspection. The existing reduced-motion rule already handles users who ask for less motion.
- **Lenis/GSAP or scroll smoothing:** explicitly out of scope for Phase 1.
