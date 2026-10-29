# Phase 8B: Hero WebM fallback

Date: 2026-10-29

Status: **PASS** for implementation and functional browser tests. LT Browser visual screenshots were not captured; see Limitations.

Scope: add the validated VP9 WebM as a fallback for the scroll-controlled hero film while keeping the existing H.264 MP4 as the primary source. No Testimonials, Story, SmoothScroll, global CSS, dependency, or Cloudinary asset changes. No commit or push.

## Source selection

The hero now selects one source URL before the first load, using capability detection rather than user-agent sniffing:

1. Use the existing MP4 when `video.canPlayType('video/mp4; codecs="avc1.42E01E"')` is truthy.
2. Otherwise use the validated WebM when `video.canPlayType('video/webm; codecs="vp9"')` is truthy.
3. Otherwise keep the MP4 as the safe default.
4. If `document` is unavailable, keep the MP4.

The existing MP4 URL is unchanged:

```text
https://res.cloudinary.com/z8nlnc6b/video/upload/q_auto:best,ki_1/v1792936612/new-video-Camera_moving_through_hotel_lobby_20261023081539.mp4
```

The fallback is the Phase 8A.1 asset:

```text
https://res.cloudinary.com/z8nlnc6b/video/upload/v1793251281/hero-lobby-20261029-vp9-6148df8e.webm
```

The video element receives a single `src`. No child `<source>` elements were added.

## Fallback conditions

The fallback is deliberately narrow:

- Only a media error code `3` (`MEDIA_ERR_DECODE`) or `4` (`MEDIA_ERR_SRC_NOT_SUPPORTED`) is eligible.
- The active source must still be the MP4.
- No earlier fallback attempt may have happened.
- The browser must report VP9 support.
- After one switch to WebM, `fallbackAttemptedRef` prevents further switches.
- `AbortError`, `net::ERR_ABORTED`, seek cancellations, and other ordinary media errors do not switch sources.

On a source change, only source-dependent state is reset: `videoReadyRef`, `durationRef`, and an explicit `video.load()`. Scroll progress is preserved, and metadata from the old source is ignored by comparing `video.currentSrc` with the active source ref.

Diagnostics are limited to genuine media error events:

```js
console.warn('[Hero video] media failure', {
  source,
  errorCode,
  errorMessage,
  readyState,
  networkState,
  fallback,
});
```

No per-scroll logging was added.

## Files changed

- `src/components/3d/EntranceExperience.jsx`
  - Source constants and capability detection.
  - `videoSource` state and fallback refs.
  - Source-change reset effect.
  - Stale metadata guard.
  - One-attempt fallback error handler.
  - `src={videoSource}` on the existing video element.
- `changes/phase-8b-hero-webm-fallback.md` (this report).

The working tree already contained uncommitted Phase 2–7 changes. This phase did not modify those files.

## Verification

### Lint and build

Both passed from the project root:

```text
npm run lint
> tsc --noEmit
(no errors)

npm run build
> vite build
✓ built in 12.15s
```

The build emitted the existing large-chunk warning only. No build errors.

Tests used the production build through `vite preview` at `http://127.0.0.1:4173/`.

### LT Browser 107

Environment: HeadlessChrome `107.0.5304.110`, `1792x1120`, DPR 1.

- Selected source: WebM, both `src` attribute and `currentSrc`.
- Duration `10`, `1280x720`, `readyState 4`, no media error, seekable `[0, 10]`.
- No child `<source>` elements.
- Poster URL unchanged.
- Track ratio `3.289285714`; video filled `1786x1120` with `object-fit: cover` and `object-position: 50% 50%`.
- CTA "Enter Restaurant" was visible and interactive at progress 0.
- At progress 0.5, entrance copy was opacity 0, inert, and pointer-events none; dining copy was opacity 1, not inert.
- Forward seeks settled at `4.979166`, `9.958333`, and back to `0`.
- Large jumps `0.9`, `0.1`, `1`, `0.25`, `0` all settled without a stuck seek or media error.
- CTA click landed at `scrollY 3580` against expected `3580.671875` (delta `0.671875`); Story top was `3683.671875`.
- Hero source did not change after initial WebM selection.
- No page errors, unhandled rejections, or runtime exceptions.
- One unrelated Testimonials console warning and one unrelated Testimonials media abort were present.

LT visual screenshots: **NOT TESTED**. Headless `Page.captureScreenshot` failed or timed out in this browser. With GPU enabled the GPU process crashed; with `--disable-gpu` CDP returned `Unable to capture screenshot`. The media state, seek targets, and layout metrics above still passed.

### Chrome 156

Environment: HeadlessChrome `156.0.0.0`, `1792x1120`, DPR 1.

- Selected source: MP4, both `src` attribute and `currentSrc`.
- Duration `10.005`, `1280x720`, no media error, seekable `[0, 10.005]`.
- No child `<source>` elements.
- Poster URL unchanged.
- Track ratio `3.289285714`; video filled `1786x1120` with `object-fit: cover` and `object-position: 50% 50%`.
- CTA "Enter Restaurant" was visible and interactive at progress 0.
- At progress 0.5, entrance copy was opacity 0, inert, and pointer-events none; dining copy was opacity 1, not inert.
- Forward seeks settled at `4.981666`, `9.963333`, and back to `0`.
- Large jumps `0.9`, `0.1`, `1`, `0.25`, `0` all settled without a stuck seek or media error.
- CTA click landed at `scrollY 3581` against expected `3580.671875` (delta `0.328125`); Story top was `3683.671875`.
- Hero source did not change after initial MP4 selection.
- No page errors, unhandled rejections, runtime exceptions, or Hero media warnings.

Visual screenshots were captured:

- `shots-chrome156/zero.png`: opening lobby frame, entrance copy and CTA visible.
- `shots-chrome156/mid.png`: buffet handover frame, dining copy visible.
- `shots-chrome156/final.png`: final biryani frame, dining copy visible.

### Chrome 156 controlled fallback simulation

The MP4 was loaded first, then a runtime media error with code `4` was injected on the video element and an `error` event was dispatched. This tests the fallback branch without changing application source.

- Initial source: MP4.
- After the simulated error, the hero switched to WebM once.
- WebM loaded with duration `10`, `1280x720`, `readyState 4`, and no media error.
- Source history: initial MP4, then one MP4-to-WebM mutation. No second source mutation.
- After a second simulated code `4` error on WebM, the source remained WebM and no additional WebM source request was made.
- Two `[Hero video] media failure` warnings were logged, one per simulated error. No loop.
- Post-fallback scroll seeks settled at `0.5 -> 4.979166`, `1 -> 9.958333`, and `0 -> 0`.
- Post-fallback screenshots showed the final biryani frame and the opening lobby frame.
- No page errors, unhandled rejections, or runtime exceptions.

This was a simulated codec failure, not a real H.264 decode failure.

### Mobile responsive smoke

Environment: HeadlessChrome `156.0.0.0`, `390x844`, DPR 2.

- Selected source: MP4.
- `document.scrollWidth` was `390`, so there was no horizontal overflow.
- Video filled `390x844` with `object-fit: cover` and `object-position: 50% 50%`.
- Track ratio `3.289099526`.
- CTA was inside the viewport at progress 0 (`x 95.86`, width `198.27`).
- Handover, final seek, reverse seek, and large jumps all settled without media errors.
- CTA click landed at `scrollY 2689` against expected `2688.90625` (delta `0.09375`).
- Mobile screenshots were captured for zero, mid, and final states.

## Limitations and NOT TESTED

- **LT Browser visual screenshots:** NOT TESTED because headless CDP screenshot capture failed in that browser. Functional media and layout checks passed.
- **Physical devices:** NOT TESTED. All browser checks were desktop headless or emulated viewport runs.
- **Real MP4 codec failure:** NOT TESTED. The fallback branch was exercised with a simulated media error code `4`.
- **Real network failure behavior:** NOT TESTED. The code intentionally does not switch on code `1`/`2` or aborted requests.
- **Safari and Firefox:** NOT TESTED.
- **Reduced-motion and resize/orientation behavior:** NOT TESTED in this phase. Those code paths were not modified.
- **Poster rendering:** the poster URL and attribute are unchanged and present; the poster itself was not separately screenshot-tested before video load.
- **Stale-metadata guard:** it compares the resolved `currentSrc` exactly with the selected URL. Cloudinary served the asset directly in these tests; a future redirect to a different host or path would need a path-based comparison.
- **Capability detection:** `canPlayType` can return `maybe`; a later decode or source failure is covered by the one-switch fallback, but an optimistic `maybe` is not a guarantee of playback.

## Evidence

Test artifacts are outside the repository:

- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8b\phase8b-ltb107.json`
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8b\phase8b-chrome156.json`
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8b\phase8b-chrome156-fallback.json`
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8b\phase8b-chrome156-mobile.json`
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8b\shots-chrome156\`
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8b\shots-chrome156-fallback\`
- `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8b\shots-chrome156-mobile\`

## Repository state

- No commit or push was made.
- Neither Cloudinary asset was changed or deleted.
- `src/components/3d/EntranceExperience.jsx` is the only application source file changed by this phase.
- This report is a new untracked file.
