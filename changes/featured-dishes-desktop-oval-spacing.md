# Featured Dishes — Desktop Equal-Spacing Oval

## Summary

On desktop (`>= 1024px`) the seven dishes all sat on one shared ellipse (`rx 430` / `ry 210`). Because a constant distance from a circular hub is itself circular, that ellipse could not give every dish the same visible gap: measured against the hub's outer dashed ring, the closest plate sat **7px** away and the furthest sat **238.6px** away — a **231.6px** spread across the seven dishes. The observed plate-centre angles were uneven too (steps of `27.7°` to `89.2°` instead of the intended `51.4286°`), because the ellipse stretched the x and y coordinates differently.

The desktop orbit now solves a **per-station radius** from each dish's own measured footprint, so every plate's nearest visible pixel clears the hub ring by the same **60px**, while the station angle stays exactly index-derived. The desktop stage grew from `620px` to `780px` to give that ring of plates room to stay inside the section.

Result at `1920 / 1440 / 1280 / 1024`: visible-gap spread **231.6px -> 2.5px**, plate-centre angles exactly `51.43°` apart, no overlap with the hub, no clipping, hub centre offset `0`. The phone (`< 640px`) and tablet (`640-1023px`) code paths are untouched: their measurements and screenshots are identical to the baseline.

`npm run lint` and `npm run build` pass. No commit or push was made.

## Baseline (measured before any edit)

Gaps below are **visible** gaps: each dish image is alpha-scanned (threshold `alpha > 16`) and the nearest opaque pixel is measured to the hub's outer dashed ring. Rest state, `prefers-reduced-motion: reduce`, served from the production build.

| Viewport | Stage | Min gap | Max gap | Spread | Overlap | Clipped |
|---|---:|---:|---:|---:|---|---|
| `1920` | `1280x620` | 7.0 | 238.6 | **231.6** | none | none |
| `1440` | `1280x620` | 7.0 | 238.6 | **231.6** | none | none |
| `1280` | `1280x620` | 7.0 | 238.6 | **231.6** | none | none |
| `1024` | `922x620` | 7.0 | 161.6 | **154.6** | none | none |
| `768` (tablet) | `698x560` | 18.5 | 110.8 | 92.3 | none | none |
| `390` (phone) | `358x540` | 21.6 | 42.8 | 21.2 | none | none |

Two corrections to earlier assumptions, recorded here because they changed what the fix had to do:

1. An earlier **box-based** pass suggested dishes were overlapping the hub and being clipped by the stage edge. Those numbers came from the images' transparent padding, not their plates. The alpha-aware pass shows there was **no overlap and no clipping at any width** — the real defect is uneven spacing (a plate nearly touching the ring at the top, plates 239px away at the sides).
2. Phone and tablet were already even (`21.2px` and `92.3px` spreads), which is why they are left alone.

## Design decisions (confirmed before implementation)

- **Equal gaps, compact oval (recommended)** — one shared gap target for all seven dishes, with a compact near-circular cluster rather than the old wide ellipse.
- **Taller desktop stage (recommended)** — the desktop stage grows so the equal-gap ring fits without clipping.

## How the new geometry works

All new logic lives in `src/components/sections/SignatureDishes.jsx`.

### Constants (desktop only, `>= 1024px`)

| Constant | Value | Meaning |
|---|---:|---|
| `HUB_RING_RADIUS` | `124` | Outer dashed ring radius = `lg:w-52` disc (`104`) + `md:-inset-5` ring inset (`20`) |
| `DESKTOP_GAP` | `60` | Clear space kept between that ring and each dish's nearest visible pixel |
| `DESKTOP_STAGE_HEIGHT` | `780` | Desktop stage height (was `620`) |
| `DESKTOP_EDGE_MARGIN` | `8` | Breathing room the fit clamp keeps between a dish and the stage edge |

### 1. Each dish's real footprint is measured, not guessed

The assets ship with large transparent margins (the mint glass is only ~32% opaque, the wrap ~42%), so the element box badly overstates what the eye sees. On mount and on resize the component:

- reads the element's rendered box and the image's natural size, then applies the `object-contain` scale;
- alpha-scans the natural image once (canvas `getImageData`, threshold `16`) to get its opaque bounding box;
- converts that into an inscribed **ellipse** with semi-axes `hx`/`hy` and centre offset `dx`/`dy` — the plates are round, so the box corners are transparent and would otherwise overstate the footprint.

Results are cached per asset in a module-level map, so each image is scanned exactly once. Below `1024px` the scan is skipped entirely (only the desktop orbit consumes footprints), and until an image is measurable the fallback is the full CSS box (`88 x 110`), which never understates.

### 2. Per-station radius solve

For each dish, at its unchanged index-derived angle, a bisection finds the radius at which the **nearest point of that dish's footprint ellipse** is exactly `HUB_RING_RADIUS + DESKTOP_GAP = 184px` from the hub centre:

```text
angle(i)  = -pi/2 + i * (2*pi / 7)          // unchanged: 51.4286 deg steps
radius(i) = solve(footprint(i), 184)         // per dish, from its own footprint
x(i) = cos(angle(i)) * radius(i)
y(i) = sin(angle(i)) * radius(i)
```

The solve samples 96 boundary points from a precomputed unit-circle table (no trig in the inner loop) and bisects for 32 steps, so its model error is below `0.1px`. Because the radius depends on the dish, all seven **visible** gaps come out equal; because the angle is untouched, the centres stay exactly evenly spaced.

A `fitRadius` clamp caps each radius so the dish's opaque box cannot be pushed past the stage edge (`8px` margin). At the tested widths the clamp never engaged: solved station radii are `243.5-267px`, and the tightest stage margin is `38px` (top dish, `352px` of `390px` half-height).

### 3. Everything downstream follows the stations

- Each station carries its own `rx`/`ry` (equal on desktop), so the entrance (`1.3 -> 1.0` radial) and exit spiral run on the same curve the dish rests on. On phone and tablet `rx`/`ry` are the shared ellipse values, exactly as before.
- The faint guide ellipse draws at the **mean station radius** on desktop (`257.3px` — a circle, since the equal-gap ring is circular) and keeps the old ellipse below `1024px`. Footprints differ per dish, so no single curve can pass through every centre; the mean keeps it centred and within ~14px of all of them.
- The geometry is computed once per change in a `useMemo` and shared by the animation effect and the render, so the resting stations and the guide can never come from different inputs, and the solve runs once instead of twice.

### 4. What did not change

- Phone (`540px` stage) and tablet (`560px` stage) station math, dish sizes, hub sizing.
- Dish content, image assets, reveal timing, stagger (`8.4s` cycle / `1.2s` stagger), entrance/exit curves, rest behaviour, IntersectionObserver pause, reduced-motion path.
- No new dependencies; no CSS file changes.

## Changed files

- `src/components/sections/SignatureDishes.jsx` — `253` insertions, `29` deletions (desktop geometry, footprint measurement, per-station radii, guide sizing, image refs).
- `changes/featured-dishes-desktop-oval-spacing.md` — this report.

No other source file was touched. The pre-existing uncommitted `src/components/3d/EntranceExperience.jsx` change (Phase 8C.1) was left untouched, as were the existing `changes/phase-8c*.md` reports. Before/after screenshots were captured in the session temp directory (`.../opencode/dishes/visible/`, tags `before`, `after`, `final3`) and deliberately not committed, per the change-scope rule.

## Verification

### Visible gap, rest state (alpha-aware, reduced motion)

| Viewport | Stage | Min | Max | **Spread** | Mean | Overlap | Clipped |
|---|---:|---:|---:|---:|---:|---|---|
| `1920` | `1280x780` | 57.9 | 60.4 | **2.5** | 59.7 | none | none |
| `1440` | `1280x780` | 57.9 | 60.4 | **2.5** | 59.7 | none | none |
| `1280` | `1178x780` | 57.9 | 60.4 | **2.5** | 59.7 | none | none |
| `1024` | `922x780` | 57.9 | 60.4 | **2.5** | 59.7 | none | none |
| `768` (tablet) | `698x560` | 18.5 | 110.8 | 92.3 | 65.6 | none | none |
| `390` (phone) | `358x540` | 21.6 | 42.8 | 21.2 | 34.1 | none | none |

Per-dish desktop gaps against the ring (target `60`): `60.4, 60.1, 59.3, 59.8, 60.0, 60.4, 57.9`. The `2.5px` residual is the ellipse-inscribed-in-opaque-bounds model vs the true silhouette; `Mint Margarita` (a tall narrow glass) is the outlier at `57.9`.

### Centre spacing and centring

| | Before | After |
|---|---|---|
| Observed centre angles | `-90, -21.3, 6.4, 45.4, 134.6, 173.6, 201.3` | `-90, -38.6, 12.9, 64.3, 115.7, 167.1, 218.6` |
| Angle steps | `68.7 / 27.7 / 39.0 / 89.2 / 39.0 / 27.7 / 68.7` | `51.43` at every step |
| Hub centre offset | `0` at every width | `0` at every width |

The desktop cluster is a near-circular oval: station radii `243.5-267px` (mean `257.3`), tightest stage margin `38px` at the top dish.

### Phone and tablet unchanged

Every measured value at `768` and `390` (stage size, box sizes, centre distances, nearest visible pixel, gaps, angles, hub radii) is **identical to the baseline**, and the before/after screenshots are visually indistinguishable.

### Live animation (no reduced-motion emulation, 14s per width)

| Width | Ticks | Dishes reaching opacity `1.00` | Samples with visible clipping | Page exceptions |
|---|---:|---|---:|---:|
| `1440` | 64 | 7 / 7 | 0 | 0 |
| `1024` | 64 | 7 / 7 | 0 | 0 |

Centre distances confirm the full range of motion (out to ~`1.3 x` station radius on entry, back to ~`0` on absorption), so the entrance, rest, and exit phases all still run. Sampling every ~`110ms` cannot rule out sub-frame transients; analytically the worst case during the unchanged entrance curve is `<= 1.1px` past the stage edge at opacity `~0` (the first ~2% of the entrance), versus ~`5px` visible past the edge before the change — the taller stage improved this rather than regressed it. Negative `minGap` values in the sample are the exit spiral passing **behind** the hub (`z-index 10` under the hub's `20`), which is by design.

Note: in live mode the sampler's gap column measures the hub ring's **rotating** bounding box (a spinning square reads up to `248 * sqrt(2)`), so reduced-motion runs are the authoritative gap metric.

### Cost of the new math (standalone probe, 1440px)

- Alpha scan: 7 images / `1,746,214` pixels = **91-117ms**, once per asset, cached for the session, skipped below `1024px`.
- Station solve: **4.8ms** for all seven stations (vs `14.2ms` without the precomputed unit-circle table); runs only when the stage, breakpoint, or footprints change, and once per change thanks to the shared memo.

### Checks

- `npm run lint`: pass (`tsc --noEmit`, no output).
- `npm run build`: pass (`dist/assets/index-CFULD2Ab.js`, `929.15 kB` / `250.54 kB` gzip; `9.49s`). The existing Vite chunk-size warning (`> 500 kB`) is unrelated and pre-existing (baseline bundle `926.8 kB`).

## PASS / FAIL / NOT TESTED

### PASS

- Desktop visible gap spread reduced from `231.6px` to `2.5px` at `1920`, `1440`, `1280`, `1024` (target `60px`, mean `59.7`).
- No dish overlaps the centre circle or its ring at any tested width (`overlapsRing` / `overlapsDisc` empty).
- No dish is clipped by the section edges at rest at any tested width (`clipped` empty); the fit clamp was never needed (`38px` minimum margin).
- The desktop oval is centred and balanced: hub centre offset `0`, plate-centre angles exactly `51.43°` apart at every desktop width.
- Mobile and tablet are visually unchanged: identical measurements and screenshots at `390` and `768`; stage heights `540` / `560` untouched.
- Live orbit still works on the final build: all 7 dishes animate to full opacity and travel their full entrance/exit range; `0` samples with visible clipping; `0` page exceptions at `1440` and `1024`.
- Reduced-motion path renders all seven dishes statically at their stations.
- `npm run lint` and `npm run build` pass; only the pre-existing chunk-size warning remains.
- Change scope respected: only `SignatureDishes.jsx` and this report; no new dependencies; nothing committed or pushed.

### FAIL

- None.

### NOT TESTED

- Live Vercel / production deployment (only the local `vite preview` build).
- Browsers other than Chrome `156.0.8078.80` (Firefox, Safari, Edge) — including canvas `getImageData` timing on other engines. The assets are same-origin, so a tainted canvas is not expected; the code falls back to the element box if it ever happens.
- Physical devices and touch input (emulation only); real-user impact of the one-time `~91-117ms` alpha scan on lower-end hardware.
- Extreme zoom / text-only scaling, and widths between the tested breakpoints other than the ones listed (the `1024` case is the narrowest desktop stage, so it is the worst case for horizontal fit).
- Sub-frame entrance transients (sampling interval ~`110ms`; see the analytical estimate above).
- Automated visual-regression suite and screen-reader/keyboard review (the change adds measurement refs only; no interactive or semantic markup changed).

## Limitations

- The desktop cluster is a **near-circular** oval (`243.5-267px` radii), not the old wide ellipse: a constant gap around a circular hub is circular by definition, and this is the shape the "equal gaps" decision implies. Phone and tablet keep the ellipse.
- The desktop guide circle sits on the **mean** station radius, so it passes within ~14px of each plate centre instead of through them exactly — per-dish radii differ because per-dish footprints differ.
- The footprint model is an ellipse inscribed in each image's opaque bounding box, not the exact silhouette; the resulting gap error is `<= 2.5px` against a `60px` target.
- Gap measurements use an alpha threshold of `16`; very faint anti-aliased plate edges read a fraction of a pixel differently at other thresholds.
- Verification used headless Chrome via CDP with DOM/alpha geometry and screenshots, not a visual regression suite. Screenshots live in the session temp directory and are not committed.
