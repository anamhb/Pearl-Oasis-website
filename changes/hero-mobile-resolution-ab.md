# Hero mobile resolution A/B

- Date: 2026-10-23
- Scope: representative portrait crops from the current Hero footage only
- Status: experiment complete; no production code or assets changed

## Method

The existing Hero in
[`EntranceExperience.jsx`](../src/components/3d/EntranceExperience.jsx) was
tested in headless Chrome against the current 70-frame sequence. The B arm
intercepted five frames (018, 024, 037, 055, and 070) with temporary q70
426×720 center crops made from those same current frames. Frame 001 and all
other frames remained at 1280×720. The sixth generated crop was not routed
during the live test.

Both arms used 4× CPU throttling, disabled browser cache, local unthrottled
network, and wheel input of 100 px every 200 ms through the Hero's full pinned
distance. The tested viewports were 320×568 and 390×844. Network bytes below
are browser resource-transfer measurements, not total page or device memory.
The 320×568 resource entries were cleared after initial frame setup; the
390×844 counts include the full page load in both arms.

## Results

| Viewport | Arm | Scroll / final frame | Pre-update synchronous lag, p50 / p90 / max* | rAF interval, p50 / p90 | Frame decode, p50 / p90 | Frame requests / bytes |
|---|---|---:|---:|---:|---:|---:|
| 320×568 | Original | 1300 px / 070 | 5 / 5 / 6 frames | 28.4 / 53.6 ms | 18.4 / 37.4 ms | 40 / 1,135,435 B |
| 320×568 | Crops | 1300 px / 070 | 5 / 5 / 6 frames | 25.4 / 51.3 ms | 17.1 / 39.0 ms | 39 / 1,096,981 B |
| 390×844 | Original | 1932 px / 070 | 4 / 5 / 5 frames | 26.1 / 51.5 ms | Not comparable | 66 / 2,029,526 B |
| 390×844 | Crops | 1932 px / 070 | 4 / 5 / 5 frames | 26.0 / 52.1 ms | Not comparable | 66 / 2,005,471 B |

*Correction:* the lag column above was sampled synchronously in the `scroll`
event, before the Hero's queued animation-frame update. It measures the
expected pre-update stale frame, not post-update visible lag, and must not be
used as actual scroll-to-frame latency. The 320×568 scroll-to-visible estimate
used 200 ms checkpoints and produced only two matched samples per arm; its p90
values (509 ms original, 354 ms crops) are too sparse and checkpoint-biased
to support a latency claim. At 390×844, an opacity-mutation observer found
nine matched samples per arm: p50/p90 were 1.5/4.6 ms for original and
1.3/3.0 ms for crops. That difference is also too small and too sparsely
sampled to establish an improvement.

At 390×844, both arms changed the visible frame about 21 times during 20 scroll
events and finished on frame 070. The rAF p50/p90 and target lag were
effectively unchanged. At 320×568, the crop arm's rAF p90 improved by about
4%, while decode p90 was about 4% slower; request bytes fell by about 3.4%.
At 390×844, request bytes fell by about 1.2% with the same request count.
Selected-frame decode timings varied in both directions between arms, so they
do not demonstrate a consistent decode gain.

The crop contains 66.7% fewer decoded pixels per replaced frame (about 1.17
MiB versus 3.52 MiB for RGBA pixels, estimated from dimensions). This is a
pixel-buffer estimate, not measured process or GPU memory. The six temporary
q70 samples total about 159.5 KB versus 201.9 KB for their originals. Pixel
comparison against each original's center crop showed MAE 1.37–1.89/255;
the central doors, buffet, and final dish remained framed. The 426×720 center
crop preserves the original `object-fit: cover` field of view at both tested
portrait sizes.

## Conclusion

Reducing resolution substantially reduces the theoretical decoded pixel
footprint of each substituted frame, but this representative live A/B did not
show a meaningful improvement in scroll cadence, frame lag, decode timing, or
transfer volume. It therefore does **not** justify generating or integrating
all 70 portrait frames.

The primary lag source remains unproven. The clearest repeated symptom under
4× CPU throttling is slow rAF cadence (about 52 ms p90), while corrected
post-update frame lag was p90=1 at 390×844 and p90=3 at 320×568. The crop
experiment did not materially improve either cadence or lag, so image
resolution is not demonstrated as the primary bottleneck. General frame
scheduling or page-wide main-thread pressure is the strongest remaining
direction to investigate, but no specific source has been demonstrated.
No scheduler, rendering, or scroll-mapping change is made on this evidence.

## Scheduler and main-thread follow-up

A follow-up used the same headless Chrome setup (4× CPU throttle, disabled
cache, visible/focused page, and 100 px wheel input every 200 ms). Lag was
sampled after two animation frames so the Hero's queued update could run before
comparing the target and visible frame. The table's earlier synchronous-lag
values are intentionally not compared with these corrected measurements.

| Viewport / condition | Post-update lag samples, p50 / p90 / max | rAF interval samples, p50 / p90 / max | Long tasks | Final frame |
|---|---:|---:|---:|---:|
| 320×568, normal page | 13; 2 / 3 / 4 frames | 188; 26 / 51.9 / 118.8 ms | 0 | 070 |
| 390×844, SignatureDishes loop paused; BrandWordmark active | 20; 0 / 1 / 2 frames | 201; 26 / 52.0 / 977 ms | 0 | 070 |
| 390×844, both loops paused | 20; 0 / 1 / 4 frames | 208; 26 / 51.9 / 661.7 ms | 0 | 070 |

At 320×568, the corrected target-to-visible lag was p90=3 frames, not the
pre-update p90=5 from the earlier table. At 390×844, the repeated
BrandWordmark-only intervention changed rAF p90 by 0.1 ms (52.0 to 51.9 ms)
and did not improve post-update lag. This did not reproduce an earlier
single sequential run in which pausing the BrandWordmark loop coincided with
rAF p90 falling from 52.1 to 35.6 ms. The discrepancy makes that initial result
inconclusive; it is not evidence that the header loop is the primary cause.
Pausing SignatureDishes alone previously changed rAF p90 only from 53.6 to
52.1 ms. One sampled CPU profile included time in the SignatureDishes
animation, but this and the runtime interventions do not establish it as the
primary cause either.

The repeated 390×844 pair had no observed long tasks, while rAF interval p90
remained about 52 ms and isolated maxima were much larger. Long-task absence
does not explain those intervals or rule out other main-thread, browser, or
device scheduling effects. These measurements do not establish a GPU or
compositing bottleneck. The small corrected lag sample counts and sequential
same-page arms also limit the strength of the comparison.

## Limitations and remaining checks

- These are headless Chrome results, not proof of smoothness on physical
  Android or iOS devices. Real-device validation remains outstanding.
- The test used local, unthrottled network and did not collect reliable
  process/GPU memory measurements. The one sampled CPU profile is not a
  repeatable attribution by itself.
- The corrected 320×568 lag sample (13 scroll updates) and 390×844 loop-pause
  arms (20 updates each, sequential on the same page) are limited samples;
  decode and request counts are sensitive to initial preload and instrumentation
  timing.
- A failed browser instrumentation setup emitted a MutationObserver
  instrumentation error, and the page logged aborted external Cloudinary video
  requests. No failure of the measured Hero JPEGs was observed, but a clean
  console/network-failure audit was not established.
- Fast forward/reverse flings, re-entry, rotation, and deliberate image-failure
  behavior were not part of this representative-resolution A/B.
- No lint, test, or production build was run because application code and
  project assets were not changed.

No commit or push was made. The temporary prototype files remain outside the
repository in session storage.
