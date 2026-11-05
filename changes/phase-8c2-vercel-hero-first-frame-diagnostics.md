# Phase 8C.2: Vercel hero first-frame diagnostics

Date: 2026-11-01
Status: diagnosis complete. No application source, Cloudinary asset, Lenis setting, scroll mapping or Hero behavior was changed. Nothing was committed or pushed.
Scope: the live Vercel build of the Phase 8B hero film, in LT Browser 107 at 1792x1120, against the local Phase 8B build.

## 1. Question

The live Vercel site keeps the hero film on its first frame in LT Browser 107 at 1792x1120 and does not follow the scroll. The local Phase 8B build works in the same browser. This phase establishes whether the live deployment is current, which source the live page selects, what the media element actually does, and whether the scroll/seek lifecycle runs.

## 2. Verdict

Confirmed:

- The live deployment is current Phase 8B. The live JavaScript bundle is byte-identical to the local production bundle (same SHA-256, same length). The WebM URL, the MP4-primary `canPlayType` logic and the one-way MP4-to-WebM fallback are all present.
- The live page selects the WebM in LT 107 because that browser reports no H.264 support and VP9 support: `video/mp4; codecs="avc1.42E01E"` returns `''`, `video/webm; codecs="vp9"` returns `'probably'`.
- The reported failure was observed in the user's own running LT Browser session on the current deployment. One of the two live previews had `video.error.code = 4` (`MEDIA_ELEMENT_ERROR: Format error`), `readyState = 0`, `networkState = 3`, `duration = NaN`, `videoWidth/Height = 0x0`, no buffered range, and `currentTime = 0`. The other preview loaded the same WebM URL to `readyState = 4`, duration 10 s, 1280x720, fully buffered.
- The WebM URL itself is healthy: a range request from this machine returns HTTP 206, `Content-Range: bytes 0-1023/3189710`, `Access-Control-Allow-Origin: *`, `Accept-Ranges: bytes`, with a full length of 3,189,710 bytes.
- A forced WebM failure reproduces the exact symptom. With the WebM request blocked, the element goes to error 4, `readyState 0`, no metadata. Scrolling still advances the Hero progress to 46.8 % but `currentTime` stays at 0 and the poster stays visible. Removing the block and reloading restores `readyState 4`, duration 10 s and a seek to 4.66 s at the same scroll position.
- The scroll mapping, Lenis, the track height and the seek code are not broken. The film cannot move only because metadata never arrives, so `videoReadyRef` stays false and `applyVideoProgress` returns before any seek.
- The app has no recovery path for a WebM load failure. `handleVideoError` only switches MP4 to WebM; when WebM is already the active source, `canUseFallback` is false and the element stays dead until the page is reloaded.

Not confirmed:

- The exact trigger of the failed WebM request. The failed request returned 0 bytes in 0 ms; no HTTP status or network error text was captured because the failure happened before instrumentation. The leading hypothesis is a Chromium 107 media/cache race when two LT previews request the same WebM concurrently: the first request got 0 bytes and error 4, the second got the full 3,189,710-byte body from cache. A transient Cloudinary/edge failure or a stale partial cache entry are also possible; neither is proven.
- A deterministic reproduction in a clean profile. The failure was observed in the user's live session, not reproduced from a fresh launch.

Not fixed. No code change was made, and the report does not claim the live issue is resolved.

## 3. Deployment identity

The GitHub repository is `anamhb/Pearl-Oasis-website`. Local HEAD is `bb96c7ff0a1e5653277348349580bbb9e3fe8688` on branch `main`, committed 2026-10-29 14:59:20 +05:00. `git log -S "hero-lobby-20261029-vp9"` shows the Phase 8B WebM URL was introduced in `bb96c7f`.

GitHub commit statuses for `bb96c7f` show five Vercel projects, all successful:

| project | pending | success |
|---|---|---|
| `pearl-oasis-website` | 2026-10-29T10:00:37Z | 2026-10-29T10:00:57Z |
| `pearl-oasis-website-yfrp` | 2026-10-29T10:00:37Z | 2026-10-29T10:01:07Z |
| `pearl-oasis-website-y4p2` | 2026-10-29T10:00:37Z | 2026-10-29T10:01:20Z |
| `pearl-oasis-website-yrw5` | 2026-10-29T10:00:37Z | 2026-10-29T10:01:34Z |
| `pearl-oasis-website-bn47` | 2026-10-29T10:05:01Z | 2026-10-29T10:05:21Z |

The preceding commit `acbdd68` (pre-8B) was deployed on 2026-10-27 at 09:54:42-09:55:32Z. Phase 8B has therefore been live since 2026-10-29 10:00Z.

The live URL used here is the one linked from the repository homepage, `https://pearl-oasis-website.vercel.app/`. Its HTML references `/assets/index-Cj4zoLIE.js` (925,580 bytes) and `/assets/index-C6sPsz2A.css`. The live JavaScript has SHA-256 `8C2DE7124D38DE94B7062440CE25B0781529A3BDA6EF1C883926FD8AF48CE4A8`; the local `dist/assets/index-D--mgh8M.js` has the same SHA-256 and the same 925,580-byte length. The different filenames are a build-path hash difference, not a code difference. No source map is emitted for either build, so the comparison is byte-for-byte on the bundle itself.

The other four project aliases (`-yfrp`, `-y4p2`, `-yrw5`, `-bn47`) all serve the same `index-Cj4zoLIE.js` bundle. An outdated deployment is ruled out.

Live headers:

- HTML: `Cache-Control: public, max-age=0, must-revalidate`, `ETag "aca9a142b9c18d1e0e4ea1d724b1302a"`, `X-Vercel-Cache: HIT`.
- Bundle: `Content-Length: 925580`, `ETag "2e1a963a0169d4372ad03b95e30d7bc0"`, `Cache-Control: public, max-age=0, must-revalidate`, `X-Vercel-Cache: HIT`.
- The `Last-Modified` values are edge cache-fill times, not deployment times, and are not used as deployment evidence.

The user's LT Browser history in the default profile shows a visit to `https://pearl-oasis-website-bn47.vercel.app/` at 2026-10-29T10:09:44Z (after the 8B deployment) and to `https://pearl-oasis-website.vercel.app/` at 2026-10-30T08:49:05Z. The code cache also contains an older local-LAN build (`index-C_o7otfD.js` from `http://192.168.1.5:4174/`, dated 2026-10-28), which is a local test artifact, not a live deployment.

## 4. Source selection and error handling (confirmed)

`src/components/3d/EntranceExperience.jsx`:

```js
const getInitialVideoSource = () => {
  if (canPlayVideoType(VIDEO_MP4_TYPE)) return VIDEO_MP4_URL;
  if (canPlayVideoType(VIDEO_WEBM_TYPE)) return VIDEO_WEBM_URL;
  return VIDEO_MP4_URL;
};
```

- `getInitialVideoSource` (lines 44-48): if `canPlayType(VIDEO_MP4_TYPE)` is truthy, use the MP4; else if `canPlayType(VIDEO_WEBM_TYPE)` is truthy, use the WebM; else fall back to the MP4.
- `VIDEO_MP4_TYPE = 'video/mp4; codecs="avc1.42E01E"'`, `VIDEO_WEBM_TYPE = 'video/webm; codecs="vp9"'`.
- `handleVideoError` (lines 189-219): logs `[Hero video] media failure`, and switches to WebM only when the active source is the MP4, no fallback has been attempted, the error code is 3 or 4, and VP9 is supported. If the active source is already WebM, it does nothing.
- `applyVideoProgress` (lines 152-171): returns immediately if `videoReadyRef.current` is false or if the duration is not finite and positive. `videoReadyRef` is set true in `handleVideoMetadata` (line 181) on `loadedmetadata`/`canplay`, or in the mount effect (lines 332-340) only if the element already has a finite positive duration.
- The video element (lines 472-486) has `preload="auto"`, `muted`, `playsInline`, the Cloudinary poster, and `onLoadedMetadata`/`onCanPlay`/`onSeeked`/`onError` handlers. The film is never played; scroll only seeks it.

In LT Browser 107, `canPlayType` results were:

| type | result |
|---|---|
| `video/mp4; codecs="avc1.42E01E"` | `''` |
| `video/webm; codecs="vp9"` | `'probably'` |

The WebM is therefore the correct and only playable choice in LT 107. The live page's `video.currentSrc` was the WebM URL in every LT run.

## 5. The failing state in the user's LT session

The user's LT Browser instance (PID 8572, LT Browser 107.0.5304.110, UA `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36`) had the live URL open in two previews. Both previews reported `innerWidth = 1792`, `innerHeight = 1120`, `devicePixelRatio = 1`.

State captured at 2026-11-01T08:09:10Z, before any reload:

| field | preview 0 (`#1-...`) | preview 1 (`#2-...`) |
|---|---|---|
| `currentSrc` | WebM `hero-lobby-20261029-vp9-6148df8e.webm` | same WebM |
| `readyState` | 0 (`HAVE_NOTHING`) | 4 (`HAVE_ENOUGH_DATA`) |
| `networkState` | 3 (`NETWORK_NO_SOURCE`) | 1 (`NETWORK_IDLE`) |
| `duration` | `NaN` | 10 |
| `videoWidth x videoHeight` | 0 x 0 | 1280 x 720 |
| `currentTime` | 0 | 0 (not scrolled) |
| `buffered` | none | 0-10 |
| `error.code` | 4 | null |
| `error.message` | `MEDIA_ELEMENT_ERROR: Format error` | empty |
| `paused` | true | true |

Resource timing for the WebM URL:

| preview | initiator | start | duration | transferSize | encodedBodySize |
|---|---|---|---|---|---|
| 0 | `video` | 1401 ms | 0 ms | 0 | 0 |
| 0 | `fetch` | 5594 ms | 0 ms | 0 | 0 |
| 1 | `video` | 3174 ms | 60 ms | 0 | 3,189,710 |

Preview 0's media request started at 1.4 s and failed immediately with 0 bytes. Preview 1's request started 1.77 s later and got the full 3,189,710-byte body, reported as cache (`transferSize 0`, full `encodedBodySize`). The same URL, same origin, same profile, same page load: one failed, one succeeded.

The element in preview 0 had the poster URL, `preload="auto"`, `muted` and `playsInline`. No metadata arrived (`readyState 0`, `duration NaN`), so `loadedmetadata`, `loadeddata` and `canplay` could not have fired; with no metadata and `currentTime` pinned at 0, `seeking` and `seeked` could not have fired either. Those events were not instrumented before the failure, so the saved state is the evidence, not an event log. The visible frame is the Cloudinary poster, which is the first frame of the film (`so_0`), hence "stays on its first frame".

The WebM URL was fetched independently at 2026-11-01T08:08:28Z and returned:

```
HTTP/1.1 206 Partial Content
Content-Type: video/webm;codecs=vp9
Content-Range: bytes 0-1023/3189710
Accept-Ranges: bytes
Access-Control-Allow-Origin: *
Cache-Control: public, no-transform, immutable, max-age=2592000
ETag: "b7c5d4c5e8fabdbce6f2fbf5d8c49173"
Last-Modified: Thu, 29 Oct 2026 05:37:33 GMT
server-timing: ... hit ... bytes=3189710 ... du=10.0, vc="vp9", 1280x720, 24.0 fps
```

So the asset and its CORS/range headers are healthy at the time of diagnosis.

## 6. Control experiment: a WebM failure reproduces the symptom

The WebM request was blocked in the user's preview 0 with CDP `Network.setBlockedURLs(['*hero-lobby*'])`, the page was reloaded, and the page was scrolled with `window.scrollTo(0, 1200)`. The block was then removed and the page reloaded again.

| phase | `scrollY` | Hero progress | `readyState` | `networkState` | `duration` | `currentTime` | error |
|---|---|---|---|---|---|---|---|
| blocked, before scroll | 0 | 0 | 0 | 3 | `NaN` | 0 | code 4, `MEDIA_ELEMENT_ERROR: Format error` |
| blocked, after `scrollTo(0, 1200)` | 1200 | 0.4680 | 0 | 3 | `NaN` | 0 | code 4 |
| unblocked, reloaded at the same scroll | 1200 | 0.4680 | 4 | 1 | 10 | 4.660686 | none |

This is the decisive control:

- The scroll reached 1200 px, the track is 3684 px, the viewport is 1120 px, and the Hero progress reached 46.8 %. The copy hand-over and the scroll handler were working.
- The desired media time at 46.8 % is about 4.66 s. The film stayed at 0 because `videoReadyRef` was false and `applyVideoProgress` returned before the seek.
- Once the same page was reloaded without the block, the film loaded and seeked to 4.660686 s at the same 46.8 % progress.

A separate blocked-WebM run on a controlled LT instance produced the same error state (`error.code 4`, `readyState 0`, `networkState 3`, zero seek assignments) and the console warning `[Hero video] media failure`. In that run the CDP wheel dispatch timed out, so the scroll position was not changed; the `window.scrollTo` control above is the cleaner measurement.

## 7. Controlled runs that passed

These runs used a single preview at 1792x1120 and did not reproduce the failure. They confirm that the live build and the local build both work when the WebM loads. The local build was the production `dist` served at `http://127.0.0.1:4174/`. Chrome was 156.0.8078.48, headless, UA `HeadlessChrome/156.0.0.0`. LT Browser was 107.0.5304.110, UA `Chrome/107.0.0.0`.

| run | source | `readyState` | duration | buffered | after scroll `y` | desired time | `currentTime` | assignments | `seeked` |
|---|---|---|---|---|---|---|---|---|---|
| local `dist`, LT 107 | WebM | 4 | 10 | 0-2.25 | 1800 | 6.991029641185647 | 6.963842 | 17 | 17 |
| live, LT 107, warm | WebM | 4 | 10 | 0-10 | 1800 | 6.991029641185647 | 6.956074 | 19 | 19 |
| live, LT 107, cache disabled | WebM | 4 | 10 | 0-2.25 | 1800 | 6.991029641185647 | 6.991029 | 18 | 18 |
| live, Chrome 156 | MP4 | 4 (1 before scroll) | 10.005 | 0-3.501 | 1800 | 6.994539781591264 | 6.982882 | 18 | 18 |

All four runs selected the expected source, reached the target time after 18 synthetic 100 px wheel steps, and fired one `seeking`/`seeked` pair per assignment. In these runs the element was already at `readyState 4` before the scroll (the Chrome run was at 1 before the scroll and reached 4 during it), so `loadedmetadata` and `canplay` had fired. The local and live LT runs both selected WebM; Chrome 156 selected the MP4 because its `canPlayType` for H.264 returned `'probably'`.

The difference from the failing case is concurrency: the user's session had two live previews loading the same WebM at once. The controlled runs loaded one preview (or reloaded one at a time).

## 8. Attribution

### Confirmed

- The live deployment is current Phase 8B. The live and local JavaScript are byte-identical.
- Source selection is correct. LT 107 cannot play the H.264 MP4 and can play VP9 WebM, so WebM is the right source.
- The WebM URL is healthy and supports ranges and CORS.
- The failure is a media load failure, not a scroll, Lenis, CSS or poster bug. The failing element never reaches metadata, so the seek code is never allowed to run.
- The app does not recover from a WebM load failure. `handleVideoError` only handles MP4-to-WebM; a WebM error leaves the poster and a dead element until reload.
- A reload clears the failure. The same preview went from error 4 to `readyState 4`, duration 10, and a working seek after reload.

### Hypotheses, most likely first

1. **Chromium 107 media/cache race between two concurrent previews.** Both previews request the same WebM at nearly the same time. Preview 0's request returned 0 bytes and error 4 at 1.4 s; preview 1's request returned the full 3,189,710-byte body from cache at 3.17 s. This is consistent with a cache/range race in Chromium 107, where one reader gets an empty or invalid entry while the other gets the complete body. It explains why the failure is one-of-two, why it is intermittent, why a reload fixes it, and why single-preview tests pass. The exact Chromium error text was not captured, so this remains a hypothesis.

2. **Transient Cloudinary/edge failure for one request.** The failed request transferred 0 bytes in 0 ms. A transient edge or connection failure could produce the same media error. The URL was healthy before and after, and the second preview succeeded, so this is possible but less specific than the cache race.

3. **Stale or partial media cache entry in the LT profile.** The WebM is served with `Cache-Control: immutable, max-age=2592000`. If the profile held a partial entry from an earlier interrupted load, one read could fail while a later read repairs or re-fetches it. The successful preview reported the full body from cache, so the entry was complete at that moment; this hypothesis is weaker.

4. **Cold-start resource contention in LT 107.** Two 1280x720 VP9 decoders in one browser could contend, but the failure happened at request time (0 bytes, `readyState 0`, before any decode). The second preview decoded the same asset fine. This does not fit as well as the cache/range explanation.

### Ruled out

- Outdated deployment: live JS is byte-identical to the local 8B build; all five Vercel aliases serve it.
- Wrong source selection: LT 107 correctly selects WebM; the MP4 would not play there.
- Codec support mismatch: VP9 is reported as `'probably'`.
- Cloudinary URL unavailable: the URL returns 206 with the full 3,189,710 bytes and CORS.
- Scroll/Lenis broken: the blocked control advanced Hero progress to 46.8 %.
- Poster or CSS covering the film: the poster is the first frame by design, and the same element seeks correctly once metadata arrives.
- Stale HTML or bundle in the LT profile: the profile's cache contains the current `index-Cj4zoLIE.js` and CSS; the failing page ran the current bundle.

## 9. Why the local test passed and the live test failed

The live and local JavaScript are byte-identical, and both use the same Cloudinary WebM URL. The live origin does not proxy or alter the video; the browser fetches it directly from `res.cloudinary.com`.

The observed difference is the test setup, not the build:

- The local runs in this diagnosis used one preview at a time, and the video loaded normally. The user's own local test setup was not inspected.
- The live failure occurred with two previews in the user's LT window, both loading the same WebM concurrently. One request failed with 0 bytes; the other loaded the full file from cache.
- The failure is intermittent and tied to the initial media load. A reload of the failing preview recovered it, and the same preview then seeked correctly.

This means the live URL is not inherently broken. The live environment exposed a load-time race that the single-preview local test did not.

## 10. NOT TESTED

- The exact HTTP status or `net::ERR_*` text for the failed WebM request. The failure happened before the probe attached; the saved state has the media error code and the zero-byte resource entries, but not the network error.
- A deterministic reproduction from a clean profile with two 1792x1120 previews and an empty cache. A fresh LT profile would not create the two desktop previews (the app stayed on "For using sync features please wait for the page to load"), and the copied profile opened its default mobile previews. The failure was observed in the user's existing session instead.
- Headed LT Browser or Chrome with GPU decode, macOS user agent, DPR 2, a 60 Hz display, trackpad momentum, touch and keyboard scrolling.
- Mobile, Safari, Firefox and reduced-motion mode.
- Whether a code-level retry, a WebM-to-MP4 fallback, or a `preload`/`load()` retry would recover the element. No fix was implemented or measured.
- Whether the same race occurs on the local build with two concurrent previews. The local build uses the same URL and code, so it is expected to be possible, but it was not reproduced.

## 11. Evidence

Temp directory (outside the repo): `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8c2\`

- `probe.cjs`: CDP probe (instrumentation, reload/navigate, scroll scenario, media fetch checks, network failures).
- `dual.cjs`: two-preview reload probe with per-target network capture.
- `block-scroll.cjs`: blocked-WebM control with `window.scrollTo`.
- `shot.cjs`: top-level screenshot helper.
- `forensics.cjs`, `history.cjs`: read-only LT profile cache and history checks.
- `phase8c2-live-lt107-1792.json`: live LT 107, warm, 1792x1120.
- `phase8c2-live-lt107-cold.json`: live LT 107, cache disabled, 1792x1120.
- `phase8c2-local-lt107-1792.json`: local `dist`, LT 107, 1792x1120.
- `phase8c2-live-chrome156-1792.json`: live Chrome 156, 1792x1120, MP4.
- `phase8c2-live-lt107-blocked-webm.json`: blocked WebM control.
- `phase8c2-blocked-scroll.json`: blocked WebM plus `window.scrollTo` control.
- `phase8c2-user-if0-failed-state.json`: the user's failing preview state, captured before reload.
- `phase8c2-user-if0-reload.json`: the same preview after a normal reload.
- `phase8c2-dual-cold.json`, `phase8c2-dual-nocache.json`: two-preview reload attempts.
- `live-index-Cj4zoLIE.js`: downloaded live bundle used for the SHA-256 comparison.
- `ltb-history-copy`: read-only copy of the LT Browser history database.
- `ltb-user-copy`: read-only copy of the LT Browser profile used for the two-preview tests.

Repo state: HEAD is `bb96c7f`. `git status --short` shows only the two diagnostic reports:

```
?? changes/phase-8c-hero-scroll-smoothness-diagnostics.md
?? changes/phase-8c2-vercel-hero-first-frame-diagnostics.md
```

No commit or push was made. The user's LT preview was reloaded during the control test and restored to a working state; the failing state above was saved before that reload.
