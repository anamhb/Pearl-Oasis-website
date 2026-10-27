# Menu Image Cropping Fix

Date: 2026-10-26

## Problem

The six inset Menu cards (steps 1, 2, 4, 5, 6, and 8) were still cropping the top and bottom of their dishes and the glass. The inset itself was correct. The crop came from the image fit.

## Root cause

The six affected assets are portrait PNG canvases. The five dishes are near-square inside substantial transparent padding above and below; the glass is tall and narrow inside the same kind of padding:

| Step | Asset | Canvas | Subject bounds | Tightest safe scale |
| --- | --- | --- | --- | --- |
| 1 | `Chicken_soup.png` | 428 x 582 | 394 x 388 at (29, 91) | 1.455 |
| 2 | `Chowmen.png` | 436 x 573 | 427 x 438 at (9, 74) | 1.270 |
| 4 | `Malai_Boti.png` | 436 x 573 | 401 x 406 at (23, 71) | 1.329 |
| 5 | `Seekh_Kabab-1.png` | 432 x 577 | 405 x 408 at (13, 88) | 1.390 |
| 6 | `Chicken_Fried_Rice.png` | 439 x 568 | 433 x 434 at (2, 55) | 1.240 |
| 8 | `mint.png` | 428 x 582 | 282 x 460 at (79, 50) | 1.208 |

The Menu media box is landscape: 4:3 on mobile and a fixed 9rem height on desktop. With `object-fit: cover`, the browser scaled each portrait canvas to fill the media width. The rendered canvas was then taller than the media box, so centered cover cropping removed the top and bottom of the subject. The 10-14px inset made the crop easier to see, but did not create it.

## Fix

The inset media now uses a two-part fit:

1. `object-fit: contain` keeps the entire canvas and subject inside the inset image box.
2. A per-asset scale trims only the transparent padding above and below the subject. The scale is supplied by `IMAGE_FIT_SCALE` in `MenuExperience.jsx` and consumed through `--menu-image-fit-scale`.

The scale values stay below the tightest alpha-bound limit for each asset, leaving the visible subject fully inside the media box. The tightest visible edge remains at or above the layout inset at every tested width.

| Step | Scale | Tightest visible margin at 390px |
| --- | --- | --- |
| 1 | 1.42 | 13.38px |
| 2 | 1.24 | 13.38px |
| 4 | 1.30 | 13.19px |
| 5 | 1.36 | 13.16px |
| 6 | 1.21 | 13.41px |
| 8 | 1.18 | 13.25px |

The image box itself remains inset equally on all four sides. The visible margins can be larger than the layout inset because the source PNGs still contain asymmetric transparent padding. The media background remains the existing `#0b0c0e`; no new background, blur layer, card padding, or image asset was added, and the six source PNGs were not modified.

The desktop hover rule now uses `scale(calc(var(--menu-image-fit-scale, 1) * 1.035))`. Inset cards keep the existing 3.5% hover zoom above their resting scale; non-inset cards keep the original 1.035. The hover scale stays inside the media box, so the full subject remains visible during hover.

## Files changed

- `src/components/sections/MenuExperience.jsx`: added the per-asset `IMAGE_FIT_SCALE` map and applied it as a custom property on the six inset media boxes. Navigation, modal, and layout code were not changed.
- `src/index.css`: changed the inset image fit to `contain`, kept the equal image-box inset, and made the hover transform use the per-card scale with a 1.035 fallback.
- `changes/menu-image-cropping-fix.md`: this report.
- `changes/menu-mobile-navigation-image-width-fix.md`: added a follow-up note pointing to this fix.
- `changes/evidence/menu-image-cropping-verification.json`: viewport geometry, computed styles, alpha bounds, visible margins, and overflow checks.
- `changes/evidence/menu-image-cropping-320-selected-cards.png`
- `changes/evidence/menu-image-cropping-390-selected-cards.png`
- `changes/evidence/menu-image-cropping-430-selected-cards.png`
- `changes/evidence/menu-image-cropping-1440-selected-cards.png`
- `changes/evidence/menu-image-cropping-390-soup-before-after.png`
- `changes/evidence/menu-image-cropping-390-glass-before-after.png`
- `changes/evidence/menu-image-cropping-390-full-bleed-card-03.png`

## Verification

Tested in headless Chrome 156 against the dev server at `http://127.0.0.1:3000/`. For each viewport, the page was scrolled to the Menu, every affected card was inspected individually, and the alpha bounds of each PNG were compared with the rendered subject box.

| Viewport | Card size | Image-box inset | Tightest visible margin | Full subject | Page overflow |
| --- | --- | --- | --- | --- | --- |
| 320 x 844 | 249.59 x 323.69 | 10px | 11.81px (step 5) | 6 of 6 | none |
| 390 x 844 | 304 x 364.5 | 10.92px | 13.16px (step 5) | 6 of 6 | none |
| 430 x 844 | 304 x 364.5 | 12.04px | 14.26px (step 5) | 6 of 6 | none |
| 1440 x 900 | 184.33 x 290 | 14px | 15.20px (step 5) | 6 of 6 | none |

Additional checks:

- Cards 3, 7, 9, and 10 still use `object-fit: cover`, have a full-bleed image box, and keep transform scale `1.0`.
- The image box inset is equal on all four sides at each viewport.
- No image is stretched. The uniform scale keeps the source aspect ratio.
- No half-width blank area or horizontal page overflow was introduced.
- Desktop hover measured 1.4697 for the soup card, 1.2213 for the glass card, and 1.035 for a non-inset card. The existing 3.5% image zoom is preserved; the card expansion styles were not changed.
- The visible margins are at least the layout inset. The side space is the existing dark media background showing through the transparent PNG background.
- Card dimensions, text positions, borders, typography, mobile arrows, desktop three-card stepping, full-menu action, modal, and the 3D book were not changed.

## Checks

- `npm run lint`: passed.
- `npm run build`: passed; only the existing Vite chunk-size warning remains.

No changes were committed or pushed.
