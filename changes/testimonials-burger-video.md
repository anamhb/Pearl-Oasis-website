# Testimonials: burger background video

Date: 2026-10-25

The Testimonials background film now uses the burger footage. One source string changed, one `object-position` value changed, and one comment was updated. The section layout, heading, cards, arrows, and playback logic are untouched.

## Confirmed target

- `src/components/sections/Testimonials.jsx` holds the only `<video>` element in `src/`.
- The video sits inside `.testimonial-film` in the `#experience` section, below `Words of Appreciation`.
- No hero video or second video exists elsewhere to confuse the edit. The same element was updated in place.

Source now in `TESTIMONIAL_VIDEO`:

```text
https://res.cloudinary.com/z8nlnc6b/video/upload/v1792855493/Creating_commercial_video_of_burger_20261024202438.mp4
```

No query string, transformation, or second URL was added.

## Playback configuration

All of these remain as they were:

- `muted`, `loop`, `playsInline`, `preload="metadata"`, `tabIndex={-1}`, `disablePictureInPicture`.
- Playback still starts from the existing IntersectionObserver when the section is near, and pauses when it leaves.
- The existing reduced-motion check still skips playback.
- There is no `autoplay` attribute; the observer calls `play()`, and its promise rejection is already swallowed.
- The film still has no overlay, filter, or second layer.

## Framing change

The new source is 1280x720. The film is wider than 16:9 on desktop, so `object-fit: cover` crops top and bottom. At 1440x900 the film is 1440x612:

```text
scale = max(1440 / 1280, 612 / 720) = 1.125  ->  1440 x 810
crop  = 810 - 612 = 198px, 99px at each edge when centered
visible source rows = 88 to 632
```

The burger spans roughly rows 120 to 600 across the clip, so a centered crop keeps the top bun, the filling, and the bottom bun in frame. The previous `object-position: 50% 90%` moved the window down to rows 158 to 702, which cut the top of the bun. The value is now `50% 50%`.

The change is minimal and only affects the crop position. `object-fit: cover`, full width, reduced height, and aspect behavior are unchanged.

| Viewport | Film size | Aspect | Source crop | object-position |
| --- | --- | --- | --- | --- |
| 1440x900 | 1440x612 | 2.35 | 99px top and bottom | 50% 50% |
| 1024x768 | 1024x522 | 1.96 | 27px top and bottom | 50% 50% |
| 768x1024 | 768x432 | 1.78 | none | 50% 50% |
| 390x844 | 390x219 | 1.78 | none | 50% 50% |
| 320x640 | 320x180 | 1.78 | none | 50% 50% |

## Verification

- Exactly one video element exists, and its `src` and `currentSrc` both equal the requested URL.
- `muted`, `loop`, and `playsInline` are true; `playsInline` is present as an attribute. `preload` is `metadata`. `error` is `null`.
- Playback advanced on every run. A 2 second sample moved the clock 1.7 to 2.2 seconds at 1440, 1024, 768, and 390 in the main pass; the narrow software-rendered passes were slower (0.46 to 0.94 seconds) but still advanced. No frame stalled at zero after the section was in view.
- Computed style reports `object-fit: cover` and `object-position: 50% 50%` at every width.
- The heading is above the film at every width. The film starts at the section's left edge and ends at its right edge.
- The film remains `position: absolute` inside `.testimonial-stage`; it is not fixed to the viewport.
- Section heights are unchanged: 825px, 735.2px, 701.4px, 1140.9px, and 1207.3px. No horizontal page overflow at any width.
- Console output contains no video errors. The existing favicon 404 and the existing React `inert=""` warning from `EntranceExperience.jsx` remain outside this change.
- `npm run lint` passes.
- `npm run build` passes; the only warning is the existing chunk-size warning.

Headless Chrome produced intermittent text raster artifacts while capturing this section, so the kept screenshots come from a clean Edge run of the same page. They show the real section, heading, cards, and burger film. No page code was altered for the captures.

## Files

- `src/components/sections/Testimonials.jsx` (video URL and the framing comment)
- `src/index.css` (`object-position` only)
- `changes/testimonials-burger-video.md`
- `changes/evidence/testimonials-burger-1440x900.png`
- `changes/evidence/testimonials-burger-390x844.png`

Nothing was committed or pushed.

## Evidence

- `changes/evidence/testimonials-burger-1440x900.png`: desktop, full-width film below the heading, burger centered with the top bun and table visible.
- `changes/evidence/testimonials-burger-390x844.png`: phone, film below the heading at its exact 16:9 height, burger fully in frame, cards below.
