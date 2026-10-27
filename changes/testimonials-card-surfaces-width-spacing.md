# Testimonials: dark side cards, restored width, compact spacing

> The visible-card count, top gap and section heights in this report were
> superseded by `testimonials-five-card-restoration.md`, which restores all five
> cards at every tested width.

Section: `#experience`, "Words of Appreciation".

This pass refines the existing arc carousel. Side cards now use a dedicated deep
charcoal surface, the earlier card widths are restored, and the stage offset and
excess vertical band are gone. The active card keeps its exact `#17130f`
surface, and the arc, rotation, drag, autoplay, reduced-motion behaviour, five
testimonials and burger film remain intact.

## Root causes

| Symptom | Cause |
| --- | --- |
| Side cards looked light and washed out | They inherited the active card's warm surface and were faded with inline opacity. The bright burger video showed through that translucent surface. |
| Desktop cards felt narrow | `--tc-card-w` had been reduced to `224px` at 768, 1024 and 1440, `210px` at 390 and `190px` at 320 to fit the compact stage. |
| Large heading-to-card gap | The carousel still used `--testimonial-stage-offset: min(68vh, 16:9 width)` in its top padding and as stage `min-height`. The offset was designed around the old film edge, not the actual card top. |
| Section bottom felt empty | The stage kept a large minimum height, the carousel had `2.5rem` bottom padding and the controls added another gap, so the arrows sat above an unused band. |

## Changes

### `src/components/sections/Testimonials.jsx`

- Added `testimonial-card--active` and `testimonial-card--side` from the existing
  `active` value. Only one card receives the active class as the carousel moves.
- Raised side-card opacity to `0.90` for the first neighbour and `0.82` for the
  outer neighbour. This keeps the hierarchy while making the dark fill and ivory
  copy survive a bright video frame.
- Changed the second-neighbour visibility margin from `24px` to `12px`, so the
  restored `260px` cards can show all five at 1440. The visibility test still
  requires the complete rotated frame to clear the viewport.
- Reduced header bottom padding from `pb-8 sm:pb-10` to `pb-5 sm:pb-6` so the
  heading block ends closer to the cards.

### `src/index.css`

- Added `.testimonial-card--side` with `background-color: #0c0e10` and a very
  restrained gold top gradient. The active card has no override, so its
  `#17130f` surface, ivory gradient, border and shadow are unchanged.
- Restored `--tc-card-w` to `260px` at 1280 and above, `252px` at 1024, `240px`
  at 768 and on mobile up to the 240px clamp, and `210px` at 320. The `10px` gap,
  `10.5deg` step and existing card heights are unchanged.
- Removed the stage offset variable and `min-height` from `.testimonial-stage`.
  The stage now takes its height from the arc.
- Replaced the offset-based top padding with `clamp(4rem, 12vh, 7rem)`, a direct
  responsive heading-to-card gap.
- Reduced carousel bottom padding to `clamp(0.75rem, 1.5vw, 1.25rem)` and the
  controls top margin to `0.25rem`, putting the arrows immediately below the
  lowest visible card. The group stays centred with previous left and next right.

## Measurements

Measured in Edge at rest with the video playing and autoplay paused by pointer
hover. Side margin is the distance from the rotated side-card frame to the
viewport edge.

| Viewport | Section height | Heading to active top | Active card | Visible cards | Side margin | Lowest card to arrows | Arrow bottom to section |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440 x 900 | 857px | 124px | 260 x 350px | 5 | 27.61px | 7.76px | 20px |
| 1024 x 768 | 752.52px | 108.16px | 252 x 340px | 3 | 106.32px | 13.63px | 15.36px |
| 768 x 1024 | 762px | 128px | 240 x 334px | 3 | 5.38px | 14.45px | 12px |
| 390 x 844 | 725.77px | 117.27px | 240 x 320px | 3 | 6.39px | 14.13px | 12px |
| 320 x 640 | 755.8px | 92.8px | 210 x 320px | 3 | 5.70px | 17.04px | 12px |

Section heights before this pass were `1129.59px`, `1038.5px`, `985.78px`,
`772.47px` and `816.59px`. This pass removes `272.59px`, `285.98px`,
`223.78px`, `46.7px` and `60.79px` respectively. The mobile gains are smaller
because the heading wraps to two lines and the 320px card is already the tallest
part of the section.

The active background measured `rgb(23, 19, 15)`, exactly `#17130f`, at every
width. Side cards measured `rgb(12, 14, 16)`, exactly `#0c0e10`. After a next
step, the new active card took the `--active` class and the previous active card
became a dark side card.

At 1440 all five rotated frames fit inside the viewport. At the narrower widths
the visibility test keeps three complete cards; the outer pair is hidden until
it can fit rather than being clipped. All five cards remain in the loop.

## Interaction checks

| Test | Result |
| --- | --- |
| Next then previous | Active 1 to 2 to 1; progress changes correctly |
| Keyboard Right then Left | Active 1 to 2 to 1 |
| Five Next steps | 2, 3, 4, 0, 1; wraps correctly |
| Side-card click | Active moved to the clicked card |
| Drag left | Active moved one card; no synthetic click |
| Five rapid Next clicks | Settled at the fifth step without overshoot |
| Autoplay idle | Advanced one card after the interval |
| Hover and focus pause | Paused while hovered or focused, resumed after leaving |
| Reduced motion | Step settled immediately; autoplay stayed off |
| Touch swipe left | Active 0 to 1 |
| Touch cancel | Active stayed 1 |
| Touch vertical drag | Page scrolled 105px; active stayed 1 |
| `#experience` anchor | Clears the fixed header by 94.09px at 1440 and 78.17px at 390 |

## Visual and media checks

- No horizontal page overflow at any of the five widths.
- No card had content overflow, and the active card stayed fully inside the
  section.
- The arrow group centre offset was `0px` at every width. Previous is left and
  next is right.
- Button size stayed `44px`; there was no overlap with the lowest card.
- The film kept the existing Cloudinary URL, `object-fit: cover` and
  `object-position: 50% 50%`.
- All five loads reported a playing video with `readyState: 4` and no media
  error.
- Text contrast passes at the measured solid surfaces: quote `16.49:1` and meta
  `8.23:1` on side cards, quote `15.76:1` and meta `7.86:1` on the active card.
  With the side cards at `0.82` opacity, the worst-case video composite remained
  `10.13:1` for the quote and `5.70:1` for the meta line.

## Evidence

The header is hidden in the screenshots to expose the full section width. The
video is playing and autoplay is paused by pointer hover.

- `changes/evidence/testimonials-refine-1440x900-top.png`
- `changes/evidence/testimonials-refine-1440x900-cards.png`
- `changes/evidence/testimonials-refine-1024x768-top.png`
- `changes/evidence/testimonials-refine-1024x768-cards.png`
- `changes/evidence/testimonials-refine-768x1024-top.png`
- `changes/evidence/testimonials-refine-768x1024-cards.png`
- `changes/evidence/testimonials-refine-390x844-top.png`
- `changes/evidence/testimonials-refine-390x844-cards.png`
- `changes/evidence/testimonials-refine-320x640-top.png`
- `changes/evidence/testimonials-refine-320x640-cards.png`
- `changes/evidence/testimonials-refine-1440x900-state-before.png`
- `changes/evidence/testimonials-refine-1440x900-state-after.png`

## Checks

- `npm run lint` (`tsc --noEmit`) passed.
- `npm run build` passed. The only build warning is the existing chunk larger
  than 500kB.
- The headless runs recorded no new Testimonials errors. The existing React
  `inert` warning and the harness-generated THREE.WebGLRenderer messages remain
  outside this section.
- The pre-existing uncommitted `changes/testimonials-fullwidth-video.md` file
  and earlier testimonial evidence were left in place.
- No dependency was added. No commit or push was made.

## Delivery Gate

Design Read: a luxury restaurant guest-feedback arc over a cinematic burger
film. The side cards are a deeper charcoal than the warm centre card, and gold
stays a single restrained accent. Dials: ENERGY 2, RHYTHM 2, MOTION 2.

| Gate check | Result | Evidence |
| --- | --- | --- |
| R-02 em dash | PASS | None added to the changed source, report or user copy. |
| R-03 mobile layout | PASS | No horizontal overflow at 320, 390, 768, 1024 or 1440; controls remain 44px and the active copy fits. |
| R-05 / R-20 visual structure | PASS | The existing restaurant narrative, arc composition and hierarchy remain; no template section was introduced. |
| R-11 border radius | PASS | Cards keep the existing `1.25rem` and `1rem` radii; circular arrow buttons keep their existing shape. |
| R-15 / R-16 copy and CTA | PASS | No new CTA or marketing copy; the five placeholders and disclosure are unchanged. |
| R-18 / R-38 invented reviews | PASS | No review was invented; the placeholder language remains explicit. |
| R-21 dark theme | PASS | The section keeps the brand's existing dark theme; no theme toggle was required by this request. |
| R-24 anchor and navigation | PASS | `#experience` resolves and clears the fixed header by 94.09px at 1440 and 78.17px at 390. |
| R-25 contrast | PASS | Active quote and meta measure `15.76:1` and `7.86:1`; side cards measure `16.49:1` and `8.23:1`, with the worst video composite at `10.13:1` and `5.70:1`. |
| R-26 / R-32 controls and keyboard | PASS | Arrows, keyboard, card click, drag, touch swipe, touch cancel, focus and looping were exercised. |
| R-29 palette | PASS | Warm near-black, ivory and gold remain the system; the side charcoal is a neutral shade, not a new accent. |
| R-30 / R-31 identity and reasons | PASS | The arc remains specific to this restaurant; width, surface, spacing and visibility decisions are recorded above. |
| R-35 build | PASS | `npm run lint` and `npm run build` passed. |
| C-1 intentionality | PASS | Every changed value has a measured reason in the tables above. |
| C-2 functional completeness | PASS | Every arrow, card, drag and autoplay path was exercised; no dead control was added. |
| C-3 content-driven composition | PASS | The section still serves the restaurant's guest feedback; no filler section was added. |
| C-4 resilience | PASS | Checked 320 to 1440, keyboard, touch, reduced motion, looping and video playback. |
| C-5 evidence over claims | PASS | The placeholder disclosure remains; no real testimonial or statistic was fabricated. |
| Composition / craft | PASS | One active card, four dark arc positions, one gold accent, no new dependency, icon set or burger layer change. |

**Gate result: PASS.**
