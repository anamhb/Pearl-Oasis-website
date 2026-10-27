# Featured Dishes Animation Fix

## Summary

The Featured Dishes section now runs a continuous, deterministic orbit again. Each dish enters from just outside a shared elliptical orbit, rests at its calculated station, then spirals into the central Pearl Oasis hub and disappears. The next dish follows on a fixed beat, so the sequence repeats without a reset jump.

The visible border and shadow around the stage were removed, along with the per-dish drop shadow. Dish wrappers no longer have any card surface, border, outline, background, or box shadow. The central hub, its border, its rotating dashed ring, and its inner hairline ring were preserved.

No commit or push was made.

## Root Causes

1. **The loop had been replaced with a one-shot entrance.**
   The previous effect placed every dish at a station, then stopped the requestAnimationFrame loop once no dish was pending. It never entered the exit/absorption phase, so dishes could not travel to the central circle and repeat.

2. **Station coordinates were hand-tuned rather than derived.**
   `STATIONS` used uneven angles for desktop and a separate even-angle calculation only for mobile. That made the desktop arrangement look arbitrary and made responsive behavior differ by breakpoint.

3. **The JS breakpoints and CSS dish sizes disagreed.**
   The motion code treated everything below `1024px` as tablet-sized, while Tailwind's `md:` styles changed the dish and hub to desktop sizes at `768px`. At `768px` and `640px` this produced oversized dishes, crowding, and visible plate overlaps.

4. **The stage and images had card-like chrome.**
   The stage had a visible `1px` border and a large box shadow. Each dish image also had a strong `drop-shadow` filter. Together they made the stage read as a rectangular card.

5. **The section has no scroll/viewport trigger to repair.**
   The old animation was mount-based and ran independently of scroll. The fix keeps that lifecycle: the sequence continues when the section is offscreen and is already mid-cycle when the visitor returns.

## Changed Files

- `src/components/sections/SignatureDishes.jsx`
  - Replaced the one-shot `STATIONS` layout with a shared, index-derived orbit.
  - Restored the continuous entrance → rest → absorption loop.
  - Aligned JS breakpoints with the CSS dish and hub sizes.
  - Removed stage/dish card chrome.
  - Added a faint orbit guide aligned to the actual dish path.
  - Made mobile hub sizing responsive so the orbit clears the logo at `320px`.
  - Slowed the centre-bound exit glide from `1.008s` to `1.176s` without changing the entry, path, stagger, or loop.

- `changes/featured-dishes-animation-fix.md`
  - This report.

- `changes/evidence/featured-dishes-verification.json`
  - Measured viewport, motion, lifecycle, reduced-motion, and style results.

- `changes/evidence/dishes-before-1440b.png`
- `changes/evidence/dishes-before-390b.png`
- `changes/evidence/dishes-after-1440.png`
- `changes/evidence/dishes-after-390.png`
  - Before/after visual evidence.

No changes were made to `src/index.css`, the central hub markup except for responsive sizing, the hero, story, menu, testimonials, footer, or dish assets. Pre-existing uncommitted Testimonials and hero changes were left untouched.

## Path and Sequence Behavior

### Deterministic orbit

The orbit is derived from the dish index and the stage geometry:

```text
angle(i) = -π/2 + i · (2π / 7)
x(i) = cos(angle(i)) · rx
y(i) = sin(angle(i)) · ry
```

Every dish uses the same orbit and the same angular step (`51.428...°`). There are no random values and no hand-picked coordinates. The faint dashed orbit guide is drawn from the same `rx`/`ry`, so it always aligns with the dish centers.

### Responsive geometry

- Mobile (`< 640px`): stage `540px` high, dish `80px`, hub `112px`, orbit `rx` clamped by the stage edge.
- Tablet (`640px–1023px`): stage `560px` high, dish `128px`, hub `176px`.
- Desktop (`≥ 1024px`): stage `620px` high, dish `176px`, hub `208px`.

The horizontal radius is clamped so a dish box cannot cross the stage edge. The vertical radius is clamped by the visible plate height, not by the image's transparent padding, which keeps more breathing room without clipping the plate.

### Timeline

Each dish runs an `8.4s` cycle with a `1.2s` stagger (`8.4 / 7`):

| Phase | Cycle progress | Duration | Behavior |
|---|---:|---:|---|
| Enter | `0.00–0.12` | `~1.01s` | Starts at `1.30 ×` orbit radius, curves into the station, scales from `0.55` to `1`, fades in |
| Rest | `0.12–0.86` | `~6.22s` | Sits exactly on its calculated station |
| Exit | `0.86–1.00` | `~1.18s` | Spirals inward with a `0.55rad` sweep, shrinks to `0.52`, and fades behind the hub |

The exit starts `0.168s` earlier while ending at the same point, so the centre-bound glide is `16.7%` longer (`1.008s → 1.176s`). The existing cubic ease is retained because its zero-velocity endpoints already produce a smooth start and settle; the longer phase lowers the approach speed. Entry timing, orbit geometry, dish positions, stagger, and total cycle are unchanged. The rest phase absorbs the extra `0.168s`, so the section does not slow down as a whole.

The opacity remains `1` until the dish is already at the center (`p ≥ 0.82`). It then fades out while the hub covers it. The reset from the center to the outer entry point happens only while the dish is fully transparent, so there is no visible jump.

Because the exit (`1.176s`) remains shorter than the stagger interval (`1.2s`), only one dish is in the absorption path at a time, with `24ms` of clearance. The other six remain on their stations. The next dish begins as the previous one clears, producing a continuous cadence rather than a batch reset.

The animation is mount-based. It does not restart when the section enters the viewport; returning to the section continues the same cycle at its current phase.

## Border and Shadow Removal

- Stage: removed `border border-[#1f1d18]` and `shadow-[0_20px_60px_rgba(0,0,0,0.85)]`.
- Dish wrapper: explicitly `border-0 bg-transparent shadow-none outline-none`.
- Dish image: removed `drop-shadow-[0_14px_28px_rgba(0,0,0,0.85)]`; retained `contrast-[1.02]` for image contrast.
- Central hub: retained its `1px` gold border, inner hairline ring, rotating dashed ring, shadow, and logo.
- Stage gradient and rounded radius remain as the section background; only the card-like edge/shadow was removed.

Computed-style checks confirmed:

```text
stage border-width: 0px
stage box-shadow: none
dish wrapper border-width: 0px
dish wrapper box-shadow: transparent
dish wrapper outline: none
dish wrapper background: rgba(0, 0, 0, 0)
central hub border: 1px retained
```

## Verification

### Viewports

Visible plate gaps were measured from each PNG's actual alpha bounds, not from the transparent image box. `minHubGap` is the smallest visible plate-to-hub gap while the dishes are resting.

| Viewport | Stage | Hub | Dish | Min plate gap | Min hub gap | Plate overlaps | Horizontal overflow |
|---|---:|---:|---:|---:|---:|---|---|
| `1440×900` | `1280×620` | `208×208` | `176×220` | `25px` | `3px` | none | no |
| `1024×768` | `928×620` | `208×208` | `176×220` | `24px` | `3px` | none | no |
| `768×1024` | `704×560` | `176×176` | `128×160` | `24px` | `18px` | none | no |
| `640×900` | `576×560` | `176×176` | `128×160` | `7px` | `18px` | none | no |
| `390×844` | `358×540` | `112×112` | `80×104` | `23px` | `10px` | none | no |
| `320×800` | `288×540` | `112×112` | `80×104` | `7px` | `2px` | none | no |

The mobile hub is smaller at `112px` only below `640px`; at `320px` the previous `144px` hub left no room for an `80px` dish on the side stations. The hub's styling, border, rings, and logo are unchanged.

The evidence screenshots were taken during a live cycle, so one station may be temporarily empty while its dish is entering or being absorbed. That is expected; the DOM audits above measured the resting stations separately.

### Motion

A 16-second CDP sample at `1440×900` measured:

- All seven dishes reached the geometric center (`radius = 0px`).
- Center arrivals occurred in order, approximately every `1.23s`.
- At least six dishes were visible after the initial warm-up.
- No dish remained hidden or stuck.
- One boundary frame per cycle can report opacity below `0.01` at the invisible wrap; it is not a visible gap.

A 26-second sample also confirmed the loop keeps absorbing dishes repeatedly, with no stalled requestAnimationFrame state.

### Timing refinement (2026-10-26)

The centre-bound glide now starts at cycle progress `0.86` instead of `0.88`, making the exit phase `1.176s` instead of `1.008s` (`+16.7%`, inside the requested `15–20%`). Browser sampling at `1440×900` measured the visible centre-bound travel at `1043–1074ms`, up from `882–941ms`; the spread is due to the `16ms` sample interval and the varying station radius.

- `390×844` sampling measured `1004–1053ms` to the center, with the same `1.176s` phase duration.
- Center arrivals stayed on the existing `~1.2s` stagger, and at least six dishes remained visible after warm-up.
- `maxConcurrentExits = 1` on both viewports: the longer exit never overlaps the next dish.
- A `51`-sample desktop trace of one exit rose from `210px` to the center in `1062ms` with a maximum frame movement of `13.65px` and no radial reversal or jump.
- Opacity stayed at `1` until the dish was within `6px` of the center, then faded behind the hub as before.
- `npm run lint` and `npm run build` passed again; only the existing chunk-size warning remains.

### Lifecycle

- Scrolled away for `2.4s`, then returned: all seven dishes were visible and the animation was still advancing.
- Resized while running from `1440×900` to `390×844`: animation continued, at least six dishes remained visible, all dish boxes stayed inside the stage, and there was no horizontal overflow.
- Reduced-motion emulation: all seven dishes rendered statically at their calculated stations, fully visible, with no rAF-driven movement.

### Checks

- `npm run lint`: pass (`tsc --noEmit`, no output).
- `npm run build`: pass (`1685 modules transformed`, `dist` generated).
- The existing Vite chunk-size warning remains (`index-*.js` is larger than `500 kB`). It is unrelated to this change.

## Limitations

- The orbit is elliptical, not a literal circle. The section is much wider than it is tall; a true circle large enough to clear the `208px` hub would push the plates into the stage edges. The ellipse is the responsive circular orbit for this layout.
- The animation continues while the section is offscreen or the tab is hidden, except for normal browser rAF throttling. There is no IntersectionObserver pause/reset.
- Plate gaps were measured from PNG alpha bounds with an alpha threshold of `24`. Soft image shadows or semi-transparent edges may read slightly differently at extreme zoom.
- Responsive verification used headless Chrome via CDP and DOM geometry, not a visual regression test suite. The evidence screenshots and JSON are in `changes/evidence/`.
