# Testimonials background video source replacement

Date: 2026-10-24

## Change

- File: `src/components/sections/Testimonials.jsx`
- Replaced the Cloudinary URL in the `TESTIMONIAL_VIDEO` constant.
- Old source: `https://res.cloudinary.com/z8nlnc6b/video/upload/v1792497626/Miniature_chefs_preparing_biryani_20261020165447.mp4`
- New source: `https://res.cloudinary.com/z8nlnc6b/video/upload/v1792772899/Chicken_falling_into_biryani_bowl_20261023201136.mp4`
- Updated the adjacent loading comment from `1.8 MB` to `2.3 MB`.
- The video element, JSX structure, styling, overlay, observer, and section layout are unchanged.

## Where it is used

- The ambient film behind `#experience` (Words of Appreciation).
- It is not used by the Hero, which uses the 3D entrance experience, and no other section uses this clip.
- No second video element or duplicate source was added.

## Preserved behavior

- `muted`, `loop`, `playsInline`, `preload="metadata"`, no controls, `tabIndex="-1"`, and `disablePictureInPicture`.
- `IntersectionObserver` starts playback near the section and pauses it away.
- `prefers-reduced-motion` pauses playback at 0:00.
- `object-cover`, the scale and filter treatment, dark tint, top and bottom seams, vignette, and heading scrim.
- The decorative wrapper remains `aria-hidden` with `pointer-events: none`.
- There was no poster; the first decoded frame remains the fallback, with the dark section base if Cloudinary is unavailable.

## Validation

- Cloudinary HEAD response: `200 OK`, `video/mp4`, 1280x720, 8.0 s, 2,337,162 bytes.
- Development server: `http://127.0.0.1:5180/`; headless Chrome at 1440x900, 390x844, and 320x800.
- `video.getAttribute('src')`, `video.src`, and `video.currentSrc` all equal the new URL. The old URL is absent.
- Network: browser `206` `video/mp4` responses for the new clip. No video-loading errors in the final run.
- Playback starts automatically after scrolling to `#experience`; `paused` is false and `currentTime` advances. `muted` and `loop` are true.
- Natural loop observed at all three widths, with playback still running after wrapping:
  - 1440: 2.09 s to 0.37 s
  - 390: 3.23 s to 1.45 s
  - 320: 3.29 s to 1.49 s
- `object-fit: cover` covers the section at every tested width. Desktop shows a slight crop of the 16:9 media; mobile portrait crops to the central bowl. Screenshots inspected.
- The existing tint and heading scrim remain, and the heading and note stay legible over the new film.
- No horizontal overflow at any tested width.
- Reduced motion: `paused` is true and `currentTime` stays at 0 after 1.4 s.
- Console: the existing `favicon.ico` 404 and pre-existing React `inert` boolean-attribute warnings remain. No video errors.

## Checks

- `npm run lint`: pass.
- `npm run build`: pass. The existing chunk larger than 500 kB warning remains.

## Limits

- Headless Chrome only; no physical device, Safari, or Firefox pass.
- The clip is remote, so Cloudinary availability remains a runtime dependency.
- The unrelated audit-003 carousel findings were not changed.
