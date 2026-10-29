# Phase 2 hero video: diagnosis and targeted changes

Date: 2026-10-27

Scope: the scroll-controlled film in `src/components/3d/EntranceExperience.jsx`. No change to the video URL, codec, preload policy, 328.9vh track height, scroll distance, copy handover, Enter Restaurant CTA, reduced-motion behavior, or any other section. No Lenis, GSAP, or new dependency. No commit.

## Files changed

| File | Change |
| --- | --- |
| `src/components/3d/EntranceExperience.jsx` | Aligned the seek threshold with the measured 24 fps source; forced the resize scroll correction to land in one step instead of animating through the hero. |
| `changes/evidence/phase2-runtime.json` | Raw runtime measurements for the video, normal scroll, final frame, resize A/B, and preload assessment. |
| `changes/phase-2-hero-video.md` | This document. |

No CSS, video source, section height, or copy changes.

## Source and URL inspection

The film is the existing Cloudinary MP4:

```text
https://res.cloudinary.com/z8nlnc6b/video/upload/q_auto:best,ki_1/v1792936612/new-video-Camera_moving_through_hotel_lobby_20261023081539.mp4
```

Transformations already present on the video:

- `q_auto:best`: automatic quality, best setting.
- `ki_1`: one-second keyframe interval.

The video URL does not use `f_auto`, `vc_*`, `w_*`, `h_*`, `c_*`, `br_*`, or an explicit audio transformation. The poster is a separate derived JPEG with `so_0,w_1280,h_720,c_fill`.

Response headers from a HEAD request:

| Header | Value |
| --- | --- |
| `Content-Length` | `3019838` bytes (3.02 MB) |
| `Content-Type` | `video/mp4;codecs=avc1` |
| `Accept-Ranges` | `bytes` |
| `Timing-Allow-Origin` | `*` |
| `Cache-Control` | `public, no-transform, immutable, max-age=2592000` |

Runtime metadata in Chrome: duration `10.005 s`, `1280x720`, `24 fps` (measured `23.9998`), `preload="auto"`, `readyState 4`, buffered and seekable `0–10.005 s`. The source was not replaced.

## Findings

### 1. The seek serialization is already correct

`applyVideoProgress` updates `progressRef` on every scroll frame, returns while `video.seeking` is true, and `handleVideoSeeked` applies the latest stored progress. The scroll listener is coalesced into one `requestAnimationFrame`. There is no second animation loop.

Every measured pass kept the invariant `seekingCount === seekedCount`. No overlapping seeks were observed:

| Pass | Scroll events | Seeks started | Seeks completed | Median seek latency |
| --- | ---: | ---: | ---: | ---: |
| Cold, forward | 110 | 16 | 16 | 209.4 ms |
| Cold, reverse | 118 | 11 | 11 | 276.9 ms |
| Warm, forward | 118 | 21 | 21 | 136.1 ms |
| Warm, reverse | 118 | 21 | 21 | 128.9 ms |
| Final warm, forward | 119 | 26 | 26 | 108.9 ms |
| Final warm, reverse | 118 | 28 | 28 | 92.8 ms |

The cold and warm runs are not a controlled A/B. The cold run transferred the full 3.02 MB video; later runs were cache-served. The higher warm seek counts come from lower decode latency, not from the threshold change.

### 2. The remaining cost is media decode, not the scroll handler

The film was fully buffered for every normal-scroll pass, yet median seek latency was roughly 93–277 ms, with individual seeks from 40 to 380 ms in headless Chrome. With `ki_1`, a seek can decode up to one second, or 24 frames at 24 fps, from the nearest keyframe. The one-in-flight design then drops intermediate scroll positions until the current seek completes.

That is the root cause visible in the measurements: the JavaScript already limits work to one seek at a time; the delay is the decoder completing that seek. A JavaScript change cannot make the decoder finish faster without changing the source encoding or the rendering approach.

The headless browser may use software decode, so the absolute latency is not representative of a GPU-backed browser. It is evidence of the bottleneck, not a claim about real-device smoothness.

### 3. The final frame is reached reliably for this asset

At progress 1 the target is `duration - 1/24 = 9.963333 s`. The measured frame interval is `0.041667 s`, so the target is the start of the final 24 fps frame. Observed final `currentTime` values were `9.947115`, `9.952521`, and `9.925491 s`; the largest distance from the target was `0.037842 s`, less than one frame. The final frame check reported `targetIsInsideLastFrame: true`. On reverse, the film settled at `0.005406` or `0.016218 s`, inside the first frame.

The existing `END_FRAME_OFFSET` behavior is correct for this source. The numeric offset was not changed.

### 4. `preload="auto"` is appropriate here

The video is 3.02 MB and was fully buffered before the normal-scroll test. The poster is 65.6 KB and covers the stage while metadata and data arrive. The Story section's JPEG sequence is local and loads on demand, so the hero film is not competing with those frames during the initial hero view.

Changing to `preload="metadata"` would reduce the initial transfer, but the first scrubs would become network-bound on top of the existing decode latency. The poster would also stay visible longer on a cold connection. That trade-off was not tested on a real mobile network, so the preload policy was left unchanged. The existing poster and `onError` handler remain the initial fallback.

### 5. The resize correction was causing an avoidable seek chain

The document uses `scroll-behavior: smooth`. The old `onResize` handler called `window.scrollTo` after a width change, so the correction animated from the old scroll position to the new one. During that animation the hero progress passed through intermediate values and the film seeked through them, even though the intended progress was unchanged.

Controlled A/B at hero progress 0.5, viewport `1440x900` to `900x1440`:

| Resize path | Scroll events | Seeks started/completed | Final progress | Final `currentTime` |
| --- | ---: | ---: | ---: | ---: |
| Old smooth correction | 15 | 5 / 5 | 0.5 | 4.981666 s |
| Instant correction | 1 | 0 / 0 | 0.5 | 4.981666 s |

Both runs used the same seek threshold. The only difference was whether the resize correction was animated. The instant correction keeps the same scroll mapping and final frame; it only removes the intermediate scrub.

## Exact changes

### `src/components/3d/EntranceExperience.jsx`

1. Replaced the duplicated frame constants with one measured value:

   ```js
   const SOURCE_FRAME_DURATION = 1 / 24;
   const SEEK_EPSILON = SOURCE_FRAME_DURATION;
   const END_FRAME_OFFSET = SOURCE_FRAME_DURATION;
   ```

   `SEEK_EPSILON` was `1 / 30`; it is now one measured source frame. This avoids seeking for target changes that stay inside the same 24 fps frame at slow scroll. The full-speed seek count is decode-bound, so no full-speed speedup is claimed. `END_FRAME_OFFSET` keeps the same numeric value as before (`1 / 24`), so final-frame behavior is unchanged.

2. Forced the width-change scroll correction to land in one step:

   ```js
   const root = document.documentElement;
   const previousBehavior = root.style.scrollBehavior;
   root.style.scrollBehavior = 'auto';
   window.scrollTo(0, top + progress * scrollDistance);
   root.style.scrollBehavior = previousBehavior;
   ```

   This is only used by `onResize`. The Enter Restaurant CTA still uses its existing smooth scroll, and reduced-motion behavior is unchanged.

No other component code changed.

## Validation

- `npm run lint` (`tsc --noEmit`) passed.
- `npm run build` passed. The only warning is the pre-existing chunk larger than 500 kB (`dist/assets/index-*.js`), plus Vite's plugin timing output.
- Headless Chrome, `1440x900`, `http://localhost:3000`, driven through the Chrome DevTools Protocol:
  - Normal forward and reverse scroll through the full hero track.
  - Seek count, seek latency, buffered ranges, and final `currentTime`.
  - Frame interval measured with `requestVideoFrameCallback` on a muted copy.
  - Resize A/B with `Emulation.setDeviceMetricsOverride` from `1440x900` to `900x1440`.
- Evidence: `changes/evidence/phase2-runtime.json`.

No physical phone, Safari, Firefox, GPU-backed Chrome, slow-network, CPU, memory, or long-task profile was captured. The video was not judged smooth on a real device; that claim would need those tests.

## Remaining limitations and evidence still needed

1. **Seek latency is still the main limit.** Headless Chrome measured median seek latency of roughly 93–277 ms, with individual seeks from 40 to 380 ms, even with the file fully buffered. A real-device test is needed on Chrome with GPU decode, Safari, Firefox, and a mid-range phone, measuring `seeking` to `seeked` latency and presented frames. Until then, the remaining lag is diagnosed but not proven on representative hardware.
2. **The 1 s keyframe interval and 1280x720 source are the likely encoding levers.** A denser keyframe interval or lower resolution could reduce decode distance, but it would change the video source, file size, and visual quality. No encoding or URL change was made.
3. **Fast scrubs are intentionally sampled.** The one-in-flight design drops intermediate scroll positions; the film updates at the achievable seek rate. Removing that limit would create overlapping seeks and was not done. A frame-sequence, WebCodecs, or canvas renderer would be a larger rewrite and is out of scope.
4. **`preload="auto"` downloads 3.02 MB up front.** This is acceptable for a first-section scroll-scrubbed film that was fully buffered in the test, but a cold mobile connection could make the poster last longer. A metadata or idle-preload variant needs a poster-first mobile test before it is safe to adopt.
5. **Initial media failure is covered by the poster; a later failure leaves the last frame.** `handleVideoError` sets `videoReadyRef` to false, so no further seeks are attempted. There is no retry or separate fallback image overlay.
6. **The resize fix only applies when the width changes and the hero is visible.** Height-only changes are intentionally left alone by the existing code.
7. **The cold/warm seek-count comparison is confounded by cache.** The first run transferred 3.02 MB; later runs were cached. The resize A/B is the only controlled comparison in this phase.

## Requested changes not made, and why

- **Video URL, codec, keyframe interval, or resolution:** not changed. The source was to be preserved, and the evidence for a different encode would need a real-device comparison and a file-size/quality trade-off review.
- **`preload="metadata"`:** not changed. It would make the first scrubs network-bound and was not tested on a cold mobile connection.
- **A seek queue, overlapping prefetch, or a second animation loop:** not added. The current one-in-flight logic already serializes seeks; a queue or prefetch would increase decoder and memory pressure without evidence that it improves the result.
- **Frame sequence, WebCodecs, or canvas rendering:** not introduced. That is a rendering rewrite, not a targeted change.
- **Track height, scroll distance, copy handover, CTA, or reduced motion:** unchanged.
