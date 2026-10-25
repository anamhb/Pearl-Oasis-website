# Menu: expanding-tile carousel

Date: 2026-10-24

The `#menu` section now uses one horizontal row of category tiles. The heading and supporting copy stay at the top, the previous and next arrows sit on the right of that heading area, and every tile opens the existing full-menu dialog. The ten categories, their images, descriptions, order, and modal content are unchanged.

## Heading and supporting copy

- Heading: "A Taste for Every Craving."
- Supporting paragraph: "Discover the flavours of Pearl Oasis, from satisfying favourites to dishes made for sharing."

These two text nodes replace the earlier heading and paragraph. Their classes, alignment, font hierarchy, spacing, and responsive sizes are untouched, and nothing else in the section was edited.

## What replaced what

The old desktop pinned scroll-reveal stage and its separate mobile list are gone. Both were presentation layers over the same ten cards, so replacing them kept the content intact:

- The section header is in normal flow, so the heading never moves while the row is browsed.
- A single track serves desktop and mobile. Desktop uses calculated widths and arrow navigation; phones turn the same track into a native scroll-snap row.
- The old `.menu-desktop-intro`, `.menu-desktop-stage`, and `.menu-mobile` presentation rules were removed. No rule from those blocks is referenced anywhere in `src/`.

## Layout calculation

Tile and track sizes come from the measured viewport, not from breakpoint guesses:

```js
const visible = Math.min(6, Math.max(1, Math.floor((width + 14) / (176 + 14))));
const tileWidth = (width - (visible - 1) * 14) / visible;
const imageHeight = Math.round(tileWidth * 0.75);
const trackWidth = 10 * tileWidth + 9 * 14;
```

- `14px` is the shared gap, used by the CSS track and by the scroll offsets.
- `176px` is the minimum comfortable tile width.
- Six is the wide-desktop cap. Ten categories remain in the row.
- The image height follows the tile width at 4:3, so a narrower tablet tile does not leave a short image.
- Desktop card height is a minimum of `imageHeight + 9.5rem`. Normal-size content sits inside it, and enlarged text can grow the row instead of being clipped.

The visible count and tile width are recalculated with a `ResizeObserver` and a window resize listener, so a rotated tablet or a resized window lands on whole tiles instead of a fractional count.

## Design direction and reasons

The site reads as a cinematic dining page: ENERGY 2, RHYTHM 3, MOTION 2. This section keeps the page's energy and motion while adding a quieter, single-row beat to its rhythm.

- Charcoal cards on the existing `#08090a` ground, with the established gold accent, keep the row inside the site's palette instead of introducing a second visual system.
- Image-first tiles put the food ahead of chrome: the image is the largest element on each card, and the category name follows it.
- A 4:3 image window keeps one predictable image height across widths, while `object-fit: cover` crops the portrait source photos without distortion.
- Gold hairlines, the step index, and the uppercase category tag reuse the typographic voice already used in the menu dialog; they mark hierarchy instead of decorating every edge.
- Hover expansion exists so a diner can inspect one category without leaving the row. The 32% growth is large enough to read and small enough that the other five tiles stay legible.
- The tiles share one size because they are peers in a category list. The photo and the hover state carry the variation, so unequal card sizes would imply a hierarchy the menu does not have.
- The 44px arrows use chevrons because direction is what they communicate, and their labels name the destination rather than the icon.
- There is no autoplay and no scroll-jacking. The row moves only when the visitor uses an arrow, swipes, or tabs to a tile.

## Hover expansion

Hover is active only when all of these are true: a mouse pointer, `(hover: hover) and (pointer: fine)`, width of 768px or more, and no reduced-motion preference. The React state does the same check again on `pointerType`, so a synthetic or touch pointer cannot trigger it.

- The hovered tile grows 32% of one tile width.
- The other visible tiles shrink between them by exactly the same total width.
- Offscreen tiles keep their base width, and the track width does not change, so nothing after the row moves.
- The hovered tile lifts with a stronger gold border and shadow, its image scales to 1.035, and the other visible tiles dim: image `brightness(0.68) saturate(0.9)` and body opacity `0.78`.
- Leaving the tile restores all widths and filters. The transition is `flex-basis 550ms cubic-bezier(0.22, 1, 0.36, 1)`.
- Tiles are buttons, so a click anywhere on a tile opens the full-menu dialog. Keyboard focus never triggers the expansion.

## Arrow navigation

- Both arrows move by `MENU_STEP = 3` tiles and clamp at `0` and `maxIndex`.
- The previous button is disabled at the first position, the next button at the last.
- Scroll position is synced back into the active index after a user scroll, so the buttons reflect where the row actually is.
- Each arrow is a 44px button with an `aria-label` and `aria-controls` pointing at the viewport. A polite live region announces the visible range.

## Mobile

Below 768px the arrows are hidden and the viewport becomes a native swipe row:

- `overflow-x: auto` with `scroll-snap-type: x mandatory`.
- Tiles are `min(78vw, 19rem)` wide with `scroll-snap-align: start`, which leaves the next tile's edge visible as a swipe cue.
- Scrollbars are hidden, the page keeps its own width, and the last tile aligns flush with the row end.
- No hover expansion is applied on phones.

## Keyboard and focus

- All ten tiles are buttons in visual order. Each exposes `Open full menu: <category>` as its accessible name.
- Focusing a tile that sits outside the current window scrolls it fully into view without animation, then the live region updates.
- The focus ring is `2px solid #ffd875` with `outline-offset: -2px`, drawn inside the card so the carousel clip cannot cut it at either edge.
- The dialog focuses its close button on open, traps Tab, closes on Escape or a backdrop click, and returns focus to the tile or footer button that opened it.
- `prefers-reduced-motion: reduce` removes the hover expansion, sets transitions to `none`, and changes programmatic scrolling to instant.

## Measurements

| Viewport | Section height | Viewport width | Visible tiles | Tile width | Tile height | Track width |
| --- | --- | --- | --- | --- | --- | --- |
| 1440x900 | 728px | 1176px | 6 | 184.3px | 290px | 1969.3px |
| 1024x768 | 726px | 960px | 5 | 180.8px | 288px | 1934px |
| 768x1024 | 719.8px | 720px | 3 | 230.7px | 325px | 2432.7px |
| 390x844 | 740px | 358px | 1 plus peek | 304px | 364.5px | 3148px |
| 320x640 | 757.9px | 288px | 1 plus peek | 249.6px | 323.7px | 2603.9px |

At 1440 the whole row is 1969.3px inside a 1176px viewport, so the later categories stay offscreen until an arrow or a focus jump brings them in.

Hover at 1440x900:

| State | Hovered tile | Other five tiles | Track | Section rect |
| --- | --- | --- | --- | --- |
| Before | 184.3px | 184.3px each | 1969.33px | unchanged |
| During | 243.3px | 172.5px each | 1969.33px | unchanged |
| After | 184.3px | 184.3px each | 1969.33px | unchanged |

The section stayed at `y=92.1`, `h=728` through the hover, so the page below it did not shift.

## Verification

`npm run lint` passes. `npm run build` passes; the only warning is the existing chunk-size warning. Tests ran against the dev server at 1440x900, 1024x768, 768x1024, 390x844, and 320x640.

Arrow positions measured after each click:

| Viewport | Start | Next 1 | Next 2 | Next 3 | Previous once |
| --- | --- | --- | --- | --- | --- |
| 1440x900 | 0 | 595 | 793 | at end | 198 |
| 1024x768 | 0 | 584 | 974 | at end | 390 |
| 768x1024 | 0 | 734 | 1468 | 1713 | 979 |

- At each end the matching button was disabled: previous disabled at `0`, next disabled at the last index.
- Live region text matched the visible range, for example `Showing 5 to 10 of 10 menu categories` at the 1440 end.
- No horizontal page overflow at any width: `documentScrollWidth` equalled `innerWidth` in all five cases.
- Heading copy: one line at 1440, 1024, 768, and 390; two lines at 320. The paragraph takes two lines from 1440 down to 390 and three at 320. Neither box overflowed, the arrows cleared the intro block by 406px at 1440 and 32px at 768, and the header to viewport gap stayed 30px on desktop and 24px on phones.
- Mobile rows kept `x mandatory` snap, showed a partial next tile at rest, and aligned the last tile inside the viewport after scrolling to the end.
- Tab traversal reached all ten tiles in order. Every focused tile was fully visible, with a measured ring of `2px solid rgb(255, 216, 117)`.
- Click-through: a tile opens the dialog with 10 sections and the close button focused; Escape closes it and focus returns to `Open full menu: Soup`; the footer "See Menu Sections" button opens the same dialog; the 390px dialog fits at 358px wide with no page overflow.
- Reduced-motion run: the first tile stayed at 184.3px while another tile was hovered, tile and image transitions reported `none`, and scroll behavior reported `auto`.
- Text resize: with the root font at 32px (200% of 16px) at 1440, all ten cards stayed equal at 619.5px tall, every description and title reported zero clipped pixels, and the page still measured 1440px wide with no overflow.
- Contrast, computed with the WCAG formula: description `7.98:1` on the lightest card background, tag `12.94:1`, title `16.86:1`, dimmed description `5.51:1`, dimmed tag `8.50:1`, focus ring `13.56:1`, arrow icon `13.90:1`. Every pairing clears AA.
- Console output contains no menu errors. The existing favicon 404 and the existing React `inert=""` warning from `EntranceExperience.jsx` remain outside this section.

## Files

- `src/components/sections/MenuExperience.jsx` (carousel, layout measurement, hover state, navigation, focus handling; the ten categories and dialog are preserved)
- `src/index.css` (menu carousel, tile, hover, focus, mobile, and reduced-motion rules; old pinned-menu rules removed)
- `changes/menu-expanding-tile-carousel.md`
- `changes/evidence/menu-carousel-*.png`

No other section, the navigation, the global typography, or the hero was edited. No dependency or external asset was added. Nothing was committed or pushed.

## Evidence

- `changes/evidence/menu-carousel-1440x900.png`
- `changes/evidence/menu-carousel-1440x900-hover.png`
- `changes/evidence/menu-carousel-1440x900-end.png`
- `changes/evidence/menu-carousel-1440x900-keyboard-focus.png`
- `changes/evidence/menu-carousel-1440x900-modal.png`
- `changes/evidence/menu-carousel-1024x768.png`
- `changes/evidence/menu-carousel-768x1024.png`
- `changes/evidence/menu-carousel-390x844.png`
- `changes/evidence/menu-carousel-390x844-end.png`
- `changes/evidence/menu-carousel-390x844-modal.png`
- `changes/evidence/menu-carousel-320x640.png`
- `changes/evidence/menu-carousel-320x640-end.png`
