# Mobile Footer Optimization

Date: 2026-11-04
Files changed: `src/components/sections/Footer.jsx` (only), plus this report.

## Goal

Reduce footer height and clutter on phones while keeping branding, content, and the
desktop (≥ 640px) footer exactly as they were.

## Inspection (before)

The footer is one component, `src/components/sections/Footer.jsx`, styled with Tailwind
utility classes. Its own responsive tier boundary is `sm` (640px): below it the footer
used single-column stacking, `pt-9 pb-8 px-6` padding, `gap-8 mb-10` between the four
blocks, a 2×2 Explore link grid, and full-width blocks; at `sm`+ padding, gaps, and the
vertical link list stepped up to desktop values. `md` (768) makes the grid two columns,
`lg` (1024) makes it four.

Content identified: brand wordmark + 3D crest + description paragraph + social row;
Explore heading with 4 links (Our Story, Featured Dishes, Menu, Testimonials); Opening
Hours heading with 3 rows (Daily Hours, Lunch and Afternoon Service, Dinner and Evening
Service — each "Mon – Sun" + time); Sanctuary Location (address + phone); bottom bar
(copyright + Return to Top Entrance).

## Changes (all scoped below `sm:` — the footer's existing mobile tier)

1. **Paragraph removed on mobile.** The brand description `<p>` gets `hidden sm:block`,
   so phones show logo, wordmark, and social row only. `sm`+ keeps the paragraph.
2. **Explore: three links, one line on mobile.** The `<ul>` becomes
   `flex flex-nowrap items-center justify-between gap-x-3 whitespace-nowrap` below `sm`
   (replacing the 2×2 grid); the Testimonials `<li>` gets `hidden sm:block`, leaving
   Our Story · Featured Dishes · Menu on a single unwrapped line. Testimonials remains
   reachable from the top navigation (`#experience`). `sm:block sm:space-y-0.5`
   restores the original four-item vertical list at `sm`+. Existing 44px minimum tap
   targets are untouched.
3. **Opening Hours condensed.** Each row renders as label · time on one line on phones
   (`flex flex-wrap items-baseline gap-x-2` with `sm:block` restoring the stacked
   layout). The redundant "Mon – Sun:" prefix (all services are daily; the Daily Hours
   row states it) is dropped only on phones via a `sm:hidden` / `hidden sm:inline` span
   pair — the full original text is what renders at `sm`+. Heading margin
   `mb-1.5 sm:mb-4`, row gap `space-y-1 sm:space-y-2`, row padding `sm:pt-2` only.
   Where the width demands it (320px, long labels) the time wraps to its own line
   instead of clipping.
4. **Spacing reduced on mobile only.** Footer `pt-9 pb-8` → `pt-6 pb-6`; section grid
   `gap-8 mb-10` → `gap-5 mb-6`; the three heading wrappers `space-y-3` →
   `space-y-1.5 sm:space-y-3` (heading margin now collapses to 6px instead of 12px);
   bottom bar `pt-6` → `pt-4`. Horizontal `px-6` padding is unchanged for readability.
   Every change carries its original value back at `sm:`.

## Measured before / after (Chrome CDP, production build)

| Width | Footer height | Δ | Brand paragraph | Explore | Opening Hours block | Horizontal overflow |
| --- | --- | --- | --- | --- | --- | --- |
| 320 | 871 → 622.5 px | −248.5 (−28.5%) | shown → hidden | 4 links / 2 rows → 3 links / 1 row | 148 → 112 px | 0 → 0 |
| 390 | 851.5 → 594.5 px | −257 (−30.2%) | shown → hidden | 4 links / 2 rows → 3 links / 1 row | 148 → 84 px | 0 → 0 |
| 768 | 664.5 → 664.5 px | 0 | unchanged | unchanged | unchanged | 0 |
| 1440 | 456.5 → 456.5 px | 0 | unchanged | unchanged | unchanged | 0 |

Block-level diff at 768 and 1440 compared every metric captured (footer rect, all four
column rects, bottom bar rect, paragraph visibility and rect, link rects and counts,
hours-row heights, scrollWidth): **IDENTICAL** at both widths. Only the phone tier moved.

## Validation

- **Screenshots** (`C:/Users/Nomanz/AppData/Local/Temp_sewit/opencode/menu/shots/`,
  `before-*.png` vs `after-*.png` at 320/390/768/1440): reviewed — no clipped text; at
  320 the Explore row uses 190px of its 272px line (≈41px breathing space between
  links); at 320 Lunch/Dinner times wrap to their own line, at 390 all three hours rows
  are single lines; address wrap behavior unchanged.
- **No horizontal scrolling**: `scrollWidth == innerWidth` at 320/390, and no footer
  element's rect crosses the viewport edge (checked programmatically at all widths).
- **Tap targets**: every footer link/button still measures ≥ 44px tall at 320/390.
- **Anchors**: `#story`, `#signature`, `#menu`, `#experience` all resolve; the hidden
  Testimonials link is removed from the mobile accessibility tree (not merely invisible)
  and remains in the top navigation; Return to Top Entrance button unchanged.
- **Console**: clean (no errors or warnings) at 320 and 390 in the final runs.
- **Checks**: `npm run lint` (`tsc --noEmit`) passes; `npm run build` succeeds
  (only the pre-existing chunk-size warning).

## Out-of-scope observation (not changed)

Intermittently at load (3 of 6 harness runs, before scrolling), Chrome logged
`[Testimonials video] playback rejected` twice. It comes from the already-handled
`.catch` in `Testimonials.jsx` `applyPlayback()` — a race between the mount-time
visibility heuristic and the IntersectionObserver's first delivery — and is unrelated
to the footer. Verified after scrolling the section into view at 320 and 390: the video
is `readyState 4`, `paused: false` (playing), console clean. Left untouched per the
scope constraint; this report records it for a separate follow-up if wanted.

## Not committed

No commit or push was made; changes remain in the working tree.
