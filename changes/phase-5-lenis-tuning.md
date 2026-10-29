# Phase 5: Lenis programmatic tuning and deep-link repair

## Scope

A targeted pass after Phases 1 to 4:

- Tune the programmatic Lenis glide without changing wheel smoothing, native touch scrolling, reduced-motion handling, browser history, or final scroll targets.
- Investigate the intermittent duplicate Story decode sources seen in Phase 4.
- Investigate the pre-existing `#story` deep-link failure.
- Document the findings and leave the decoder, Story scheduler, sticky sections, section heights, and hero mapping unchanged.

Preserved:

- Phases 1 to 4, including the Lenis root, anchor and history handling, hero scroll-controlled video, and Story 56-frame sequence.
- The Story 212vh track, frame order, bounded decoded-image pool, prefetch scheduler, decode guard, scroll mapping, and copy timing.
- Sticky sections, navigation anchors, Enter Restaurant CTA, reverse scrolling, browser history, resize correction, and footer navigation.
- Existing visual styling, scroll distances, video/frame assets, and the existing GSAP dependency.

Not done:

- No decoder change.
- No Story frame-count, scheduler, or section-height change.
- No hero scroll-to-video mapping change.
- No package install or upgrade.
- No unrelated refactor.
- No real-device testing.
- No commit or push.

## Decision

Keep `lenis@1.3.27`.

Add one targeted change: a per-call `0.9s` duration for programmatic scrolls. The global Lenis options are unchanged, so wheel input keeps the `0.1` lerp, touch remains native, and reduced motion remains immediate.

Fix the initial deep-link failure separately. On a fresh load, the browser tries to resolve the fragment before React creates the target. A post-mount effect now reads the initial hash and scrolls to the target immediately. This fixes both `#story` and `#menu` without changing normal anchor clicks or history behavior.

Do not change the Story decoder. The Phase 4 duplicate decode-source anomaly did not reproduce in six Phase 5 runs. The Phase 3 per-layer token guard remains in place.

## What changed

### Programmatic duration

`LENIS_OPTIONS` still has no `duration` or `lerp` override:

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

Because `duration` was unset, `lenis.scrollTo()` inherited the default `lerp: 0.1`. That exponential interpolation took about `1.1s` to `1.6s` for this page's programmatic jumps.

The new shared constant is in `src/components/ui/scroll.js`:

```js
export const PROGRAMMATIC_SCROLL_DURATION = 0.9;
```

It is passed only on programmatic calls:

- `src/components/ui/SmoothScroll.jsx`: anchor clicks, `popstate` history navigation, and the initial hash.
- `src/components/3d/EntranceExperience.jsx`: the Enter Restaurant CTA.
- `src/components/sections/Footer.jsx`: Return to Top Entrance.

A global `duration` was rejected because it would also replace the wheel lerp. A per-call duration leaves the wheel path alone.

### Initial hash and the `#story` deep link

The correct Story target is `section id="story"` in `src/components/sections/WelcomeStory.jsx` (around line 450). The section ID was already correct. The failure was timing, not a wrong ID.

On a fresh load:

- `DOMContentLoaded` and `load` fired at about `183ms` to `248ms`.
- `#story` and `#menu` did not exist at that point.
- React created both sections at about `371ms` to `481ms`.
- The browser did not retry the fragment scroll after the targets appeared.
- The page stayed at `scrollY 0`.

Phase 4's `#menu` result was not a fresh deep link. The probe navigated to `#story` and then changed the hash to `#menu` in the same document, so `#menu` was a same-document hash change after React had mounted. A fresh `#menu` load failed the same way as `#story` in Phase 5.

The fix runs inside the existing `AnchorScroll` effect after `useLenis()` returns an instance:

```js
const initialId = decodeURIComponent(window.location.hash.slice(1));
const initialTarget = initialId
  ? document.getElementById(initialId)
  : null;
if (initialTarget) scrollToTarget(initialTarget, true);
```

`scrollToTarget` passes `duration: PROGRAMMATIC_SCROLL_DURATION` and `immediate: true`. Immediate is correct for a deep link because a native fragment navigation lands without animation. Normal anchor clicks still animate, and `popstate` still uses the shared duration.

This is a post-mount repair, not a pre-paint fix. The SPA has no target when the browser first tries the fragment. The measured jump happens about `378ms` to `428ms` after load, immediately after React creates the sections.

### Files changed

| File | Change |
| --- | --- |
| `src/components/ui/scroll.js` | New shared `PROGRAMMATIC_SCROLL_DURATION = 0.9` constant |
| `src/components/ui/SmoothScroll.jsx` | Initial hash repair; duration on anchor, history, and initial-hash scrolls |
| `src/components/3d/EntranceExperience.jsx` | Duration on the Enter Restaurant CTA |
| `src/components/sections/Footer.jsx` | Duration on Return to Top Entrance |
| `changes/phase-5-lenis-tuning.md` | This report |
| `changes/evidence/phase5-runtime.json` | Compact Phase 5 comparison and evidence |

`WelcomeStory.jsx`, `index.css`, `package.json`, `package-lock.json`, and the Lenis options were not changed in Phase 5.

## Validation

Commands:

```text
npm run lint   -> passed
npm run build  -> passed
```

The final production build is `dist/assets/index-DdC-1IOQ.js`. The only build warning is the existing chunk-size warning.

### Method

- Production build served by `vite preview` at `http://localhost:4173`.
- Headless Chrome through the Chrome DevTools Protocol.
- Desktop viewport: `1424x805`.
- Mobile viewport: `390x844` emulated metrics with a desktop user agent, matching the Phase 4 smoke method.
- Fresh Chrome profile per probe; browser cache cleared before the measured runs.
- The controlled A/B used the same build, viewport, cache state, and Lenis instance. It compared the inherited `0.1` lerp with explicit durations on the same CTA and menu targets.
- Programmatic completion was recorded from Lenis `onComplete`, not only from scroll samples. This avoids counting a late sample after a main-thread block as extra glide time.
- Raw probe output was produced outside the repository. The compact comparison is `changes/evidence/phase5-runtime.json`.

## Measured results

### Programmatic glide

The controlled A/B used the same target and page state:

| Test | Inherited lerp | Explicit `0.9s` | Native smooth reference |
| --- | --- | --- | --- |
| Enter Restaurant CTA | `1637.8ms` | `887.7ms` | `851.9ms` |
| Menu anchor | `1505.9ms` | `890.4ms` | not re-run |
| Menu anchor, actual click | not re-run | `897.2ms` | not re-run |
| Experience anchor, actual click | `1116.9ms` baseline click | `923.4ms` completion | not re-run |
| Footer Story anchor | `1380.7ms` baseline click | `842.1ms` after click | not re-run |
| Footer top | `1555.5ms` baseline click | `878.0ms` after click | not re-run |

The `0.9s` CTA is close to the native smooth reference and about `0.75s` shorter than the inherited lerp. The menu and footer jumps are also about `0.5s` to `0.7s` shorter. The Experience jump improves by about `0.19s`; it is a short jump, so the fixed duration is less dramatic there.

One earlier menu sample showed `1268ms` to the last sampled movement. The Lenis `onComplete` measurement was `890ms`. The difference came from menu image decode and layout work blocking the sampler for a few frames, not from a longer animation. The completion value is the one used above.

### Targets and history

Anchor targets include the existing `scroll-margin-top` of `104px` on desktop. The raw section top and the expected final position differ by that margin.

| Test | Raw target | Expected final | Final | Difference |
| --- | --- | --- | --- | --- |
| Enter Restaurant CTA | `2544.640625px` | `2544.640625px` | `2545px` | `+0.359375px` |
| Menu anchor | `5283.234375px` | `5179.234375px` | `5179px` | `-0.234375px` |
| Experience anchor | `6011.234375px` | `5907.234375px` | `5907px` | `-0.234375px` |
| Footer Story anchor | `2647.640625px` | `2543.640625px` | `2544px` | `+0.359375px` |
| Footer top | none | `0px` | `0px` | `0px` |

History behavior:

| Step | Hash | ScrollY | History length |
| --- | --- | --- | --- |
| Before back | `#experience` | `5907` | `4` |
| After back | `#menu` | `5179` | `4` |
| After forward | `#experience` | `5907` | `4` |

The hash and final targets match the Phase 4 values. The only change is the shorter animation.

### Wheel and hero

Four trusted `120px` wheel events at the top:

| Measurement | Baseline | After |
| --- | --- | --- |
| Distinct scroll positions | `46` | `50` |
| Final scrollY | `480` | `480` |
| Samples | `120` | `127` |

The final distance is unchanged and Lenis still produces many intermediate positions. The run-to-run count varies, but both runs show the wheel smoothing is still active. Only programmatic calls received the explicit duration.

Hero mapping during the CTA:

| Path | Max transient lag | Final `currentTime` | Final progress | End lag |
| --- | --- | --- | --- | --- |
| Inherited lerp | `6.38s` | `9.963333s` | `1` | about `0s` |
| Explicit `0.9s` | `7.53s` | `9.963333s` | `1` | about `0s` |
| Native smooth | `9.96s` | `9.963333s` | `1` | about `0s` |

The transient maximum is noisy and was highest on the native smooth path. The final frame is identical at `9.963333s` of `10.005s`. The hero mapping, seek coalescing, and final frame offset were not changed.

### Story and duplicate decode sources

The Story scheduler and decode guard were not changed.

| Run | Decodes | Visible frame changes | Max target lag | Duplicate decode sources | Duplicate load sources |
| --- | --- | --- | --- | --- | --- |
| Phase 5 baseline 1 | `51` | `55` | `0` frames | `0` | `0` |
| Phase 5 baseline 2 | `55` | `55` | `0` frames | `0` | `0` |
| Phase 5 baseline 3 | `55` | `55` | `1` frame | `0` | `0` |
| Phase 5 after 1 | `51` | `55` | `1` frame | `0` | `0` |
| Phase 5 after 2 | `55` | `55` | `1` frame | `0` | `0` |
| Phase 5 after 3 | `55` | `55` | `1` frame | `0` | `0` |

Phase 4 evidence:

- `changes/evidence/phase4-lenis-raw.json` forward run 1: frames `027`, `032`, and `034` each decoded and loaded twice.
- `changes/evidence/phase4-lenis-wheel-raw.json` reverse run 3: frames `017`, `012`, and `010` each decoded and loaded twice.
- The other Phase 4 runs showed none.

Phase 5 did not reproduce the anomaly. The probe counts duplicate sources across a whole run. A recycled pool layer can legitimately load the same frame again later, which is different from two concurrent decodes or a broken per-layer token. `WelcomeStory.jsx` still checks the layer token and `loading` flag before a load can reveal. Without a reproducible root cause, changing the decoder would be guesswork.

### Reduced motion

| Test | Completion | First sample within target | Distinct positions | Final / difference |
| --- | --- | --- | --- | --- |
| CTA | `0.3ms` | `0ms` | `1` | `2545px` / `+0.359375px` |
| Menu anchor | `0.3ms` | `0ms` | `1` | `5179px` / `-0.234375px` |

`respectReducedMotion: true` still forces immediate programmatic scrolling. When reduced motion is active, the explicit duration does not add a glide.

### Mobile

Emulated `390x844` with a desktop user agent:

| Test | Completion | Expected final | Final | Difference |
| --- | --- | --- | --- | --- |
| Enter Restaurant CTA | `900.5ms` | `2688.90625px` | `2689px` | `+0.09375px` |
| Menu anchor | `897.5ms` | `5247.671875px` | `5248px` | `+0.328125px` |

Mobile `scroll-margin-top` is `88px` and the header is `87px` tall. The expected values include that margin.

Fresh mobile deep links:

| Link | Final scrollY | Expected final | Difference |
| --- | --- | --- | --- |
| `#story` | `2688` | `2687.90625px` | `+0.09375px` |
| `#menu` | `5248` | `5247.671875px` | `+0.328125px` |

This is emulated mobile, not a real phone. No real-device improvement is claimed.

### Deep links

Fresh desktop loads:

| Build | Link | ScrollY | Expected final | Difference |
| --- | --- | --- | --- | --- |
| Before | `#story` | `0` | `2543.640625px` | `-2543.640625px` |
| Before | `#menu` | `0` | `5179.234375px` | `-5179.234375px` |
| After | `#story` | `2544` | `2543.640625px` | `+0.359375px` |
| After | `#menu` | `5179` | `5179.234375px` | `-0.234375px` |

The before events show why:

```text
#story: DOMContentLoaded 201.0ms, load 201.5ms, story exists false, scrollY 0
        story-appeared 392.8ms, scrollY 0
#menu:  DOMContentLoaded 247.8ms, load 248.5ms, menu exists false, scrollY 0
        menu-appeared 481.5ms, scrollY 0
```

After the repair, the target exists and the page has already moved when the section appears:

```text
#story: story-appeared 370.8ms, scrollY 2544
        scroll event 378.1ms, scrollY 2544
#menu:  menu-appeared 419.0ms, scrollY 5179
        scroll event 427.5ms, scrollY 5179
```

Both fresh deep links now land at the same positions as the corresponding normal anchor navigation. The initial-hash path does not call `pushState`.

## Observations

- Measured: the explicit `0.9s` duration cut the CTA from `1637.8ms` to `887.7ms`, the menu from `1505.9ms` to `890.4ms`, and the footer jumps by about `0.5s` to `0.7s`.
- Measured: final targets, hash values, history entries, sticky positions, reduced-motion targets, and the hero final frame all match the Phase 4 values.
- Measured: wheel smoothing is unchanged in behavior; four wheel events still reach `480px` through many intermediate positions.
- Measured: Story forward runs stayed within `1` frame of the target with no duplicate decode sources in six runs.
- Measured: fresh `#story` and `#menu` loads failed before the repair and both work after it. The Phase 4 `#menu` success was a same-document hash change.
- Observed: the initial hash repair lands after React mounts, not before first paint. That is the cost of fixing a client-rendered fragment target without adding server rendering or a static anchor placeholder.

## Limitations

- Headless desktop Chrome only. No real-device or physical touch testing.
- Mobile results use emulated `390x844` metrics with a desktop user agent.
- No throttled-network or low-end-CPU profile was run.
- The initial hash repair lands about `190ms` to `430ms` after load. It is not an SSR or pre-paint fix.
- The hero transient max lag is noisy across runs and was highest on the native smooth path. The final frame mapping is identical.
- The duplicate decode-source anomaly was not reproduced in Phase 5, so no decoder change was attempted.
- The controlled A/B was run once per duration. The completion values are more stable than the last sampled movement, but the hero lag remains timing-sensitive.

## Evidence

- `changes/evidence/phase5-runtime.json` - compact Phase 5 comparison, deep-link events, Story runs, reduced-motion and mobile checks.
- `changes/evidence/phase4-lenis-raw.json` - Phase 4 forward duplicate-source evidence.
- `changes/evidence/phase4-lenis-wheel-raw.json` - Phase 4 reverse duplicate-source evidence.
- `changes/evidence/phase4-deeplink-lenis.json` - Phase 4 deep-link result used with the Phase 4 probe order to identify the same-document `#menu` success.

No commit or push was made.
