# Phase 8C.1: Hero seek synchronization fix

Date: 2026-11-02

Status: **PASS** for the seek synchronization fix in the controlled browser tests. The MP4 path keeps H.264 and the WebM path keeps VP9. The main result is that no scroll update assigned `video.currentTime` while a previous seek was still active, including in LT Browser 107 where `video.seeking` reads false during an active seek. An independent re-run on 2026-11-03 against a fresh production build re-confirmed the result; see section 9.

Scope: `src/components/3d/EntranceExperience.jsx` and this report only. No Lenis settings, scroll mapping, track height, poster, CTA, handover, video asset, encoding, dependency, or unrelated component was changed. Nothing was committed or pushed.

## 1. Problem

Phase 8C found that the old guard could retarget a seek in flight:

```js
if (video.seeking) return;
video.currentTime = target;
```

In LT Browser 107 with the WebM, `video.seeking` sometimes read false while the previous seek was still decoding. A new assignment then cancelled or restarted that seek. The Phase 8C baseline measured 4, 16, 6, 0 and 1 assignments inside an active `seeking` to `seeked` window across the five scenarios.

## 2. Change

The new guard is synchronous and ref based. `video.seeking` is no longer the synchronization signal.

1. `seekInFlightRef` is set to true before `video.currentTime` is assigned.
2. While it is true, `applyVideoProgress` stores the latest target in `pendingSeekTargetRef` and returns. It does not assign another timestamp.
3. On `seeked`, the guard is released. The pending target is applied only if it is more than one source frame (`SEEK_EPSILON`, 1/24 s) from the current time.
4. `startSeek` clamps the target to the film range and checks the frame epsilon before assigning, so a second seek is not issued for a nearly identical time.
5. A generation token invalidates in-flight state across source changes, metadata reloads, media errors, `emptied` events and unmount. A stale `seeked` from an old source cannot release the new source's guard.
6. `handleVideoSeeked` also checks the current media source and the event timestamp against the current source's metadata time before accepting the event.
7. `loadedmetadata` resets the media state and reapplies the retained scroll progress. `canplay` refreshes metadata without resetting an active seek.
8. `error` and `emptied` reset the guard before the existing MP4 to WebM fallback and WebM recovery logic runs.

The existing Phase 8C.3 WebM recovery, MP4 primary selection, poster, handover and scroll mapping were preserved. The working tree also contains the Phase 8C.3 recovery that was already present before this phase; this report does not claim it as new work.

## 3. Environment and build

- Production `dist` served by `vite preview` at `http://127.0.0.1:4174/`.
- Bundle: `dist/assets/index-DxGcm4DY.js` (926,852 bytes).
- Chrome 156.0.8078.48, `--headless=new`, UA `HeadlessChrome/156.0.0.0`. MP4 path.
- LT Browser 107.0.5304.110, headless, UA `HeadlessChrome/107.0.5304.110`. WebM path.
- Viewport 1792x1120, DPR 1. Both paths fully buffered the film before the scenarios.
- `npm run lint` (`tsc --noEmit`) passed.
- `npm run build` passed. The only warning was the existing bundle size warning.

The probe wraps `HTMLMediaElement.prototype.currentTime` and `requestAnimationFrame` for observation only. It forwards every call unchanged and records timestamps. No application code was patched by the probe.

Scenarios match Phase 8C except for one addition:

- `slow-forward`: 10 wheel steps of 20 px, 200 ms apart.
- `gradual-forward`: 18 wheel steps of 100 px, 100 ms apart.
- `gradual-reverse`: 18 wheel steps of -100 px, 100 ms apart.
- `fast-jump-forward`: one 1800 px wheel step.
- `fast-jump-reverse`: one -1800 px wheel step.
- `wheel-stop-catch-up`: six 300 px wheel steps 40 ms apart, then no input. This scenario was not in the Phase 8C baseline.

Metrics:

- **Assignments**: writes to `video.currentTime`.
- **Completed seeks**: `seeked` events.
- **During seek**: assignments whose timestamp is strictly between a `seeking` and its matching `seeked`. This is the Phase 8C guard metric.
- **Film updates/s**: presented `requestVideoFrameCallback` frames divided by scenario wall time. Wall time includes CDP wheel dispatch latency, so absolute rates are not a controlled throughput benchmark.
- **Last seek**: time from the last wheel event to the last `seeked`.
- **Final frame**: time from the last wheel event to the first presented frame within one source frame of the final target. `n/a` means no matching frame was observed before the probe stopped.

## 4. Results

### 4.1 LT Browser 107, WebM

| scenario | assignments (base -> new) | completed seeks (base -> new) | during seek (base -> new) | film updates/s (base -> new) | last seek ms (base -> new) | final frame ms (base -> new) |
|---|---|---|---|---|---|---|
| slow-forward | 9 -> 11 | 9 -> 11 | 4 -> **0** | 0.51 -> 0.42 | 4606 -> 3143 | 4337 -> n/a |
| gradual-forward | 22 -> 21 | 22 -> 21 | 16 -> **0** | 0.96 -> 1.11 | 2129 -> 2745 | 1903 -> 2402 |
| gradual-reverse | 21 -> 21 | 21 -> 21 | 6 -> **0** | 0.65 -> 0.89 | 2147 -> 2594 | 1845 -> 2353 |
| fast-jump-forward | 3 -> 3 | 3 -> 3 | 0 -> **0** | 0.58 -> 0.84 | 3741 -> 2617 | 3466 -> 2534 |
| fast-jump-reverse | 3 -> 3 | 3 -> 3 | 1 -> **0** | 0.41 -> 0.44 | 4523 -> 5747 | 4293 -> 5467 |
| wheel-stop-catch-up | not run -> 6 | not run -> 6 | not run -> **0** | not run -> 0.69 | not run -> 2377 | not run -> 1982 |

Seek duration medians (base -> new): slow-forward 877 -> 1128 ms, gradual-forward 782 -> 472 ms, gradual-reverse 1081 -> 748 ms, fast-jump-forward 1463 -> 752 ms, fast-jump-reverse 1473 -> 1545 ms.

What this shows:

- The retargeting is gone on the WebM path. All five baseline scenarios now report 0 assignments inside an active seek.
- Completed seeks remain close to the baseline count: 11 vs 9, 21 vs 22, 21 vs 21, 3 vs 3, 3 vs 3.
- The film updates faster in gradual-forward, gradual-reverse and fast-jump-forward. Slow-forward and fast-jump-reverse are within the run-to-run variation of the WebM path.
- Catch-up is mixed: better in slow-forward and fast-jump-forward, about 0.5 to 0.6 s slower in gradual-forward, gradual-reverse and fast-jump-reverse, and 1.98 s to the final frame for the new wheel-stop case.
- The slow-forward final frame is listed as `n/a` because the last seek ended at 3.14 s but the probe stopped before a frame within one source frame of the final target was observed. The final `currentTime` was within one frame of the requested target.

### 4.2 Chrome 156, MP4

| scenario | assignments (base -> new) | completed seeks (base -> new) | during seek (base -> new) | film updates/s (base -> new) | last seek ms (base -> new) | final frame ms (base -> new) |
|---|---|---|---|---|---|---|
| slow-forward | 15 -> 13 | 15 -> 13 | 0 -> **0** | 3.39 -> 2.38 | 602 -> 238 | 543 -> n/a |
| gradual-forward | 17 -> 44 | 17 -> 44 | 0 -> **0** | 3.13 -> 3.96 | 919 -> 578 | 880 -> n/a |
| gradual-reverse | 20 -> 46 | 20 -> 46 | 0 -> **0** | 3.60 -> 4.99 | 857 -> 659 | 825 -> 626 |
| fast-jump-forward | 6 -> 6 | 6 -> 6 | 0 -> **0** | 2.92 -> 2.89 | 1070 -> 1128 | n/a -> n/a |
| fast-jump-reverse | 8 -> 6 | 8 -> 6 | 0 -> **0** | 3.95 -> 2.93 | 1251 -> 1180 | 1236 -> 1151 |
| wheel-stop-catch-up | not run -> 18 | not run -> 18 | not run -> **0** | not run -> 4.55 | not run -> 1033 | not run -> 1057 |

Seek duration medians (base -> new): slow-forward 203 -> 96 ms, gradual-forward 266 -> 155 ms, gradual-reverse 198 -> 129 ms, fast-jump-forward 149 -> 172 ms, fast-jump-reverse 166 -> 221 ms.

What this shows:

- The MP4 remains the selected source. The media element stayed on the MP4 URL, `readyState` reached 4, and the duration stayed 10.005 s.
- No assignment landed inside an active seek. This was already true on Chrome MP4 in Phase 8C and remains true.
- The gradual runs completed more seeks and presented more frames per second. The guard now processes the latest target after every completed seek instead of letting `video.seeking` drop updates. That is a measured tradeoff, not a synchronization failure.
- Long tasks increased in the gradual runs (0 to 19 in gradual-forward and 0 to 18 in gradual-reverse). The Hero rAF callback itself stayed at 0.1 ms median. The extra work is in the media pipeline, consistent with the higher seek and frame rate. Lenis settle remained in the same 0.63 to 1.40 s range.
- The slow-forward and gradual-forward final frame entries are `n/a` because no presented frame within one source frame of the final target was observed before the probe stopped. The final `currentTime` was within one frame of the target, and the last seek ended 238 ms and 578 ms after the last wheel.

## 5. Source swap and stale seek check

This was tested in LT Browser 107 by simulating a media format error 4 on the base WebM and letting the existing Phase 8C.3 recovery load the same URL with `?recovery=1`.

- `loadCalls`: 1.
- Source after recovery: `...hero-lobby-20261029-vp9-6148df8e.webm?recovery=1`.
- Scroll progress before recovery: 0.4680, `currentTime` 4.660686.
- `currentTime` after recovery metadata: 4.660686 at `readyState` 1, so the scroll position was preserved.
- After recovery, gradual scroll assigned 8 timestamps and completed 8 seeks, reverse assigned 13 and completed 13, and the large jump assigned 14 and completed 14.
- No assignment landed inside an active seek window in any post-recovery scenario.
- A second simulated error 4 on the recovery URL did not change the source, `loadCalls` stayed 1, and no recovery loop occurred.

This is a controlled synthetic source swap. It is not the original nondeterministic two-preview cache race from Phase 8C.2.

## 6. PASS / FAIL

- **PASS**: synchronous ref guard is set before every `currentTime` assignment.
- **PASS**: latest scroll target is coalesced while a seek is in flight.
- **PASS**: `seeked` releases the guard and applies the latest pending target only when it differs by more than one source frame.
- **PASS**: LT 107 WebM retargeting dropped from 4/16/6/0/1 to 0/0/0/0/0.
- **PASS**: Chrome 156 keeps the MP4 and reports 0 assignments inside an active seek.
- **PASS**: gradual forward, reverse, large jumps and wheel-stop catch-up all reached a `currentTime` within one frame of the requested target.
- **PASS**: source change, metadata reload, error, `emptied` and cleanup invalidate the old seek state. The synthetic recovery run had no mid-flight assignments after the swap.
- **PASS**: `npm run lint` and `npm run build`.
- **PASS with tradeoff**: Chrome MP4 gradual runs now complete more seeks (17/20 -> 44/46) and show more media long tasks. This follows from processing every completed seek instead of dropping updates. The Hero rAF work and Lenis timing were not changed.
- **FAIL**: none in the tested scope.

## 7. Not tested

- Headed LT Browser or headed Chrome, hardware VP9/H.264 decode, GPU decode, a real 60 Hz display.
- The live Vercel deployment. This build is local only.
- The original two-preview media cache race. The source-swap test was a controlled synthetic error.
- macOS, Safari, Firefox, mobile, DPR 2, trackpad momentum, touch scrolling and keyboard scrolling.
- Visual frame-by-frame smoothness, screenshots, Hero layout, CTA, handover, reduced motion and poster behavior were inspected by diff only, not re-captured.
- The MP4 to WebM fallback error path was not re-run in this phase. The existing Phase 8C.3 recovery test was run for the WebM source swap.
- Absolute seek and update rates are order-of-magnitude numbers. The machine was shared with other browser processes, and Phase 8C already recorded large seek-time variance under contention.

## 8. Artifacts

- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c1\probe.cjs`: observation-only seek probe with the added wheel-stop scenario.
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c1\phase8c1-chrome156-clean.json`: Chrome 156 MP4 evidence and raw data.
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c1\phase8c1-ltb107.json`: LT 107 WebM evidence and raw data.
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c1\phase8c1-ltb107-recovery.json`: LT 107 synthetic WebM source-swap evidence.
- Phase 8C baseline: `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c\phase8c-chrome156.json` and `phase8c-ltb107.json`.

Repository state before this report: only `src/components/3d/EntranceExperience.jsx` is modified in the tracked tree. The untracked Phase 8C, 8C.2 and 8C.3 reports were already present. No commit or push.

## 9. Independent re-run (2026-11-03)

The six scenarios were repeated from scratch after the report was written, with a fresh build and fresh browser sessions, to show the result does not depend on the original run.

Environment:

- `npm run lint` (`tsc --noEmit`) passed.
- `npm run build` passed in 25.46 s. The bundle is `dist/assets/index-DxGcm4DY.js` (926,852 bytes), byte identical to the build in section 3, so the tested bundle and the current production bundle are the same file. The only warning was the existing chunk size warning.
- `vite preview --port 4174`, the same URL as section 3.
- Chrome 156.0.8078.74 headless, reported by CDP `/json/version`. Section 3 recorded 156.0.8078.48; Chrome patched itself in between. The UA is unchanged: `HeadlessChrome/156.0.0.0`. MP4 path.
- LT Browser 107.0.5304.110 headless, UA `HeadlessChrome/107.0.5304.110`. WebM path.
- Viewport 1792x1120, DPR 1. Both runs buffered the whole film before the scenarios: Chrome warm in 0.64 s, LT warm in 1.65 s, both ending at `readyState` 4.

Before comparing, the baseline figure in section 1 was recomputed from `phase8c-ltb107.raw.json` using the Phase 8C `seekstats.cjs` analyzer. It reproduced 4, 16, 6, 0, 1 assignments inside an active `seeking` to `seeked` window. The same analyzer reports `seekRequestsWhileSeeking` = 0 for every baseline scenario, which is the defect this phase fixes: `video.seeking` read false at assignment time while the previous seek was still decoding. The Chrome baseline `phase8c-chrome156.json` returned 0 for all five scenarios under the same analyzer, confirming section 4.2.

### 9.1 Chrome 156, MP4

| scenario | assignments | during seek | completed seeks | film updates/s | last seek ms | final frame ms | seek median ms |
|---|---|---|---|---|---|---|---|
| slow-forward | 16 | **0** | 16 | 3.99 | 550 | 476 | 144 |
| gradual-forward | 26 | **0** | 26 | 5.08 | 774 | 752 | 143 |
| gradual-reverse | 22 | **0** | 22 | 4.15 | 656 | 647 | 178 |
| fast-jump-forward | 4 | **0** | 4 | 1.60 | 1544 | 1457 | 426 |
| fast-jump-reverse | 3 | **0** | 3 | 1.04 | 1975 | 1904 | 635 |
| wheel-stop-catch-up | 5 | **0** | 5 | 1.53 | 1514 | 1504 | 507 |

### 9.2 LT Browser 107, WebM

| scenario | assignments | during seek | completed seeks | film updates/s | last seek ms | final frame ms | seek median ms |
|---|---|---|---|---|---|---|---|
| slow-forward | 10 | **0** | 10 | 0.64 | 5337 | 5154 | 918 |
| gradual-forward | 20 | **0** | 20 | 0.71 | 2716 | 2110 | 1005 |
| gradual-reverse | 18 | **0** | 18 | 0.59 | 5919 | 6030 | 1435 |
| fast-jump-forward | 3 | **0** | 3 | 0.32 | 5320 | 5092 | 1556 |
| fast-jump-reverse | 3 | **0** | 3 | 0.22 | 6602 | 6507 | 1618 |
| wheel-stop-catch-up | 9 | **0** | 9 | 0.52 | 3885 | 3138 | 829 |

What this shows:

- **During seek is 0 in all twelve scenario runs.** The baseline LT run measured 4, 16, 6, 0, 1 under the same analyzer.
- On LT every assignment has a matching completed `seeked` (10/10, 20/20, 18/18, 3/3, 3/3, 9/9), so no seek was cancelled and left incomplete.
- Sources were unchanged: Chrome stayed on the MP4, LT stayed on the WebM, and every `seeked` in both runs reported `readyState` 4.
- Absolute timings moved, as section 7 warned they would. Chrome long tasks fell to 0 in every scenario (section 4 recorded 0 to 19) while the two single-jump seek medians rose from 172 to 426 ms and from 221 to 635 ms. LT catch-up is slower than section 4, for example fast-jump-reverse last seek 6.60 s against 5.75 s. These are load dependent. The guard metric is not timing dependent: an assignment either falls inside an active `seeking` to `seeked` window or it does not, and none did.
- No page exception was thrown in either run. The only failed requests were for the separate Testimonials film (`Burger_layers_assemble_together_20261025085531`, `net::ERR_ABORTED`, cancelled) plus the existing `[Testimonials video] source failed` warning. The Hero film had no failed request.

Two attempts were discarded before any scenario ran, both from harness faults rather than application behavior:

1. Warm-up timed out with `ERR_CONNECTION_REFUSED` because the `vite preview` background process had been killed, so the page never loaded and no video element existed.
2. The probe navigated to `http://127.0.0.1:4173/` instead of 4174. `probe.cjs` parses `--name value` only, so `--url=http://...` was ignored and the built-in default was used.

Both wrote the same file, `phase8c-browser.json`, which was discarded and deleted. Fixing the harness (restart the preview, pass space separated flags) was enough; no application code was involved.

Artifacts from this re-run:

- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c1\phase8c1-recheck-chrome.json` and `phase8c1-recheck-chrome.raw.json`: Chrome 156 MP4 evidence.
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c1\phase8c1-recheck-ltb.json` and `phase8c1-recheck-ltb.raw.json`: LT 107 WebM evidence.
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c1\debug-page.cjs`: read only CDP page inspector used to confirm source selection, `readyState`, console output and resource status before each probe run.

Result: the PASS in section 6 is re-confirmed by an independent run against the current production build. Section 7 is unchanged, so the live Vercel deployment, headed browsers, hardware decode, mobile and physical scroll smoothness remain not tested.
