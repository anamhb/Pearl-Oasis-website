# Testimonials — brighter film + two-column card deck

Follow-up pass on the ambient-video section: the clip was too dark to read and one 576px card sat in
the middle of the frame, covering it. This pass fixes both without touching the video source, the
playback logic, or the section's identity.

## Files modified

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | Overlay stack replaced (no flat tint, short seam blends, hairline vignette), video filter brightened and de-blurred, heading given a local scrim, cards reduced to `22rem / 18rem / 22rem`, alternate left/right column assignment with per-column stagger. |
| `src/index.css` | Added the two-column placement block (`min-width: 768px`) and its reset inside the existing reduced-motion / short-viewport fallback. |

Nothing else in the site was touched.

## 1. The film is now the subject, not the backdrop

| Layer | Before | After | Why |
| --- | --- | --- | --- |
| Flat tint | `#0a0b0d` @ **55 %** over the whole frame | **removed** | this alone was halving the picture |
| Top gradient | **50 % of the viewport**, `.9 @20%`, `.45 @52%` | **112 px**, `.62 @45%` | keeps the seam with `#08090a` above, then gets out of the way |
| Bottom gradient | **38 % of the viewport**, `.88 @30%` | **112 px**, `.58 @45%` | still lands on the footer `#070708`, without eating the floor of the frame |
| Vignette | `rgba(8,9,10,.6)` from 40 % | `rgba(8,9,10,.30)` from 58 % | edge framing only |
| Video filter | `blur(1.5px) saturate(.85) brightness(.95)` | `brightness(1.08) saturate(1.03) contrast(1.02)` | no blur, natural colour, a genuine lift |
| Scale | `1.03` | `1.015` | still hides sub-pixel edges |

Measured on the composited stack (frames at t = 0.6 s and 5.4 s, 1440 × 900): the open centre of the
film averages **luma 126–131** (max 255) versus **~78** before — the chefs, the copper pot, the
biryani and the wooden floor are all clearly readable.

**Text contrast is now local, not global.** The only copy that sits on the film is the heading block,
so it got its own radial scrim (`rgba(6,7,9,.92) → .82 @42% → .42 @68% → transparent @84%`, inside
`inset-x-0 -inset-y-14`, clipped to the heading's own width so it cannot cause overflow). The note
line was lifted from `neutral-400` to `neutral-300` and all three heading layers carry the same
drop shadow the hero uses.

| Heading layer | Background luma | Contrast |
| --- | --- | --- |
| H2 `#f6efe4` | 17.6–18.4 avg, 24.3–29.7 max | **16.4–16.5 : 1** (14.7 worst pixel) |
| Eyebrow `#d4af37` | 16.9–18.2 avg | **7.9–8.1 : 1** |
| Note `#d4d4d4` | 29.3–30.1 avg, 90.4 max | **11.2 : 1** (4.6 worst pixel) |

Card text is unaffected: the cards stay fully opaque, so their 13–14 : 1 ratios hold.

## 2–4. Cards: smaller, halved into two columns, same animation

The deck is unchanged mechanically — five `90vh` sticky panels, first panel shortened to `70vh`,
`z-index` growing per card, `--stack-offset` staggering each pile. Only the horizontal placement
changed: cards now alternate **left (1, 3, 5)** and **right (2, 4)**, and each column recentres its
own pile (`-18 / 0 / +18` on the left, `-9 / +9` on the right) so the stacking read is identical.

| Property | Before | After |
| --- | --- | --- |
| Card width | `max-w-xl` 576 px | 352 px desktop, **288 px** 768–1023, 336 px at 390, 266 px at 320 |
| Padding | `p-8` (32 px) | `p-6` / `p-7` (24 / 28 px) |
| Quote | 18 px, `leading-relaxed`, `mb-6` | 16 px (`18 px` ≥1024), `leading-[1.65]`, `mb-5` |
| Quote mark | 32 px, `mb-6` | 28 px, `mb-4` |
| Card area | 576 × 287 = 165k px² | 352 × 324 = 114k px² (**−31 %**) |

The longest quote wraps to **5 lines** in the 288 px card, so nothing is clipped and nothing needs a
smaller font to fit.

Measured placement (live DOM, iframes at each viewport):

| Viewport | Layout | Left card | Right card | Centre gap | Card width |
| --- | --- | --- | --- | --- | --- |
| 1440 × 900 | two columns | x 141 → 493 | x 941 → 1293 | **448 px** | 352 |
| 1280 × 800 | two columns | x 61 → 413 | x 861 → 1213 | **448 px** | 352 |
| 1024 × 768 | two columns | x 48 → 400 | x 618 → 970 | **218 px** | 352 |
| 900 × 700 | two columns | x 48 → 336 | x 558 → 846 | **222 px** | 288 |
| 768 × 1024 | two columns | x 48 → 336 | x 426 → 714 | **90 px** | 288 |
| 390 × 844 | single column | x 24 → 360 | — | — | 336 |
| 320 × 640 | single column | x 24 → 290 | — | — | 266 |

* Card heights 298–340 px, always centred on the 50vh pin line, so the top edge stays well below the
  heading once the deck pins (the heading has already scrolled past by then, as before).
* Horizontal overflow: **none** at any size (`scrollWidth − innerWidth = −6` everywhere, i.e. just the
  scrollbar gutter). The first attempt at the heading scrim used `-inset-x-28` and produced +58 px at
  768 and +82 px at 390; it now spans exactly the heading box instead.
* The two columns never overlap horizontally at any breakpoint, so the alternating cards cannot
  collide; vertical order and the up/down scroll behaviour are untouched.

### Responsive behaviour

* **≥ 768 px** — left/right columns via `.testimonial-stack__item--left/--right` (`justify-content`
  plus a single auto margin on the card; the card's own `mx-auto` is overridden only in this range).
* **< 768 px** — one centred column at full container width; the deck still pins and stacks, the film
  shows above, below and beside the card.
* **Reduced motion / < 560 px tall** — the existing static-column fallback still wins: those cards
  are re-centred (`margin-inline: auto`) by a rule that comes after the column block, so the
  accessibility path is a plain readable column, not a broken two-column layout.

## 5–6. Heading and spacing

"Words of Appreciation", the eyebrow and the placeholder note are unchanged in content, position and
type size; the heading block keeps `mb-4` and gains the local scrim plus drop shadows. No extra
vertical gaps were introduced — the cards' distance from the heading is still the panel geometry
(first panel `70vh` from `15vh`), which keeps them clear of the title on every viewport.

## 7. Verification

| Check | Result |
| --- | --- |
| Film brightness | centre luma **126–131** (was ~78), no blur, full frame detail visible |
| Heading contrast | H2 **16.4 : 1**, eyebrow **8 : 1**, note **11.2 : 1** |
| Cards smaller | 576 → 352 px wide, **−31 %** area |
| Left / right on desktop | yes at 768, 900, 1024, 1280, 1440 |
| Film visible between cards | gap 448 / 218 / 222 / 90 px by viewport |
| Overflow | none at 320, 390, 768, 900, 1024, 1280, 1440 |
| Console errors | none |
| `npx tsc --noEmit` | clean |
| `npm run build` | ✓ |

**Visually tested?** Partly. The live preview tab in this environment reports
`document.visibilityState === "hidden"`, and Chromium freezes `scrollTo` and screenshots in a hidden
document, so the page could not be scrolled to the pinned state and photographed in the browser. The
layout was verified by reading the real computed geometry from the running app at every breakpoint,
and the brightness/contrast were verified by compositing the real video frames with the exact layer
stack at 1440 × 900 and 768 × 1024. The clip itself was confirmed streaming (`206`), decoding
(`readyState 4`, `duration 8`) and correctly paused off-screen. A foreground pass through the deck
(scroll down and back up) is still worth doing with human eyes.
