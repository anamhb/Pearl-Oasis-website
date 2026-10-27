# Menu: mobile navigation and full-width dish images

Date: 2026-10-26

The mobile Menu now exposes the existing previous/next controls, moves one card per tap, and keeps the native swipe row. The dish media wrappers are now explicit full-width boxes and every image fills its box with `object-fit: cover`. The current section has ten category cards, not nine, so all ten were tested.

## Scope note

The checked-out `main` tree uses the expanding-tile carousel documented in `changes/menu-expanding-tile-carousel.md`. There is no hardcover/book-hinge component in `src` at this revision. The existing tile design, gold borders, step badges, hover expansion, full-menu dialog, and header copy were preserved; no new carousel or book layer was added.

## Root cause

### Mobile arrows

The controls already existed but were deliberately disabled on phones:

- `src/index.css` hid `.menu-carousel__controls` below `768px`.
- `MenuExperience.jsx` forced `canGoBack` / `canGoForward` to `false` when `isMobile`.
- `scrollToIndex()` returned early when `layout.tileWidth` was `0`, which is the mobile layout value.
- `syncIndexFromScroll()` also returned early on mobile, so the card index could not follow the native scroll position.

Simply showing the buttons would not have made them work.

### Dish image width

The image rule already used `object-fit: cover`, but the media wrapper was a flex child with no explicit width. It relied on the button's cross-axis stretch. When a portrait image's intrinsic size influenced that flex item, the image could be laid out inside a narrower box; `cover` then filled only that narrow box and left card background beside it. The affected cards in the screenshot are the PNG assets (1, 2, 4, 5, 6, 8, 9); the correct cards 3, 7 and 10 are landscape JPGs.

The fix removes the dependency on intrinsic sizing:

- `.menu-tile__media` is now `align-self: stretch` and `width: 100%`.
- The image is positioned against that definite box with `position: absolute; inset: 0; width: 100%; max-width: none; height: 100%`.
- `object-fit: cover` and `object-position: center` preserve the intended crop and aspect ratio.

In the Chrome verification runs, the current tree already measured a `1.0` image/media width ratio before and after the change. The change hardens the layout against the flex/intrinsic-width failure mode shown in the report; it does not alter the image content or crop behaviour.

## Files changed

- `src/components/sections/MenuExperience.jsx`
  - mobile step of one card; desktop step of three cards preserved
  - rendered tile+gap measurement for mobile scrolling
  - mobile scroll-to-index and index-from-scroll support
  - mobile index sync after a responsive resize
  - accessible labels and mobile live-region text
  - image inset class for steps 1, 2, 4, 5, 6, and 8
- `src/index.css`
  - mobile controls shown in flow under the intro copy
  - explicit full-width media wrapper and absolute image fill
  - targeted inset for steps 1, 2, 4, 5, 6, and 8
- `changes/menu-mobile-navigation-image-width-fix.md`
- `changes/evidence/menu-mobile-navigation-verification.json`
- `changes/evidence/menu-image-inset-verification.json`
- `changes/evidence/menu-mobile-320-initial.png`
- `changes/evidence/menu-mobile-390-initial.png`
- `changes/evidence/menu-mobile-390-last-card.png`
- `changes/evidence/menu-mobile-390-footer-action.png`
- `changes/evidence/menu-mobile-390-modal.png`
- `changes/evidence/menu-mobile-430-initial.png`
- `changes/evidence/menu-mobile-1440-desktop.png`

## Implementation

### Navigation

- `navigationStep = isMobile ? 1 : MENU_STEP`, where `MENU_STEP` remains `3` on desktop.
- `readScrollStep()` measures the first rendered tile plus the track's computed `column-gap`; this covers the mobile `12px` gap and the desktop `14px` gap after a breakpoint change.
- `scrollToIndex()` now works when `layout.tileWidth` is `0` by using the measured step. It still clamps to `0…maxIndex`.
- `syncIndexFromScroll()` updates `activeIndex` on mobile as well as desktop, so a native swipe is followed by the arrows from the correct card.
- A small effect recalculates the index when the layout changes into the phone breakpoint while the row is scrolled.
- The first/last boundary behaviour is unchanged: previous is disabled at the first card, next is disabled at the last card.
- The live region announces `Showing N of 10 menu categories` on mobile.

### Mobile controls

- `.menu-carousel__controls` is displayed below `768px` as a right-aligned row under the intro copy.
- The controls stay in normal flow above the carousel, so they do not cover images, titles, descriptions, or the footer button.
- Both buttons retain the existing `44px × 44px` circular gold treatment and have `aria-label="Previous menu item"` / `aria-label="Next menu item"`.
- The footer's existing `See Menu Sections` action remains outside the scroll track and opens the full-menu dialog on every viewport.

### Image fill

- The wrapper gets its width from the card, not from the image's intrinsic size.
- The image is absolutely positioned to the wrapper's full box, so its natural width cannot shrink the media area.
- `object-fit: cover` keeps the existing crop; no image asset was replaced and no dish content was changed.

### Image spacing refinement

Cards 1, 2, 4, 5, 6, and 8 (the glass in Traditional Tandoor) now receive an inset through the existing media box. The inset is applied to the image itself, not as padding on the card, so the body copy, titles, card size, and border treatment keep their previous positions. Cards 3, 7, 9, and 10 remain full-bleed.

The inset uses `--menu-image-inset: clamp(10px, 2.8vw, 14px)`, with equal offsets on all four sides. The image fills the remaining inset box with `width/height: calc()` and keeps `object-fit: cover`, so the aspect ratio is unchanged.

Measured inset (all sides):

| Viewport | Cards 1, 2, 4, 5, 6, 8 | Image width ratio | Card size | Body gap below media |
| --- | ---: | ---: | --- | ---: |
| 320×800 | 10px | 0.919 | 249.6 × 323.7px | 0 |
| 390×844 | 10.9px | 0.928 | 304 × 364.5px | 0 |
| 430×932 | 12px (12.1px on the right/bottom subpixel edge) | 0.920 | 304 × 364.5px | 0 |
| 1440×900 | 14px | 0.846 | 184.3 × 290px | 0 |

Cards 3, 7, 9, and 10 still measure an image width ratio of `1.0` and no inset. No page overflow was introduced at any viewport. Text positions are unchanged: the body starts immediately after the media box, and the body-to-media gap is `0` for every card.

## Verification

Automated evidence: `changes/evidence/menu-mobile-navigation-verification.json` and `changes/evidence/menu-image-inset-verification.json`.

### Mobile navigation and images

| Viewport | Next taps to end | Previous taps to start | Last/first card fully visible | Arrow size | Image width ratio | Image fit | Horizontal page overflow |
| --- | ---: | ---: | --- | --- | ---: | --- | --- |
| 320×800 | 9 | 9 | yes / yes | 44×44 | 0.919 inset / 1.0 full-bleed | `cover` | none |
| 390×844 | 9 | 9 | yes / yes | 44×44 | 0.928 inset / 1.0 full-bleed | `cover` | none |
| 430×932 | 9 | 9 | yes / yes | 44×44 | 0.920 inset / 1.0 full-bleed | `cover` | none |

The 390px run also verified:

- status sequence: `Showing 2 of 10` through `Showing 10 of 10`, then back to `Showing 1 of 10`
- native scroll position `2 × step` produced `Showing 3 of 10`; the next tap produced `Showing 4 of 10`
- all 10 images loaded by the end of the traversal
- the footer action opened the 10-row Menu Sections dialog; focus returned to the button on close
- the last card opened the same dialog; focus returned to that card on close
- normal vertical page scrolling still moved the document (`5389 → 5549px`)

### Desktop preservation

At `1440×900`:

- tile width stayed `184.3px`
- one next tap still advanced three cards (`nextAdvanceCards: 3`)
- hover expansion stayed `184.3 → 243.3 → 184.3px`
- cards 3, 7, 9, and 10 kept a `1.0` image width ratio; the six inset cards measured `0.846` with `object-fit: cover`
- no new page overflow was introduced

### Screenshots

- `changes/evidence/menu-mobile-320-initial.png`
- `changes/evidence/menu-mobile-390-initial.png`
- `changes/evidence/menu-mobile-390-last-card.png`
- `changes/evidence/menu-mobile-390-footer-action.png`
- `changes/evidence/menu-mobile-390-modal.png`
- `changes/evidence/menu-mobile-430-initial.png`
- `changes/evidence/menu-mobile-1440-desktop.png`
- `changes/evidence/menu-image-inset-320-initial.png`
- `changes/evidence/menu-image-inset-390-initial.png`
- `changes/evidence/menu-image-inset-430-initial.png`
- `changes/evidence/menu-image-inset-1440-initial.png`
- `changes/evidence/menu-image-inset-390-selected-cards.png`
- `changes/evidence/menu-image-inset-390-soup-before-after.png`
- `changes/evidence/menu-image-inset-390-soup.png`
- `changes/evidence/menu-image-inset-390-glass.png`

The full-viewport headless captures retain a pre-existing compositor ghost in the section background (also visible in the earlier `menu-mobile-390-initial.png`). The per-card crops, selected-cards montage, and DOM geometry are clean; the card surfaces themselves are unaffected.

## Checks

- `npm run lint` — passed (`tsc --noEmit`), including after the image-spacing refinement
- `npm run build` — passed; only the existing Vite chunk-size warning remains

No changes were committed or pushed.

## Follow-up

The top and bottom cropping in the six inset cards was corrected in `changes/menu-image-cropping-fix.md`. The image-box inset and card geometry recorded above remain the same; the fit is now `contain` with a per-asset transparent-padding trim.
