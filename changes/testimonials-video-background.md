# Testimonials — ambient video background

> The blend stack and card layout described below were superseded by
> `testimonials-two-column-layout.md` (brighter film, two-column deck). The
> video source, playback gating and sticky-wrapper technique are unchanged.

## What changed

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | Added a muted, looping, decorative film behind the card deck, four blend layers, an `IntersectionObserver`-gated playback effect, and the `sectionRef` / `videoRef` they need. Card markup, themes, copy and the sticky deck were not touched. |

No other file was modified. No new dependencies, no CSS file changes.

```js
const TESTIMONIAL_VIDEO =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/v1792497626/Miniature_chefs_preparing_biryani_20261020165447.mp4';
```

Source is 1280 × 720, **8 s**, **1.78 MB**, `video/mp4; codecs=avc1`.

## Why a sticky wrapper (not `absolute inset-0`)

The section is **3575 px tall** at 1000 × 700 (five `90vh` sticky panels + runway). A plain
`absolute inset-0` video would be stretched to 3575 px and `object-cover` would then blow the frame
up ~5×, leaving a meaningless sliver visible.

```jsx
<div className="pointer-events-none absolute inset-0 z-0">          // full section, holds the layer
  <div className="sticky top-0 h-screen w-full overflow-hidden">    // exactly one viewport
    <video className="absolute inset-0 h-full w-full object-cover …" />
```

The sticky box tracks the section top, so while the deck scrolls the film stays viewport-sized, and
when the section releases, the sticky box scrolls out with it — the fades always line up with the
section boundaries rather than with the scroll position.

## Blend stack (inside the sticky wrapper)

| Layer | Spec | Purpose |
| --- | --- | --- |
| Film | `object-cover`, `scale-[1.03]`, `blur-[1.5px]`, `saturate-[0.85]`, `brightness-[0.95]` | viewport-sized crop, softened so it reads as ambience rather than footage; the 1.03 scale hides the blurred edges |
| Flat tint | `bg-[#0a0b0d]/55` | knocks the film back so the cards own the composition |
| Top fade | `h-1/2`, `#08090a 0% → rgba(10,11,13,.9) 20% → rgba(10,11,13,.45) 52% → transparent` | `#08090a` is the **Menu Experience** section above, so the boundary disappears; also gives the heading a quiet bed |
| Bottom fade | `h-[38%]`, `#070708 0% → rgba(7,7,8,.88) 30% → transparent` | `#070708` is the **footer** colour, so the hand-off at the end of the deck has no seam |
| Vignette | `ellipse 88% 78% at 50% 45%`, transparent → `rgba(8,9,10,.6)` | pulls the corners back into the page background |

The section keeps `bg-[#0a0b0d]` as the base colour: if the clip never loads, the section is exactly
what it was before. Content sits in a `relative z-10` wrapper, the film in `z-0`; the cards' inline
`z-index: 1…5` live inside the content wrapper, so paint order is unchanged.

## Playback

* `muted`, `loop`, `playsInline`, `preload="metadata"`, no `controls`, `tabIndex={-1}`, wrapped in
  `aria-hidden="true"` + `pointer-events-none` — decoration only, never focusable or clickable.
* **Bandwidth:** the clip is 1.78 MB and the hero warms 56 + 299 frames, so it must not compete.
  Playback is driven by an `IntersectionObserver` with `rootMargin: 100% 0px`: the first bytes are
  the metadata only, and streaming/playback starts one viewport before the section arrives. It
  pauses again once the section has left, and resumes from the same point when the visitor returns.
* **Deep links:** the effect also checks the section rect once on mount, so `#experience` (the
  footer link and the nav's "Testimonial" target) starts playing even if the observer's first
  delivery has not happened yet.
* **Reduced motion:** `prefers-reduced-motion: reduce` keeps the video paused; the section then
  shows its dark base + gradients. The listener reacts if the preference changes mid-session.
* A rejected `play()` (battery saver, strict autoplay policy) is swallowed: the first decoded frame
  stays on screen, so the section still reads as designed.

## Verification (real Chromium, dev server `localhost:3002`, live DOM measured)

| Check | 390 × 844 | 768 × 1024 | 1000 × 700 | 1440 × 900 |
| --- | --- | --- | --- | --- |
| Sticky layer height | 844 | 1024 | 700 | 900 |
| Video box (after `scale(1.03)`) | 396 × 869 | 785 × 1055 | 1024 × 721 | 1477 × 927 |
| Covers the viewport | yes | yes | yes | yes |
| `object-fit` | cover | cover | cover | cover |
| Horizontal overflow | none | none | none | none |
| Heading top (from section top) | 101 (36 px) | 109 (48 px) | 109 (48 px) | 109 (48 px) |

* **Network:** `206 Partial Content` from Cloudinary in 21–385 ms; the media request is deferred until
  the section is in range (verified: at 1000 × 700 with the section 7356 px below the fold the video
  is `paused`, `currentTime 0`, `preload="metadata"`).
* **Contrast** (canvas composite of real frames at t = 0.5 s / 5.5 s with the exact layer stack):

  | Zone | Background luma | Contrast |
  | --- | --- | --- |
  | H2 `#f6efe4` (y 112–156) | 20.7–20.8 avg, 35.9 max | **16 : 1** avg, **13.6 : 1** worst pixel |
  | Eyebrow `#d4af37` | 13.7–14.4 avg, 18.1 max | **8.3 : 1** |
  | Note line `#a3a3a3` | 30.3–30.9 avg, 48.9 max | **6.6 : 1** avg, **5.2 : 1** worst pixel |
  | Top strip (0–40 px) | 9.7 | merges with `#08090a` above |
  | Bottom strip (660–700 px) | 8.7 | merges with `#070708` below |

* **Layering:** the film sits behind the cards; the heading, quote icon and card surfaces are
  unchanged (cards remain fully opaque, so card text contrast is untouched).
* `npx tsc --noEmit` clean, `npm run build` ✓, no console errors from the app.

## Known limitation of the harness

The preview tab reports `document.visibilityState === "hidden"`, and Chromium blocks autoplay *and*
freezes `scrollTo` / IntersectionObserver delivery in hidden documents, so "is it moving on screen"
could not be observed directly. Everything around it was verified: attributes, `206` streaming, full
decode (`readyState 4`, `duration 8`), and the paused-when-far-away state. Muted + `playsInline` +
programmatic `play()` is the set of conditions every current browser accepts, but the final
"it loops while scrolling" needs one look in a foreground window.
