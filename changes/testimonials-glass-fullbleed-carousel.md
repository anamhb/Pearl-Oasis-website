# Testimonials: full-bleed film, independent sides, glass cards

Date: 2026-10-24
Supersedes the layout notes in `testimonials-two-sided-carousel.md`.

## What changed

**1. Arrows sit beside their own card.**
The shared bottom control strip is gone. The row is now `prev | left card | centre gap | right card | next` on tablet and desktop. Each arrow sits 8px from its card on phones and 12px from 768px up, vertically centred, with its own accessible label. Below 768px the cards stack in two alternating rows: left card + left arrow, then right card + right arrow.

**2. The two sides navigate independently.**
`leftIndex` and `rightIndex` are separate state values. Each handler uses a functional update and wraps through all five entries. The left arrow changes only the left card; the right arrow only the right card. A right-card click, `ArrowRight`, and a horizontal swipe starting on the right card advance the right side; `ArrowLeft` and a swipe starting on the left card advance the left side. Vertical swipes are ignored. There is no autoplay. Because the indices are independent, the two cards can land on the same testimonial after separate moves. Preventing that would require skipping an entry or moving the other card, both of which would break the requested one-arrow-one-card behavior.

**3. The film fills the whole section.**
The video is an `absolute inset-0` layer inside the section, with `width: 100%`, `height: 100%`, `object-fit: cover`, and `pointer-events: none`. It is not fixed and it is behind the content (`z-index: 0` vs `z-index: 10`). The old 1024-only central film panel and the mobile film band are removed. No filter, brightness change, vignette, or full-section overlay is applied.

The responsive focal positions are `46% 62%` below 768px and `42% 58%` from 768px up. The bowl stays visible between the cards on tablet and desktop. On the smallest screens the cards must cover more of it; the glass is what carries the film through.

**4. Both cards use the same glass treatment.**
Dark translucent pane with `backdrop-filter` and `-webkit-backdrop-filter`: `blur(24px) saturate(120%)`. The pane runs from `rgba(10, 11, 13, 0.76)` at the quote to `rgba(10, 11, 13, 0.84)` at the meta row. Gold border, restrained inset highlight, and shadow. A solid `#111216` fallback is provided for browsers without backdrop filter. Quote, publication, meta, and index text are all above the pane; focus states and hover states are explicit.

A compact caption plate sits behind the section heading (`max-width: 42rem`, gold hairlines). It is 78% opaque on phones and 90% from 640px up. This is not a section-wide scrim: it exists because bright chicken frames pass behind the title on tablet, and it keeps the heading readable without dimming the film around the cards. The video remains bright above, below, and to the sides of the plate.

## Layout at the tested widths

| Width | Card width | Card positions | Arrow positions | Section height |
| --- | --- | --- | --- | --- |
| 320 | 220px | 76px / 24px, stacked | 24px / 252px | 1131.9px |
| 390 | 290px | 76px / 24px, stacked | 24px / 322px | 918.9px |
| 768 | 208px | 104px / 456px | 48px / 676px | 743px |
| 1024 | 240px | 104px / 680px | 48px / 932px | 743px |
| 1440 | 260px | 248px / 932px | 192px / 1204px | 743px |

No horizontal overflow at any width (`scrollWidth - clientWidth = 0`). No card content is clipped (`scrollHeight` matches `clientHeight` within the 1px borders).

On 320px the stacked second card puts its arrow below the first 640px viewport; both arrows remain beside their cards and are reached by scrolling. At 390x844 both arrows are in view. On 768, 1024, and 1440 both arrows are in view at the `#experience` anchor.

## Verification

- `npm run lint` passes.
- `npm run build` passes. The only output is the existing chunk-size warning above 500 kB.
- Anchor check after using the real "Testimonials" nav link: the section clears the fixed header at every width (section top 88px at 320/390, 104px at 768/1024/1440; eyebrow and H2 both below the header).
- Video computed state at 320, 390, 768, 1024, and 1440: `position: absolute`, `object-fit: cover`, expected `object-position`, `filter: none`, `opacity: 1`, `pointer-events: none`, playing.
- Left arrow, five presses: `5, 4, 3, 2, 1`; right card stayed at `2`.
- Right arrow, five presses: `3, 4, 5, 1, 2`; left card stayed at `1`.
- Five rapid left clicks from `1` returned to `1`; five rapid right clicks from `2` returned to `2`; no stale increments.
- Right-card click, `ArrowRight`, and left-card/right-card horizontal swipes each changed only the intended side.
- Vertical swipe changed scroll position but not either card.
- No autoplay after waiting 2.6 seconds.
- `prefers-reduced-motion: reduce`: card entrance animation `none`, card and arrow transitions `none`, video paused at `0.00s`; navigation still works.
- Console: only the pre-existing `favicon.ico` 404, no runtime exceptions.

## Files

- `src/components/sections/Testimonials.jsx`
- `src/index.css`

No other section was edited for this revision. The working tree remains uncommitted; nothing was committed, pushed, reset, or stashed.

## Evidence

- `changes/evidence/testimonials-glass-1440x900.png`
- `changes/evidence/testimonials-glass-1024x768.png`
- `changes/evidence/testimonials-glass-768x1024.png`
- `changes/evidence/testimonials-glass-390x844.png`
- `changes/evidence/testimonials-glass-320x640.png`
- `changes/evidence/testimonials-glass-1440x900-anchor.png`
- `changes/evidence/testimonials-glass-1024x768-anchor.png`

The section images are the clean full-section captures; the anchor images show the fixed navigation and the `#experience` landing position.
