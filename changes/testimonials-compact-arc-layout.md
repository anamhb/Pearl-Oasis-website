# Testimonials: compact arc width, spacing and edge visibility

Section: `#experience`, "Words of Appreciation".

This refines the existing arc carousel without rebuilding it. The section now
uses a narrower centred stage, a smaller heading-to-card gap, higher outer-card
opacity, and a visibility test that keeps the displayed cards inside the
viewport. The five placeholders, dark-and-gold surfaces, burger video, controls,
drag, autoplay and reduced-motion behavior are preserved.

## Root causes

The three faults came from the arc math and spacing, not from the card theme.

| Fault | Cause |
| --- | --- |
| Carousel felt full-width | `max-width: 72rem` constrained the empty arc box, but card positions come from `cardWidth + gap`. At 1440 the cards used `260px + 18px`; the unrotated outer edges sat about 51px from the viewport, and the rotated corners reached the edge. |
| Outer cards were cut off | The second-neighbour test checked `halfWidth - (secondX - cardWidth / 2) >= 24`, which only proved that the card's inner edge was visible. It ignored the outer half and the rotated bounding box. At 1024 it passed while the outer card was half offscreen. |
| Outer cards looked like ghosts | At `abs = 2` the opacity formula produced `0.113`, against `0.68` for the first neighbour. |
| Heading gap was too large | Top padding still derived from the old full-height film band: `68vh` or `16:9`, minus `4rem` to `7rem`. At 1440 that was `500px`, placing the active card 517px below the heading block. The full-section film no longer needs that band height for spacing. |

The stage itself had enough vertical room. Visible card bottoms stayed 31.7px to
98.4px above the stage bottom. The clipping was horizontal at the section edge.

## Files changed

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | Responsive horizontal compression for narrow arcs, rotated-bounding-box visibility check, revised opacity curve. |
| `src/index.css` | Centred 72rem stage, compact card widths and gap, responsive top-spacing trim. Card theme and video layering unchanged. |
| `changes/testimonials-compact-arc-layout.md` | This report. |
| `changes/evidence/testimonials-layout-*-top.png`, `changes/evidence/testimonials-layout-*-cards.png` | Viewport evidence at the five checked widths. Untracked. |

No other section changed. Pre-existing uncommitted notes and evidence were left
alone.

## Width and geometry

The carousel is now a centred `72rem` stage. Card sizing is:

| Width | Card width | Gap | Step | Minimum height |
| --- | ---: | ---: | ---: | ---: |
| 320 | 190px | 10px | 10.5deg | 320px |
| 390 | 210px | 10px | 10.5deg | 320px |
| 768 | 224px | 10px | 10.5deg | 330px |
| 1024 | 224px | 10px | 10.5deg | 340px |
| 1440 | 224px | 10px | 10.5deg | 350px |

At 1440 all five rotated card boxes fit between x = 114.1 and x = 1325.9, leaving
114.1px on each side. Before this pass the unrotated edge was about 51px from the
viewport and the rotated corner reached it. At 1024 and 768 the arc shows three
complete cards, with 147.6px and 20.0px side margins. Five rotated cards cannot
fit at those widths without shrinking the active card below a readable size.

On 390 and 320 the first neighbours are compressed horizontally so each card body
keeps a 24px inset. The rotated bounding boxes reach 5.7px and 3.65px from the
viewport edge, still inside. The active card covers their inner halves, leaving
84px and 61px side strips. No card is cut by the viewport and no horizontal page
scrollbar appears.

All five cards remain in the loop and on the same arc. The two second neighbours
are hidden only when their complete rotated frames cannot fit. They return when
the viewport has room, as it does at 1440.

## Visibility and opacity

The display test now uses the section width and the second card's rotated
bounding box:

```js
const showSecond = sectionWidth / 2 - (secondX + secondBBoxHalf) >= 24;
```

This is the change that removes half-clipped cards at 1024. The first neighbours
are always complete at tablet widths; the outer pair appears only with a 24px
margin.

The opacity curve is now:

| Position | Opacity |
| --- | ---: |
| Active | 1 |
| First neighbour | 0.72 |
| Second neighbour | 0.62 |
| Leaving second neighbour | fades from 0.62 to 0 by `abs = 2.2` |

The active card remains fully opaque and upright. The two outer cards keep their
outward tilt and vertical drop; only their distance fade changed. The first and
last visible cards now read as cards, not as traces.

## Heading spacing

A responsive trim was subtracted from the existing card offset:

```css
padding-top: calc(
  var(--testimonial-stage-offset) -
  clamp(4rem, 8vw, 7rem) -
  clamp(0rem, 10vw, 10rem)
);
```

The heading, disclosure and their typography are unchanged. The trim is 144px at
1440, 102px at 1024, 77px at 768, 39px at 390 and 32px at 320. The stage content
moves up with the reduced gap, so the section becomes shorter instead of leaving
a matching empty band below the controls.

| Viewport | Section height | Active card | Active top | Heading-to-card gap | Visible cards | Side margin |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440 x 900 | 1129.59px | 224 x 350px | 585px | 372px | 5 | 114.1px |
| 1024 x 768 | 1038.5px | 224 x 340px | 566.91px | 353.91px | 3 | 147.56px |
| 768 x 1024 | 985.78px | 224 x 334px | 520.19px | 307.19px | 3 | 19.99px |
| 390 x 844 | 772.47px | 210 x 320px | 329.88px | 132.38px | 3 | 5.7px |
| 320 x 640 | 816.59px | 190 x 342px | 354px | 100px | 3 | 3.65px |

The 320 section is slightly taller than 390 because the narrower 190px card
wraps the longest quote onto an extra line. No card content overflows its box at
any width. The active card stays centred on the section at every width.

## Video

The source is unchanged:

```text
https://res.cloudinary.com/z8nlnc6b/video/upload/v1792900563/Burger_layers_assemble_together_20261025085531.mp4
```

All five loads reported `readyState: 4`, no media error, and a playing video. The
film covers the section content box; the video keeps `object-fit: cover` and
`object-position: 50% 50%`.

## Interaction checks

| Test | Result |
| --- | --- |
| Next then previous | 1 to 2 to 1; progress `02 / 05` to `03 / 05` to `02 / 05` |
| Keyboard Right then Left | 1 to 2 to 1 |
| Five Next steps | 2, 3, 4, 0, 1; wraps correctly |
| Neighbour click | Active 2 to 3 |
| Outer second-neighbour click | Active unchanged; `pointer-events: none` |
| Active card click | Active unchanged |
| Drag left | Active 3 to 4; no synthetic click |
| Five rapid Next clicks | Settled at the fifth step without overshoot |
| Autoplay idle | Advanced one card after 4.8s |
| Hover pause and leave | Paused while hovered, resumed after leaving |
| Focus pause | Paused while the stage had focus |
| Reduced motion | Step settled immediately; autoplay stayed off; video paused |
| Touch swipe left | Active 1 to 2 |
| Touch cancel | Active stayed 2 |
| Touch vertical drag | Page scrolled 105px; active stayed 2 |
| `#experience` anchor | Clears the fixed header by 94.09px at 1440 and 78.17px at 390 |
| Horizontal overflow | None at 320, 390, 768, 1024 or 1440 |

## Checks

- `npm run lint` (`tsc --noEmit`) passed.
- `npm run build` passed. The only build warning is the existing chunk over
  500kB.
- The interaction run produced no carousel or video errors. Pre-existing noise
  remains: the React `inert` warning, favicon 404, and harness WebGL messages.
- The uncommitted `changes/testimonials-fullwidth-video.md` file was left
  unchanged. No commit or push was made.

## Evidence

The header is hidden only to expose the full section width. Autoplay is paused by
pointer hover at the initial card; the video is playing.

- `changes/evidence/testimonials-layout-1440x900-top.png`
- `changes/evidence/testimonials-layout-1440x900-cards.png`
- `changes/evidence/testimonials-layout-1024x768-top.png`
- `changes/evidence/testimonials-layout-1024x768-cards.png`
- `changes/evidence/testimonials-layout-768x1024-top.png`
- `changes/evidence/testimonials-layout-768x1024-cards.png`
- `changes/evidence/testimonials-layout-390x844-top.png`
- `changes/evidence/testimonials-layout-390x844-cards.png`
- `changes/evidence/testimonials-layout-320x640-top.png`
- `changes/evidence/testimonials-layout-320x640-cards.png`

## Delivery Gate

Design Read: a luxury restaurant guest-feedback arc over a cinematic burger
film, using warm near-black cards and restrained gold. Dials: ENERGY 2,
RHYTHM 2, MOTION 2.

| Gate check | Result | Evidence |
| --- | --- | --- |
| R-02 em dash | PASS | None added. |
| R-03 mobile layout | PASS | 320 and 390 have no page overflow; active text and controls fit. |
| R-18 / R-38 invented reviews | PASS | Five existing placeholders and the disclosure are unchanged. |
| R-24 anchor and navigation | PASS | `#experience` resolves and clears the header. |
| R-25 contrast | PASS | Active surface and text palette are unchanged from the measured 15.76:1 to 5.42:1 set. |
| R-26 / R-32 controls and keyboard | PASS | Arrows, cards, drag, swipe, arrow keys, focus and autoplay were exercised. |
| R-35 build | PASS | Lint and production build passed. |
| C-1 deliberate decisions | PASS | Width, gap and visibility have measured reasons above, not arbitrary overrides. |
| C-2 interactions | PASS | All manual, autoplay, reduced-motion and touch checks passed. |
| C-4 hostile conditions | PASS | Checked 320 to 1440, touch, keyboard, reduced motion and video failure fallback. |
| Composition | PASS | One centred active card, one accent, one arc, explicit side margins. |
| Craft | PASS | Cards remain warm dark surfaces with gold hairlines; no new template, icon set or palette. |

**Gate result: PASS.**
