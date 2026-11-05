# Phase 8C.3: Vercel hero WebM recovery

Date: 2026-11-01
Status: implemented and verified against the local production build. Nothing was committed or pushed, and the live Vercel deployment was not changed.
Scope: `src/components/3d/EntranceExperience.jsx` and this report.

## 1. Change

The existing source selection is unchanged:

- MP4 remains the primary source when H.264 is supported.
- WebM/VP9 remains the pre-load source when H.264 is not supported.
- The existing one-time MP4 to WebM fallback is unchanged.

One bounded recovery was added for the WebM path:

1. `VIDEO_WEBM_RECOVERY_URL` is the same WebM URL with a cache-busting query: `?recovery=1`.
2. `webmRecoveryAttemptedRef` starts `false` for every page load.
3. `handleVideoError` now checks whether the active source is the base WebM or the recovery WebM.
4. If the active source is WebM and `video.error.code` is `3` (`MEDIA_ERR_DECODE`) or `4` (`MEDIA_ERR_SRC_NOT_SUPPORTED`), and no WebM recovery has been attempted, the handler sets the ref synchronously and changes the source to `VIDEO_WEBM_RECOVERY_URL`.
5. The existing source-change effect calls `video.load()`. `progressRef` is not reset, so when the recovery metadata arrives `handleVideoMetadata` reapplies the current scroll progress and target time.
6. Error codes `1` (aborted) and `2` (network), null errors, and seek cancellations are excluded. A failed recovery sets the ref permanently, so no second recovery is started.

No changes were made to Lenis, scroll mapping, the video assets, encoding, layout, CTA, handover, reduced motion, or the seek guard. The only log change is an added `recovery` field in the existing `[Hero video] media failure` warning.

## 2. Test environment

- Build: local production build served from `dist` at `http://127.0.0.1:4174/`.
- Bundle tested: `dist/assets/index-Caz8eRPv.js`, 925.71 kB.
- LT Browser: version 107, separate instance and profile, viewport `1792 x 1120`, DPR 1.
- Chrome: 156.0.8078.48, headless, viewport `1792 x 1120`, DPR 1.
- The user's running LT Browser instance was not navigated or modified.
- Evidence JSON: `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c3\lt107-recovery.json`, `lt107-block-console.json`, `lt107-block-both.json`, and `chrome156-scroll.json`.

## 3. Results

| Test | Browser | Result |
| --- | --- | --- |
| Normal WebM load | LT 107 | Pass. Base WebM selected, `readyState 4`, `duration 10`, `1280 x 720`, buffered `0-10`. |
| First-load error 4, then recovery | LT 107 | Pass. Console showed `errorCode 4`, `MEDIA_ELEMENT_ERROR: Format error`, `readyState 0`, `networkState 3`. The app switched the source to `?recovery=1`; after the block was lifted, that source loaded to `readyState 4`, `duration 10`, buffered `0-10`. At `scrollY 1200` the current time was `4.660686`. |
| Recovery failure without looping | LT 107 | Pass. With both the base and recovery URLs blocked, the source stayed at `?recovery=1`, `readyState 0`, `networkState 3`, error code 4. No new URL or query was requested. |
| Post-load error 4, progress preserved | LT 107 | Pass. Before the error: progress `0.4680`, current time `4.660686`. After recovery: progress `0.4680`, current time `4.660686`, `loadCalls 1`. |
| Gradual scroll after recovery | LT 107 | Pass. `scrollY 1800`, desired `6.9910`, current time `6.991029`, 8 `seeking` and 8 `seeked` events. |
| Reverse scroll after recovery | LT 107 | Pass. `scrollY 1200`, desired `4.6607`, current time `4.660686`, 14 `seeking` and 14 `seeked` events. |
| Large jump after recovery | LT 107 | Pass. `scrollY 1800`, desired `6.9910`, current time `6.991029`, 15 `seeking` and 15 `seeked` events. |
| Second error 4 on the recovery source | LT 107 | Pass. Source stayed at `?recovery=1`, `loadCalls` stayed at 1, current time stayed at `6.991029`, `readyState 4`. No second recovery was started. |
| Network error code 2 | LT 107 | Pass at source level. A synthetic code 2 on the base WebM left the source at the base WebM; no `?recovery=1` request was made. |
| Aborted error code 1 | LT 107 | Pass at source level. A synthetic code 1 on the base WebM left the source at the base WebM; no `?recovery=1` request was made. |
| MP4 retained, scroll seeking | Chrome 156 | Pass. MP4 selected, `readyState 4`, `duration 10.005`. `scrollY 1200` gave `4.663026`; gradual to `1800` gave `6.994539` with 7/7 seeks; reverse to `1200` gave `4.663026` with 13/13; large jump to `1800` gave `6.994539` with 14/14. |
| Lint | Local | Pass. `npm run lint` (`tsc --noEmit`). |
| Production build | Local | Pass. `npm run build`; same tested bundle `index-Caz8eRPv.js`. |

## 4. First-load error evidence

The first-load failure was reproduced by blocking `*hero-lobby*` with CDP `Network.setBlockedURLs`, reloading the LT preview, and unblocking when the app logged the media failure. The app reported:

```text
[Hero video] media failure
source: https://res.cloudinary.com/.../hero-lobby-20261029-vp9-6148df8e.webm
errorCode: 4
errorMessage: MEDIA_ELEMENT_ERROR: Format error
readyState: 0
networkState: 3
```

This is the same media state recorded in the Phase 8C.2 live failure. After the block was lifted, the video source was:

```text
https://res.cloudinary.com/.../hero-lobby-20261029-vp9-6148df8e.webm?recovery=1
```

The recovery loaded to `readyState 4`, `duration 10`, buffered `0-10`, and scroll-controlled seeking resumed. The blocked test produced several zero-byte range attempts while the recovery URL was still blocked; the browser's own range retry loaded the recovery after the unblock. The app did not change the source again.

## 5. Limitations

- The tests used the local production build, not the live Vercel deployment. The live site continues to serve the previous bundle until this change is committed, pushed, and deployed. This report does not claim that the live site is fixed.
- The first-load error was a controlled reproduction using CDP request blocking, not the original nondeterministic two-preview media-cache race. It did reproduce the relevant state: error code 4, `readyState 0`, `networkState 3`.
- The code 1 and code 2 checks used a synthetic `MediaError`; they verify that the handler does not select the recovery URL, not that a real aborted or network request is handled end-to-end.
- A user-triggered seek cancellation was not separately simulated. The handler only acts on error codes 3 and 4; seek cancellations emit `abort`/`emptied` rather than a media error in the tested flow.
- Not tested: the live Vercel deployment, macOS/Safari/Firefox, mobile, DPR 2, 60 Hz, trackpad/touch, headed GPU decode, and the MP4 to WebM fallback failure path. The MP4 to WebM branch is unchanged.
- The recovery URL uses `?recovery=1`. Cloudinary returns the same asset for that URL; the query is used only as a distinct cache key. Phase 8C.2 verified the base URL's 206/range/CORS behavior, and the local tests loaded the recovery URL successfully.

## 6. Verdict

The WebM recovery is implemented with one bounded attempt, preserves scroll progress and seek synchronization, and does not retry network/aborted errors or loop after a failed recovery. Local production tests pass in LT Browser 107 at `1792 x 1120` and Chrome 156. Deployment is still required for the live Vercel site.
