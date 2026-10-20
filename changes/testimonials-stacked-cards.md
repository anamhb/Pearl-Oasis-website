# Stacked testimonial cards (Courses-style scroll stack)

## What changed

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | The 3-column grid was replaced by a stacked deck. The card markup, typography, colours, padding, quote icon and attribution block are unchanged. Each card is wrapped in a full-height sticky panel with an inline `zIndex` and `--stack-offset`; a spacer div adds the scroll runway at the end. |
| `src/index.css` | Appended one scoped block (`.testimonial-stack__item`, `.testimonial-stack__card`, `.testimonial-stack__spacer`) with the sticky/centring rules plus the reduced-motion + short-viewport fallback. No existing rule was touched. |

No other file was modified. GSAP / ScrollTrigger were **not** used — everything is `position: sticky` + `z-index` + a tiny paint offset, so there are no scroll listeners and no per-frame JS.

## Card size and position (chosen from the existing design)

* Width: `w-full max-w-xl` → **576px** desktop (vs. ~352px in the old 3-column grid), `336px` at 390px viewport, `266px` at 320px → compact, horizontally centred, always with side margins.
* Height: content-driven (no fixed/min height) — measured **287px** at 1366×768, **407–437px** at 320×640. Unchanged `p-8` padding, quote size and attribution spacing.
* Deck: all three cards centre on the viewport centre line, staggered by `--stack-offset` = **−18 / 0 / +18px**, so the pile is itself centred and the earlier cards keep an 18px top edge visible.
* One visual addition: a soft drop shadow on the card, so the overlap between the stacked cards reads clearly (colour/typography untouched).

## Animation behaviour

1. Each testimonial lives in a `90vh` panel with `position: sticky; top: 5vh`. The card is flex-centred inside it, so a card always settles on `5vh + 90vh/2 = 50vh` — exactly the viewport centre — whatever the quote length is.
2. As the page scrolls, the current card stays pinned on that centre line while the next panel/card rises from the bottom and overlaps it.
3. `z-index` grows per card (1, 2, 3 …), so each incoming card paints above the previous one (`elementFromPoint` confirms the last card is the topmost hit).
4. After the last card, the `40vh` spacer gives it a hold (~300px at 768) before the entire deck is pushed up by the parent and normal page scrolling resumes. Scrolling back up reverses the stack exactly.

## Verification (real Chromium, dev server `localhost:3002`, live DOM measured)

| Viewport | Panel (90vh) | Card size | Pinned centre offset (3 cards) | Header overlap | X-overflow |
| --- | --- | --- | --- | --- | --- |
| 1366×768 | 691px | 576 × 287/258 | −18.02 / −0.02 / +17.98 px | none (248px clearance) | none |
| 1440×900 | 810px | 576 × 287/258 | −18 / 0 / +18 px | none (307px clearance) | none |
| 768×1024 | 922px | 576 × 287/258 | −18.02 / −0.02 / +17.98 px | none (363px clearance) | none |
| 390×844 | 760px | 336 × 287/258 | −18.02 / −0.02 / +17.98 px | none (245px clearance) | none |
| 320×640 | 576px | 266 × 437/407/424 | −18 / 0 / +18 px | — | none |

* **Sticky pinning:** all three panels report `position: sticky` and are pinned simultaneously at the end of the deck; each card's centre matches its designed offset to ≤0.02px, and every card is fully inside the viewport while pinned.
* **Overlap / layering:** at the end of the deck the cards overlap by 269px and 255px; z-indexes are `[1, 2, 3]`; hit-testing 4px below each card's top edge returns the expected card (0 → 0, 1 → 1) and 80px into the last card returns card 2 — i.e. the incoming card is always on top and the earlier cards' peeks stay visible.
* **No header collision:** the topmost card stayed ≥248px below the section heading while the heading was on screen.
* **Complete sequence → normal scrolling:** in the tail of the section all panels unpin and the card tops move up with the page (−578 → −715 → −852px), and the following section scrolls into place. Scrolling back above the section returns all three cards to normal flow order.
* **Longer testimonial:** a ~380-character quote (≈2× the longest real one) grew the card to 375px on desktop / 537px at 320px and it stayed pinned, centred (offset −18) and inside its panel.
* **Reduced motion / short viewports:** at 1366×520 the fallback is active — computed `position: static`, `height: auto`, `display: block`, spacer `display: none`, 24px gaps, **no overlap and no clipping**. The browser parsed the reduced-motion rule as `@media (prefers-reduced-motion: reduce), (max-height: 560px)` with the same declarations.
* **Checks:** `npx tsc --noEmit` exits 0; no console errors in any viewport.

## Notes / limitations

* The section is intentionally taller now (stack ≈ `3 × 90vh + 40vh` ≈ 2381px at 768px) to provide the scroll space the stack needs.
* `prefers-reduced-motion` could not be emulated in this environment (no media-emulation tooling); the rule is verified by parsing the live stylesheet and by behaviourally exercising its identical `(max-height: 560px)` branch. It renders a plain, fully readable centred column.
* A testimonial longer than the viewport itself would exceed the pinned panel; the short-viewport fallback covers short screens, and the real content has ~2× headroom.
