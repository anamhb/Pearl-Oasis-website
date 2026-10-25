# Anti-Slop audit 001 fix pass

- Date: 2026-10-23
- Source: `anti-slop/audit-001-2026-10-22.md`
- Report: [`anti-slop/audit-001-fixes.md`](../anti-slop/audit-001-fixes.md)
- Status: implemented and checked. Not committed or pushed.

## Scope

Implemented only the approved findings 2, 4, 5, 7, 8, 9, 11, 13, 14, 15, 16, and 17.

Findings 1, 3, 6, 10, and 12 remain open. Audit-002, #18, #19+, finding 22, and all other unapproved items were not touched. No menu item, price, testimonial, halal claim, source, business detail, or booking behaviour was added.

## Files

| File | Change |
| --- | --- |
| `src/components/3d/EntranceExperience.jsx` | Local eyebrow scrim; 44px hero CTA and cue; inert and `aria-hidden` toggling for the entrance, dining, and cue phases; reduced-motion-aware Enter Restaurant scroll; cue label. |
| `src/components/ui/Navigation.jsx` | 44px View Menu button; Escape closes the mobile panel and returns focus; `aria-controls` and panel `id`. |
| `src/components/sections/Footer.jsx` | 44px footer links; reduced-motion-aware Return to Top; three `h4` headings changed to `h3` with classes unchanged. |
| `src/components/sections/MenuExperience.jsx` | Plain section label without Sparkles or capsule; card blur and hover borders removed; thumbnail hover scale removed; 4px menu and modal buttons; 12px modal panel; "See Menu Sections" and "Call to Reserve". |
| `src/components/sections/SignatureDishes.jsx` | One-shot dish entrance that settles and cancels the rAF; hover/tap replay; dish cursor and scale removed; 12px stage. |
| `src/components/sections/Testimonials.jsx` | Card radius changed from 8px to 12px. |
| `src/index.css` | Reduced-motion `scroll-behavior: auto`. |

## Checks

- `npm run lint` passed.
- `npm run build` passed: 1685 modules, 6.86s, only the pre-existing >500 kB chunk warning.
- Headless Chrome 156 at 320, 390, 768, and 1440: no horizontal overflow; tap targets at least 44px; mobile menu Escape and focus return work; hero inert states switch correctly; modal Escape works and the overlay keeps its blur while the cards report none; the old CTA strings are gone; radii are 4px on buttons and 12px on cards and panels; the dish entrance settles and replays on hover and tap; reduced motion jumps immediately and freezes the dishes; Hero frames map to 001, 019, 037, 054, and 070 at 0, 0.25, 0.5, 0.75, and 1.0.
- Eyebrow contrast at full copy opacity is 6.43:1 or better across the scroll positions checked. The final fade frame samples 4.72:1 against a full-opacity label.
- No page exceptions or console errors. The only failed requests were a pre-existing `/favicon.ico` 404 and an aborted below-the-fold Cloudinary video fetch.

## Limits

- Headless Chrome only. No physical devices, screen readers, Firefox, or Safari.
- Reduced motion was emulated through CDP.
- The dish entrance starts on mount, so it can finish before the section is reached. Hover or tap replays it. Keyboard replay was not added because the stage has no focusable control.
- The slow decorative hub ring remains in normal motion and stops under reduced motion.
- The eyebrow scrim fades with the entrance copy. The measured 4.72:1 at 31% scroll assumes a full-opacity label; the label is already fading there.

## Git

The pre-existing Hero sequence and image work is in `5d276c0` and is untouched. This pass leaves seven modified source files and the two new documentation files uncommitted. No commit, push, reset, or stash was made.
