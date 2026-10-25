# Testimonials: three-left / two-right film-band composition

Date: 2026-10-24
Supersedes the layout notes in `testimonials-glass-fullbleed-carousel.md`.

## What changed

**The heading is back in normal flow, above a shorter film band.**
`Words of Appreciation`, its eyebrow, and the placeholder disclosure now sit in a normal section header. The biryani film starts at the header's bottom edge, not behind or above it, and is no longer a full-section background. The caption plate that existed only to make the title readable over the full-bleed clip is removed.

The film is a section-relative, full-width band: `68vh` from 768px up, `42vh` below that, with `clamp()` bounds. Measured heights are 269px at 320x640, 352px at 390x844, 696px at 768x1024, 522px at 1024x768, and 612px at 1440x900. It keeps `object-fit: cover` and a bowl-centred `object-position` (`50% 56%` from 768px, `50% 58%` below). There is no tint, gradient, vignette, brightness filter, or overlay. The film is `absolute` inside the stage on tablet/desktop and returns to normal flow on phones, so it cannot cover the heading or the cards.

**The composition is five visible cards: three left, two right.**
Cards 1, 2, and 3 stack top-to-bottom on the left; cards 4 and 5 stack top-to-bottom on the right. The centre stays open over the bowl. The old carousel state, arrows, swipe handling, carousel-specific semantics, and the one-side-at-a-time navigation are removed rather than left as dead controls. Every one of the five placeholders now renders at once, so there is no hidden slide, duplicate index, or duplicate testimonial entry.

Navigation is therefore native page scroll plus the keyboard tab order. Each card is an `article` with `tabIndex=0` and an accessible label that includes its side, position, and placeholder status. The old arrows were not preserved because there is nothing for them to move between; keeping them would either be inert or would have to hide already-visible cards.

**All five cards share one refined glass treatment.**
The pane is translucent charcoal at `rgba(10, 11, 13, 0.76)` to `rgba(10, 11, 13, 0.84)`, with `backdrop-filter: blur(16px) saturate(118%)` and the `-webkit-` equivalent. A restrained gold border, inset highlight, and deep shadow sit around it. Browsers without backdrop-filter get a solid `#111216` fallback. No card keeps the old alternating colour treatment. The quote icon, serif quote, Cinzel labels, counters, and placeholder disclosure are preserved; only the card width and padding adapt to the denser composition.

**The tilts are small and mirrored toward the centre.**
Left cards use `rotateY(2.5deg)` and right cards `rotateY(-2.5deg)` with a `1100px` perspective. On hover or keyboard focus the angle eases to `0.6deg` with a 2px lift, so the card flattens without jumping. Focus also adds a 2px gold outline at 4px offset. Phones and `prefers-reduced-motion: reduce` remove the tilt, transition, and entrance animation. Only cards are transformed; there are no controls to tilt.

## Layout at the tested widths

| Viewport | Layout | Film height | Section height | Card width | Clear centre | Overflow |
| --- | --- | --- | --- | --- | --- | --- |
| 320x640 | stacked | 269px (42vh) | 2072px | 272px | n/a | 0 |
| 390x844 | stacked | 352px (42vh, capped) | 1976px | 342px | n/a | 0 |
| 768x1024 | 3 left / 2 right | 696px (68vh) | 1537px | 176px | 321px | 0 |
| 1024x768 | 3 left / 2 right | 522px (68vh) | 1200px | 288px | 354px | 0 |
| 1440x900 | 3 left / 2 right | 612px (68vh) | 1200px | 288px | 482px | 0 |

At 768 the cards are narrow, so the left stack measures 411px / 386px / 411px tall and the right stack 386px each. At 1024 and 1440 all five cards are 291px tall. At 320 and 390 the cards are 283px and 258px tall. No card clips: `scrollHeight` matches `clientHeight` at every width.

The left stack intentionally extends below the film band at 768 (cards 2–3), 1024 (card 3), and 1440 (card 3). That is the consequence of keeping three cards plus a 65–75vh film instead of stretching the clip to the full section. The film remains a band, the left stack remains complete, and the card overhang does not cross the bowl's central focal point.

At 320 and 390 the five cards stack in reading order. The section is long (2072px and 1976px) because it shows all five full cards plus the 42vh film; no card is hidden behind a carousel. At 768 the section is about 1.5 viewports tall; at 1024 and 1440 it is 1200px.

## Verification

- `npm run lint` passes.
- `npm run build` passes. The only build output beyond the assets is the existing chunk-size warning above 500 kB.
- All five cards render exactly once: three in the left column, two in the right column. Counters read 01/05 through 05/05 with no duplicates.
- All five cards are keyboard-focusable (`tabIndex=0`), have explicit labels, and accept focus. The focus test made each card the active element and the gold focus outline was present. `:focus-visible` resolves to `outline: 2px solid rgb(212, 175, 55)`.
- Hover and focus flatten the card from 2.5deg to 0.6deg. Computed transforms for left and right cards are mirrored; the hover border moves from `rgba(212, 175, 55, 0.32)` to `0.55` and the focus border to `0.7`.
- There are zero `.testimonial-carousel__arrow` elements, zero carousel roles, and zero buttons or links inside the section. The five cards are the only interactive targets, by focus and scroll.
- The video keeps its existing source, `muted`, `loop`, `playsInline`, `preload="metadata"`, and existing IntersectionObserver near-view playback gate. No new autoplay was added. The evidence captures pause the clip at 4.2s to hold a stable bowl frame.
- Computed video state: `position: absolute` at 768/1024/1440 and `relative` at 320/390; `object-fit: cover`; expected mobile/desktop `object-position`; `filter: none`; `opacity: 1`; `pointer-events: none`.
- The real `#experience` anchor clears the fixed header at every width: section top is 88px at 320/390 and 104px at 768/1024/1440. The eyebrow and H2 are below the fixed header at every width. The film's top is at the header's bottom edge and the H2 is entirely above it.
- No horizontal overflow at any width (`scrollWidth - clientWidth = 0`). No card content is clipped. No card extends past the section edge.
- `prefers-reduced-motion: reduce`: card transform `none`, card transition `none`, card-body animation `none`, and video paused at 0.00s.
- Console: only the pre-existing `favicon.ico` 404. No runtime exceptions.
- The bowl remains visible between the card columns at 768, 1024, and 1440, and below the heading on 320/390.

## Tradeoffs

At 768 the three-column composition required 176px cards to keep a 321px clear centre. The copy wraps more often than at desktop but does not clip and the reading order remains clear. At 320/390 the all-five stack is long; that is preferable to a carousel that hides cards or introduces duplicate indices.

The section no longer has carousel controls. That is a deliberate removal, not a missing state: all five testimonials are visible, so there is no hidden slide to navigate. The cards remain reachable by normal scroll and by keyboard focus.

## Files

Edited for this revision:

- `src/components/sections/Testimonials.jsx`
- `src/index.css`
- `changes/testimonials-three-left-two-right.md`
- `changes/evidence/testimonials-3x2-*.png`

Other modified files in the working tree predate this revision and were not touched. No other section was changed.

No commit, push, reset, or stash was performed.

## Evidence

- `changes/evidence/testimonials-3x2-1440x900.png`
- `changes/evidence/testimonials-3x2-1024x768.png`
- `changes/evidence/testimonials-3x2-768x1024.png`
- `changes/evidence/testimonials-3x2-390x844.png`
- `changes/evidence/testimonials-3x2-320x640.png`
- `changes/evidence/testimonials-3x2-1440x900-anchor.png`
- `changes/evidence/testimonials-3x2-390x844-anchor.png`

The section images are clean, fixed-header-free captures stitched from viewport tiles; headless full-page capture with the backdrop-filter cards was intermittently tiling the compositor output. The anchor images show the fixed navigation and the actual `#experience` landing position.
