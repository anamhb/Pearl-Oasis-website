# Phase 8A.1: Cloudinary WebM validation

Date: 2026-10-29

Status: **PASS**

The uploaded Cloudinary asset was inspected and tested directly. It is byte-identical to the Phase 8A candidate, and the exact delivered URL passed the isolated seek tests in LT Browser 107 and Chrome 156.

Scope was validation only. No application source, dependency, existing Cloudinary asset, hero timing, scrolling, CTA, poster, or layout was changed. Nothing was uploaded, deleted, committed, or pushed.

## Asset

- Public ID: `hero-lobby-20261029-vp9-6148df8e`
- Delivery URL:

  ```text
  https://res.cloudinary.com/z8nlnc6b/video/upload/v1793251281/hero-lobby-20261029-vp9-6148df8e.webm
  ```

- Cloudinary version: `v1793251281`
- Size: `3,189,710` bytes
- Expected SHA-256:

  ```text
  6148DF8E9B4C6695F39D6D3F0FF723A2E74F9F10B33AF7EB2CCD5F4978941B20
  ```

- Downloaded SHA-256:

  ```text
  6148DF8E9B4C6695F39D6D3F0FF723A2E74F9F10B33AF7EB2CCD5F4978941B20
  ```

The complete download matched both the expected hash and the local Phase 8A candidate byte for byte. Cloudinary did not re-encode or alter the delivered media.

## HTTP delivery

### HEAD

```text
HTTP/1.1 200 OK
Content-Type: video/webm;codecs=vp9
Content-Length: 3189710
Accept-Ranges: bytes
Cache-Control: public, no-transform, immutable, max-age=2592000
ETag: "b7c5d4c5e8fabdbce6f2fbf5d8c49173"
Last-Modified: Thu, 29 Oct 2026 05:37:33 GMT
```

### Byte range

Request: `Range: bytes=1000000-1001023`

```text
HTTP/1.1 206 Partial Content
Content-Type: video/webm;codecs=vp9
Content-Length: 1024
Content-Range: bytes 1000000-1001023/3189710
Accept-Ranges: bytes
```

The browser runs also received `206` responses from Cloudinary for the full file and later mid-file ranges. The response headers included:

```text
content-type: video/webm;codecs=vp9
accept-ranges: bytes
content-range: bytes 0-3189709/3189710
```

Cloudinary's `server-timing` content information also reported:

```text
width=1280,height=720,abps=318971,fps=24.0,du=10.0,vc="vp9",bytes=3189710,format="webm"
```

That matches the local inspection: 1280x720, 24 fps, 10.0 seconds, VP9, WebM, 3,189,710 bytes.

## Media metadata

The downloaded delivered file was inspected with FFmpeg 6.1.1.

- Codec: VP9, Profile 0
- Pixel format: `yuv420p`
- Dimensions: `1280x720`
- Sample aspect ratio: `1:1`
- Display aspect ratio: `16:9`
- Frame rate: `24 fps`
- Duration: `10.00 s`
- Frames: `240`
- Audio: none
- Bitrate: approximately `2551 kb/s`

The delivered file is the same WebM that passed the Phase 8A file-level inspection.

## Keyframes and cues

FFmpeg `showinfo` found ten I-frames at:

```text
0, 1, 2, 3, 4, 5, 6, 7, 8, 9 seconds
```

That is one-second keyframe spacing. The final segment from 9 seconds to 10 seconds is covered by the keyframe at 9 seconds.

The EBML structure is unchanged:

| Element | Offset | Size |
| --- | ---: | ---: |
| `SeekHead` | 48 | 58 |
| `Info` | 209 | 50 |
| `Tracks` | 264 | 91 |
| `Tags` | 360 | 283 |
| `Cues` | 649 | 188 |
| First `Cluster` | 843 | 312076 |

- Cluster count: `10`
- `Cues` before first `Cluster`: `true`

The index is near the beginning, before the first media cluster.

## Browser test setup

Both browsers were installed and tested headless:

- LT Browser: `HeadlessChrome/107.0.5304.110`
- Chrome: `Chrome/156.0.8078.47`

The isolated test page was served from a temporary local server. The video source was the exact Cloudinary URL above. The page did not import or load any application source.

Test harness, outside the repository:

```text
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a\index.html
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a\server.cjs
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a\probe.cjs
```

## Browser results

### LT Browser 107

- `loadedmetadata`: fired once
- Duration: finite, `10`
- Dimensions: `1280x720`
- `readyState`: `4`
- `networkState`: `1` at the settled state
- `video.error`: `null`
- `seekable`: `0–10`
- `currentSrc`: exact Cloudinary URL
- Primary seeks: midpoint, `0`, `duration - 1/24` (`9.958333`), back to `0`
- Primary seek failures: `0`
- Mixed seeks: `20` alternating forward and reverse targets
- Mixed seek failures: `0`
- Stuck `seeking` states: `0`
- Seek timeouts: `0`
- Media errors: `0`
- `seeking` events: `24`
- `seeked` events: `24`
- `canplay` events: `25`
- Maximum primary seek time: `1118 ms`
- Maximum mixed seek time: `963 ms`
- Console messages: `0`
- JavaScript exceptions: `0`
- Log errors: `0`

The 20 mixed targets were:

```text
9.958333, 0.5, 9.5, 1.0, 9.0, 1.5, 8.5, 2.0, 8.0, 2.5,
7.5, 3.0, 7.0, 3.5, 6.5, 4.0, 6.0, 4.5, 5.5, 5.0
```

Each target settled at the requested time with `seeking: false`, `readyState: 4`, and `error: null`.

### Chrome 156

- `loadedmetadata`: fired once
- Duration: finite, `10`
- Dimensions: `1280x720`
- `readyState`: `4`
- `networkState`: `1` at the settled state
- `video.error`: `null`
- `seekable`: `0–10`
- `currentSrc`: exact Cloudinary URL
- Primary seeks: midpoint, `0`, `duration - 1/24` (`9.958333`), back to `0`
- Primary seek failures: `0`
- Mixed seeks: `20` alternating forward and reverse targets
- Mixed seek failures: `0`
- Stuck `seeking` states: `0`
- Seek timeouts: `0`
- Media errors: `0`
- `seeking` events: `24`
- `seeked` events: `24`
- `canplay` events: `25`
- Maximum primary seek time: `986 ms`
- Maximum mixed seek time: `1104 ms`
- Console messages: `0`
- JavaScript exceptions: `0`
- Log errors: `0`

The mixed target sequence and the final target were the same as the LT Browser run. Each seek completed without a timeout or a stuck `seeking` state.

### Network notes

Both browsers recorded canceled media requests with `net::ERR_ABORTED`. These were browser-canceled range requests during seeking, not media decode failures. `video.error` remained `null`, and every seek completed.

Chrome's stderr contained unrelated updater and CPU-probe warnings. The page-level console had no messages, exceptions, or log errors.

## Visual checks

The final frame, the reverse seek back to zero, and the midpoint were captured after the final state settled. The status overlay was hidden for these captures.

LT Browser screenshots:

```text
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a1\shots-ltb107\final.png
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a1\shots-ltb107\zero.png
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a1\shots-ltb107\mid.png
```

Chrome screenshots:

```text
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a1\shots-chrome156\final.png
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a1\shots-chrome156\zero.png
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a1\shots-chrome156\mid.png
```

The final frame shows the biryani close-up, the zero frame shows the lobby opening, and the midpoint shows the buffet. Reverse seeking from the final frame back to zero displayed the opening lobby frame in both browsers.

## Evidence

Temporary result files:

```text
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a1\phase8a1-ltb107.json
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a1\phase8a1-chrome156.json
```

Downloaded delivered asset:

```text
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a1\hero-cloudinary.webm
```

The local candidate remains:

```text
C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\phase8a\hero-vp9.webm
```

All test tooling and screenshots remain outside the repository.

## Limitations

- Tests ran in headless desktop Chromium builds, not on physical devices, GPU-backed browsers, Safari, Firefox, or mobile networks.
- Seek timings are headless measurements. They are not a claim about real-device performance.
- LT Browser 107 does not expose `requestVideoFrameCallback`, so most per-seek frame callback flags were false. The screenshots provide the visual frame check.
- The Cloudinary CDN edge and cache state can vary by location. The tested URL and version are recorded above.
- This validation covers the isolated media asset. It does not cover the application's scroll-to-time mapping, CTA, poster, or layout after integration.

## Result

**PASS**

The exact Cloudinary URL delivered the expected byte-identical VP9 WebM with the correct MIME type, range support, finite 10-second duration, 1280x720 dimensions, 24 fps, no audio, one-second keyframes, and early Cues. Both required browsers loaded metadata, exposed a usable seekable range, completed all primary and 20 alternating mixed seeks, kept `video.error` null, and displayed the correct final, zero, and midpoint frames.

The asset is ready for Phase 8B integration. Integration should keep the existing MP4 as the primary source and select this WebM only where VP9 is supported. The application-level hero behavior still needs its own test after integration.
