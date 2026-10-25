# Testimonials: side-by-side cards, independent sequences, full bowl

Date: 2026-10-24
Supersedes the layout notes in `testimonials-three-left-two-right.md`.

## Root cause

The previous revision stacked three testimonial cards on the left and two on the right. That contradicted the requested one-card-per-side composition, removed the side controls, and made the section unnecessarily tall.

The bowl was cut for a separate reason: the film was a full-width, `68vh` band with `object-fit: cover`. At 1024 and 1440 the container was wider than the source's 16:9 frame, so `cover` cropped the top and bottom of the video. At 1440 the container aspect was about 2.35 while the source is 1.778; the lower part of the copper bowl fell outside the visible crop.

## What changed

**One card on each side, with separate sequences.**
The left slot renders card 1, 2, or 3; the right slot renders card 4 or 5. `leftIndex` and `rightIndex` are separate state values with separate handlers and independent wrap-around. Each button has an explicit label: `Show next left testimonial` or `Show next right testimonial`. The left arrow changes only the left card; the right arrow changes only the right card. There is no shared index, no autoplay, no duplicate entry, and no invented testimonial.

The initial view is entry 1 on the left and entry 4 on the right. The left sequence cycles 1 → 2 → 3 → 1. The right sequence cycles 4 → 5 → 4. The card counters keep the original 01/05–05/05 order, while the accessible labels also identify the side sequence (`left 2 of 3`, `right 1 of 2`). A polite live region reports the current pair.

**The film is now a fitted 16:9 panel.**
The source is 1280×720 (aspect 1.778). The stage uses:

- `--testimonial-film-height: min(68vh, calc(100vw * 9 / 16));`
- `width: min(100%, calc(var(--testimonial-film-height) * 16 / 9));`
- `aspect-ratio: 16 / 9;`
- `object-fit: contain; object-position: center;`

This keeps the natural frame instead of cropping it. The panel is centered below the heading. It is not fixed, has no dark overlay, no vignette, and no brightness filter; the video keeps its existing source, `muted`, `loop`, `playsInline`, and near-view playback gate. The card columns leave the bowl's central area open.

**Layout and controls adapt by width.**

- **1024px and up:** `left arrow | left card | centre | right card | right arrow`. The arrows sit beside their cards.
- **768–1023px:** `left card | centre | right card`, with each arrow directly below its own card. This preserves a 257px open centre at 768 instead of squeezing it with inline arrows.
- **Below 768px:** the film returns to normal flow, then the two visible cards stack with their own arrows below them. Both sequences remain usable by scrolling and by the native buttons.

The glass treatment, quote icons, serif typography, gold border, fallback surface, card counters, and mirrored `2.5deg` inward tilts are preserved. Tilts flatten on hover and focus, are removed on phones and under `prefers-reduced-motion`, and are never applied to the arrows.

## Measurements

| Viewport | Cards | Film panel | Section height | Card width | Open centre | Arrows |
| --- | --- | --- | --- | --- | --- | --- |
| 320×640 | stacked | 320×180 | 1207px | 272px | n/a | below each card |
| 390×844 | stacked | 390×219 | 1141px | 342px | n/a | below each card |
| 768×1024 | one each side | 768×432 | 701px | 208px | 257px | below each card |
| 1024×768 | one each side | 928×522 | 735px | 240px | 337px | beside each card |
| 1440×900 | one each side | 1088×612 | 825px | 288px | 362px | beside each card |

The film aspect and the source aspect both measure 1.778. There is no crop or stretching: the source frame is shown in full, with any residual fit gap confined to the frame edge. At 1440 the fitted panel leaves dark side margins (`176px` each) because a full-width 16:9 frame would be 810px tall; keeping the panel at 612px preserves the requested reduced height and the complete bowl. At 1024 the 68vh cap produces a 928px panel, which matches the content width. At 768 and below, the natural 16:9 height is shorter than the old band; that is why the section is much shorter while the bowl remains complete.

Card heights: 362px at 768; 379px left / 353px right at 1024; 291px each at 1440; 258px at 390; 283px at 320. No card clips its content, and no card crosses the section edge.

## Verification

- `npm run lint` passes.
- `npm run build` passes. The only build output beyond the assets is the existing chunk-size warning above 500 kB.
- Exactly five testimonials are preserved. A complete cycle produced entries 1, 2, 3 on the left and 4, 5 on the right, with no duplicates or missing entry.
- Initial state: left entry 1 of 5, right entry 4 of 5.
- Three left clicks: left 2 → 3 → 1; the right card stayed on entry 4 throughout.
- Two right clicks: right 5 → 4; the left card stayed on entry 1 throughout.
- Keyboard activation works: with focus on the left arrow, both Enter and Space advanced the left card; focus stayed on the button.
- Only one `.testimonial-card` exists in each side slot, and there are exactly two `.testimonial-arrow` buttons.
- The full bowl, including the lower copper edge and the table below it, is visible at 320, 390, 768, 1024, and 1440. The screenshots show the fitted frame, not a cover crop.
- No horizontal overflow at any width (`scrollWidth === innerWidth`).
- Card tilt is a mirrored `matrix3d(...)` at 768/1024/1440; it is `none` on phones and under `prefers-reduced-motion: reduce`. Arrow transforms are `none`.
- Glass styles remain in place: dark translucent gradient, `backdrop-filter: blur(16px) saturate(118%)`, `-webkit-backdrop-filter`, gold border/shadow, and the `#111216` no-backdrop-filter fallback.
- The heading remains above the film at every width. The film is `absolute` inside the stage at 768+, and `relative` in normal flow below 768.
- `#experience` anchor checks:
  - 1440 deep link: header bottom 103px, section top 104.1px, heading top 197.1px.
  - 1024 deep link: header bottom 103px, section top 103.9px, heading top 196.9px.
  - 390 mobile nav link: header bottom 87px, section top 98.9px, heading top 176.4px.
  - 320 direct link: header bottom 87px, section top 95px, heading top 189px.
  - 768 direct link: heading top 388px, clear of the 103px header (the section is near the page end, so it settles at 295px).
- Reduced-motion check: card transform `none`, card transition `none`, card-body animation `none`, arrow transition `none`, and the video pauses as before.
- Console: no runtime exceptions from the Testimonials component. The run still records the pre-existing `favicon.ico` 404 and the pre-existing React `inert=""` warning from `src/components/3d/EntranceExperience.jsx`, which are outside this revision.

## Tradeoffs

At 1440 the fitted 16:9 panel is 1088px wide rather than full-bleed. The `176px` dark margins are deliberate: a full-width 16:9 frame at 1440 would need about 810px of height, which would exceed the reduced-height target and reintroduce the crop problem. The panel still fills the centre of the section and the whole bowl is visible.

At 768, placing two inline 44px arrow columns plus their gaps would consume most of the 257px clear centre. Moving the arrows below the cards preserves that centre and keeps the bowl unobstructed. On phones the cards stack, so both arrows are below their cards and may require scrolling at 320px; both sequences remain reachable.

## Files

Edited for this revision:

- `src/components/sections/Testimonials.jsx`
- `src/index.css`
- `changes/testimonials-side-by-side-independent-sequences.md`
- `changes/evidence/testimonials-side-by-side-*.png`

No other section was edited. The working tree remains uncommitted; nothing was committed, pushed, reset, or stashed.

## Evidence

- `changes/evidence/testimonials-side-by-side-1440x900.png`
- `changes/evidence/testimonials-side-by-side-1024x768.png`
- `changes/evidence/testimonials-side-by-side-768x1024.png`
- `changes/evidence/testimonials-side-by-side-390x844.png`
- `changes/evidence/testimonials-side-by-side-390x844-bottom.png`
- `changes/evidence/testimonials-side-by-side-320x640.png`
- `changes/evidence/testimonials-side-by-side-320x640-bottom.png`
- `changes/evidence/testimonials-side-by-side-1440x900-anchor.png`

The 1024px viewport capture shows the complete bowl; the video panel continues below the screenshot edge and is available by normal page scroll. The 390/320 captures use top and bottom images so the stacked cards and both arrows are visible.
