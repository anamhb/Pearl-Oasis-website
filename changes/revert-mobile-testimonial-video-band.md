# Revert: mobile testimonials video band

Reverts **only** the “Improve Mobile Testimonials Video Framing” change. The
Testimonials film is back to the full-section background framing it had before
that change. Nothing else was touched.

## What was removed

### `src/components/sections/Testimonials.jsx`

1. **Docstring paragraph** added for the band (the “Portrait phones get a
   different crop …” block). The surrounding film description is back to its
   original wording.
2. **Five class hooks** that existed only so `index.css` could target the band:
   * `testimonial-film` on the sticky wrapper,
   * `testimonial-film__video` on the `<video>`,
   * `testimonial-film__seam` on both seam gradients,
   * `testimonial-film__vignette` on the vignette.

The wrapper is back to:

```jsx
<div className="sticky top-0 h-screen w-full overflow-hidden">
```

The video element, its `src`, `muted`/`loop`/`playsInline`/`preload`/
`disablePictureInPicture` attributes, the `object-cover scale-[1.015]
brightness-[1.08] saturate-[1.03] contrast-[1.02]` classes, both seam gradients
and the vignette are unchanged.

### `src/index.css`

The whole portrait block was deleted:

```css
@media (max-width: 767px) and (orientation: portrait) and (min-height: 701px) {
  .testimonial-film { top: 5.5rem; height: auto; aspect-ratio: 16 / 9; }
  .testimonial-film__seam,
  .testimonial-film__vignette { display: none; }
  .testimonial-film__video { -webkit-mask-image: …; mask-image: …; }
}
```

No other CSS rule was changed. `grep` for `testimonial-film` and
`aspect-ratio: 16 / 9` returns no matches anywhere in the project.

## What was preserved

* Testimonial cards, content, colours, sizes, spacing and the heading/scrim.
* The stacked-cards scroll animation (panels, `50vh` centre line, stagger,
  z-index order, reduced-motion and short-viewport fallbacks).
* The video source, filters, autoplay gating (`IntersectionObserver`,
  `prefers-reduced-motion`) and `preload="metadata"`.
* **All Hero / Our Story / crest performance work** — `EntranceExperience.jsx`,
  `WelcomeStory.jsx` and `BrandWordmark.jsx` were not opened for editing. Their
  optimisations are still present (`warmWindow`, `img.decode()`,
  `IntersectionObserver` gating, cached `metricsRef`, single-pending-rAF
  scheduling, 30 fps / 1.5× DPR crest).

## Verification

Measured in headless Chromium 151 at exact device metrics (real render, video
seeked to 3.2 s), then screenshotted:

| Check | 390×844 | 320×568 | 1440×900 |
| --- | --- | --- | --- |
| `.testimonial-film` present | no | no | no |
| Wrapper classes | `sticky top-0 h-screen w-full overflow-hidden` | same | same |
| Wrapper height | **844** (= viewport) | **568** | **900** |
| Wrapper `top` / `position` | `0px` / `sticky` | `0px` / `sticky` | `0px` / `sticky` |
| `aspect-ratio` | `auto` | `auto` | `auto` |
| Video box | 396×857 (viewport ×1.015 scale) | 325×577 | 1462×914 |
| `object-fit` / mask | `cover` / `none` | `cover` / `none` | `cover` / `none` |
| Filters | `brightness(1.08) contrast(1.02) saturate(1.03)` | same | same |
| Playback | playing, `readyState 4`, no error | playing | playing |
| Card size | 342×273 (unchanged) | 272×332 | 352×324 |
| Card top when pinned | 267 / 380 | 100 / 194 | 270 / 419 |
| Horizontal overflow | none (`scrollWidth == innerWidth`) | none | none |
| Page exceptions | none (only the pre-existing `favicon.ico` 404) | — | — |

`npx tsc --noEmit` — clean. `npm run build` — ✓.

Screenshots (full-section framing restored, centre-cropped film behind the
pinned deck):

* `changes/evidence/testimonials-390x844-restored.jpg`
* `changes/evidence/testimonials-320x568-restored.jpg`
* `changes/evidence/testimonials-1440x900-restored.jpg`

The earlier band screenshots remain in `changes/evidence/` (`testimonials-390x844.jpg`,
`testimonials-375x812.jpg`, `testimonial-crop-before-after.jpg`) as the record of
the reverted state; the `-restored` files show the current behaviour.
