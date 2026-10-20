# Testimonials — five cards, alternating themes, tighter heading gap

Section: `#experience` ("Words of Appreciation"). Only the testimonial section was
touched — its stacked-card scroll animation is unchanged in mechanism (pure CSS
sticky panels, no JS, no carousel, no grid).

## Files changed

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | 2 new testimonials (3 → 5), one shared card shell + two alternating colour themes (`CARD_BASE` / `CARD_THEMES`), heading margin `mb-16` → `mb-4` |
| `src/index.css` | Shorter first panel (`top: 15vh; height: 70vh`, media-gated) so the first card starts nearer the heading; the reduced-motion / short-viewport fallback now resets that `:first-child` override too |
| `changes/testimonials-five-cards.md` | This report |

No other section, dependency, layout, card dimension, typography, radius or shadow
was changed.

## 1. Five cards

Cards 1–3 keep their exact existing quotes and attributions. Cards 4 and 5 are new
and written for Pearl Oasis' actual menu (Pakistani mains/tandoor, fast food, and
Chinese specialties) — not rewrites of the existing text:

| # | Publication | Role |
| --- | --- | --- |
| 4 | DAWN Weekend Magazine | Casual Dining Review — *"Weeknight karahi and tandoori naan that taste like a family kitchen, plus a fast-food counter the children insist on…"* |
| 5 | The Express Tribune Dining | Cuisine Spotlight — *"The Chinese menu is a genuine surprise: wok-seared chow mein, crisp spring rolls and chilli chicken with real heat…"* |

All five cards share one shell (`CARD_BASE`: same `max-w-xl` 576px width, `p-8`,
`rounded-lg`, identical drop shadow, identical quote/meta structure) — verified as
identical computed `border-radius: 8px`, `padding: 32px`, `width: 576px` and shadow
across all five at 1366×768.

## 2. Alternating themes (1/3/5 = A, 2/4 = B)

The section previously used **one** theme for all three cards, so "card 2's theme"
did not exist as such. Theme B was therefore built **only from colours already in
this section** — `#1f1d18` (the section's own top border colour), `#d4af37` (the
existing gold), `#f6efe4` (the heading white) and `neutral-400` (the note text
colour) — so no new palette, gradient or design style was introduced:

| | A — cards 1, 3, 5 | B — cards 2, 4 |
| --- | --- | --- |
| Background | `#121316` (unchanged) | `#1f1d18` |
| Border | `#232019` (unchanged) | `#d4af37/40` (hover `#d4af37/70`) |
| Quote text | `#ece5d8` | `#f6efe4` |
| Quote mark | `#d4af37/30` | `#d4af37/60` |
| Divider | `#221f18` | `#d4af37/20` |
| Publication | `#f2e6cf` | `#f2e6cf` |
| Role / context | `neutral-500` | `neutral-400` |

Card 3 already matched card 1, so it needed no change. Contrast stays high
(`#f6efe4` on `#1f1d18` ≈ 14:1, `#ece5d8` on `#121316` ≈ 13:1, `neutral-400` on
`#1f1d18` ≈ 6:1). The section has no rating element, so none was added.

Because the pile staggers by 18px per card (−36/−18/0/+18/+36), each earlier card
keeps a visible top strip, and **alternating strips are what the user sees**: hit
testing at each strip in the settled deck returned the owning card with backgrounds
`[A, B, A, B]` (i.e. cards 1→2→3→4) at every viewport tested.

## 3. Tighter heading → first card gap

Two changes, no font-size or card-size change:

1. The header block's bottom margin `mb-16` (64px) → `mb-4` (16px).
2. The **first panel only** is shorter: `top: 15vh; height: 70vh` instead of
   `5vh / 90vh`. A flex-centred card sits `(panel − card) / 2` below the panel top,
   so a shorter panel starts the first card higher. Centring is untouched because
   the pin line moves with the panel (`15vh + 70vh/2 = 50vh`, same as `5vh + 90vh/2`).

The shorter panel is media-gated (`@media (min-width: 768px), (min-height: 730px)`)
because at very narrow widths the quote wraps taller and a 70vh panel could push the
card up into the heading. Measured in-flow gap (heading bottom → first card top):

| Viewport | Before | After | Δ |
| --- | --- | --- | --- |
| 1366×768 | 247.97px | **105.18px** | −142.8px (−58%) |
| 1440×900 | 307.38px | **151.37px** | −156.0px (−51%) |
| 768×1024 | 363.20px | **194.76px** | −168.4px (−46%) |
| 390×844 | 244.90px | **94.52px** | −150.4px (−61%) |
| 360×640 | 130.25px | **64.25px** | −66.0px (−51%) |
| 320×640 | 115.63px | **49.63px** | −66.0px (−57%) |
| 1366×520 (fallback) | 64.00px | **16.00px** | −48.0px (−75%) |
| 800×582 (live app) | — | **40.06px** | — |

"Before" is the previous geometry (`mb-16` + `(90vh − card)/2` with the old −18px
stagger); its 1366×768 / 1440×900 / 768×1024 / 390×844 values match the clearances
recorded empirically in the earlier verification run (247.97 / 307.3 / 363.2 / 244.9).

**No heading overlap.** Measured minimum clearance while both are on screen — against
the heading block bottom and against the note text's own line box: 192.52/193.52
(1366×768), 266.72/267.72 (1440×900), 324.78/325.78 (768×1024), 196.63/197.63
(390×844), 76.39/77.39 (360×640), 61.60/62.60 (320×640), 16.00/17.00 (1366×520).
All positive, so the first card always sits beneath the heading.

> This measurement is also what caught a real bug in the first iteration: with five
> cards the stagger for card 1 grew from −18px to −36px, which at 320×640 put the
> card's top 14.4px *inside* the heading. The media-gated panel above is the fix
> (320×640 now keeps the 90vh first panel and clears the heading by 61.6px).

## 4. Animation preserved

Nothing in the animation depended on there being three cards except
`--stack-offset`, which is computed from `testimonials.length` (now ±36) — every
other value is CSS/`vh`-driven and needed no edit. Verified per viewport:

* Five distinct pin positions, one deliberate scroll each (e.g. 1366×768:
  8034 → 8654 → 9334 → 10034 → 10714 px).
* The topmost card on the viewport centre line advances `0→1→2→3→4` monotonically
  as you scroll down, and `4→3→2→1→0` monotonically as you scroll back up.
* Reversibility: at every one of ~250 identical scroll positions per viewport, all
  five card tops are bit-identical between the down and up sweeps (max diff
  **0.00px**) and the hit-tested card is identical (0 mismatches) — no threshold
  flicker, no stuck states.
* Settle window where all five cards are fully stacked: 300px (1366×768), 340px
  (1440×900), 400px (768×1024), 320px (390×844), 240px (360/320×640) — the deck then
  releases, the cards return to normal flow and the page continues scrolling.
* Per-card visible strips in the settled pile: 18 / 32.6 / 18 / 18px (desktop and
  768/1024), 26 / 24.4 / 26.3 / 18 (390×844), 40.6 / 10 / 26 / 10 (360×640),
  32.6 / 9.8 / 26.3 / 18 (320×640) — minimum 9.8px, so no card disappears under the
  one in front of it.
* Whole pile fits inside the viewport at every size (pile tops 204–332px, bottoms
  549–677px) — no clipping, no early exit.

## 5. Responsive & performance

* Horizontal overflow: **0px** at every sampled scroll position at every viewport
  (document `scrollWidth − clientWidth`), and the live app reports 0 at 800×582.
* Mobile/tablet layout intact (single 576px-max card, 24px gutters at 320px → card
  266px wide, all five cards' text fully readable, no truncated content).
* ≤560px-tall viewports and `prefers-reduced-motion` still take the static centred
  column (verified live at 1366×520: no pinning, 16px heading gap, no overlap, no
  overflow, 5 cards).
* Normal page scrolling preserved: each instance scrolls to the document end with the
  footer fully visible; `scroll-snap-type: none`, `scroll-behavior: smooth`
  (unchanged).
* No new dependency; `npx tsc --noEmit` exits **0**; browser console shows **0 errors
  and 0 warnings** on the live page and in all seven instrumented instances.

## 6. How this was verified, and what was not

**Method.** Real Chromium via a temporary same-origin harness (deleted afterwards)
hosting the live app in seven fixed-size iframes — 1366×768, 1440×900, 768×1024,
390×844, 360×640, 320×640 and 1366×520 — plus the live app tab at 800×582. Scroll
state was driven with instant `scrollTo` in 20px steps across each deck (≈250 samples
per viewport, both directions), reading live geometry, computed styles and
`elementFromPoint` hit tests.

**Not verified — stated honestly.**

* **No pixel-level visual confirmation.** The desktop window is occluded, so
  `document.hidden === true` and `browser.screenshot` refuses ("Screenshot needs a
  visible tab"). Colours, themes, stacking, overlaps and gaps were therefore confirmed
  through computed styles, geometry and hit testing — not by looking at pixels, and
  no screenshot comparison exists.
* **`prefers-reduced-motion` could not be emulated** (no media-emulation tool is
  available in this environment). The identical CSS branch was verified through its
  shared `(max-height: 560px)` selector at 1366×520, and by inspection of the live
  stylesheet.

**Known limitation (pre-existing, not a regression).** At 360×640 and 320×640 the
site's fixed navbar (97px tall, `z-50`) covers the uppermost ~30px of the settled
pile, i.e. the peek strip of the earliest card; its inner content starts just below
the navbar's bottom edge, so no card text is hidden. Keeping the pile centred on a
short viewport cannot clear a 97px navbar when the card alone is 407–437px tall — the
previous three-card pile overlapped the same navbar by ~13px.
