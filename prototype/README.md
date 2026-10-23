# Scroll-frame asset prototype

This folder is a throwaway measurement harness, not part of the app build.

It exists to answer one question before generating 299 replacement frames: does a
portrait centre crop reduce the Hero and Story decode/composite cost enough to
justify a device-aware asset set?

## Run it

```powershell
node prototype/serve.mjs
```

Open `http://127.0.0.1:4174/?set=hero-original&interval=120`.

| Query | Values |
| --- | --- |
| `set` | `hero-original`, `hero-phone`, `hero-tablet`, `story-original`, `story-portrait` |
| `interval` | target change in ms; `120` is a slow scrub, `40` is a fast scrub |
| `still` | freeze on a frame index (0-8) for framing screenshots |

The lab uses four decoded image layers, the same `object-fit: cover` framing,
and the same centre anchor as the production sections. The nine frames per set
are spread across the Hero entrance/interior and the Story kitchen sequence.

## What was generated

Only nine representative frames per variant. No production frame folder was
changed, and no 299-file set exists yet.

| Set | Source size | Crop | JPEG | Total (9) | Decoded RGBA (one frame) |
| --- | --- | --- | --- | --- | --- |
| `hero-original` | 1920x1080 | none | source | 491.2 KB | 7.91 MB |
| `hero-phone` | 1920x1080 | centre 640x1080 | q82 | 309.8 KB | 2.64 MB |
| `hero-tablet` | 1920x1080 | centre 832x1080 | q82 | 403.8 KB | 3.43 MB |
| `story-original` | 1280x720 | none | source | 322.8 KB | 3.52 MB |
| `story-portrait` | 1280x720 | centre 560x720 | q82 | 309.1 KB | 1.54 MB |

The phone crop covers every portrait phone up to a 0.593 aspect ratio (including
320x568 and 390x844). The tablet crop covers 768x1024, 820x1180, and 1024x1366.
Landscape keeps the original 1920x1080 frames.

## Framing check

Screenshots at the same viewport and frame, original versus crop:

- Hero 390x844: mean absolute channel difference 0.280/255; 0.42% of channels
  differ by more than 2; 0.158% by more than 8.
- Hero 768x1024: mean 0.327/255; 2.28% over 2; 0.392% over 8.
- Story 390x844: mean 0.927/255; 9.60% over 2; 0.481% over 8.

Those differences are JPEG re-encode noise, not a framing shift. The visible
composition is the same. See `evidence/*.png`.

## Decode measurements

Headless Chrome, CPU 4x, 4G profile, 40 ms target interval, nine-frame loop,
four layers. These are directional; they are not physical-device proof.

| Run | Decode p50 | Decode p90 | Lag p90 | Frames >1 behind |
| --- | --- | --- | --- | --- |
| Hero original 390 | 11.3 ms | 21.9 ms | 2 | 56 |
| Hero phone 390 | 5.0 ms | 8.2 ms | 0 | 7 |
| Hero original 768 | 11.6 ms | 26.0 ms | 2 | 30 |
| Hero tablet 768 | 5.9 ms | 7.6 ms | 1 | 11 |
| Story original 390 | 6.2 ms | 9.9 ms | 1 | 7 |
| Story portrait 390 | 3.9 ms | 6.0 ms | 0 | 7 |

The phone crop cuts decode time roughly in half and removes most of the
one-frame lag. The tablet crop does the same at 768x1024. Story's byte size is
almost unchanged, but its decoded pixel count drops 56%, which is why decode
time falls.

## Decision needed

Approve a 299-file phone set first (`640x1080`, q82) and, if tablet testing
still shows lag, the 299-file tablet set (`832x1080`, q82). That conversion
also needs:

- a viewport/orientation variant selector;
- a reload path when the device rotates between portrait and landscape;
- a final visual pass on the entrance and door frames, not just these nine.

Until then the production app still loads the original frames. Physical iOS,
Android, and tablet verification is still required.
