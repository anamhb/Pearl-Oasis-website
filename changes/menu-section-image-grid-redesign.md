# Menu Section: Image-Led Zigzag Grid

## Summary

The Menu section was a **horizontal carousel**: runtime-measured tile widths (`ResizeObserver` + `useLayoutEffect`), arrow buttons, desktop hover-growth that expanded the hovered tile by 32% while shrinking and dimming its peers, a scroll-linked index sync, and a phone-only native scroll-snap row. The dish image sat in a fixed 4:3 box (`--menu-image-height`) above a text body, so the photos were small relative to the tile and the section only ever showed 6 of 10 items at once.

It is now a **static image-led grid**: each existing card became a full-bleed image card (rounded, subtle gold border, scrim over the lower part, category tag top-left, dish name and existing description bottom-left), arranged as a 12-column zigzag at desktop: rows alternate **7 cols + 5 cols** then **5 + 7**, so the large and small cards trade sides down the section. Below `1024px` the grid relaxes to two equal columns (`768-1023`) and then one centred column capped at `480px` (`<768`), so a portrait dish never sits in an over-wide card.

Everything the section is made of is preserved: the same ten cards and data arrays, the same header (eyebrow / serif title / rule / supporting copy), the same `aria-label` per card, the same full-menu modal (10 sections, `tel:` link, focus trap, Escape, focus restore), the same `#menu` anchor, and the same CTA ("See Menu Sections", opening the full-menu modal), now centred **directly after the grid**.

Result at `1920 / 1440 / 1280 / 1024 / 768 / 640 / 390 / 320`: zigzag spans exactly `7,5,5,7,7,5,5,7,7,5`, no horizontal overflow, no clipped dish subject (portrait PNGs keep 7.3 to 11.4px of margin at their worst breakpoint), all text inside its card, CTA centred (`Δ0px`) with a `40/32px` gap after the grid. Hover, keyboard focus, modal (X button, footer Close, Escape), anchor offset and reduced motion all verified, with **no console errors, warnings or exceptions** during load and the full click-through. Text-over-image contrast (worst sampled pixel of every text line box, 180 boxes across five widths): title **13.6:1**, description **9.69:1**, tag **7.7:1**; all pass WCAG AA.

`npm run lint` and `npm run build` pass. No commit or push was made.

## Direction and decision reasons

Design read for this section, taken from the brief and the site's existing language: Pearl Oasis fine dining, dark ground with gold and serif type, dish photography carrying the appetite. Dials: **ENERGY 2** (rich photography and gold accents, nothing loud), **RHYTHM 2** (a regular grid broken deliberately by the alternating 7/5 zigzag), **MOTION 1** (hover and focus states only, no scroll animation). The output matches: the only movement is the hover zoom (gated off under reduced motion) and the section has no scroll-reveal.

| Decision | Reason |
|---|---|
| Zigzag 7/5 alternation | The brief asked for it, and the size trade keeps a ten-card grid from reading as one repeated template. |
| Single column capped at 480px below 768 | A portrait dish in a full-width phone card would letterbox; the cap keeps card width near card height. |
| Min-heights (320/380/400/440), not fixed heights | Text must never clip; equal heights come from the min-heights plus identical content structure. |
| Scrim gradient over the lower part of the image | The dish name and description sit on photography; the scrim is what buys the measured 9.69:1 worst case. |
| Tag on its own dark plate | The category label keeps contrast even where the photo is bright, so it never relies on the scrim. |
| Serif dish names, muted sans descriptions | Matches the section header hierarchy already on the page; the eye lands on the dish name first. |
| Resting border `rgba(212,175,55,0.28)` | The brief asked for a subtle border; same value family as the tiles it replaced (0.3). |
| Hover: border brightens, shadow, image `x1.03` zoom | Pointer affordance only, media-queried to hover-capable devices; zoom gated off under reduced motion, border kept as an instant state. |
| Shadow on hover only | Resting cards are flat, so elevation marks the active tile instead of decorating every card. |
| Radius 1.1rem cards / 0.3rem tag | Carried from the tile system (0.9rem) scaled to the larger card, so the section still reads as one site. |
| CTA gap 40/32px, centred after the grid | The brief put it directly after the grid; the gap separates without detaching. |
| Eager loading for the first 2 images | Only the first row sits above the fold; everything else lazy-loads. |

## Files changed

| File | Change |
|---|---|
| `src/components/sections/MenuExperience.jsx` | Carousel markup and logic replaced by the grid; data, modal and CTA kept |
| `src/index.css` | One contiguous hunk (`@@ -526,327 +526,211 @@`): the `.menu-carousel__*` / `.menu-tile__*` block replaced by `.menu-grid` / `.menu-card*` |
| `changes/menu-section-image-grid-redesign.md` | This report |

No other files touched; no new dependencies.

## Layout

### Breakpoints (one `12 -> 2 -> 1` column progression)

| Range | Columns | Track math (measured) | Card sizes | Card min-height | Row pitch |
|---|---|---|---|---:|---:|
| `>= 1280` | 12 (gap `24`) | `12 x 76` in `1176` grid | `676x440` (span 7) + `476x440` (span 5) | `440` | `464` |
| `1024-1279` | 12 (gap `24`) | `12 x 57.5` in `954` grid | `546.5x400` + `383.5x400` | `400` | `424` |
| `768-1023` | 2 (gap `20`) | `2 x 347` in `714` grid | `347x380` equal | `380` | `400` |
| `640-767` | 1, capped `30rem` (gap `16`) | `480` centred | `480x380` | `380` | `396` |
| `< 640` | 1 (gap `16`) | full width | `358x320` @390, `288x320` @320 | `320` | `336` |

- Zigzag pairing is index-derived in the component (`isLargeCard`: even row, large first; odd row, small first) and applied via `.menu-card--large` / `--small`, which are **inert below 1024px** so the two-column tier stays equal.
- Heights are **min-heights**, not fixed: normal-size content sits inside them and enlarged text grows the card instead of being clipped (`contentOverflow []` at every width).
- The `<768` cap (`max-width: 30rem`) keeps a single-column card from becoming a letterboxed wide box; it lifts at `768` when the grid goes two-up.

### Card anatomy

```
button.menu-card                  <- clickable, aria-label, :focus-visible gold ring
├── .menu-card__media  (abs, z0)  <- img fills card; cover, or contain+scale for portraits
├── .menu-card__scrim  (z1)       <- bottom gradient: 0 -> .45@50% -> .86@72% -> .97@100%
├── .menu-card__tag    (z2)       <- categoryTag on its own dark plate (guaranteed bg)
└── .menu-card__body   (z2)       <- dish name (serif) + existing description
```

- **Hover** (`hover: hover and pointer: fine`): border `rgba(212,175,55,.28)` -> `rgba(255,216,117,.62)`, card shadow, image `x1.03` zoom.
- **Reduced motion**: `transition: none` on card and image; the zoom media query also requires `no-preference`, so a reduced-motion user gets **no zoom** but still gets the (instant) border state; verified: `matrix(1.19,...)` unchanged on hover, border still switches.
- **Focus**: `outline: 2px solid #ffd875`, `outline-offset: 3px`, drawn outside the card (grid gaps always have room; the old inset ring existed only because the carousel viewport clipped outward).

## Image fit: why the old scales would have clipped dishes

Each of the six portrait PNGs is a canvas with transparent padding, and the old `IMAGE_FIT_SCALE` values (`1.42 / 1.24 / 1.30 / 1.36 / 1.21 / 1.18`) were tuned to the old **4:3 inset box**, where the box was landscape and height-limited with lots of horizontal room. The new cards are near-square to portrait at some breakpoints, so those values would have pushed subjects through the card edge.

New values were computed from measured **alpha bounds** (threshold `alpha > 16`), per asset, as the largest scale at which the subject rectangle stays inside every card box at every tier, including the `x1.03` hover zoom; that is why resting = `0.98 x minSafe / 1.03`:

| Step | Asset | Old scale | New scale | Binding box |
|---:|---|---:|---:|---|
| 1 | Chicken soup | 1.42 | **1.19** | `288x320` phone |
| 2 | Chow mein | 1.24 | **1.13** | `288x320` phone |
| 4 | Malai boti | 1.30 | **1.19** | `288x320` phone |
| 5 | Seekh kabab | 1.36 | **1.22** | `288x320` phone |
| 6 | Fried rice | 1.21 | **1.12** | `288x320` phone |
| 8 | Mint drink | 1.18 | **1.15** | its `50px` top padding (box-independent) |

Runtime check (analytic: `object-fit` box, then scale, then subject rect vs card rect), minimum margin across the six portraits per width:

| Width | 1920 | 1440 | 1280 | 1024 | 768 | 640 | 390 | 320 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Min subject margin | 11.4 | 11.4 | 11.4 | 10.5 | 10.0 | 10.0 | 8.6 | 7.3 |

All positive, so **no portrait is clipped at any breakpoint** (`clippedSubject` only ever lists cards 2/6/8/9, which are the four `cover` photos; see below).

The four landscape photos (3 JPGs plus the wrap PNG) keep `object-fit: cover`, as before. Measured side crop: -55.3px rendered per side at `>= 1280` (9.4% of the image), -74.8px at 1024, worst case -79.6px at `768` (15.6%) and -68.9px at `320` (16.1%), always centred; the wrap PNG stays fully visible (positive margins). All four dishes read intact in the screenshots; `cover` cropping here is framing, not amputation.

## Content and architecture preservation

Kept unchanged: `LEFT_CARDS` + `RIGHT_CARDS` -> `ALL_CARDS_IN_ORDER` (sorted by `step`), all titles, descriptions and `categoryTag`s, all ten image imports, card-as-`<button>` with `aria-label="Open full menu: ..."`, the full-menu modal (structure, X close, footer Close, `tel:+923327515538` link, Escape, focus trap, focus restore), the header copy, the section background decor, `id="menu"`, and the CTA label **"See Menu Sections"** (no "Explore Full Menu" string exists anywhere in the project; that action is this button and its destination is the modal, only its position moved).

Deliberate removals, all specific to the replaced carousel: measurement effects and constants (`MENU_STEP/GAP/MIN_TILE_WIDTH/MAX_VISIBLE/HOVER_GROWTH`), arrows, scroll-sync, hover peer growth and dimming, `isMobile` branching, the mobile scroll-snap row, and the `sr-only` live region (a static grid has no paging state to announce). The step-number badges left the cards (they remain visible in the modal as "Section 01 ..."); the tag shows `categoryTag` only, per the instruction to use only accurate existing information; no invented "Featured" or "Chef's Special" labels (the one existing "Chef's Special Pizza Section" is a preserved card title). Lazy loading tightened from `index < 6` to `index < 2` (eager = first visible row).

The section had **no scroll-reveal before and none was added**: no `IntersectionObserver`, no reveal keyframes; all cards measure `opacity: 1` at rest.

## Validation

Lint `tsc --noEmit` pass. Build pass (`dist/assets/index-CehlO1yn.css`, `index-BDJS1UUz.js`; only the pre-existing chunk-size warning). Served from the production build via `vite preview`.

Geometry (measured in-page, reduced motion, after a lazy-load walk): no horizontal overflow at any width (`overflowX -6...0px`), rows pair correctly (`0+1 ... 8+9`), text never leaves its card (`textOutside []`), no content overflow, all 10 images decoded.

| Check | Result |
|---|---|
| Zigzag spans `>=1024` | `7 5 / 5 7 / 7 5 / 5 7 / 7 5` exact; row pitch = card height + gap |
| Equal columns `768-1023` | `347+347`, both `380` tall |
| Single column `<768` | one card per row, equal heights, capped `480` at `640-767` |
| CTA after grid | gap `40px` (`>=1024`) / `32px`, centre delta `0px` |
| Hover (pointer, motion on) | border `0.28 -> 0.62` plus image transform change (zoom `x1.03`) |
| Hover under `reduce` | transform **unchanged** (`matrix(1.19,...)`), border state still switches |
| Focus (Tab) | `:focus-visible` true, `solid 2px rgb(255,216,117)`, offset `3px` |
| Keyboard | Tab reaches cards; **Enter opens the modal**, Space opens it too |
| Cards (first, middle, last) | click opens the modal with 10 sections; focus moves to Close |
| Modal close paths | X close button, footer Close button and Escape all close it; focus returns to the card |
| Modal contact | `tel:+923327515538` ("Call to Reserve") present; href recorded, not dialled |
| CTA | "See Menu Sections" opens the same modal; Escape closes |
| `#menu` anchor | nav link and hash both land the section at `104.1px` vs fixed header bottom `103px` |
| Reduced motion | card and image `transition-duration: 0s` |
| Cards | 10 `<button>`s, original labels, `alt=""`, carousel and live region gone |
| Console | no errors, no warnings, no exceptions during load and the full click-through |

### Contrast (R-25)

`contrast-check.py` has no Python runtime on this machine, so its functions (`linearize`/`luminance`/`contrast_ratio`, unrounded verdicts) were ported 1:1 and the port reproduces **9/9** rows of the skill's reference table.

Worst sampled pixel of every text line box (glyphs hidden, 180 boxes across `1440/1024/768/390/320`; the worst spot, not an average):

| Pairing | Worst background | Ratio | AA |
|---|---|---:|---|
| Title `#FCF9F2` over scrim | `#2C2A28` (burger photo, 320) | **13.6:1** | PASS |
| Description `#CFC7B8` over scrim | `#21201F` (burger photo, 320) | **9.69:1** | PASS |
| Tag `#FFD875` on its plate | `#3E3F40` (over handi photo, 1440) | **7.7:1** | PASS |

Static pairings: eyebrow `14.55:1`, section title `18.95:1`, supporting copy `13.02:1`, CTA text on the gold gradient worst stop `6.08:1`, focus ring `14.55:1` (non-text bar 3), hover border `5.96:1` (non-text bar 3). **All pass.**

## Known and accepted

1. **Resting hairline border about 1.76:1** (informational): `rgba(212,175,55,0.28)` over the section, deliberately subtle per the brief and matching the pre-existing tile border (0.3). The tile is identified by its photo and dish name, not the hairline, and the *states* clear 3:1 comfortably (focus `14.55:1`, hover `5.96:1`).
2. **`cover` side crop** on the four landscape photos (8 to 16% per side, centred), inherent to `cover`; all dishes fully visible in evidence screenshots.
3. **CDP Enter quirk**: synthesised Enter only activates the button when the key event carries `text: '\r'` (verified working both ways; this is a harness detail, not a page behaviour, and Space activates regardless).
4. Images below the fold decode on scroll (lazy by design; first row eager).

## Evidence

`C:/Users/Nomanz/AppData/Local/Temp_sewit/opencode/menu/shots/` holds `final-{1920,1440,1280,1024,768,640,390,320}.png` (section captures), `vp-1440.png` (header and eyebrow below the fixed nav), `final-measure.json` (geometry, spans, subject margins, interaction results) and `contrast.json` (every sampled ratio). Measurement harnesses in the same directory: `measure-grid.cjs`, `contrast-sample.cjs`, `extras.cjs`, `gate.cjs`, `viewport-shot.cjs`.
