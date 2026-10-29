# Phase 4: Lenis smooth-scroll experiment

## Scope

A controlled experiment with Lenis smooth scrolling on the Pearl Oasis site.

Preserved:

- Phases 1–3, including the hero scroll-controlled video and the Story 56-frame sequence.
- The Story 212vh track, frame order, decode guard, bounded decoded-image pool, prefetch scheduler, scroll mapping, and copy timing.
- Sticky sections, navigation anchors, Enter Restaurant/menu navigation, reverse scrolling, browser history, resize correction, and footer navigation.
- Existing visual styling, scroll distances, video/frame assets, and the existing GSAP dependency.

Not done:

- No component rewrite.
- No GSAP addition or upgrade.
- No unrelated dependency upgrade.
- No real-device testing.
- No commit or push.

## Decision

Keep `lenis@1.3.27`.

No measured regression required a revert. The only consistent trade-off is that programmatic jumps glide longer than native smooth scrolling. Targets, history, sticky positioning, resize correction, reduced motion, and the hero final frame all match the native baseline.

## Integration

### One shared instance

`src/components/ui/SmoothScroll.jsx` mounts one `ReactLenis` root around `App` in `src/main.jsx`.

Options:

```js
{
  autoRaf: true,
  autoResize: true,
  smoothWheel: true,
  syncTouch: false,
  respectReducedMotion: true,
  anchors: false,
}
```

- Lenis owns the page scroll. The existing section rAF loops were not moved into it.
- `syncTouch: false` keeps native touch scrolling.
- `ReactLenis` creates and destroys the instance; there is no second instance or second animation loop.
- The app's existing rAF loops in BrandWordmark, Navigation, SignatureDishes, MenuExperience, Testimonials, WelcomeStory, and EntranceExperience remain independent.

### Native smooth-scroll conflict

The document still has `class="scroll-smooth"` in `index.html`. `src/index.css` now adds:

```css
html.lenis {
  scroll-behavior: auto;
}
```

Computed style after integration is `auto`, so Lenis writes are not animated a second time by native CSS smooth scrolling. Reduced-motion CSS still forces `scroll-behavior: auto !important`.

### Anchors and history

Lenis 1.3.27's `anchors: true` handler does not call `preventDefault`, so native anchor jumps can still occur. The experiment therefore disables it and uses a capture-phase same-page anchor handler in `SmoothScroll.jsx`:

- Finds same-origin, same-path links with a hash.
- Calls `event.preventDefault()`.
- Calls `lenis.scrollTo(target)`.
- Updates the hash with `history.pushState`.
- Handles `popstate` by scrolling to the hash target, or to the top when there is no hash.

The click target and history behavior are unchanged; only the scroll controller changed.

### Reduced motion

`respectReducedMotion: true` makes Lenis interpolation immediate. The measured reduced-motion CTA and anchor jumps reached the target on the first sample with one distinct scroll position, and the final targets matched the baseline.

### Nested scroll areas

`data-lenis-prevent` was added to:

- The mobile navigation panel.
- The full-menu dialog.

The full-menu dialog test confirmed that a wheel gesture inside the dialog scrolls the dialog (`scrollTop` 0 -> 420) while the page scroll stays fixed at `5336`.

### Files changed

| File | Change |
| --- | --- |
| `package.json` | Exact `lenis: "1.3.27"` dependency |
| `package-lock.json` | Lock entry for `lenis@1.3.27` |
| `src/main.jsx` | Mounts `SmoothScroll` and imports Lenis CSS |
| `src/components/ui/SmoothScroll.jsx` | New shared Lenis root and anchor/history handling |
| `src/index.css` | `html.lenis { scroll-behavior: auto; }` |
| `src/components/3d/EntranceExperience.jsx` | CTA and resize correction use the shared Lenis instance |
| `src/components/sections/Footer.jsx` | Back-to-top uses the shared Lenis instance |
| `src/components/ui/Navigation.jsx` | `data-lenis-prevent` on the mobile panel |
| `src/components/sections/MenuExperience.jsx` | `data-lenis-prevent` on the full-menu dialog |

`WelcomeStory.jsx` was not changed in Phase 4. Its Phase 3 work remains in place.

## Validation

Commands:

```text
npm run lint   -> passed
npm run build  -> passed
```

The final production build is `dist/assets/index-COyTgtgQ.js`. The only build warning is the existing chunk-size warning.

### Method

- Production build served by `vite preview` at `http://localhost:4173`.
- Headless Chrome through the Chrome DevTools Protocol.
- Desktop viewport: `1424x805`.
- Fresh Chrome profile for each probe; browser cache cleared before warm-up.
- Baseline was captured before the Lenis source integration, using native `scroll-smooth`.
- The after runs used the same probe, viewport, browser, cache-clear/warm-up path, and direct scroll paths where possible.
- Raw data is in `changes/evidence/phase4-*-raw.json`; the compact summary is `changes/evidence/phase4-runtime.json`.

The direct-scrub probe calls `window.scrollTo` while Lenis is active. That is a test-only control path and can interact with Lenis native-scroll synchronization. The wheel tests are the realistic Lenis path.

## Measured results

### Initial state

| Measurement | Native baseline | Lenis |
| --- | --- | --- |
| `html` class | `scroll-smooth` | `scroll-smooth lenis` |
| Computed `scroll-behavior` | `smooth` | `auto` |
| Lenis version | none | `1.3.27` |
| Hero scroll distance | `1843px` | `1843px` |
| Story scroll distance | `902px` | `902px` |
| Story top | `2647.640625px` | `2647.640625px` |
| Story frames | `56` | `56` |
| Story DOM layers | `5` | `5` |

### Wheel input at the top

Four trusted `120px` wheel events:

| Measurement | Native baseline | Lenis |
| --- | --- | --- |
| Distinct scroll positions | `5` | `40` |
| Final scrollY | `480` | `480` |

This is the clearest measured effect: Lenis adds intermediate positions without changing the final distance.

### Hero direct scrub

| Run | Forward max lag | Forward average lag | Reverse max lag | Reverse average lag |
| --- | --- | --- | --- | --- |
| Native baseline | `1.7137s` | `0.3824s` | `1.2542s` | `0.3588s` |
| Lenis run 1 | `1.9029s` | `0.3771s` | `1.2758s` | `0.3401s` |
| Lenis run 2 | `2.2922s` | `0.3409s` | `2.1138s` | `0.4281s` |
| Lenis run 3 | `1.3894s` | `0.3114s` | `2.1029s` | `0.3733s` |

The maximum is noisy between runs; the averages are not consistently worse. The final frame is identical:

| Measurement | Native baseline | Lenis |
| --- | --- | --- |
| Final `currentTime` | `9.963333s` | `9.963333s` |
| Video duration | `10.005s` | `10.005s` |
| Final progress | `1` | `1` |
| End lag | `0.0054s` | `0s` |

### Hero wheel input

Sixteen trusted `120px` wheel events through the hero:

| Measurement | Lenis |
| --- | --- |
| Samples | `205` |
| Max lag | `0.9190s` |
| Average lag | `0.1891s` |
| End lag | `0s` |
| Seeking samples | `121` |
| Final `currentTime` | `9.963333s` |
| Final progress | `1` |

This is the realistic wheel path and is better than the direct-scrub maximum.

### Story direct scrub

| Run | Forward max lag | Forward average lag | Forward visible changes | Forward duplicate decode sources | Reverse max lag | Reverse average lag | Reverse duplicate decode sources |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Native baseline | `2` | `0.101` | `55` | `0` | `0` | `0` | `0` |
| Lenis run 1 | `8` | `0.63` | `51` | `3` | `0` | `0` | `0` |
| Lenis run 2 | `1` | `0.03` | `55` | `0` | `0` | `0` | `0` |
| Lenis run 3 | `8` | `0.80` | `50` | `0` | `1` | `0.0101` | `3` |

Phase 3 production reference: forward max `8`, average `1.25`; reverse max `2`, average `0.04`.

The 8-frame maximum is within the Phase 3 production range. The duplicate-decode counts did not reproduce consistently: one forward run and one reverse run showed three duplicate sources, while the other runs showed none. The Phase 3 decode guard is still present. The probe counts duplicate decode sources across a whole run; a recycled pool layer can load the same frame again later, which is different from removing the guard.

Large jumps and entry/exit still settled on the target frame. For example, Lenis run 2:

| Test | Target frame | Settle | Visible frame |
| --- | --- | --- | --- |
| Jump to 60% | `33` | `36.4ms` | `33` |
| Jump to 95% | `52` | `35.7ms` | `52` |
| Jump to 5% | `3` | `20.8ms` | `3` |
| Jump to 80% | `44` | `55.8ms` | `44` |
| Entry at 75% | `41` | `125.1ms` | `41` |
| Entry at 10% | `6` | `99.7ms` | `6` |
| Entry at 20% | `11` | `94.4ms` | `11` |

The baseline entry times were `67.3ms`, `73.6ms`, and `78.2ms`. The Lenis entry times are slower by roughly 15-60ms in this probe, but the stale-frame exposure is still short and the target frame is reached.

### Story wheel input

Eight trusted `120px` wheel events through the Story:

| Measurement | Lenis |
| --- | --- |
| Unique frame resources | `53` |
| Loads / decodes | `65 / 65` |
| Duplicate decode sources | `11` |
| Visible frame changes | `41` |
| Requested but never visible | `12` |
| Max target lag | `4` frames |
| Average target lag | `0.424` frames |
| End lag | `0` |

Fast wheel input moves several frames per event, so skipped intermediate frames are expected. The visible target stayed within 4 frames and settled on the final frame. This is not the same as a broken frame order or a blank stage.

### Navigation targets and history

| Test | Native baseline | Lenis |
| --- | --- | --- |
| Enter Restaurant CTA target | `2544.640625px` | `2544.640625px` |
| CTA final scrollY | `2545px` | `2545px` |
| CTA difference | `+0.359375px` | `+0.359375px` |
| Menu anchor final | `5179px` | `5179px` |
| Menu anchor difference | `-104.234375px` | `-104.234375px` |
| Experience anchor final | `5907px` | `5907px` |
| Experience anchor difference | `-104.234375px` | `-104.234375px` |
| Footer Story anchor final | `2544px` | `2544px` |
| Footer Story difference | `-103.640625px` | `-103.640625px` |
| Footer top | `0px` | `0px` |
| Back hash / scrollY | `#menu` / `5179` | `#menu` / `5179` |
| Forward hash / scrollY | `#experience` / `5907` | `#experience` / `5907` |

The negative anchor differences are the existing fixed-header offset, not a Phase 4 change.

### Resize during the hero

At hero progress `0.5`, the viewport was changed from `1424` to `1200` and then restored.

| State | Width | ScrollY | Hero progress | Video time | Hero sticky top |
| --- | --- | --- | --- | --- | --- |
| Native before | `1424` | `922` | `0.500271` | `4.984369s` | `0` |
| Native after | `1200` | `922` | `0.500271` | `4.984369s` | `0` |
| Native restored | `1424` | `922` | `0.500271` | `4.984369s` | `0` |
| Lenis before | `1424` | `922` | `0.500271` | `4.984369s` | `0` |
| Lenis after | `1200` | `922` | `0.500271` | `4.984369s` | `0` |
| Lenis restored | `1424` | `922` | `0.500271` | `4.984369s` | `0` |

The Lenis resize correction calls `lenis.resize()` and an immediate `scrollTo`, so the correction still lands in one step.

### Reduced motion

| Measurement | Native baseline | Lenis |
| --- | --- | --- |
| Emulated `prefers-reduced-motion` | `true` | `true` |
| Computed `scroll-behavior` | `auto` | `auto` |
| CTA first sample within target | `0ms` | `0ms` |
| CTA last movement | `0ms` | `0ms` |
| CTA distinct positions | `1` | `1` |
| CTA final / difference | `2545px` / `+0.359375px` | `2545px` / `+0.359375px` |
| Anchor first sample within target | `0ms` | `0ms` |
| Anchor last movement | `0ms` | `0ms` |
| Anchor distinct positions | `1` | `1` |
| Anchor final / difference | `5179px` / `-104.234375px` | `5179px` / `-104.234375px` |

Lenis remains mounted, but its interpolation is immediate under reduced motion. Programmatic navigation still works; the scroll-linked mapping code is unchanged.

### Programmatic glide duration

| Test | Native last movement | Lenis last movement |
| --- | --- | --- |
| Enter Restaurant CTA | `854.3ms` | `1600.1ms` |
| Menu anchor | `1220.0ms` | `1460.2ms` |
| Experience anchor | `498.1ms` | `1123.3ms` |
| Footer Story anchor | `1079.2ms` | `1405.3ms` |
| Footer top | `1397.6ms` | `1568.1ms` |

This is a real feel change. Short jumps take longer because Lenis uses its default exponential interpolation rather than the distance-scaled native smooth scroll. The final positions are unchanged. If the longer short-jump glide is unwanted, the next tuning step would be a per-call `duration` or `lerp`, not a structural change.

### Mobile smoke test

Emulated `390x844` mobile metrics with a desktop user agent:

| Measurement | Result |
| --- | --- |
| Lenis version | `1.3.27` |
| `html` class | `scroll-smooth lenis` |
| Computed `scroll-behavior` | `auto` |
| Narrow Story pool | `true` |
| Mobile menu opens | `true` |
| Mobile menu `data-lenis-prevent` | `true` |
| Mobile Story anchor final | `2688px` |
| Mobile Story target | `2775.90625px` |
| Anchor difference | `-87.90625px` (existing header offset) |
| Menu closed after anchor | `true` |
| Hash after anchor | `#story` |
| Full-menu dialog `data-lenis-prevent` | `true` |
| Wheel inside dialog | Dialog `scrollTop` `0 -> 420`; page scrollY stays `5336` |

This is emulated mobile, not a real phone. No real-device improvement is claimed.

### Deep links

| Link | Native baseline | Lenis |
| --- | --- | --- |
| `#story` | scrollY `0` (target `2647.640625`) | scrollY `0` (target `2647.640625`) |
| `#menu` | scrollY `5179` (target `5283.234375`) | scrollY `5179` (target `5283.234375`) |

The `#story` deep link already failed before Phase 4. The `#menu` deep link worked in both builds. This is a pre-existing issue, not introduced by Lenis.

## Observations

- Measured: wheel input produced 40 distinct positions versus 5 native, with the same final distance.
- Measured: all tested navigation targets, hash values, history entries, sticky positions, resize states, and reduced-motion targets matched the native baseline.
- Measured: the hero final frame was identical at `9.963333s` of `10.005s`.
- Measured: Story direct-scrub lag varied by run; the 8-frame maximum is within the Phase 3 production range. The duplicate-decode anomaly did not reproduce consistently.
- Measured: fast wheel scrubbing skipped intermediate Story frames, but the target stayed within 4 frames and settled correctly.
- Observed: programmatic glides are longer than native smooth scrolling, especially for short jumps.
- Observed: the `#story` deep-link failure is pre-existing and outside Phase 4.

## Limitations

- Headless desktop Chrome only. No real-device or physical touch testing, so no real-device improvement is claimed.
- Mobile smoke used emulated mobile metrics with a desktop user agent.
- No throttled-network or low-end-CPU profile was run.
- Reduced-motion wheel input and the reduced-motion Story/Hero mapping were not separately re-measured; the programmatic navigation path was measured, and the scroll-linked mapping code is unchanged.
- The direct-scrub probe calls `window.scrollTo` while Lenis is active; that test-only path can interact with Lenis native-scroll synchronization and is not the normal wheel path.
- Programmatic glide duration was not tuned to match native smooth scrolling exactly.

## Evidence

- `changes/evidence/phase4-runtime.json` - compact comparison and checks.
- `changes/evidence/phase4-baseline-raw.json` - native baseline probe.
- `changes/evidence/phase4-lenis-raw.json` - Lenis run 1.
- `changes/evidence/phase4-lenis-run2-raw.json` - Lenis run 2.
- `changes/evidence/phase4-lenis-wheel-raw.json` - Lenis run 3, including wheel-through-hero and wheel-through-Story.
- `changes/evidence/phase4-mobile-raw.json` - mobile menu and modal smoke test.
- `changes/evidence/phase4-deeplink-baseline.json` - native deep-link check.
- `changes/evidence/phase4-deeplink-lenis.json` - Lenis deep-link check.

No commit or push was made.
