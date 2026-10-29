# Phase 3: Story frame sequence

## Scope

Only `src/components/sections/WelcomeStory.jsx` was investigated and changed.

Preserved:

- 56 frames, in order
- 212vh story track
- existing scroll-to-frame mapping
- copy timing and reduced-motion behavior
- responsive layout and the 5-frame desktop / 4-frame narrow pool
- Phase 1 and Phase 2 work

Not done:

- no preload of all 56 full-resolution frames
- no video replacement
- no Lenis or GSAP work
- no commit or push

## Frame audit

All frames in `public/video-frames-second/` are JPEG, `1280x720`, `ezgif-frame-001.jpg` through `ezgif-frame-056.jpg`.

| Frames | Format | Dimensions | Total bytes | Total | Min | Max | Average |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 56 | JPEG | 1280x720 | 2,101,864 | 2.00 MiB / 2.10 MB | 26,245 | 115,748 | 37,533 |

At the measured viewport (`1424x805`) the story track was `1707px` tall and the scroll distance was `902px`.

## Method

A CDP probe instrumented the live page:

- `HTMLImageElement.decode()` calls and durations
- image `load` and `error` events
- `MutationObserver` on the five story layers for visible-frame changes
- rAF samples of scroll progress, target frame, and visible frame
- `PerformanceResourceTiming` entries for frame requests
- CDP `Network` events for request priority, failures, and cancellations

Scenarios:

1. Forward scrub: progress `0` to `1` over `3000ms`, then settle.
2. Reverse scrub: progress `1` to `0` over `3000ms`, then settle.
3. Large jumps: `0.1 -> 0.6 -> 0.95 -> 0.05 -> 0.8`.
4. Repeated entry/exit: scroll to the hero top, wait for release, re-enter at `0.75`, `0.1`, and `0.9`.

The final run used the production build through `vite preview` on `http://127.0.0.1:4173`, a fresh browser profile, and a warm OS file cache. The dev-server runs used fresh browser profiles as well, but the Vite dev server showed large run-to-run variance.

## Findings

### Confirmed: cached frames were decoded twice

The original `loadLayer()` called `decode()` from both the `complete` path and the `onload` path. When a frame was already cached, both paths ran for the same load.

Measured on the original component, warm dev server, reverse scrub:

- 51 image loads
- 102 `decode()` calls
- every frame from `001` to `051` appeared twice in the duplicate-source list
- decode median `2.0ms`, max `50.1ms`

After the fix, production preview reverse scrub:

- 51 image loads
- 51 `decode()` calls
- 0 duplicate decode sources
- decode median `3.8ms`, max `12.7ms`

The duplicate work was real, but decode is not the main scroll bottleneck. The fix removes redundant main-thread work on cached frames; it is not a claim of a large frame-rate gain.

### Confirmed: no duplicate frame requests within a scenario

Within each measured scenario, every requested frame URL was unique:

- forward: `44` requests, `44` unique, `0` duplicate URLs
- reverse: `7` requests, `7` unique, `0` duplicate URLs
- large jumps: `18` requests, `18` unique, `0` duplicate URLs
- entry/exit: `18` requests, `18` unique, `0` duplicate URLs

Across the whole production probe there were `96` frame requests for `56` unique URLs, so `40` repeats occurred across scenarios. These are re-entry, pool recycling, and cache reuse, not duplicate in-flight requests. One request was canceled during the run, consistent with `releaseIdleLayers()` removing the active layer's neighbors on exit.

### Confirmed: exit release works

On each production exit, exactly one story image kept a `src` and `opacity: 1`; the other four had `src: null` and `opacity: 0`.

The active frame is intentionally retained. Re-entry therefore shows that stale frame until the new target decodes. Measured stale-frame time in production:

| Entry target | Stale frame shown first | Time to target |
| --- | --- | --- |
| 41 | 0 | 77.2ms |
| 6 | 0 | 58.8ms |
| 49 | 0 | 65.7ms |

This is a deliberate trade-off: a short stale frame instead of a blank stage. On a slower network the stale period will be longer.

### Not confirmed as a general scheduler bug: reverse and large-jump lag

The first cold dev run showed severe lag:

- forward: 14 downloads, `790-1698ms` each, max lag `40` frames
- reverse: 6 downloads, `811-2371ms` each, frames `40`, `41`, `52`, and `53` requested but never visible
- visible frame stayed on `55`/`51` for long stretches

The same original component, rerun with a fresh browser cache but a warm OS file cache, showed:

- forward: 51 downloads, `4-188ms` each, all 55 measured frame positions visible, max lag `1`
- reverse: 0 downloads, all frames visible, max lag `0`

The cold run was dominated by server and file-cache cost, not by a deterministic reverse-scheduling defect. The production preview behaved like the warm run: forward max lag `8`, reverse max lag `2`.

Large jumps followed the same pattern:

- cold dev, 1.5s timeout: target `33` did not become visible before the next jump
- production: targets `33`, `52`, `3`, and `44` became visible in `243.6ms`, `53.7ms`, `36.1ms`, and `117ms`

### Rejected: canceling in-flight prefetch and changing fetch priority

A trial version canceled in-flight prefetch frames behind a new target and set prefetch requests to `auto` priority. On the warm dev run it caused:

- 14 canceled prefetches during the forward scrub
- visible frames `24-34` skipped
- max lag `11`, versus max lag `1` for the original warm run

That is a regression against the original behavior, so the trial was reverted. The final code does not cancel in-flight loads or change request priority.

The current code still requests every frame at high priority. In the cold dev run, `38` of `39` frame requests were `High`. That may matter on a constrained connection, but it was not changed without a controlled slow-network test.

### Not changed: pool size on breakpoint changes

`poolSizeRef` is still set only at mount. A breakpoint or pointer change does not resize the prefetch pool. This is a source-level limitation, not a measured scroll defect, so it was left alone. Memory remains bounded at 5 desktop layers / 4 narrow layers.

### Not changed: decode fallback covers decode, not download

The `300ms` fallback starts after `onload`, so it covers a slow `decode()`, not a slow download. The cold run showed download is the dominant cost, but changing the fallback would not make a missing image arrive sooner. It was not changed.

## Change

Only one code change was kept.

`loadLayer()` now shares one `startDecode()` path between the `onload` handler and the `complete` branch. A per-load `decodeStarted` flag prevents the second `decode()` call, and both paths set the existing `DECODE_FALLBACK_MS` timer.

```js
let decodeStarted = false;
const startDecode = () => {
  if (decodeStarted) return;
  decodeStarted = true;
  layer.timer = window.setTimeout(finish, DECODE_FALLBACK_MS);
  if (typeof node.decode === 'function') node.decode().then(finish, finish);
  else finish();
};

node.onload = () => {
  if (layer.token !== token) return;
  startDecode();
};
node.onerror = fail;
node.src = src;

if (node.complete && node.naturalWidth > 0 && node.currentSrc.endsWith(src)) {
  startDecode();
}
```

No frame, order, height, scroll mapping, copy timing, responsive rule, or reduced-motion branch changed.

## Validation

- `npm run lint` (`tsc --noEmit`): passed.
- `npm run build` (`vite build`): passed.
  - Vite `8.3.4`
  - 1685 modules transformed
  - built in `28.58s`
  - existing chunk-size warning remains for the main JS bundle (`901.37 kB`, gzip `242.13 kB`); not introduced by this change.

Production preview measurements:

| Scenario | Downloads | Download median | Decode median | Visible frames | Max lag | Average lag | Lag at end |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Forward | 44 | 59.0ms | 8.2ms | 46 | 8 frames | 1.25 frames | 0 |
| Reverse | 7 | 68.5ms | 3.8ms | 54 | 2 frames | 0.04 frames | 0 |

The forward run requested frames `25` and `45` but did not display them; the reverse run requested `39` and `40` but did not display them. These were prefetch-only frames, not reordered or duplicated frames.

The large-jump summary reports a max lag of `49` frames, but that number is an artifact of comparing the immediate pre-jump frame with the new target. The meaningful number is the time until the target appears, listed above.

## Limitations

- No real-device, mobile, or throttled-network run. The measurements are headless Chrome at `1424x805` against a local static preview.
- The Vite dev server was too variable for a controlled wall-clock comparison. The cold and warm dev runs are context, not a before/after benchmark.
- Download/queue time dominates decode time in the cold run. The Story sequence can still skip intermediate frames on a slow connection; the pool is intentionally bounded.
- The active frame is kept on exit. Re-entry can show a stale frame for roughly `60-77ms` in the production preview, longer on a slow network.
- Pool size is not recomputed on breakpoint or pointer changes.
- No commit or push was made.

## Evidence

- `changes/evidence/phase3-runtime.json`: summarized metrics and comparison.
- `changes/evidence/phase3-prod-raw.json`: raw production-preview probe.
- `changes/evidence/phase3-baseline-warm-raw.json`: raw original-component warm dev probe, used for the duplicate-decode comparison.
