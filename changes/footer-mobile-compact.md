# Footer: compact mobile layout

Date: 2026-10-27

Section: site footer (`src/components/sections/Footer.jsx`).

The footer was taking roughly a full extra phone screen on mobile. This revision
tightens mobile spacing and reflows one link list into two columns. No content,
color, typography, tap target, or desktop value was changed. No dependency was
added and no other section was touched.

## Files changed

| File | Change |
| --- | --- |
| `src/components/sections/Footer.jsx` | 12 `className` values only. Each mobile value gained an `sm:` variant that restores the original utility, so anything at 640px and wider renders exactly as before. |
| `changes/footer-mobile-compact.md` | This report. |
| `changes/evidence/footer-mobile-compact-before.json` | Baseline measurements from the unmodified source. |
| `changes/evidence/footer-mobile-compact-after.json` | Measurements after the change. |
| `changes/evidence/footer-mobile-compact-layout.json` | Clipping, overlap, link-grid and color checks. |
| `changes/evidence/footer-mobile-compact-{320,390,430,1440}-footer.png` | Footer after the change. |
| `changes/evidence/footer-mobile-compact-{320,390,430,1440}-footer-before.png` | Footer before the change. |

`git diff` for the change is 12 lines, all `className` attributes. There are no
structural, content, or asset changes.

## Causes of the excessive height

Measured on the unmodified footer at 390px wide, total height `1091.5px`:

| Cause | Size | Share |
| --- | --- | --- |
| Four sections stacked one per row (`grid-cols-1`) with a `48px` gap, three gaps | `144px` | Grid block was `821px` of the `1091.5px` total |
| Explore links stacked one per row, each forced to a `44px` tap target | `182px` of a `214px` block | Largest single block |
| `pt-14` / `pb-10` on the `<footer>` | `96px` | Outer padding |
| `mb-16` between the grid and the bottom bar | `64px` | |
| `pt-8` on the bottom bar | `32px` | |
| Copyright bar stacked as two rows with a `16px` gap | `109.5px` bar | |
| Three `h3` headings with `mb-4` | `48px` | |
| Two Opening Hours blocks with a redundant `pt-2` on top of `space-y-2` | `16px` | |

Typography was inspected and is already small, not oversized: headings `12px`,
description `12px` with `19.5px` line-height, copyright `11px`, "Coming soon"
`10px`. There was no large type to trim, so type was left alone rather than
pushed below a readable size.

## Adjustments

Every change applies only below `640px`. The `sm:` variant restores the original
value, so 640px and wider is untouched.

| Element | Mobile before | Mobile after | Restored at |
| --- | --- | --- | --- |
| `<footer>` padding | `pt-14 pb-10` (56/40) | `pt-9 pb-8` (36/32) | `sm:` |
| Section grid gap | `gap-12` (48) | `gap-8` (32) | `sm:` |
| Grid margin before bottom bar | `mb-16` (64) | `mb-10` (40) | `sm:` |
| Brand column spacing | `space-y-4` | `space-y-3` | `sm:` |
| Description top padding | `pt-2` | `pt-1` | `sm:` |
| Social row top padding | `pt-2` | `pt-1` | `sm:` |
| Heading bottom margin (x3) | `mb-4` | `mb-3` | `sm:` |
| Explore link list | `block`, four stacked rows | `grid grid-cols-2` (2 x 2) | `sm:block` |
| Opening Hours blocks 2 and 3 | `pt-2` | `pt-1` | `sm:` |
| Bottom bar top padding | `pt-8` | `pt-6` | `sm:` |
| Bottom bar gap | `gap-4` | `gap-3` | `sm:` |

Approximate savings at 390px: outer padding `28px`, section gaps `48px`, bottom
margin `24px`, the 2 x 2 Explore grid `92px`, heading margins `12px`, hours
spacing `8px`, bottom bar `12px`, brand spacing `16px`. Total `240px`, matching
the measured result.

## Deliberately not changed

These were the remaining height levers, rejected on purpose:

- **Tap targets.** Every `min-h-11` (44px) was kept: the four Explore links, the
  phone link, and the Return to Top button. Shrinking them would have saved the
  most height, but it would break comfortable touch input, so it was not done.
- **Typography.** Already 10px to 12px, see above.
- **Logo.** The `h-16` (64px) wordmark is the brand mark and was left as is.
- **Content.** Nothing was removed or hidden. All five content groups, all three
  service hours, the address, phone, social row, copyright, and Return to Top
  remain.
- **Colors.** Warm-black `#070708`, hairline `#1d1b16`, ivory `#b0a99d`, and gold
  `#d4af37` are unchanged.

## Viewport checks

Headless Chrome against the dev server, device scale factor 1.

| Viewport | Before | After | Change |
| --- | --- | --- | --- |
| 320 x 700 | 1111.0px | 871.0px | -240.0px (-21.6%) |
| 390 x 844 | 1091.5px | 851.5px | -240.0px (-22.0%) |
| 430 x 932 | 1091.5px | 851.5px | -240.0px (-22.0%) |
| 1440 x 900 | 456.5px | 456.5px | 0.0px (unchanged) |

Layout and content checks, all four widths:

| Check | Result |
| --- | --- |
| Horizontal overflow | None. `documentElement.scrollWidth` equalled `innerWidth` at 320, 390, 430 and 1440. |
| Clipped text | None. Every leaf text node in the footer had `scrollWidth <= clientWidth` and `scrollHeight <= clientHeight`. |
| Element overlap | None. Zero overlapping Explore links and zero overlapping grid columns at every width. |
| Content present | All 15 items true at every width: logo, description, Explore heading, Our Story, Featured Dishes, Menu, Testimonials, Opening Hours, all three service lines, Sanctuary Location, address, phone, copyright, Return to Top. |
| Tap targets | 44px on all four Explore links, the phone link, and the Return to Top button, at every width. |
| Explore link grid | `grid` with two columns: 128px each at 320, 163px at 390, 183px at 430. Back to `block` (stacked) at 1440. |
| Main section grid | 1 column below 768, 2 columns at 768, 4 columns of 284px at 1440. |
| Bottom bar | Fully inside the footer at 320 and 390. Copyright 17px tall, Return to Top button 44px, both `visibility: visible` at opacity 1. |
| Colors | `rgb(7,7,8)` background, `rgb(29,27,22)` border, `rgb(176,169,157)` text at both 390 and 1440. |

### Desktop proof

The 1440px footer screenshots before and after are byte-identical: both
`58,465` bytes, both SHA-256 `E4BBCBDD9C85B2C0`. Computed values also match
exactly: height `456.5px`, padding `56px` / `40px`, grid gap `48px`, grid margin
`64px`, grid height `218.5px`, bottom bar padding `32px`, bottom bar height
`77px`.

### Interaction check

The spacing changes did not affect any control:

| Control | Result |
| --- | --- |
| Explore: Our Story | Scrolled to `#story`, target in view. |
| Explore: Featured Dishes | Scrolled to `#signature`, target in view. |
| Explore: Menu | Scrolled to `#menu`, target in view. |
| Explore: Testimonials | Scrolled to `#experience`, target in view. |
| Return to Top Entrance | Scrolled from `6891` to `0`. |
| Phone link | Real `tel:+923327515538` anchor, text `+92 332 7515538`. |

### How the before images were made

To capture a faithful before image without editing source, the original
utilities were re-applied at runtime through a temporary style override. The
reconstruction was only accepted where it reproduced the true measured height
from the unmodified source. It matched exactly at all four widths (1111.0,
1091.5, 1091.5, 456.5), so the before images are trustworthy.

## Checks

- `npm run lint` (`tsc --noEmit`) passed.
- `npm run build` passed. The only warning is the existing chunk-over-500kB
  warning.
- `git diff` touches only `Footer.jsx`, 12 lines, all `className`.
- No commit or push was made.
- The only console/network error is the pre-existing `favicon.ico` 404, which is
  unrelated to the footer.

## Delivery Gate (scoped)

Reading this as: restaurant site footer for diners, in a dark cinematic editorial
style, dial ENERGY 2 / RHYTHM 2 / MOTION 2. The existing direction was inherited
and preserved; this revision changes spacing only.

Scoped to the footer. Items outside it are marked N/A, not PASS. Unchanged
content was not re-audited.

| Gate | Result | Evidence |
| --- | --- | --- |
| R-02, no em dash | PASS | No em dash in this report or the changed file. |
| R-03, mobile responsiveness | PASS | No overflow, no clipping, no overlap at 320, 390, 430; 44px tap targets retained. |
| R-17 / R-36, no invented numbers or claims | PASS | No statistics or performance claims added. |
| R-18 / R-38, honest placeholders | N/A | The footer holds no testimonials. |
| R-23, visual assets | PASS | No logo, avatar, or image was created; the existing wordmark is unchanged. |
| R-24, navigation | N/A | No navbar change. The four Explore anchors point to existing sections. |
| R-25, contrast | N/A | No text or color changed; contrast was not re-measured. |
| R-26, interactive elements | PASS | Explore anchors, phone link, and Return to Top all retained with real behavior. |
| R-27, UI states | N/A | Static footer, no data fetch. |
| R-28, FAQ | N/A | No FAQ. |
| R-32, keyboard | PASS | Anchor and button semantics untouched; focus styling untouched. |
| R-33, source patching | PASS | Written as Tailwind classes in `Footer.jsx`; no patch script. The temporary override used for screenshots was browser-side only and left no files. |
| R-34, themes | N/A | No theme change. |
| R-35, verify before delivery | PASS | Lint, build, and the four-viewport click-through above. |
| R-37, design direction | PASS | Existing direction inherited, stated above. |
| R-01 / R-07 / R-09 / R-10 / R-13 / R-22, decorative defaults | N/A | No new gradient, pattern, badge, glass, glow, or illustration. |
| R-04, icons | PASS | Existing clock, pin, phone, social, and arrow icons retained for relevance. |
| R-06, typography | PASS | Type scale unchanged. |
| R-08, arrows | PASS | The up arrow marks a real Return to Top control. |
| R-12, shadow | PASS | No shadow change. |
| R-14, feature cards | N/A | No cards in the footer. |
| R-19, animation | N/A | No motion added; the existing smooth scroll is untouched. |
| Liveliness | PASS | Existing gold accent, hairline divider, and wordmark motif preserved; dials explicit. |
| C-1 / R-31, intentionality | PASS | Each spacing change is tabulated above with its before and after value. |
| C-2, functional completeness | PASS | Every link and control retained. |
| C-3, content-driven section | PASS | No section added or removed. |
| C-4, resilience | PASS | Verified at four widths with no overflow, clipping, or overlap. |
| C-5, evidence over claims | PASS | No fabricated content. |
| R-05 / R-11 / R-15 / R-16 / R-20 / R-21 / R-29 / R-30, layout and identity | PASS / N/A | No new layout, radius, CTA, buzzword, theme, palette, or clone behavior. |

## Limitations and unverified behavior

- Browser checks were headless Chrome only. No physical phone, Safari, or
  Firefox run.
- The compact values stop at 640px, so viewports from 640px to 767px (large
  phones and small tablets in portrait) keep the original taller footer. This was
  deliberate, to avoid altering any layout above the phone range.
- Contrast was not re-measured, because no text or color changed.
- The reduction is spacing only. It is not a reflow into a different mobile
  arrangement, so the footer still reads top to bottom in the same order.
