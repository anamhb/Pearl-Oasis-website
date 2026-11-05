# Phase 8C: Hero scroll smoothness diagnostics

Date: 2026-10-30
Status: diagnosis complete. No application source, dependency, video asset, scroll setting or Hero behavior was changed. Nothing was committed or pushed.
Scope: the Phase 8B hero film on the entrance track, MP4 primary path and WebM fallback path.

## 1. Question

Phase 8B made the hero film select MP4 on H.264-capable browsers and WebM on browsers without H.264 (LT Browser 107). After that change the scroll-controlled film still reads as laggy, or as not following the scroll. This phase measures where the time goes: wheel input, Lenis smoothing, Hero progress, the target `currentTime`, the seek, and the displayed frame.

## 2. Environment and build

- Build: production `dist` from 2026-10-29 11:30:32, bundle `index-D--mgh8M.js`, served by `vite preview` at `http://127.0.0.1:4173/`.
- Chrome 156.0.8078.48, `--headless=new`, UA `HeadlessChrome/156.0.0.0`. MP4 path.
- LT Browser 107.0.5304.110, headless, UA `HeadlessChrome/107.0.5304.110`. WebM path.
- Viewport 1792x1120, DPR 1, desktop. Both browsers fully buffered the film before any scenario: `buffered [0, duration]`.
- MP4: 10.005 s, 1280x720, H.264, 1 s keyframe interval (`ki_1`).
- WebM: 10.000 s, 1280x720, VP9, SHA-256 `6148DF8E9B4C6695F39D6D3F0FF723A2E74F9F10B33AF7EB2CCD5F4978941B20`, 3,189,710 bytes (the Phase 8A.1 validated asset).
- Track: 3684 px tall, scroll distance 2564 px, 3.289 x viewport.

Mapping: 9.9633 s of playable film over 2564 px = 0.003887 s per px. A 100 px wheel step asks for 0.389 s, or 9.3 source frames. At 1000 px/s the film would need 93 source frames per second. `SEEK_EPSILON` is 1/24 s.

## 3. How the trace was captured

An out-of-repo CDP probe (temp directory, not the repo) recorded, per scenario:

- trusted wheel events and scroll events,
- a per-frame sample of `scrollY`, the desired media time computed with the same formula as the app, `video.currentTime`, `video.seeking`, `readyState` and buffered end,
- every assignment to `video.currentTime`,
- every `seeking` to `seeked` pair and its latency,
- `requestVideoFrameCallback` presentation data,
- `getVideoPlaybackQuality()` before and after,
- long tasks (`PerformanceObserver`) and per-rAF callback duration.

Two observation-only patches were installed before application code ran:

1. `HTMLMediaElement.prototype.currentTime` setter wrapper. It forwards to the native setter unchanged and records the assignment.
2. `window.requestAnimationFrame` wrapper. It calls the original callback with the same timestamp and `this`, and records duration.

Both keep ordering, values and timing. No app code, hook, ref or style was touched.

Scenarios (synthetic trusted wheel events at the viewport centre):

- `slow-forward`: 10 x 20 px steps, 200 ms apart.
- `gradual-forward`: 18 x 100 px steps, 100 ms apart.
- `gradual-reverse`: 18 x -100 px steps, 100 ms apart.
- `fast-jump-forward`: one 1800 px wheel event.
- `fast-jump-reverse`: one -1800 px wheel event.

Each scenario started after the film was fully buffered, and ended when the scroll had been still for 300 ms and the film had reached its target, or after a timeout.

## 4. Measurements

### 4.1 Chrome 156, MP4 (primary path)

| scenario | wheel to first scroll | scroll settle after last wheel | seeks | seek median / p95 | film updates per second | time seeking | displayed lag median / max (frames) | film catch-up after last wheel | long tasks |
|---|---|---|---|---|---|---|---|---|---|
| slow-forward | 26 ms | 651 ms | 15 | 203 / 306 ms | 3.39 | 65% | 1.6 / 3.4 | 543 ms | 0 |
| gradual-forward | 26 ms | 958 ms | 17 | 266 / 415 ms | 3.13 | 85% | 10.9 / 28.4 | 880 ms | 0 |
| gradual-reverse | 26 ms | 955 ms | 20 | 198 / 391 ms | 3.60 | 85% | 9.0 / 37.9 | 825 ms | 0 |
| fast-jump-forward | 26 ms | 1388 ms | 6 | 149 / 374 ms | 2.92 | 50% | 1.5 / 112.5 (mid-flight) | 1070 ms | 0 |
| fast-jump-reverse | 27 ms | 1390 ms | 8 | 166 / 296 ms | 3.95 | 60% | 1.2 / 101.0 (mid-flight) | 1236 ms | 0 |

Supporting numbers:

- rAF callbacks: median 0.1 ms, max 0.8-5.3 ms. Frame cadence 25.9 ms median (headless), p95 26-28 ms.
- `getVideoPlaybackQuality`: 98-312 decoded frames per scenario, 0 dropped, 0 corrupted.
- rVFC: one presented frame per completed seek. Frame interval median 155-286 ms. Seeked to matching frame median 5-184 ms where a match was found.
- Media advanced per seek: 0.05 s at slow scroll (about 1.2 frames), 0.28-0.40 s at normal speed (7-10 frames), up to 0.88 s in one step.

### 4.2 LT Browser 107, WebM (fallback path)

| scenario | wheel to first scroll | scroll settle after last wheel | seeks | seek median / p95 | film updates per second | time seeking | displayed lag median / max (frames) | film catch-up after last wheel | long tasks |
|---|---|---|---|---|---|---|---|---|---|
| slow-forward | 102 ms | 736 ms | 9 | 877 / 3386 ms | 0.51 | 60% | 2.6 / 6.6 | 4337 ms | 165, 17.9 s |
| gradual-forward | 137 ms | 917 ms | 22 | 782 / 1558 ms | 0.96 | 82% | 9.4 / 18.9 | 1903 ms | 186, 22.8 s |
| gradual-reverse | 132 ms | 826 ms | 21 | 1081 / 2717 ms | 0.65 | 82% | 8.8 / 22.2 | 1845 ms | 276, 32.3 s |
| fast-jump-forward | 96 ms | 1396 ms | 3 | 1463 / 1567 ms | 0.58 | 63% | 23.4 / 51.4 | 3466 ms | 48, 5.3 s |
| fast-jump-reverse | 102 ms | 1243 ms | 3 | 1473 / 2220 ms | 0.41 | 57% | 1.3 / 40.3 | 4293 ms | 69, 7.7 s |

Supporting numbers:

- The last seek ended 2.13-4.61 s after the last wheel event. The film reached its final frame 1.85-4.34 s after the last wheel.
- rVFC: 3-22 presented frames per scenario. Frame interval median 841-2176 ms. Seeked to matching frame median 733-1279 ms where matched.
- rAF callbacks: median 0.1 ms, max 1.9-10 ms. Frame gaps median 103-109 ms, every one above 33 ms.
- `getVideoPlaybackQuality`: 61-329 decoded frames, 0 dropped, 0 corrupted.
- `seeked` often fired at `readyState` 1 (HAVE_METADATA): 5 of 9 in slow-forward, 15 of 21 in gradual-forward, 7 of 19 in gradual-reverse. Chrome MP4 and Chrome WebM always fired at 4 (HAVE_ENOUGH_DATA).

### 4.3 Same browser, both codecs (Chrome 156)

To separate codec from browser version, Chrome 156 loaded the byte-identical WebM through a local request fulfilment. The URL and the app's source selection were kept; only the response body came from the validated local file. Media was fully buffered before the scenarios.

| scenario | MP4 seek median | WebM seek median | MP4 updates/s | WebM updates/s |
|---|---|---|---|---|
| slow-forward | 203 ms | 944 ms | 3.39 | 0.75 |
| gradual-forward | 266 ms | 1721 ms | 3.13 | 0.54 |
| gradual-reverse | 198 ms | 1747 ms | 3.60 | 0.62 |
| fast-jump-forward | 149 ms | 1825 ms | 2.92 | 0.46 |
| fast-jump-reverse | 166 ms | 1604 ms | 3.95 | 0.34 |

Chrome 156 WebM also showed the post-input trail: the last seek ended 2.44-3.85 s after the last wheel, and the film reached its final frame 2.13-3.22 s after the last wheel.

This is the cleanest comparison in the phase: same browser, same viewport, same machine, same 10 s 1280x720 asset pair. The WebM path seeks 5 to 12 times slower than the MP4 path.

### 4.4 Environment variance

Chrome MP4 seek medians varied between runs: 110 ms (first run), 150-270 ms (fresh run used above), and 2.4-5.6 s in one run taken while several probe browsers and the preview server were competing for the machine. The WebM numbers were stable in direction but not in magnitude: 0.78-1.47 s in LT 107, 0.94-1.83 s in Chrome 156. Treat the absolute values as order-of-magnitude and the codec gap as the reliable result.

## 5. Trace: wheel to displayed frame

1. Wheel: Lenis receives the trusted event. Chrome starts moving the page 26 ms later; LT 107 starts 96-137 ms later because its main thread is already busy.
2. Lenis: the page keeps easing after the last wheel. Settle is 624-1396 ms on both paths. This is intentional smoothing, not a defect.
3. Hero update: the rAF-coalesced scroll handler computes progress and calls `applyVideoProgress`. The handler itself is cheap: rAF callback median 0.1 ms on both paths.
4. Guard: `if (video.seeking) return;` then the frame epsilon check at `EntranceExperience.jsx:160-164`.
5. Seek: one assignment to `video.currentTime`. On completion, `seeked` immediately applies the newest progress.
6. Frame: rVFC reports when a frame with the new media time is presented.

On the MP4 path the loop completes in 149-266 ms per update. On the WebM path it completes in 782-1825 ms per update, and the film is always one seek behind a moving target.

## 6. Attribution

### Seeking

- MP4 in Chrome 156: 149-266 ms median, 296-415 ms p95. Time seeking 50-85% of the scenario. One presented frame per seek, so the film updates 2.9-4.0 times per second.
- WebM in LT 107: 782-1473 ms median, up to 3.4 s. Time seeking 57-82%. The film updates 0.4-1.0 times per second.
- WebM in Chrome 156: 944-1825 ms median. The film updates 0.3-0.8 times per second.
- The codec comparison in section 4.3 rules out browser version and machine as the main cause: the same Chrome 156 seeks the WebM 5-12 times slower than the MP4.

### Scroll smoothing

- Lenis settle after the last wheel is 624-1396 ms on both paths, and it is the same on both. It is a large part of the visible post-input motion in Chrome, where the film otherwise catches up in 543-1236 ms.
- On the WebM path the film keeps catching up for 1.85-4.34 s, well beyond the 0.74-1.40 s Lenis settle. There the seek cost, not smoothing, is the dominant term.

### Rendering and main thread

- Chrome MP4: 0 long tasks in every scenario. rAF max 5.3 ms. Frame cadence 25.9 ms. Presentation of a seeked frame is fast where measured (5-184 ms median). Rendering is not the bottleneck.
- LT 107 WebM: 48-276 long tasks per scenario, 5.3-32.3 s in total, individual tasks up to 447 ms. Frame gaps median 103-109 ms, all above 33 ms. rVFC presentation of a seeked frame is 733-1279 ms median. The app's own rAF work stays at 0.1 ms, so the long tasks come from the media pipeline (software VP9 decode and seek), not from the Hero scroll handler.
- Chrome 156 WebM: 0-6 long tasks, up to 495 ms total, frame cadence 26 ms. The decode is off the main thread there, but each seek still costs about 1 s.

### Guard behaviour

The code comment at `EntranceExperience.jsx:146-150` states that only one seek is allowed in flight and that this avoids cancelling and restarting seeks. That held on Chrome MP4 (0 assignments inside an active seek in every scenario) and on Chrome 156 WebM (0 in every scenario). It did not hold on LT 107 WebM: 4, 16, 6, 0 and 1 assignments landed inside an active `seeking` to `seeked` window per scenario, while `video.seeking` read false at assignment time. One LT example: a seek started at 5960.8 ms for 0.2913 s, an assignment for 0.3767 s arrived at 6652.2 ms with `seeking === false`, and the same seek reported `seeked` at 6781.6 ms with `currentTime` 0.3767 s. The seek was retargeted mid-flight.

In LT 107 many `seeked` events also arrived at `readyState` 1, so the next assignment could preempt a decode that had not produced a frame yet. In Chrome MP4 every `seeked` arrived at `readyState` 4, and in Chrome WebM too, so this part is specific to Chromium 107.

This is a real amplifier on the LT path. It is not the root cause of the 1 s seek cost, but it makes the cost worse by cancelling and restarting decode work.

## 7. Expected frame stepping vs real stutter

- Slow scroll: Chrome made 15 seeks for 0.77 s of film (18.4 frames), so each update advanced about 1.2 frames. That is correct frame stepping. LT made 9 seeks for about 0.73 s (17.5 frames), about 1.9 frames per update, also close to frame level; the problem is that each step took 0.4-3.4 s.
- Normal and fast scroll: Chrome advanced 0.28-0.40 s (7-10 frames) per update and updated 2.9-4.0 times per second. LT advanced 0.36-0.37 s (about 9 frames) per update but updated 0.4-1.0 times per second. Skipping frames during a fast scrub is expected; the stutter is the low update rate and the trailing lag, not a wrong frame.
- A single 1800 px jump asked for about 7 s of film in one gesture. The film cannot present that as motion at any update rate; it settles on the target. The measured 2.1-5.1 s lag mid-flight is the expected cost of that gesture, but the 1.9-4.3 s catch-up afterwards is not.

## 8. Most likely root cause

The WebM fallback cannot seek fast enough on this machine. A paused VP9 seek costs about 0.8-1.8 s (up to 3.4 s under load), against 0.15-0.27 s for the MP4 in the same Chrome 156. The app allows one seek at a time, so the film's update rate is capped at one divided by the seek latency: about 0.3-1.0 update per second on WebM against 3-4 per second on MP4. During a normal scroll the film is one seek behind; after the wheel stops it keeps catching up for 1.9-4.3 s, which is the "does not follow the scroll" behaviour.

The second cause, specific to LT 107, is that the VP9 decode and seek work blocks the renderer main thread: 48-276 long tasks and 5.3-32.3 s of long-task time per scenario. That delays Lenis's first movement to 96-137 ms, stretches frame gaps to about 105 ms, and delays frame presentation by 0.7-1.3 s after `seeked`.

Scroll smoothing is not the main cause. Lenis behaves the same on both paths (0.62-1.40 s settle) and the Hero's own scroll handler is 0.1 ms. On the MP4 path, Lenis is the largest remaining term, and the film catches up within 0.5-1.2 s. On the WebM path the film trails the scroll for 1.9-4.3 s against a 0.6-1.4 s glide, so the seek cost dominates.

Rendering is not the bottleneck on either path. Chrome MP4 has zero long tasks and 0 dropped frames; LT's rendering problems are a symptom of the media pipeline, not of the Hero scroll code.

## 9. Smallest justified fix

The measurements do not support adding Lenis smoothing or lowering video quality:

- More smoothing would lengthen the post-input glide the film has to chase. The glide is already 0.62-1.40 s, and on the WebM path the film trails it by seconds.
- The seek cost does not scale with seek distance in the loaded WebM run (correlation between distance and duration was -0.04 in LT gradual-forward), so resolution or bitrate reduction is not guaranteed to fix the 1 s per-seek cost and should not be adopted on assumption.

Two changes are justified, smallest first:

1. Code, small: enforce the one-seek-in-flight rule with a synchronous ref, not with `video.seeking`. Set the ref immediately before assigning `video.currentTime`, clear it on `seeked` (and on `error`, `emptied` and source change), and check it in `applyVideoProgress`. Measured basis: up to 16 assignments per LT scenario landed inside an active seek while `video.seeking` read false. This stops the app from cancelling and restarting decode work on the slow path, and it is a small, local change in `EntranceExperience.jsx` that does not alter the scroll mapping or the visual design.

   A `readyState` gate is not part of this fix. In LT, `seeked` and `canplay` both arrived at `readyState` 1, and `loadeddata` did not fire per seek, so gating on `readyState >= 2` would stall the chain. If decoder starvation persists after the ref fix, the next thing to measure is gating on a presented frame (`requestVideoFrameCallback`) instead of on `readyState`. That is a larger change and was not tested.

2. Asset, only if the fallback must approach the MP4's feel: give the WebM a cheaper seek. The same-browser comparison shows the asset, not the browser, sets the 1 s cost. Test one variant with denser keyframes (for example every 0.25-0.5 s) and one all-intra variant, and measure the same five scenarios before adopting either. The MP4 data shows GOP offset drives seek cost (r = 0.65-0.84 in the continuous scenarios), and Chrome 156 WebM shows the same (r = 0.69-0.93), so keyframe density is the first thing to test; the loaded LT run shows the cost becomes backlog-dominated (r = 0.02), so keyframe density alone may not be enough. Do not treat this as a quality reduction: the test is about seek structure, and it must be measured.

If neither change brings the fallback under about 0.3 s per seek, the remaining option is to stop using seek-based scrubbing on that path (a pre-decoded frame sequence or a static frame with the copy hand-over), which is a larger change than this phase should prescribe.

## 10. Limitations and NOT TESTED

- Headless browsers only. Both runs used headless Chromium builds with software decode. A headed LT Browser or Chrome with hardware VP9 decode may seek faster. NOT TESTED: headed browsers, GPU decode, real display at 60 Hz.
- Input was synthetic trusted wheel events. Trackpad momentum, touch, and keyboard scrolling were NOT TESTED.
- The Chrome WebM comparison used a local byte-identical response to remove Cloudinary variance. The bytes and the URL were the same; the network path was not. The local fulfilment also made the initial buffer slow (39 s) although the media was fully buffered before the scenarios. One earlier Cloudinary WebM run was fully buffered and showed the same 1.0-2.1 s seek range, but its JSON was overwritten by a failed re-run, so only the local run is reported in full.
- The machine was shared with other browser processes. One Chrome MP4 run measured 2.4-5.6 s per seek under contention. The reported MP4 run was taken with a fresh browser and is consistent with the earlier 110 ms run; the variance is stated in section 4.4.
- Mobile, Safari, Firefox, and reduced-motion mode were NOT TESTED; the complaint and the Phase 8B change are desktop.
- The proposed code and asset changes were NOT implemented or measured in this phase.
- No visual screenshots were captured; this phase measures timing, not appearance.

## 11. Evidence

Temp directory (outside the repo): `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c\`

- `probe.cjs`: CDP probe (instrumentation, scenarios, analysis).
- `phase8c-chrome156.json` and `.raw.json`: Chrome 156 MP4, fresh run.
- `phase8c-ltb107.json` and `.raw.json`: LT Browser 107 WebM, fresh run.
- `phase8c-chrome156-webm-local.json` and `.raw.json`: Chrome 156 WebM, local byte-identical fulfilment.
- `summarize.cjs`, `summary2.cjs`, `abs.cjs`, `seekstats.cjs`, `gop.cjs`, `timeline.cjs`: analysis helpers.

Repo state: `git status --short` is empty; HEAD is `bb96c7f`. This report is the only new file. No commit or push.
