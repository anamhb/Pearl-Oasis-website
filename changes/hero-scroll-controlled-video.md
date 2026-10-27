# Hero scroll-controlled video

## Result

The hero still uses one remote HTML video and maps scroll progress directly to `currentTime`. The film is never played, so down and up produce the same frame at the same scroll position.

The original upload had one video sync sample, at `0 s`. The production `src` now points at a Cloudinary derivative of that same asset, with a one-second keyframe interval and best automatic quality:

```text
https://res.cloudinary.com/z8nlnc6b/video/upload/q_auto:best,ki_1/v1792936612/new-video-Camera_moving_through_hotel_lobby_20261023081539.mp4
```

The source file was not re-uploaded. Cloudinary's `ki_1` transformation ([keyframe interval reference](https://cloudinary.com/documentation/transformation_reference#ki_keyframe_interval)) produced the seekable derivative. It was downloaded and verified before the URL was changed: H.264 High, `1280x720`, `24 fps`, `10.005 s`, `240` frames, ten sync samples at `0` through `9 s`, `3,019,838` bytes.

The scroll mapping, `328.9vh` track height, `23 / 69` copy hand-over, CTA, navbar, overlays, reduced-motion behavior and Our Story section are unchanged.

## Files changed

| File | Change |
| --- | --- |
| `src/components/3d/EntranceExperience.jsx` | Changed only `VIDEO_URL` to the verified `q_auto:best,ki_1` derivative and updated the source comment. Scroll mapping, seek coalescing and rendering are unchanged. |
| `changes/hero-scroll-controlled-video.md` | This report. |
| `changes/evidence/hero-video-encoding.json` | Source, transformation, keyframe, quality and range-check record. |
| `changes/evidence/hero-video-seek-bench-*.json` | Raw seek measurements for original, `q_auto`, the selected Cloudinary derivative and the local fallback. |
| `changes/evidence/hero-video-probe-after.json` | Post-change scroll probe at 1440, 1024, 768, 390 and 320. |
| `changes/evidence/hero-video-actions-after.json` | Post-change CTA, touch and reduced-motion probe. |
| `changes/evidence/hero-video-after-*.png` | Post-change screenshots at all five widths, plus CTA and touch states. |

The previous `changes/evidence/hero-video-probe.json`, `hero-video-actions.json` and `hero-video-*.png` files remain as the before evidence. The earlier uncommitted Testimonials work was not changed.

The old 70-frame hero folder (`public/video-frames-final`, 70 files, 2.2 MB) remains on disk but is not selected or requested. It was not deleted.

## Implementation

### Source and poster

```js
const VIDEO_URL =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/q_auto:best,ki_1/v1792936612/new-video-Camera_moving_through_hotel_lobby_20261023081539.mp4';
const VIDEO_POSTER =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/so_0,w_1280,h_720,c_fill/v1792936612/new-video-Camera_moving_through_hotel_lobby_20261023081539.jpg';
```

The poster is still a Cloudinary first-frame derivative of the same asset. It keeps the stage filled while metadata or frame data is arriving and remains the fallback if the film fails.

### Playback

| Requirement | Implementation |
| --- | --- |
| First frame on load | Poster at `so_0`, same 1280x720 framing. |
| No autoplay | No `autoPlay` attribute and no `video.play()` call. Probes counted 0 play calls. |
| No loop | No `loop` attribute. |
| Scroll down advances | `target = progress * max(0, duration - 1 / 24)`. |
| Scroll up reverses | Same mapping applied to a lower progress value. |
| Final frame holds | The last target is 1/24 s before the end, then the paused frame is left in place. |
| Natural scroll into Our Story | The hero still releases at the same track length; scrolling is not intercepted. |
| Efficient updates | One `requestAnimationFrame` pass per scroll burst; no React state updates while scrolling. |
| Avoid excessive seeks | Only one seek can be in flight. While `video.seeking`, the newest progress is stored; `seeked` applies that newest value. Changes below `1 / 30` s are ignored. |
| Loading, seek, error handling | Duration waits for metadata. Poster covers loading. `onError` marks the film unavailable and leaves the poster and hero copy in place. |

`preload="auto"` is retained. The selected file is 3.0 MB rather than the original 5.1 MB. In the controlled seek harness the selected derivative buffered `0 - 10.005`; the post-change app probe settled at `readyState 4`. No CORS setting was added because playback and seeking do not require one.

## Source analysis

The supplied Cloudinary source file:

| Check | Result |
| --- | --- |
| URL | `.../video/upload/v1792936612/new-video-Camera_moving_through_hotel_lobby_20261023081539.mp4` |
| Size / SHA-256 | `5,099,089` bytes / `63D928E2E1FA33109FB9015BE4023D7240067A408C20EF042D083898E3DD4F63` |
| Container | MP4 (`isom`), `moov` before `mdat` |
| Codec | H.264 High profile, level 3.1, `yuv420p`, progressive |
| Dimensions / rate | `1280x720`, `24 fps` |
| Duration / frames | `10.005 s`, `240` frames |
| Bitrate | `4,077 kb/s` overall; `3,879 kb/s` video; `128 kb/s` audio |
| Sync samples | **One**, sample 1 at `0 s` (`stss` contains only sample 1) |

A paused seek to the middle or end therefore has to decode from frame 0. That is the cause of the 4 to 6 second scroll-to-frame waits in the before run.

## Cloudinary transformation tests

`q_auto` alone fixed size, not seeking. Its derivative was smaller but still had one sync sample. Streaming and explicit H.264 variants did not change that. The `ki_1` transformation is the one that sets the keyframe interval.

| Transformation | Size | Sync samples | Quality vs source | Outcome |
| --- | ---: | ---: | --- | --- |
| Original | 5,099,089 B | 1 at `0` | reference | Slow long seeks |
| `q_auto` | 1,798,094 B | 1 at `0.041667` | SSIM 0.981064; PSNR 41.43 dB | Rejected; one keyframe |
| `q_auto,fl_progressive` | 1,798,094 B | 1 at `0.041667` | same bytes as `q_auto` | Rejected; streaming flag did not add keyframes |
| `fl_progressive` | 1,796,076 B | 1 at `0` | not adopted | Rejected; one keyframe |
| `q_auto,vc_h264` | 1,798,094 B | 1 at `0.041667` | same bytes as `q_auto` | Rejected; codec flag alone did not help |
| `q_auto,ki_1` | 1,993,625 B | 10 at ~1 s | SSIM 0.982114; PSNR 41.65 dB | Fast, but lower quality |
| **`q_auto:best,ki_1`** | **3,019,838 B** | **10 at `0` to `9 s`** | **SSIM 0.987456; PSNR 43.91 dB** | **Selected** |

The selected derivative's measured structure:

| Check | Result |
| --- | --- |
| Container | Fragmented MP4 (`moov` at the front, then `moof`/`mdat` fragments) |
| Codec | H.264 High profile, level 3.1, `yuv420p`, progressive |
| Dimensions / rate | `1280x720`, `24 fps` |
| Duration / frames | `10.005 s`, `240` frames |
| Bitrate | `2,414 kb/s` overall; `2,269 kb/s` video; `139 kb/s` audio |
| Sync samples | `10`: `0, 1, 2, 3, 4, 5, 6, 7, 8, 9 s` |
| Keyframe gap | `1.0 s`; final segment is `9` to `10 s` |
| SHA-256 | `A21CD03A36701135C3E24708BAD767C3D95CB7C9D3163D952BE553EC5029727E` |

The `q_auto:best` quality is slightly below the source, not lossless. SSIM `0.9875` and PSNR `43.91 dB` are high for a background film, and the before/after screenshots show no visible degradation. If maximum fidelity is required, the local fallback below is closer to the source but would require a separate upload.

### HTTP delivery

The selected URL was checked with a mid-file range request:

```text
HTTP/1.1 206 Partial Content
Content-Type: video/mp4;codecs=avc1
Content-Length: 1024
Content-Range: bytes 2000000-2001023/3019838
Accept-Ranges: bytes
Cache-Control: public, no-transform, immutable, max-age=2592000
```

The app probe also saw the video response as `206` and the poster as `200`. No CORS configuration was needed.

## Local re-encode fallback

This was verified locally but is not deployed. It is the fallback if the Cloudinary `ki` transformation is unavailable, or if higher fidelity is required than `q_auto:best`.

```powershell
ffmpeg -i pearl-hero-video.mp4 `
  -map 0:v:0 -map 0:a:0 `
  -c:v libx264 -preset slow -crf 18 `
  -profile:v high -level:v 3.1 -pix_fmt yuv420p `
  -g 24 -keyint_min 24 -sc_threshold 0 -flags +cgop `
  -movflags +faststart -c:a copy `
  -map_metadata 0 -map_chapters -1 `
  pearl-optimized-crf18.mp4
```

Measured output:

| Check | Result |
| --- | --- |
| Size / SHA-256 | `5,129,164` bytes / `3FB22FC6553F34C6791B4819A559166F9FED2DE4D38C91681C08D5ECFFC6AEC6` |
| Container | MP4 (`isom`), `moov` before `mdat` |
| Codec | H.264 High profile, level 3.1, `yuv420p` |
| Duration / frames | `10.005 s`, `240` frames |
| Bitrate | `4,101 kb/s` overall; `3,968 kb/s` video; `128 kb/s` audio |
| Sync samples | `10` at `0` through `9 s` |
| GOP / flags | 24 frames / 1.0 s, closed GOP requested (`+cgop`), scene cuts disabled |
| Quality vs source | SSIM 0.992612; PSNR 47.49 dB |
| Range test | Served locally with `Accept-Ranges: bytes` and `206` responses |

The local file is still in the temporary working directory and was not committed. The production URL points at the verified Cloudinary derivative, so no upload or credentials were required.

## Seek benchmark

Method: headless Microsoft Edge at `1280x720`, video paused, full buffered range `0 - duration`, direct assignment of `currentTime`. Three rounds per target; the table shows medians in milliseconds.

* **Seeked** is measured from assigning `currentTime` to the `seeked` event.
* **Display** is measured from assigning `currentTime` to the first `requestVideoFrameCallback` whose `mediaTime` is within `0.13 s` of the target.
* The display callback can fire before the `seeked` event because the frame can be presented before the event is dispatched.

| Variant | 0.5 s: seeked / display | 5.0 s: seeked / display | 9.9 s: seeked / display |
| --- | ---: | ---: | ---: |
| Original, one keyframe | 233 / 182 | 1,723 / 1,697 | 2,659 / 2,658 |
| Cloudinary `q_auto`, one keyframe | 191 / 153 | 1,286 / 1,250 | 2,369 / 2,354 |
| **Cloudinary `q_auto:best,ki_1`** | **172 / 146** | **61 / 38** | **224 / 223** |
| Cloudinary `q_auto:best,ki_1`, local file | 190 / 160 | 71 / 61 | 251 / 250 |
| Local CRF 18 fallback | 275 / 210 | 101 / 69 | 328 / 327 |

The selected remote derivative improves the middle seek from about `1.72 s` to `61 ms`, and the near-end seek from about `2.66 s` to `224 ms`. The beginning seek is limited by the initial media pipeline rather than GOP distance, so it changes less. The local and remote copies of the selected derivative are close, which shows the gain comes from the encoding, not from serving the file locally.

The raw measurements are in `changes/evidence/hero-video-seek-bench-before.json`, `hero-video-seek-bench-after-local.json` and `hero-video-seek-bench-after-remote.json`.

## App-level behavior after the change

These are scroll-to-matched-frame waits in the real page, not isolated media seeks. They include the scroll handler, the one-seek-at-a-time hand-off and page prefetch. The probe scrolls shortly after metadata, so the first jump is affected by the 3.0 MB download. The direct benchmark above is the clean encoding comparison.

| Viewport | Track height | Page width | 0 to 50%, before / after | 50 to 100%, before / after | 100 back to 50%, before / after |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1440x900 | 2960.09 px | 1440 px | 4.44 s / **1.60 s** | 5.47 s / **1.15 s** | 5.47 s / **1.18 s** |
| 1024x768 | 2525.94 px | 1024 px | 3.79 s / **2.24 s** | 5.49 s / **0.93 s** | 5.37 s / **1.23 s** |
| 768x1024 | 3367.92 px | 768 px | 3.86 s / **1.23 s** | 5.82 s / **1.68 s** | 5.32 s / **1.20 s** |
| 390x844 | 2775.91 px | 390 px | 3.54 s / **1.48 s** | 5.27 s / **0.95 s** | 5.02 s / **0.95 s** |
| 320x640 | 2104.95 px | 320 px | 4.32 s / **1.71 s** | 5.57 s / **1.05 s** | 5.34 s / **0.98 s** |

At the settled points the video was paused with `readyState 4`; `autoplay`, `loop` and `controls` were all `false`. The final frame was held after the scroll stopped. The content opacity followed the existing hand-over: at 50% the entrance copy was `0` and The Grand Dining Hall copy was `1`.

### Interactions

| Check | Result |
| --- | --- |
| Enter Restaurant CTA, 1440 | Landed `#story` at `top: 103.09 px`; video held at `9.963333 s`; paused; 0 play calls. |
| Touch drag down, 390 | Scrolled to `405 px`; video settled at `2.088585 s`; paused; 0 play calls. |
| Touch drag up, 390 | Returned to `0 px`; video settled at `0 s`; paused; 0 play calls. |
| Reduced motion | Content transforms were `none`, copy switched without sliding, video remained paused. |
| Story entry, 1440 | At `scrollY 2480`, `#story` top was `480.09 px` and visible; page height `7783 px`; no trapped scroll. |

No horizontal overflow was present at any width (`scrollWidth === innerWidth`). The hero copy and CTA remained in place. The screenshots show the intended frames: lobby at the start, buffet around the middle, and the biryani close-up at the end.

## Network and console

* The selected video returned `206`; later viewport runs reused the disk cache. The poster returned `200`.
* `#entrance img` count is `0`; the old image layer is gone.
* No `video-frames-final` requests occurred. Our Story still loads its own `video-frames-second` frames as before.
* The source URL in the probe is the `q_auto:best,ki_1` URL above.
* There were no JavaScript exceptions and no video errors.
* Runtime console errors: none.
* The only log error was the pre-existing `404` for `/favicon.ico`; it is unrelated to the hero video.

## Verification commands

```text
npm run lint   pass
npm run build  pass (only the existing chunk-size warning and build timing report)
```

## Remaining limitations

1. **The original asset still has one keyframe.** The fix is a Cloudinary delivery transformation, not a replacement upload. If the `ki` transformation is removed, the URL is edited back, or the account plan blocks it, the single-keyframe behavior returns.
2. **Cloudinary transformation dependency.** `ki_1` must remain part of the URL. The derived file is cached at the CDN; a cold purge can make the first request slower while Cloudinary regenerates it.
3. **Quality trade-off.** `q_auto:best` is not lossless: SSIM `0.9875`, PSNR `43.91 dB` against the source. The local CRF 18 fallback is closer (`0.9926`, `47.49 dB`) but needs a separate upload.
4. **Browser coverage.** Measurements used headless Edge/Chromium. Safari/iOS and Firefox were not part of this run. The selected file is fragmented MP4 with H.264/AAC and range support.
5. **App-level waits remain visible on a cold first jump.** The page probe settles in roughly `0.9` to `2.2 s` depending on viewport and prefetch state, versus `4` to `6 s` before. The isolated full-buffer seeks are `0.04` to `0.28 s`. The remaining app gap is sequence/network/prefetch, not GOP length.
6. **Unused old assets.** The 70 JPG files remain in `public/video-frames-final` and are copied by the build, but no code references them and no request is made for them.
7. **Favicon 404.** Pre-existing and outside this change.
8. **Remote poster.** The poster is remote. If both poster and video fail, the stage falls back to `#090a0c` while the hero copy remains usable.

## Delivery gate

No upload, commit or push was made. No credentials were used. The production URL was changed only after the `q_auto:best,ki_1` media, keyframes, range response and seek timings were verified.
