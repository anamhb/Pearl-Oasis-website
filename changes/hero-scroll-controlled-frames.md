# Hero: scroll-controlled image frames (replaces scrubbed video)

## Summary

The hero walkthrough in `src/components/3d/EntranceExperience.jsx` no longer
scrubs a remote Cloudinary video. It renders a local 70-frame image sequence
into a `<canvas>`, indexed directly by scroll progress. The track height,
copy hand-over, scrims, cues, reduced-motion behaviour, CTA and layout are
unchanged; only the media layer and its loading logic were replaced.

## Frame source

- Directory: `public/video-frames-hero/` (served at `/video-frames-hero/...`,
  vite `base` is the default `/`)
- Count: **70** JPEG frames, 2560x1440, 74-197 KB each, 6.1 MB total
- Naming: `ezgif-frame-001.jpg` .. `ezgif-frame-070.jpg`, zero-padded to three
  digits, so lexicographic order equals numeric order (no sort hazard)
- Integrity: 70 distinct indices in 1-70, no duplicates, no gaps; a
  neighbour-similarity scan of all frames shows a smooth progression (mean
  absolute difference avg 12, max 34.8 at the fastest camera motion, no
  scene-cut spikes), so the sequence is complete and correctly ordered
- Content: frame 001 = corridor with glass doors, frame 036 = dining-hall
  buffet, frame 070 = chafing-dish close-up (verified against rendered
  screenshots at scroll start / middle / end)

## Root cause of the previous video lag

The old implementation assigned `video.currentTime` on every scroll step to a
paused remote video. Each seek cost a network range fetch plus a keyframe
decode (even with `ki_1`, up to 1 s = 24 frames), and only one seek could be
in flight, so during fast scroll newer positions collapsed into a single
pending target: the display trailed the scroll, then snapped when the pending
seek landed. Decode was coupled to the compositor, so bursts dropped frames,
and any network stall held a stale frame.

## Implementation

### Rendering

- One 2D `<canvas>` (`alpha: false`) replaces the `<video>`; backing store is
  the stage box at `min(devicePixelRatio, 2)`, drawn with object-cover math so
  the result matches the old `object-fit: cover` behaviour.
- A static `<img>` of frame 001 sits under the canvas as the poster. The
  canvas starts at `opacity: 0` and is revealed only after its first
  successful draw, so the poster handover is pixel-identical and the stage is
  never blank. Canvas context failure or an undrawable frame falls back to
  the poster, then to the stage background `#090a0c`.
- The canvas is never cleared between paints; it only repaints when the frame
  index or the backing size changes.
- `data-frame` on the canvas exposes the drawn index for verification and
  debugging (same observability pattern as the existing `data-scroll-align`).

### Progress to frame mapping

- `index = Math.round(clamp01(progress) * 69)` -> frames 001..070.
- Frame 001 at progress 0, frame 070 fully displayed at progress 1 (clamped),
  no off-by-one (verified: start=0, mid=35, exact end=69 at every width).
- The scroll pipeline is otherwise untouched: same rAF-throttled `update()`,
  Lenis, IntersectionObserver visibility gate, resize/orientation correction
  and style cache. Only `applyVideoProgress` became `applyFrameProgress`.
- A monotonicity guard in `paint()` never lets the drawn index move opposite
  to the direction of the scroll target, so a briefly unpaintable neighbour
  can never cause a backwards jump; the current frame is held instead.

### Loading and decoding

- All 70 frames are `HTMLImageElement`s (compressed resident set is a fixed
  6.1 MB). Downloads run in batches of 6 (the per-host connection pool),
  re-sorted each batch by distance from the current index (forward-biased),
  so downloads chase the scroll position instead of racing it. One bounded
  pass; stops on completion or unmount.
- Decode-ahead window: frames within `[current-2, current+5]` call
  `img.decode()` on load and on each index change, so scrolling does not wait
  for decoding. `img.decoding = 'async'` is set before the source.
- `paint()` prefers already-decoded frames (two-pass nearest search), falling
  back to any loaded frame (`drawImage` decodes those synchronously as a last
  resort). Decoded rasters stay browser-managed and are evicted under memory
  pressure; the full-resolution sequence is never all decoded at once.
- Frame errors are logged once (`[Hero frames] frame failed to load`) plus a
  completion summary; failed frames are skipped without retry storms.

### Rejected approach (documented on purpose)

A `createImageBitmap` LRU cache was implemented first and removed after
profiling: a CPU profile of the scroll pass showed `createImageBitmap` at
98.1% of main-thread time with long tasks of 1.8-2.5 s (decode plus
high-quality resize runs on the main thread for HTMLImageElement sources).
A live benchmark confirmed: `img.decode()` 14-18 ms, `drawImage` of a decoded
image 0.1-0.2 ms, `createImageBitmap` with resize 170-250 ms (47-60 ms even
at `resizeQuality: 'low'`). The windowed `img.decode()` path replaced it.

## Validation

Environment: headless Chrome (GPU enabled) on CDP port 9520, `vite preview`
on 4174, script `hero-frames-check.cjs` (saved outside the repo). LT Browser
profiles are not present in this repository, so widths were emulated via CDP
device metrics instead.

Per width (1440x900, 768x800, 390x844@DPR2), all checks passed:

- First paint: frame 0 at top, canvas revealed after first draw
- Preload: 70/70 frame requests, all 200/304; zero requests to any hero
  video URL
- Four scroll passes (slow 6 s forward, fast 0.7 s reverse, fast forward,
  normal 2.5 s reverse), in-page rAF sampler of scrollY + `data-frame`:
  - 0 direction violations (monotonic both directions)
  - 0 blank samples (canvas opacity stayed 1 after first paint)
  - 0 layout shift (CLS 0.0000 per pass)
  - 0 long tasks (max 0 ms; before the fix: 6-7 tasks >120 ms, max 2462 ms)
  - max step 1 frame on slow/normal passes, 3-5 frames on fast passes
    (expected at those speeds; still monotonic)
- Key positions: start = frame 0, mid (progress 0.5) = frame 35
  (`round(0.5*69)`), exact end = frame 69, all exact at every width
- Transition: sticky stage releases at track end, `#story` enters the
  viewport, final frame stays held (screenshot verified)
- Console: clean (no errors or warnings) at every width
- JS heap delta after full preload: 2.3-3.4 MB
- Reduced motion (emulated `prefers-reduced-motion`): frames still scrub,
  copy swap is abrupt (entrance 0 / dining 1 at mid), console clean
- Screenshots reviewed: start/mid/end/transition at 1440, start/end at 390;
  source file 036 visually matches the mid-scroll render (confirms the
  index-to-file mapping)

Artifacts: `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\menu\shots\`
(`hero-{1440,768,390}-{start,mid,end,transition}.png`), scripts
`hero-frames-check.cjs` and `hero-frames-profile.cjs` in the same tree.

## Files touched

- `src/components/3d/EntranceExperience.jsx` (media layer, frame pipeline,
  removed all `VIDEO_*` URLs, source negotiation, seek queue and media-error
  fallbacks)
- `changes/hero-scroll-controlled-frames.md` (this file)

No dependencies added; no other sections or styles changed (`index.css`
needed no edits; `#entrance` only carries a scroll-margin rule).
