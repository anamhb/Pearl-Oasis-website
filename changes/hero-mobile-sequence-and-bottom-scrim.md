# Hero — updated mobile sequence and bottom-scrim fix

Scope: the Hero walkthrough (`EntranceExperience`) only. No change to the copy,
CTA, entrance animation, Story section, or other sections.

## 1. Asset audit (before editing)

| Path | Files | Dimensions | Notes |
| --- | ---: | --- | --- |
| `public/video-frames-final/` | **70** | 1280×720 | Current sequence, `ezgif-frame-001.jpg` … `ezgif-frame-070.jpg`, contiguous. There is no `071`. |
| `public/video-frames-final-phone/` | 299 | 640×1080 | Previous 299-frame portrait crop, still made from the old footage. |
| `public/video-frames/` | 70 | 1280×720 | Older 70-frame export; ends on a different dining-room shot and is not referenced by the Hero. |
| `public/video-frames-second/` | 56 | 1280×720 | Our Story sequence, not part of the Hero. |

The current desktop set is 2.13 MB in total. The old phone crop is 9.53 MB.

### Why mobile was stale

`EntranceExperience.jsx` still selected the phone folder whenever the viewport
was portrait, ≤ 640 px wide, and at or below the 640/1080 aspect ratio. That
folder contains the *previous* 299 frames. The component also still had
`FRAME_COUNT = 299`, `DINING_ROOM_FRAME = 161`, and prediction distances sized
for 299 frames, so the two asset sets and the frame-derived logic had drifted
apart.

No updated mobile crop exists. A new 640×1080 crop from the 1280×720 frames
would require cropping to about 426×720 and upscaling 1.5×, so it would be
softer than using the updated native frames. The Hero now uses the single
70-frame `video-frames-final` set on every viewport, with the existing
`object-fit: cover` framing. On a 390×844 portrait viewport, cover shows about
26% of the source width — the same effective field of view the old phone crop
ended up showing after its own cover crop.

The old phone folder is intentionally not deleted (it is user-owned, and the
change is a code-only selection change), but nothing in `src/` or the production
bundle references it any more.

## 2. Code changes

File: `src/components/3d/EntranceExperience.jsx`

### Sequence and frame-derived values

| Constant | Before | After | Reason |
| --- | ---: | ---: | --- |
| `FRAME_COUNT` | 299 | **70** | Matches the 70 contiguous files. |
| `SCROLL_VH_PER_FRAME` | 0.765 | **3.27** | Keeps ≈229 vh of pinned travel, so the section is still ≈329 vh tall and releases at the same page position. |
| `DINING_ROOM_FRAME` | 161 | **23** | Frame 24 (1-based) is the first frame inside the dining room; the dissolve now happens as the doors open. |
| `LADDER_STEP` | 38 | **9** | Same roughly 13% spacing at 70 frames. |
| `MAX_PREDICT_STEP` | 32 | **8** | Same roughly 11% jump at 70 frames. |
| `STALE_DISTANCE` | 80 | **19** | Same roughly 27% distance at 70 frames. |
| `MAX_PREDICT_LEAD` | 64 | **15** | Same roughly 21% lead at 70 frames. |

The last four matters: at 70 frames the old values were larger than the whole
sequence. In particular, `LADDER_STEP * 2 = 76` made the final-frame guards
cover every target, so the end-frame logic needed resizing along with the count.

### Responsive selection

The phone/desktop variant machinery (`PHONE_FRAME_FOLDER`, `PHONE_MAX_WIDTH`,
`PHONE_MAX_ASPECT`, `viewportFrameVariant`, `applyVariant`, the per-layer variant
tag, and the orientation background hand-over) was removed. Every viewport now
loads `video-frames-final`. This removes the only path that could select the old
299-frame crop.

Orientation changes now re-measure and keep the same progress through the walk:
the track height is in `vh`, so an unchanged `scrollY` would otherwise land on a
different frame when the viewport aspect changes. Height-only resizes (the mobile
URL bar) are still left alone.

### Cache validation

`public/` files are copied to the build without a content hash, so the reused
frame filenames could keep serving the previous bytes from a browser cache. The
frame URL now carries `?v=2026-10-23` (`ASSET_VERSION`). Bump that constant when
the files in `video-frames-final/` are replaced in place again. There is no
service worker in the project and no repository cache-header configuration.

### Bottom dark band

The band was not an image or a layout gap. It was the stack of dark overlays at
the bottom of the stage:

* an always-on `h-[36%]` linear fade starting at `rgba(9,10,12,0.62)`;
* a `h-[19rem]` radial dining scrim (0.5 core, 0.3 at 55%);
* the 10% flat tint and edge vignette.

At the dining-hall frame the floor is bright, so the combined overlay read as a
flat near-black band under the heading. On a 390 px-tall landscape phone the
19rem scrim covered more than half the viewport.

The fix:

* removed the `h-[36%]` bottom fade entirely;
* replaced the 19rem radial scrim with a `13rem` / `15rem` linear wash
  (0.52 → 0.3 → 0.1 → transparent), capped at `32vh`;
* kept the existing text shadows on the heading and "Continue" label for
  readability.

The wash still fades in and out with the dining copy, so the entrance cue keeps
its text shadow rather than a permanent dark strip.

## 3. Validation

All runtime checks were headless Chrome 155, with Vite dev and the production
`dist` preview. They were not physical-device tests.

### Frame positions

`p` is scroll progress through the Hero; `expected = round(p × 69) + 1`.

| Viewport | p=0 | p=0.16 | p=0.37 | p=0.52 | p=1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop 1440×900 | 001 | 012 | 027 | 037 | 070 |
| Phone 390×844 | 001 | 013 | 028 | 037 | 070 |
| Landscape 844×390 | 001 | 013 | 027 | 037 | 070 |

Every sampled image decoded at its natural 1280×720 size; no 404s and no blank
active layer.

### Behaviour

| Check | Result |
| --- | --- |
| Start → middle → final | 001 → 037 → 070 on desktop, phone, and landscape. |
| Reverse from final | 070 → 067 → 037, then 001 at the start. |
| Fast forward (single jump to p=1) | 070. |
| Fast reverse (single jump to p=0) | 001. |
| Leave Hero for Story, then re-enter at p=0.52 | 037, no blank or stale 070. |
| Rotate 390×844 → 844×390 at p=0.52 | stayed on 037; stage still filled the 390 px viewport. |
| Rotate back at p=1 | stayed on 070. |
| Requests to `video-frames-final-phone` | 0. |
| Hero requests carrying `?v=2026-10-23` | all. |
| Production preview responses | 46 image responses, all JPEG; cached 304s only; scheduler-aborted stale lanes reported as `net::ERR_ABORTED`, no 404. |

### Bottom band

Checked at the dining-hall frame (037) and the final frame (070) at 1440×900,
390×844, 430×932, 320×568, and 844×390. The floor/table and the final dish stay
visible through the copy area; the heading and "Continue" label remain legible.
No hard seam, transparent gap, or strip at the bottom edge was visible.

### Commands

| Command | Result |
| --- | --- |
| `npm run lint` (`tsc --noEmit`) | passed |
| `npm run build` | passed |
| Production preview (`npm run preview -- --port 4173`) | passed; Hero frames served from `dist` |

The build still reports the pre-existing >500 kB JS chunk warning. It is not
related to this change.

## 4. Limitations

* These were headless screenshots and DOM/network checks, not physical iOS or
  Android testing.
* The project has no unit or browser test suite, so `lint` and the production
  build are the available automated checks.
* The old `public/video-frames-final-phone/` folder remains on disk; it is unused
  and can be removed later after confirming nothing external depends on it.

No commit or push was made.
