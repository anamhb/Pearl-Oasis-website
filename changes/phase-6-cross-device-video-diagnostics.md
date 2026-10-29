# Phase 6: Cross-device video diagnostics

Date: 2026-10-27

Scope: diagnose why the hero and testimonials films stay on their first frame in LT Browser device profiles, and investigate the Story frame lag separately. This pass is diagnostics only. No source files, video sources, frame assets, scroll distances, Lenis options, or section layouts were changed.

Status: no source changes, no packages installed, no commit, no push. The production preview used the existing Phase 5 build.

## Summary

The two video failures have one confirmed cause: the installed LT Browser build (Chromium `107.0.5304.110`) cannot decode the H.264/AVC1 MP4 renditions used by both films.

- LT Browser reports no H.264 support: `canPlayType('video/mp4; codecs="avc1.42E01E"')` is empty and `MediaCapabilities.decodingInfo()` returns `supported: false`.
- Both `<video>` elements receive MediaError code `4` (`MEDIA_ERR_SRC_NOT_SUPPORTED`), with `readyState: 0`, `networkState: 3` (`NETWORK_NO_SOURCE`), `duration: null`, and `videoWidth`/`videoHeight` of `0`.
- The MP4 requests return HTTP `206` with `video/mp4`; the files are reachable. The same URLs work in Chrome `156.0.8078.47`.
- The hero failure happens before the seek queue starts: there are no `seeking`/`seeked` events, `currentTime` stays `0`, and `video.seeking` stays `false`.
- The testimonials failure is not an autoplay-policy or gesture problem: `play()` rejects with `NotSupportedError: The element has no supported sources`, even with autoplay explicitly allowed.
- Layout, CSS, sticky positioning, and layering are not hiding either video. Both elements are mounted, visible, `opacity: 1`, and have nonzero layout boxes.
- The Story frame sequence still loads frames and advances the visible frame in LT Browser, but `img.decode()` is much slower there: median `227 ms` at `1792x1120` and `309 ms` at `360x640`/DPR3, versus `10.6 ms` and `9.6 ms` in Chrome. That is the strongest measured correlate of the reported Story lag.

The smallest product fix is not to change the hero seek queue. For the testimonials film, a verified VP9 WebM fallback works in LT Browser. For the hero, the Cloudinary WebM variants tested are not drop-in replacements: one fails format validation and the others expose no finite duration, which the scroll mapping requires.

## Test conditions

- Production preview: `npm run preview` at `http://localhost:4173`, existing build asset `dist/assets/index-DdC-1IOQ.js`.
- Latest commit: `acbdd68`.
- Cold cache for every browser profile: `Network.setCacheDisabled=true`.
- Same scroll path in every run: load; hero at 50% then 100%; testimonials section top + `120px`; Story at 10% then 55%.
- Autoplay was explicitly allowed in both browsers with `--autoplay-policy=no-user-gesture-required`, so autoplay policy was removed as a variable.
- LT Browser: installed `%LOCALAPPDATA%\Lambdatest\LT Browser\Application\LTBrowser.exe`, product `HeadlessChrome/107.0.5304.110`.
- Control: `C:\Program Files\Google\Chrome\Application\chrome.exe`, product `Chrome/156.0.8078.47`.
- Both browsers were run headless for automation.
- Viewports:
  - `1792x1120`, DPR 1, desktop.
  - `1080x1920`, DPR 1, mobile, raw viewport.
  - `360x640`, DPR 3, mobile CSS viewport matching the Galaxy J7 Max class of profile.
- All results are emulation results. The physical MacBook Pro and Galaxy J7 Max were not tested.

## Confirmed findings

### 1. LT Browser cannot decode the delivered H.264 renditions

At `1792x1120`, LT Browser reported:

| Check | Hero | Testimonials |
| --- | --- | --- |
| `video.error` | code `4`, empty message | code `4`, empty message |
| `readyState` | `0` | `0` |
| `networkState` | `3` (`NETWORK_NO_SOURCE`) | `3` (`NETWORK_NO_SOURCE`) |
| `duration` | `null` | `null` |
| `videoWidth` / `videoHeight` | `0` / `0` | `0` / `0` |
| `currentTime` | `0` | `0` |
| `canPlayType` for AVC1 baseline | empty | empty |
| `canPlayType` for VP9 WebM | `probably` | `probably` |
| `MediaCapabilities` H.264 | `supported: false`, `smooth: false` | same |

The generic `canPlayType('video/mp4')` value was `maybe`, but every AVC1 codec string was empty; the codec-specific result and the media error are the reliable signals.

The same result appeared at `1080x1920` and `360x640`/DPR3. At `360x640`, the testimonials component selected its `w_720,q_auto` mobile MP4 instead of the full-size MP4; that rendition also failed with code `4`. The failure is therefore not specific to one video rendition or one viewport.

Delivered sources:

| Layer | Source |
| --- | --- |
| Hero | `https://res.cloudinary.com/z8nlnc6b/video/upload/q_auto:best,ki_1/v1792936612/new-video-Camera_moving_through_hotel_lobby_20261023081539.mp4` |
| Testimonials desktop | `https://res.cloudinary.com/z8nlnc6b/video/upload/v1792900563/Burger_layers_assemble_together_20261025085531.mp4` |
| Testimonials mobile | `https://res.cloudinary.com/z8nlnc6b/video/upload/w_720,q_auto/v1792900563/Burger_layers_assemble_together_20261025085531.mp4` |

All three report `video/mp4;codecs=avc1`.

The MP4 requests themselves succeeded: HTTP `206`, `mimeType: video/mp4`, no CORS or blocked-request failure. Cloudinary advertises byte-range support and full files of `3,019,838` bytes (hero), `3,835,991` bytes (testimonials desktop), and `901,814` bytes (testimonials mobile). The `ERR_ABORTED` entries in the raw media logs are range-request cancellations, not the failure. The media stack rejected the source after a valid range response. `Content-Type` from Cloudinary is `video/mp4;codecs=avc1`.

### 2. The hero failure is upstream of the seek queue

The hero is scroll-controlled, not played. Its code computes scroll progress, converts it to a target timestamp, and assigns `video.currentTime` only after metadata gives a finite duration. The element is mounted with `preload="auto"`, `muted`, and `playsInline`; it is never played. Its poster is a Cloudinary JPEG of the first frame. In LT Browser:

- The page scroll position did change. At `1792x1120`, the hero was at scrollY `1282` at 50% and `2564` at 100%; at `360x640`, scrollY was `732` and `1465`.
- At 50%, the expected target was about `4.98 s`; at 100%, about `9.96 s` (the same targets Chrome reached). The LT Browser element stayed at `currentTime: 0`.
- The video still had `duration: null` and `readyState: 0` at both positions.
- No `loadedmetadata`, `loadeddata`, or `canplay` events fired.
- No `seeking` or `seeked` events fired. `video.seeking` stayed `false`.
- `video.error` was code `4` before any seek could be attempted.

So the serialized seek queue did not get stuck. It never started. The component's error handler sets `videoReadyRef` false, so later scroll ticks return before the seek block. The visible first frame is the poster, not a decoded video frame.

The current `applyVideoProgress` code has a residual risk: if a future failure leaves `video.seeking` true without a `seeked` event, the queue would wait indefinitely. That did not happen in this failure, and there is no evidence to justify adding a timeout or retry now.

### 3. The testimonials failure is not autoplay policy, gesture, or visibility

The testimonials film is an ordinary muted, looping, `playsInline` background video. It has no `autoPlay` attribute; the component calls `video.play()` when the section is near, and retries on `canplay`/`loadeddata`. In LT Browser:

- The element was mounted with `muted: true`, `playsInline: true`, `loop: true`, `preload: "metadata"`.
- The element had `opacity: 1`, `display: block`, `visibility: visible`, a nonzero rect, and the full section as its box.
- `play()` rejected with `NotSupportedError: The element has no supported sources`, not `NotAllowedError`.
- `video.error` was code `4`, `readyState: 0`, `networkState: 3`, `currentTime: 0`, `paused: true`.
- The component catches the play rejection and does not surface it, so the failure is silent in the UI.

The poster is what remains visible, for the same reason as the hero. The film sits behind the heading and cards by design; the cards are above it. That layering does not hide the video layer, and the same layer is visible in Chrome. The failure is the media source, not the intersection observer, reduced motion, a missing gesture, or CSS.

In Chrome, the same element reached `readyState: 4`, `duration: 8`, `currentTime: 4.20` after the probe wait, `paused: false`, with no play error.

### 4. The same build works in Chrome at both profiles

Chrome `156.0.8078.47` was run with the same production preview, same cold-cache setting, same scroll path, and same autoplay policy.

| Measurement | LT Browser 107 | Chrome 156 |
| --- | --- | --- |
| H.264 `MediaCapabilities` | `supported: false` | `supported: true`, `smooth: true` |
| AVC1 `canPlayType` | empty | `probably` |
| Hero at 50% (`1792x1120`) | `currentTime: 0`, error `4` | `currentTime: 4.981666`, no error |
| Hero at 100% (`1792x1120`) | `currentTime: 0`, error `4` | `currentTime: 9.963333`, no error |
| Testimonials (`1792x1120`) | `currentTime: 0`, `paused: true`, error `4` | `currentTime: 4.202196`, `paused: false`, no error |
| Hero at 50% (`360x640`) | `currentTime: 0`, error `4` | `currentTime: 4.985067`, no error |
| Hero at 100% (`360x640`) | `currentTime: 0`, error `4` | `currentTime: 9.963333`, no error |
| Testimonials (`360x640`) | `currentTime: 0`, `paused: true`, error `4` | `currentTime: 4.348511`, `paused: false`, no error |

Chrome also emitted normal `seeking` then `seeked` events for the hero. The seek target and final frame were unchanged from Phase 2 and Phase 5.

### 5. Story frames load, but decode is much slower in LT Browser

The Story section still uses the existing 56 JPEG frames (`1280x720`, `2,101,864` bytes total), the existing scroll mapping, the existing decoded-image pool, and the existing `DECODE_FALLBACK_MS = 300` guard. No image errors occurred in any profile.

`img.decode()` timings from the probe:

| Profile | LT Browser 107 | Chrome 156 |
| --- | --- | --- |
| `1792x1120` | median `227.0 ms`, p90 `459.2 ms`, max `547.1 ms`, 13 decodes | median `10.6 ms`, p90 `15.5 ms`, max `17.9 ms`, 12 decodes |
| `1080x1920` raw | median `236.8 ms`, p90 `425.3 ms`, max `497.2 ms`, 15 decodes | median `26.0 ms`, p90 `44.4 ms`, max `56.8 ms`, 15 decodes |
| `360x640`/DPR3 | median `308.7 ms`, p90 `336.8 ms`, max `336.8 ms`, 4 decodes | median `9.6 ms`, p90 `18.3 ms`, max `21.0 ms`, 13 decodes |

The visible frame index changed in the LT Browser runs (`0 → 1` at `1792x1120`, `0 → 4` at `360x640`), and frames decoded in every run with no image errors. The Chrome mobile samples reported visible index `0` at the sample point, so those samples are not used as mapping proof. The frame request timing was noisy and not consistently worse in LT Browser: at `1792x1120`, LT Browser's completed frame requests had a median of `594 ms` versus Chrome's `915 ms`; at `360x640`, LT Browser's sample had only 5 completed requests with a median of `2,659 ms`, while Chrome had 14 completed requests with a median of `164 ms`. That mobile sample is not comparable enough to blame network latency alone. Both runs were cold-cache, with zero cache hits in the sampled frame requests.

The consistent difference is decode cost. The 300 ms fallback is close to LT Browser's mobile median decode (`308.7 ms`) and below its desktop p90 (`459.2 ms`). The fallback can therefore fire before `decode()` resolves. Whether that interaction causes the visible lag is a hypothesis, not a confirmed cause; no decoder change was made.

### 6. A VP9 WebM fallback works for the testimonials film, but not as a naive hero fix

Isolated video-element tests against Cloudinary renditions. Cloudinary serves the WebM variants as `video/webm;codecs=vp9`:

- Testimonials VP9 WebM at `1280x720`: LT Browser loaded metadata with `duration: 8.003`, played (`currentTime: 1.162672` after the wait), and completed a seek to `5 s` (`seeked` fired, `seeking: false`, no error).
- Testimonials VP9 WebM at `720x404`: LT Browser loaded metadata with `duration: 8.003`, played (`currentTime: 1.161017`), and completed a seek to `5 s` (`seeked` fired, `seeking: false`, no error).
- Hero MP4: Chrome reports `duration: 10.005`.
- Hero WebM with `q_auto:best,ki_1,f_webm`: Chrome rejects it with `MEDIA_ELEMENT_ERROR: Format error`.
- Hero WebM with `f_webm,q_auto:best` (and the `vc_vp9` variants): Chrome loads metadata but reports no finite duration. The hero code requires a finite duration before it can seek, so this is not a drop-in replacement.
- Testimonials MP4: Chrome reports `duration: 8`.
- Testimonials WebM: Chrome reports `duration: 8.003`.

The Cloudinary `f_webm` transformation is therefore a viable fallback for the testimonials film, but not a proven fallback for the hero. A hero fallback needs a rendition with finite duration, cues, and byte-range seek support, then a full scroll-mapping test.

## Hypotheses and unknowns

### Hypotheses

- The Story lag is primarily image decode cost in the old LT Browser Chromium build, not the frame order, section height, or scroll mapping.
- The 300 ms decode fallback may reveal a frame before `decode()` resolves on the slow mobile profile. This could contribute to the perceived lag, but it has not been isolated in a controlled A/B test.
- LT Browser headless may use a slower software decode path than its normal windowed mode. The absolute Story decode times may therefore be pessimistic. The H.264 capability gap is a build-level media capability and is independent of headless mode.

### Unknowns

- The physical 16-inch MacBook Pro and Galaxy J7 Max were not tested. All device-profile results are emulation results.
- The user's primary desktop was not instrumented; Chrome `156.0.8078.47` was the working control.
- The normal LT Browser UI was not fully automated through CDP in this pass. The installed build was tested headless; the user's UI report is the UI-level reproduction.
- The exact GPU/decode path used by LT Browser in normal windowed mode is unknown.
- No validated hero WebM fallback was found among the Cloudinary transformations tested.
- The exact mapping between LT Browser's device profile dimensions and CSS viewport was not exposed by the app. The `1080x1920` raw viewport and the `360x640`/DPR3 CSS viewport were both tested to cover the plausible mappings.

## Smallest recommended fix per issue

### Hero video

Do not add a naive Cloudinary `f_webm` fallback. Either:

1. require an H.264-capable browser for the scroll-controlled hero, or
2. supply a validated WebM/VP9 rendition with finite duration, cues, and byte-range seeking, then retest the full hero scroll path.

Do not change the seek queue for this failure. The queue is not the cause. A timeout/retry is only justified if a future run reproduces `video.seeking: true` with no `seeked` event.

### Testimonials video

If LT Browser support is required, the smallest product fix is to use `<source>` elements with the existing MP4 first and the verified VP9 WebM rendition second. Keep the MP4 as the primary source for browsers with H.264. The WebM fallback was verified in isolation at `1280x720` and `720x404`, but it was not integrated into the site in this pass.

### Story lag

No frame-pipeline change is justified by LT Browser alone. If the lag reproduces on a real target device, investigate smaller frame renditions or a decode budget while preserving the 56-frame order, frame mapping, decoded-image pool, and section height. Do not change `DECODE_FALLBACK_MS` without a controlled A/B test.

## Manual diagnostics procedure

No temporary diagnostics were added to the source. All instrumentation was external through the Chrome DevTools Protocol and a console snippet.

### Console check in LT Browser

1. Open the site in LT Browser and select the device profile.
2. Open DevTools (`F12` or `Ctrl+Shift+I`) if available.
3. Run:

```js
const rows = [...document.querySelectorAll('video')].map((v) => ({
  where: v.closest('#entrance') ? 'hero' : v.closest('#experience') ? 'testimonial' : 'other',
  src: v.currentSrc || v.src,
  error: v.error && { code: v.error.code, message: v.error.message },
  readyState: v.readyState,
  networkState: v.networkState,
  duration: v.duration,
  videoWidth: v.videoWidth,
  videoHeight: v.videoHeight,
  currentTime: v.currentTime,
  paused: v.paused,
  seeking: v.seeking,
  avc1: v.canPlayType('video/mp4; codecs="avc1.42E01E"'),
  vp9: v.canPlayType('video/webm; codecs="vp9"')
}));
console.table(rows);
```

The failing LT Browser profile should show `error.code: 4`, `readyState: 0`, `networkState: 3`, an empty `avc1` value, and `vp9: "probably"`.

### Remote debugging

The installed LT Browser binary is a Chromium build. It accepts remote debugging in headless mode:

```text
"%LOCALAPPDATA%\Lambdatest\LT Browser\Application\LTBrowser.exe" ^
  --headless=new ^
  --remote-debugging-port=9460 ^
  --user-data-dir="%TEMP%\ltb-phase6" ^
  about:blank
```

Then open `http://127.0.0.1:9460/json` to inspect the page target and connect a CDP client to its `webSocketDebuggerUrl`. In a normal windowed launch, the app forced port `9222` in this environment; use `http://127.0.0.1:9222/json` if that is the active endpoint.

The Phase 6 probe listened for `loadedmetadata`, `loadeddata`, `canplay`, `error`, `seeking`, `seeked`, `play`, and `pause`, and recorded `readyState`, `networkState`, `currentTime`, `duration`, `paused`, and `seeking` on those events. It did not log on every scroll or animation frame, and it did not alter playback, layout, or timing.

## Limitations

- LT Browser `107.0.5304.110` headless was used for automation. This is not a physical-device test and not a full windowed-UI automation run.
- Headless rendering and decode may be slower than the normal LT Browser window; the Story decode times should be treated as a strong signal, not an exact device benchmark.
- The raw `1080x1920` Chrome mobile run advanced the testimonials video only `0.028 s` in the headless large viewport. The `360x640`/DPR3 Chrome control advanced `4.35 s` and is the meaningful mobile comparison.
- The WebM fallback tests used isolated video elements, not the integrated site. They validate media support and seeking, not the final site behavior.
- Cold-cache localhost conditions are not identical to a user network.

## Evidence

- `changes/evidence/phase6-runtime.json`: compact summary, selected event excerpts, media state, decode statistics, and WebM fallback results.
- `changes/evidence/phase6-ltb-mac-raw.json`: LT Browser `1792x1120`.
- `changes/evidence/phase6-ltb-mobile-1080-raw.json`: LT Browser `1080x1920`.
- `changes/evidence/phase6-ltb-mobile-css-raw.json`: LT Browser `360x640`/DPR3.
- `changes/evidence/phase6-chrome-mac-raw.json`: Chrome `1792x1120`.
- `changes/evidence/phase6-chrome-mobile-1080-raw.json`: Chrome `1080x1920`.
- `changes/evidence/phase6-chrome-mobile-css-raw.json`: Chrome `360x640`/DPR3.
- `changes/evidence/phase6-webm-duration-chrome-raw.json`: MP4/WebM rendition durations in Chrome.
- `changes/evidence/phase6-webm-ltb-testimonial-raw.json`: LT Browser VP9 WebM testimonial test, `1280x720`.
- `changes/evidence/phase6-webm-ltb-testimonial-mobile-raw.json`: LT Browser VP9 WebM testimonial test, `720x404`.

## Files inspected

- `src/components/3d/EntranceExperience.jsx`
- `src/components/sections/Testimonials.jsx`
- `src/components/sections/WelcomeStory.jsx`
- `src/components/ui/SmoothScroll.jsx`
- `src/components/ui/scroll.js`
- `src/App.jsx`
- `src/main.jsx`
- `src/index.css`
- `index.html`
- `package.json`
- Phase 1–5 reports in `changes/`

No source files were changed in Phase 6. Because no source changed, lint and a new production build were not rerun; the existing Phase 5 production build was used for the preview checks.
