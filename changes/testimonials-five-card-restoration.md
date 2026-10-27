# Testimonials: restore the five-card arc and reclaim height

Section: `#experience`, "Words of Appreciation".

This pass fixes the regression that reduced the arc from five cards to three,
restores five simultaneously visible cards at desktop and tablet widths, and
keeps the section shorter than the earlier tall version. The active card keeps
its exact `#17130f` surface. The dark side surfaces, widths, heights, typography,
film URL and all carousel interactions are unchanged.

This supersedes the three-card visibility result in
`changes/testimonials-card-surfaces-width-spacing.md`.

## Root cause

The compact pass added a `showSecond` test in `Testimonials.jsx`. It measured the
complete rotated outer frame against the section edge with a `12px` margin. When
that test failed, the component:

- set `showSecondRef` to `false`;
- switched `maxAbs` to `1.35`, which faded the second neighbour to zero;
- set the second neighbour to `visibility: hidden`;
- shortened the arc to `firstDrop` instead of `secondDrop`.

At 1024, the rotated outer frame is wider than the straight card, so it failed
the margin test even though most of the card body was still inside the viewport.
The result was three visible cards. The old inner-edge test had allowed the same
five-card layout, so the new full-frame test caused the regression.

The height problem had a separate cause. The earlier tall version used a stage
offset and a stage `min-height`. Those were already removed in the previous pass.
The film is `position: absolute; inset: 0`, so it does not participate in normal
flow or set the section height. The remaining height contributors are:

1. the heading block;
2. the direct heading-to-card gap;
3. the arc height, which is the card height plus the real second-card drop;
4. the controls and their small bottom clearance.

Restoring the outer pair therefore adds the real `secondDrop` to the arc. The
fix recovers that space from the top gap and header padding instead of hiding
the cards or forcing an unsafe fixed height.

## Changes

### `src/components/sections/Testimonials.jsx`

- Removed `showSecondRef` and the `maxAbs` / `visibility: hidden` branch.
- All five cards now receive `visibility: visible`; their opacity hierarchy is
  `1`, `0.90`, `0.82`, `0.82`, `0.90` at rest. No card fades near invisibility.
- The arc always uses the real `secondDrop`, so the section height includes the
  outer pair instead of clipping it.
- Added horizontal arc compression only. Card width, height, rotation, vertical
  drop and testimonial order are unchanged.
  - At 768 and above, both outer rotated frames fit inside the section with a
    `12px` minimum edge clearance.
  - Below 768, both outer card bodies are kept at or inside the viewport edge.
    The rotated outer corners use the remaining viewport width.
- Reduced the header to `pt-10 pb-4` on phones and `sm:pt-12 sm:pb-5` above.

### `src/index.css`

- Replaced the `12vh` top gap with
  `padding-top: clamp(2.75rem, 8vh, 5.5rem)`.
- Kept the restored `260 / 252 / 240 / 210px` card widths, the existing card
  heights, the `10px` gap and the `10.5deg` step.
- Kept the side-card surface at `#0c0e10`, the active card at `#17130f`, and the
  existing arrow spacing and centring.

## Measurements

Measured at rest with the film playing and autoplay paused by pointer hover.
"Visible cards" counts cards with non-zero opacity and `visibility: visible`.

| Viewport | Section height | Heading to active top | Active card | Visible cards | Outer rotated frame edge | Lowest card to arrows | Arrow bottom to section |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| 1440 x 900 | 801px | 88px | 260 x 350px | 5 | 27.61px inside | 7.76px | 20px |
| 1024 x 768 | 773.8px | 77.44px | 252 x 340px | 5 | 23.95px inside | 9.21px | 15.36px |
| 768 x 1024 | 779.91px | 97.91px | 240 x 334px | 5 | 23.48px inside | 9.87px | 12px |
| 390 x 844 | 748.02px | 83.52px | 240 x 320px | 5 | 30.65px beyond frame, body at edge | 9.09px | 12px |
| 320 x 640 | 777.19px | 67.19px | 210 x 320px | 5 | 32.32px beyond frame, body at edge | 13.11px | 12px |

The frame value at 390 and 320 is the rotated bounding box. All five card bodies
remain inside the viewport edge; only the rotated outer corners use the extra
space. No card is removed, conditionally rendered or hidden by a threshold.

Compared with the earlier tall measurements (`1129.59`, `1038.5`, `985.78`,
`772.47`, `816.59px`), the new section is shorter at every width:

| Viewport | Earlier tall height | New height | Difference |
| --- | ---: | ---: | ---: |
| 1440 | 1129.59px | 801px | -328.59px |
| 1024 | 1038.5px | 773.8px | -264.7px |
| 768 | 985.78px | 779.91px | -205.87px |
| 390 | 772.47px | 748.02px | -24.45px |
| 320 | 816.59px | 777.19px | -39.4px |

The immediate three-card compact pass was shorter at 1024, 768, 390 and 320
because it hid the outer pair. Restoring the five-card arc adds `17.9` to
`22.3px` at those widths for the real second drop. At 1440 the new section is
`56px` shorter than the three-card compact pass. The five-card layout is never
shortened by clipping or hiding.

The active card remains exactly `rgb(23, 19, 15)` (`#17130f`). Side cards remain
`rgb(12, 14, 16)` (`#0c0e10`). After a step, the new active card took the active
class and the previous active card became a side card.

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
| `#experience` anchor | Clears the fixed header by 78.09px at 1440 and 70.17px at 390 |

The anchor clearance is lower than the previous report because the header and
top gap are tighter. It remains positive, and the heading is visible below the
fixed header at both widths.

## Visual and media checks

- No horizontal page overflow at any of the five widths.
- No card content overflow. The active card stays fully readable inside the
  section.
- The arrow group centre offset is `0px` at every width. Previous is left and
  next is right; no arrow overlaps a card.
- Button size remains `44px`.
- The film is behind the heading and cards, keeps the existing Cloudinary URL,
  `object-fit: cover`, `object-position: 50% 50%`, muted, loop and playsInline.
- All five loads reported a playing video with `readyState: 4` and no media
  error.
- Contrast is unchanged: quote `16.49:1` and meta `8.23:1` on side cards, quote
  `15.76:1` and meta `7.86:1` on the active card. With side cards at `0.82`
  opacity, the worst video composite remains `10.13:1` and `5.70:1`.
- The five placeholder testimonials and the placeholder disclosure are
  unchanged. No review or statistic was invented.

## Evidence

- `changes/evidence/testimonials-five-1440x900-top.png`
- `changes/evidence/testimonials-five-1440x900-cards.png`
- `changes/evidence/testimonials-five-1024x768-top.png`
- `changes/evidence/testimonials-five-1024x768-cards.png`
- `changes/evidence/testimonials-five-768x1024-top.png`
- `changes/evidence/testimonials-five-768x1024-cards.png`
- `changes/evidence/testimonials-five-390x844-top.png`
- `changes/evidence/testimonials-five-390x844-cards.png`
- `changes/evidence/testimonials-five-320x640-top.png`
- `changes/evidence/testimonials-five-320x640-cards.png`
- `changes/evidence/testimonials-five-1440x900-state-before.png`
- `changes/evidence/testimonials-five-1440x900-state-after.png`

## Checks

- `npm run lint` (`tsc --noEmit`) passed.
- `npm run build` passed. The only warning is the existing chunk larger than
  500kB.
- No new Testimonials console errors. The existing React `inert` warning and the
  harness-generated `THREE.WebGLRenderer` messages remain outside this section.
- The pre-existing `changes/testimonials-fullwidth-video.md` and earlier
  testimonial evidence were left in place.
- No dependency was added. No commit or push was made.

## Delivery Gate

Design Read: a luxury restaurant feedback arc over the burger film. Five cards
share one continuous arc. The centre card is warm near-black and upright; the
four side cards are deeper charcoal, lower, rotated and quieter. Gold remains
the single accent. Dials: ENERGY 2, RHYTHM 2, MOTION 2.

| Gate check | Result | Evidence |
| --- | --- | --- |
| R-02 em dash | PASS | None added to the changed source, report or user copy. |
| R-03 mobile layout | PASS | Five cards are visible at 320, 390, 768, 1024 and 1440; no horizontal page overflow; controls remain 44px. At 320 and 390 the card bodies sit at the viewport edge and only the rotated outer corners extend past it. |
| R-05 / R-20 visual structure | PASS | The existing restaurant narrative, arc composition and five-card hierarchy remain. |
| R-11 border radius | PASS | Cards keep the existing radii; arrow buttons remain circular. |
| R-15 / R-16 copy and CTA | PASS | No new CTA or marketing copy; the five placeholders and disclosure are unchanged. |
| R-18 / R-38 invented reviews | PASS | No review was invented; the placeholder language remains explicit. |
| R-21 dark theme | PASS | The section keeps the existing dark theme. |
| R-24 anchor and navigation | PASS | `#experience` resolves and clears the fixed header by 78.09px at 1440 and 70.17px at 390. |
| R-25 contrast | PASS | Active and side contrast values are unchanged and above AA. |
| R-26 / R-32 controls and keyboard | PASS | Arrows, keyboard, card click, drag, touch swipe, touch cancel, focus and looping were exercised. |
| R-29 palette | PASS | Warm near-black, ivory and gold remain the system; the side charcoal is a neutral shade. |
| R-30 / R-31 identity and reasons | PASS | The five-card arc is specific to this restaurant; visibility, compression and spacing decisions are recorded above. |
| R-35 build | PASS | `npm run lint` and `npm run build` passed. |
| C-1 intentionality | PASS | Every changed value has a measured reason in the tables above. |
| C-2 functional completeness | PASS | Every arrow, card, drag and autoplay path was exercised; no dead control was added. |
| C-3 content-driven composition | PASS | The section still serves guest feedback; no filler section was added. |
| C-4 resilience | PASS | Checked 320 to 1440, keyboard, touch, reduced motion, looping and video playback. |
| C-5 evidence over claims | PASS | The five-card count is measured; no testimonial or statistic was fabricated. |
| Composition / craft | PASS | One active card, four dark arc positions, one gold accent, no new dependency or burger-layer change. |

**Gate result: PASS.**
