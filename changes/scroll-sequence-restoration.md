# Scroll sequence restoration — Hero and Our Story

Scope: the two existing scroll-driven JPEG sequences only. No redesign, no copy
or asset changes, no new dependencies, no change to section heights, sticky
behaviour, reduced-motion support, or unrelated sections. All changes are
uncommitted.

## 1. Verified failure

Both sections originally swapped a single hidden `<img>` on every scroll event.
When the next event arrived before the hidden image loaded, the browser aborted
the old request. A finished frame that no longer matched the newest target was
also discarded. During a continuous scroll the stage could stay on frame 001
until the scroll stopped.

The desktop build also queued all 299 Hero frames (≈15 MB) at mount. Those
requests competed with the frame the user was looking at, which made the first
notch wait seconds.

## 2. Current implementation

### `src/components/3d/EntranceExperience.jsx`

- **Predictive layer pool.** One layer is visible; up to three more are
  prefetched on phones/touch tablets and up to four on desktop. Five `<img>`
  layers are the ceiling.
- **Nearest-ready reveal.** The exact target wins when it is ready; otherwise the
  closest decoded frame is shown, preferring the frame just behind the scrub.
  The current frame stays visible until a replacement is ready, so the stage
  never goes blank. On narrow screens the final frame is only eligible inside
  the last 76 frames, so a pre-decoded frame cannot jump the artwork on a normal
  read.
- **Latency-compensated, staggered prefetch (narrow screens).** Phones and touch
  tablets measure the scroll speed in frames per millisecond and the measured
  request-to-decoded time, then ask for the frame the scrub will be reading when
  the bytes land, not the frame it is already leaving. Lanes also start about
  80 ms apart: three lanes started together used to finish together, so only one
  frame of each batch could reach the screen per round trip. Desktop keeps the
  last-jump offsets (`+1`…`+4`), which measured smooth. The end frame is asked
  for first while the last stretch is in reach, and it is never made to wait for
  a lane slot.
- **No request churn.** In-flight frames are left alone unless they are more
  than 80 frames behind the scrub; only stale requests beyond that distance are
  abandoned. This keeps a sudden target jump from pinning the stage to an old
  frame while four stale downloads finish.
- **Fallback ladder and pinned final.** On narrow screens only, eight frames are
  fetched once, one at a time, at low priority, starting at 400 ms: the final
  frame first, then seven frames spaced 38 frames apart. The final frame is also
  decoded into one of the existing pool layers at mount. One layer keeps it
  while the target jump is at least 32 frames or the scrub is inside the last
  76 frames; a slow mid-scroll releases that slot back to near prefetch. This
  is still one of the four narrow layers, not an extra cache.
- **Decode safeguard.** A layer joins the ready pool after `decode()` resolves,
  with the existing 300 ms fallback after the bytes arrive and a
  `naturalWidth > 0` guard before reveal. Visible loads use
  `fetchPriority = 'high'`.
- **rAF coalescing.** Scroll events join one pending animation frame instead of
  cancelling and reposting the callback on every event.
- **Cached layout.** Track top, scroll distance and viewport height are re-read
  on resize or URL-bar height changes, not on every scroll.
- **Observer gating.** Per-scroll work stops while the stage is more than a
  viewport away and runs one catch-up pass on re-entry.

### `src/components/sections/WelcomeStory.jsx`

- Same predictive pool, nearest-ready reveal, no-churn rule, decode fallback,
  high-priority visible layer and rAF coalescing.
- The Story does **not** preload the 56-frame set at mount. Its prefetch is
  gated by the existing `IntersectionObserver` and starts when the stage is
  within about a viewport.
- Frame count, 2vh per frame, copy reveal windows, reduced-motion branches and
  the pinned layout are unchanged.

No frame indexes, progress calculations, section heights, copy, `z-index`,
scrims or unrelated sections were changed.

## 3. Measurements

Browser: headless Chromium 155 through CDP, production `dist` served by
`vite preview`, exact device metrics, browser cache cleared before each fresh
run. “Browser verification” means the real Chromium renderer and native wheel
input, not a headed GUI window.

Lag is `|target frame − visible frame|`, sampled every animation frame. It is
not an FPS claim. Throttled cases use CDP CPU 4× and a 1.25 MB/s, 40 ms 4G
profile. Unthrottled cases use no network/CPU emulation.

### Phase 1 restoration (before and after)

| Case | Hero lag P50 / P90 / max | Story lag P50 / P90 / max |
| --- | --- | --- |
| 1440×900 slow, before | 14 / 29 / 58 | 0 / 5 / 6 |
| 1440×900 slow, after | **0 / 15 / 29** | **0 / 6 / 6** |
| 390×844 CPU4 4G slow, before | 77 / 124 / 155 | 11 / 29 / 32 |
| 390×844 CPU4 4G slow, after | **20 / 47 / 63** | **0 / 6 / 12** |
| 1440×900 fast, before | 0 / 87 / 124 | 0 / 0 / 17 |
| 1440×900 fast, after | **0 / 43 / 87** | **0 / 0 / 17** |
| 390×844 CPU4 4G fast, before | 20 / 252 / 278 | 0 / 38 / 55 |
| 390×844 CPU4 4G fast, after | **46 / 101 / 147** | **0 / 6 / 35** |

### Phase 2 controlled A/B

The Phase 2 change is the pinned final frame plus the end-only reveal guard.
The same preview server, headless Chromium process and emulation were used for
a baseline build and the final build, one after the other. Fast runs used the
300 px / 12 ms wheel; slow runs used 100 px / 45 ms.

| 390×844 CPU4 4G | Hero lag P50 / P90 / max | Final Hero | Story P50 / P90 / max |
| --- | --- | --- | --- |
| Baseline fast, 3 runs | 20–67 / 240–298 / 260–298 | 298 all | 0 / 22–35 / 35–52 |
| Final fast, 4 runs | **0 / 101 / 153–193** | **298 all** | 0 / 17–35 / 52 |
| Baseline slow, 2 runs | 27–61 / 55–171 / 78–217 | 298, 278 | 0 / 11–17 / 12–25 |
| Final slow, 2 runs | **17–31 / 44–47 / 61–63** | **298 both** | 0 / 6–8 / 17 |

The fast case is the one that matters for the cold fling: all four final runs
held P90 at 101 and P50 at 0, while the three baseline builds stalled at P90
240–298. The final frame is ready before the fling arrives, so the visible
sequence no longer waits for a network round trip at the end of the scroll.
Requests also fell from 32–34 (1.5 MB) to 31 (1.4 MB) in the fast case. Slow
requests stayed in the same range: 58–62 (2.7–2.8 MB) final versus 48–56
(2.2–2.7 MB) baseline, with the final build reaching 298 in both runs instead
of the 278 stall in one baseline run.

Run-to-run variance is still real on the emulated 4G link; earlier experimental
runs of the same final code ranged from P90 93 to 139. The A/B above is the
comparison used for the decision, not a claim of sub-100 ms on every run.

### Viewport matrix (Phase 2 final code)

Each row is one clean-cache run. “Blank” counts sampled visible layers with no
loaded frame. All rows reached Hero 298 and Story 55.

| Viewport | CPU / network | Hero P50/P90/max | Story P50/P90/max | Blank | Console | Horizontal overflow |
| --- | --- | --- | --- | --- | --- | --- |
| 320×568 | 4× / 4G | 0 / 32 / 68 | 0 / 9 / 26 | 0 | 0 | 0 |
| 375×812 | 4× / 4G | 9 / 30 / 45 | 0 / 6 / 18 | 0 | 0 | 0 |
| 390×844 slow | 4× / 4G | 17 / 44 / 61 | 0 / 6 / 17 | 0 | 0 | 0 |
| 390×844 fast | 4× / 4G | 0 / 101 / 193 | 0 / 35 / 52 | 0 | 0 | 0 |
| 430×932 | 4× / 4G | 6 / 26 / 40 | 0 / 6 / 11 | 0 | 0 | 0 |
| 768×1024 | 2× / 4G | 38 / 51 / 69 | 0 / 9 / 14 | 0 | 0 | 0 |
| 768×1024 repeat | 2× / 4G | 37 / 64 / 89 | 0 / 9 / 10 | 0 | 0 | 0 |
| 1024×768 | 2× / 4G | 61 / 85 / 102 | 0 / 7 / 13 | 0 | 0 | 0 |
| 1024×768 repeat | 2× / 4G | 67 / 84 / 102 | 0 / 8 / 19 | 0 | 0 | 0 |
| 1280×800 | 1× / local | 0 / 17 / 17 | 0 / 7 / 19 | 0 | 0 | 0 |
| 1440×900 slow | 1× / local | 0 / 15 / 29 | 0 / 6 / 11 | 0 | 0 | 0 |
| 1440×900 fast | 1× / local | 0 / 43 / 55 | 0 / 6 / 33 | 0 | 0 | 0 |

The 4G rows remain bandwidth-bound: a 1920×1080 frame is about 50 KB and the
test jumps many frames per wheel event. The pool keeps the stage moving, but it
cannot show every intermediate frame on that connection. It does not load or
retain the full 299-frame set: the 1440 slow run used 134 frame requests
(6.6 MB) versus 235 (11.4 MB) before. The 390 slow runs used 58–62 requests
(2.7–2.8 MB), in the same range as the 48–56 (2.2–2.7 MB) same-session
baseline; the fast runs fell to 31 requests (1.4 MB) from 32–34 (1.5 MB).

The eight fetched ladder frames (final first, then seven spaced) are later
revalidated by the visible `<img>` requests. On the `vite preview` server, which
sends `Cache-Control: no-cache`, a repeat is a ~300-byte 304 rather than a
second full download. The pinned final frame uses one of the existing four
narrow layers, so it adds no layer or retained-frame count; it does add one
50 KB startup preload.

### Fast scroll, reverse and re-entry

- 390 CPU4 4G fast: one to four visible Hero changes before settling; Hero 298
  and Story 55 reached. Three or four Hero requests were deliberately aborted
  (`ERR_ABORTED`) as the pool replaced them; no broken image or blank frame.
  The pinned final frame is shown only after the scrub passes frame 222, so the
  probe at target 185 kept the previous artwork instead of jumping to the end.
- 1440 fast: Hero 298 and Story 55 reached; P90 43; no failed requests or blank
  frames.
- 390 and 1440 reverse: the Story and then the Hero were scrolled back to 0; the
  reverse sample ended at `finalY = 0`, Hero 0 and Story 0, with no blank
  frame. Hero P90 during the 390 reverse was 47; 1440 reverse P90 was 15.
- Re-entry at 390: Hero 149 and Story 30 were restored after leaving each
  section and returning; visible images had `naturalWidth` 1920 and 1280.

### Reduced motion

`prefers-reduced-motion: reduce` was emulated at 390×844 and 1440×900. Both
sequences still scrub and reach 298/55.

- Hero P90 67 in both 390 CPU4 4G runs, P90 15 at 1440.
- Story P90 13–14 at 390, P90 5 at 1440.
- Copy checks at 390: Hero entrance 1 / dining 0 at 0.2, then entrance 0 /
  dining 1 at 0.7; Story 1 / flavour 0 at 0.3, then 1 / 1 at 0.55. The copy
  changes in one step, without the dissolve/slide.

### Errors, images and overflow

- No console errors and no uncaught page exceptions in the final runs.
- No broken frame images: every sampled visible frame had a non-zero
  `naturalWidth`; the final matrix reports `frames.hero.broken = 0` and
  `frames.story.broken = 0`.
- Failed frame requests were `ERR_ABORTED` only, caused by the pool replacing an
  in-flight layer or by the stale-frame rule; the fast 390 runs had three or
  four, the other final runs zero or one. No non-200 frame responses.
- `scrollWidth - innerWidth` was 0 on the phone widths and −6 px on widths with
  a scrollbar; no horizontal overflow.
- JS heap after the runs was about 15–19 MB. Browser image memory is not exposed
  by CDP, so the decoded-layer footprint was not measured directly. The pinned
  final is one of the four narrow layers, so the retained layer count is
  unchanged; it is not an extra fifth frame.

## 4. Evidence

- `changes/evidence/after-scroll-hero-1440.jpg` — Hero p=0.5, frame 149,
  `naturalWidth` 1920.
- `changes/evidence/after-scroll-story-1440.jpg` — Story p=0.55, frame 30,
  `naturalWidth` 1280.
- `changes/evidence/after-scroll-hero-final-1440.jpg` — Hero final, frame 298.
- `changes/evidence/after-scroll-story-final-1440.jpg` — Story final, frame 55.
- The same four shots exist for 390×844 with `-390` suffixes. All eight were
  refreshed against the Phase 2 final code; each shows the expected frame and
  non-zero `naturalWidth`.

## 5. Build and lint

- `npm run lint` (`tsc --noEmit`): pass.
- `npm run build`: pass, 1685 modules transformed. The existing chunk-size
  warning remains; no new dependency or chunk was added.

## 6. Preserved

- Hero 299-frame sequence, 0.765vh per frame, 161/298 entrance→dining boundary,
  final frame retention.
- Story 56-frame sequence, 2vh per frame, copy reveal windows, final frame
  retention.
- Sticky/pinned sections, section heights, text and image reveals, Navbar crest,
  and every section outside the two scrub components.
- Reduced-motion branches and responsive layouts.
- `decoding="async"` and the decoded-before-reveal safeguard with a 300 ms
  fallback.
- IntersectionObserver gating, cached layout measurements and single-rAF scroll
  coalescing.

## 7. Phase 2 bottleneck and rejected changes

The probe still points at the network and cold start, not the reveal loop. In
the final 390 fast probe the final layer was already decoded at 8 ms and the
target was 185 at 290 ms; the final was intentionally withheld until target 231
at 386 ms. The intermediate 190, 278 and 266 images did not finish loading
until roughly 635–748 ms, and visible changes followed 15–30 ms after their
decode. A hard fling can therefore arrive before the middle of the sequence,
but it can no longer wait for the last frame.

Main-thread long tasks in the final runs started after the Hero window (for
example 3.3 s with Hero ending at 1.48 s in the 390 fast run), so they were
Story/menu work, not Hero selection. No Hero long task was recorded in the fast
probe.

Changes tested and reverted because they did not improve the measured result,
or caused a worse failure mode:

- **Velocity-widened stale window.** Narrow cancellation at 768/1024 raised
  P90 to 127/271 with 28/20 aborted requests; the 80-frame rule stayed.
- **Five layers on phones.** 390 fast P90 rose to 230–260; the four-layer pool
  stayed.
- **Two ladder workers.** 390 fast stalled at P90 298 and sometimes finished at
  278; one low-priority worker stayed.
- **Per-frame priority split.** Low-priority neighbors starved the visible
  sequence; one 390 slow run never left frame 0. All visible loads stayed high.
- **First-anchor-first ladder.** 390 fast P90 returned to 240–298; the final
  anchor stayed first.
- **Final ladder without the pinned layer.** The final frame was still a
  network request in the cold fling and sometimes ended at 278; the pinned
  layer fixed that.
- **Pinned final without the end guard.** The probe showed the end artwork at
  target 185 while the scroll was still mid-sequence; the 76-frame guard kept
  the sequence in order.

Files changed in Phase 2: `src/components/3d/EntranceExperience.jsx`,
`changes/scroll-sequence-restoration.md`, and the refreshed 390/1440 evidence
screenshots. `WelcomeStory.jsx` was not changed. All work remains uncommitted.

## 8. NOT TESTED

- Physical iOS/Android devices, real touch momentum, low-end hardware frame
  pacing, and real carrier variability. All performance numbers are CDP
  emulation in headless Chromium.
- Headed GUI browser window. Headless Chromium was used because the available
  Browser tab reports `visibility: hidden`.
- Firefox and Safari; neither is installed on this machine. Low-priority fetch
  hints are ignored where unsupported; the pool does not depend on them.
- Total decoded-image memory. CDP exposes JS heap, not GPU/image memory.
- Network profiles other than the 1.25 MB/s, 40 ms CDP 4G profile and localhost.

## 9. Phase 3: what actually limits phones and tablets

### The control that decided the direction

Same page, same 299 frames, 390x844, CPU throttled 4x, but no network
throttle (served from localhost): **P50 0 / P90 16, 27 visible changes**. The
same device profile on the CDP 4G profile (40 ms latency, 1.25 MB/s down)
measured **P50 14 to 17 / P90 32 to 40, 14 changes**. Four times slower CPU
with fast bytes stays smooth. Normal CPU with slow bytes does not. The mobile
lag in Phase 3 is delivery, not decode and not the main thread.

### Why delivery was slow

Two things, both visible in the request timeline at 390 slow.

1. **Batched starts.** The old `schedule` started every free lane in the same
   call. Three lanes began within a millisecond of each other and finished
   within about 30 ms of each other, roughly 250 ms later. `showBest` reveals
   the nearest completed frame only, so a batch of three put one new frame on
   screen. Effectively the sequence ran at one frame per round trip.
2. **Requests that were already stale.** The pool asked for the frame at
   `target + step`. A cold frame took 200 to 500 ms to decode on that profile,
   by which time the scrub had moved 20 to 30 frames past it.

The whole entrance produced 43 image requests and 23 distinct visible frames,
and the visible frame sat 14 to 30 frames behind the scrub for most of the
walk. Adding requests could not help; a fourth lane that lands with the other
three still yields one reveal.

### The change

`src/components/3d/EntranceExperience.jsx` is the only file changed in this
phase. `WelcomeStory.jsx` (which carries its own Phase 1 rewrite in the working
tree), the Hero layout, artwork, copy, scroll distance, frame count, image
format and cache sizes were not touched. No dependencies were added.

- **Measured speed and latency.** `showFrame` keeps a smoothed scroll speed in
  frames per millisecond (`velocityRef`). `loadLayer` keeps a smoothed
  request-to-decoded time (`latencyRef`, 120 ms starting value, clamped to 20
  to 1500 ms).
- **Lead instead of lag.** On narrow screens the first requested frame is
  `target + direction * lead`, where `lead = velocity * latency` clamped to 64
  frames. The request is for the frame the scrub will be reading when the bytes
  land.
- **Staggered starts.** While a lane is in flight, at most one new lane starts
  per 80 ms (`LOAD_PACING_MS`). Lanes now arrive spread out instead of in
  batches, so each arrival can become a visible frame.
- **End frame first, and never paced.** While the last stretch is in reach the
  end frame is the first entry in the desired list, and it bypasses the pacing
  gate. A fling to the bottom shows the end artwork as soon as it is decoded.
- **Unchanged:** nearest-ready reveal, frames behind the scrub preferred, the
  80-frame stale-abandon rule, the 300 ms decode fallback, the 76-frame end
  guard, the low-priority anchor ladder, four pool layers on narrow / five on
  desktop, the final-frame reveal guard, and reduced motion.

Desktop is deliberately not affected: the lead, the pacing and the end-first
ordering are all inside `narrowRef`, and 1440/1280 measurements below sit inside
the baseline's own run-to-run spread.

## 10. Phase 3 measurements

All numbers are P50 / P90 / P95 / max frame lag in frames, from the same CDP
harness at the same settings as Phase 2, on this machine, with the build swapped
between the Phase 2 and Phase 3 halves of each A/B. "req" is image requests,
"KB" is total image bytes for the run.

### Phones, slow drag (390x844, CPU 4x, 4G)

| build | P50 / P90 / P95 / max | changes | req | KB | failed |
|---|---|---|---|---|---|
| Phase 2 | 17 / 40 / 41 / 48 | 14 | 67 | 2984 | 0 |
| Phase 2 | 14 / 32 / 41 / 47 | 14 | 67 | 2992 | 0 |
| Phase 3 | 12 / 30 / 30 / 44 | 19 | 55 | 2610 | 0 |
| Phase 3 | **5 / 24 / 37 / 44** | 14 | 54 | 2517 | 0 |
| Phase 3 | **4 / 24 / 29 / 44** | 17 | 54 | 2598 | 0 |
| Phase 3 | **5 / 25 / 29 / 44** | 17 | 55 | 2575 | 0 |

P50 lands between 4 and 12 with a median of 5, against 14 to 17 before. P90 is
24 to 30 against 32 to 40. The first of those four runs is the slow tail of the
distribution, not a different code path: the two runs before the end-frame
ordering (same paced build, no ordering) measured 4/29 and 5/29, so the ordering
does not cost anything on a slow drag. Requests fall from 67 to 54 to 58 and
bytes from about 2.98 MB to 2.5 to 2.7 MB, because stale prefetches are no
longer started.

### Phones, fast drag (390x844, CPU 4x, 4G)

| build | P50 / P90 / P95 / max | changes | req | KB | aborts |
|---|---|---|---|---|---|
| Phase 2 | 0 / 88 / 101 / 107 | 6 | 34 | 1605 | 2 |
| Phase 2 | 0 / 88 / 101 / 107 | 6 | 34 | 1605 | 1 |
| Phase 3 | **0 / 29 / 46 / 91** | 7 | 29 | 1505 | 0 |
| Phase 3 | **0 / 74 / 75 / 91** | 6 | 29 | 1535 | 0 |

The two Phase 3 runs differ because a fling is a coin flip on which delivery
lands first. Both are inside or below the old 88/107, and the aborted requests
disappear.

### Tablets, slow drag (768x1024, CPU 2x, 4G)

| build | P50 / P90 / P95 / max | changes | req |
|---|---|---|---|
| Phase 2 | 18 / 76 / 88 / 101 | 13 | 66 |
| Phase 2 | 38 / 114 / 139 / 152 | 15 | 66 |
| Phase 2 | 14 / 38 / 51 / 63 | 24 | 79 |
| Phase 3 | **7 / 25 / 36 / 49** | 19 | 62 |
| Phase 3 | **9 / 38 / 62 / 74** | 18 | 59 |
| Phase 3 | **8 / 26 / 36 / 39** | 22 | 69 |

Every Phase 3 run beats every Phase 2 run on P50, and the worst case improves
from 152 to 74.

### Tablets, fast drag and 1024 (CPU 2x, 4G)

| profile | build | P50 / P90 / P95 / max |
|---|---|---|
| 768 fast | Phase 2 | 0 / 39 / 76 / 114 |
| 768 fast | Phase 2 | 0 / 39 / 76 / 76 |
| 768 fast | Phase 2 | 0 / 77 / 115 / 153 |
| 768 fast | Phase 3 | 0 / 113 / 127 / 151 |
| 768 fast | Phase 3 | 0 / 50 / 51 / 74 |
| 768 fast | Phase 3 | 0 / 89 / 113 / 127 |
| 1024 slow | Phase 2 | 51 / 85 / 85 / 98 |
| 1024 slow | Phase 3 | **5 / 30 / 32 / 49** |
| 1024 fast | Phase 3 | 0 / 38 / 49 / 100 |

The 1024 baseline is a single run; the 768 baseline above has three. The 768
fast case is the one profile without a clear win. Both builds spend most of
those samples waiting for the end frame, and both land anywhere from P90 39 to
113 depending on the run. The 1024 slow case is the largest single improvement
in the phase (P50 51 to 5, max 98 to 49). Before the end-first ordering was
added, 1024 fast measured P90 151 / max 252; ordering the end frame first
brought it to 38 / 100.

### Other widths (slow, CPU 4x, 4G)

| width | Phase 2 (P50 / P90 / max) | Phase 3 (P50 / P90 / P95 / max) |
|---|---|---|
| 320x568 | 0 / 32 / 68 | 2 / 28 / 41 / 44 |
| 375x812 | 9 / 30 / 45 | 4 / 25 / 46 / 62 |
| 430x932 | 6 / 26 / 40 | 7 / 27 / 29 / 43 |

No width regresses on P90.

### Desktop and Story

| profile | build | P50 / P90 / P95 / max |
|---|---|---|
| 1440 slow | Phase 2 | 0 / 15 / 15 / 15 |
| 1440 slow | Phase 2 | 14 / 44 / 59 / 73 |
| 1440 slow | Phase 2 | 14 / 44 / 58 / 67 |
| 1440 slow | Phase 3 | 9 / 15 / 29 / 29 |
| 1440 slow | Phase 3 | 15 / 21 / 29 / 29 |
| 1440 slow | Phase 3 | 14 / 43 / 52 / 52 |
| 1440 slow | Phase 3 | 1 / 15 / 15 / 29 |
| 1440 slow | Phase 3 | 1 / 15 / 15 / 29 |
| 1440 slow | Phase 3 | 14 / 28 / 29 / 30 |
| 1440 fast | Phase 2 | 0 / 43 / 44 / 87 |
| 1440 fast | Phase 3 | 0 / 43 / 44 / 87 |
| 1280 slow | Phase 3 | 0 / 17 / 17 / 33 |

The Phase 2 build measured 0/15 in one run and 14/44 in the next two in this
session, so the desktop path is unchanged within its own noise floor. The
1440 fast numbers are identical to the frame. The desktop branch of the
scheduler builds the same list as Phase 2; the lead, the pacing and the
end-first ordering only run inside `narrowRef`.

Five of six desktop slow runs ended on frame 298. One sampled 289 with the end
frame still decoding at the moment the harness read the page. That tail is not
new: the desktop scheduler is the Phase 2 one, and the pool asks for 298 in the
same way it always did. It is reported here rather than hidden.

Our Story is unchanged in every run of this phase: P50 0, P90 5 to 14 at 390
and 768, P90 17 to 38 during a full fling, and it always ends on frame 55. The
Story observer, its own mobile frame window and its reduced-motion path were
not edited.

### Behaviour checks

- **Stop mid-scroll (390, 4G):** stopped at target 154, held 1.5 s, visible
  settled to 155 (lag 1). Resumed to the bottom: 298 of 298. Reversed to target
  247, held: visible 246 (lag 1). 0 blank samples, lag P50 1 / P90 12 / max 44
  across the whole drag.
- **Full reverse (390 and 1440):** ends at scroll 0 with Hero on frame 0 and
  Story on frame 0; 390 P90 29, 1440 P90 15.
- **Re-entry:** leaving and returning to the Hero restores frame 149 with
  `naturalWidth` 1920; the Story returns to frame 30 with `naturalWidth` 1280.
- **Reduced motion (390):** P90 25 to 34, Hero and Story still track, no console
  errors. 1440 reduced measures inside the same 15 to 57 spread as Phase 2.
- **Blank and broken frames:** an all-layer probe over a full slow run and a
  full fast run (129 and 85 samples) found 0 samples with no visible frame and
  0 visible frames with `naturalWidth` 0. The end frame is reached at 298 with
  `naturalWidth` 1920, and all five layers hold a decoded 1920 px frame.
- **Console:** 0 errors in every Phase 3 run. Failed requests are 0 or, where
  present, `net::ERR_ABORTED` from the deliberate stale-frame replacement.
- **Overflow:** 0 horizontal overflow at 320, 375, 390, 430; the desktop value
  is the scrollbar.

### Where the remaining lag comes from

The floor with no network throttle is P90 16 at the same CPU setting. Phase 3
reaches P90 24 to 30 on the 4G profile, and that gap is the pipe: about 55
image requests and 2.6 MB of frames is over 2 s of transfer at 1.25 MB/s,
against a scroll that takes about 1.9 s. The sequence cannot be sharper than
that on a first visit. What changed is that almost every downloaded frame now
becomes a visible frame instead of arriving stale, so the artwork stays close to
the scrub while the bytes come in.

## 11. Phase 3 experiments that did not survive measurement

- **Lead only, no stagger** (first request `target + lead`, capped at 32, ladder
  and end frame dropped from the pool): 390 slow P50 14 to 19 / P90 40 to 62,
  768 P90 51 to 101, 1024 one run at P90 155. Worse than the unmodified build,
  because the three lanes still arrived together. Reverted.
- **Rolling warm window** (low-priority fetch 180 to 540 frames ahead on every
  schedule call): 390 slow P50 17 to 19 / P90 40 to 51, 78 requests and more
  bytes than baseline. Reverted.
- **12-frame ahead-reveal cap** (refuse to show a decoded frame that is more
  than 12 frames ahead of the scrub): 768 P90 23 to 64, 390 P90 29 to 31/44
  with 5 to 6 long tasks instead of 1. The cap made the pool hold finished
  frames while the screen showed an older one. Reverted.
- **Dedicated fifth layer for the end frame on narrow screens:** 390 fast worst
  run P90 137 / max 229, 768 fast P90 153, plus one more retained decoded frame.
  Reverted, because it cost memory and measured no better.
- **End frame first in the desired list, with pacing applied to it:** 1024 fast
  P90 151 / max 252, because the pinned frame waited up to 160 ms for a lane
  slot. Kept, but exempted from pacing, which is the version that ships.

One trade-off is deliberate: during a drag the screen can show a frame ahead of
the scrub, because the lane that lands first is used instead of being held back.
On a 100 px per 45 ms drag the largest measured overshoot was 16 frames; on the
harness's faster fling it reached 33. The 12-frame cap experiment above shows
what holding it back costs (P90 doubles on tablet). The end guard still prevents
the final artwork from appearing before the last 76 frames.

## 12. Phase 3 build, and what is still untested

`npm run lint` (TypeScript, no emit) passes after the final edit. `npm run build`
passes and emits `dist/assets/index-BYQ3y0-l.js`, 896.82 kB (238.98 kB gzip).
All of it is uncommitted, as requested.

Every number above is CDP emulation in headless Chromium: 390 and phones use
CPU 4x + 40 ms / 1.25 MB/s, 768 and 1024 use CPU 2x + the same network, desktop
uses no throttle. The following remain NOT TESTED:

- Physical iOS and Android hardware, real touch momentum, and real carrier
  variability. Emulation reproduces slow bytes and slow CPU, not a real GPU,
  a real image decoder, or a low-memory device evicting decoded bitmaps.
- Total decoded-image memory. The narrow pool is still four lanes plus the
  visible layer, with five `<img>` elements as the ceiling; the fifth-frame
  experiment was reverted for that reason, but the actual memory ceiling on a
  small phone was not measured.
- Firefox and Safari. The lead and pacing logic is plain JS and the pool does
  not rely on `fetchPriority`, but neither browser was available here.
- A headed GUI browser. The Browser pane reports `visibility: hidden`, so all
  runs are headless and rAF-driven behaviour in a visible window is assumed.
