# Testimonials: Card Redesign

Date: 2026-10-25

Follows `testimonials-burger-video.md` and `testimonials-fullwidth-video.md`. This revision updates the testimonial card styling only. The section heading, burger background footage, full-width video band, and two-sided independent navigation are untouched.

## Objectives & Card Redesign

The cards were updated from the dark glass panes to an elegant, warm ivory/cream gradient surface adapted to Pearl Oasis's visual identity:

1. **Shape and Radius:**
   - 18 to 22px corner radius (`border-radius: 1.25rem` / 20px on desktop and tablet, `1.125rem` / 18px on mobile).
   - Compact and proportional to quote lengths without excessive empty space.

2. **Surface & Separation:**
   - Soft, warm light gradient background: `linear-gradient(155deg, rgba(255, 253, 249, 0.96) 0%, rgba(248, 242, 231, 0.93) 52%, rgba(240, 231, 218, 0.95) 100%)`.
   - Subtle blur (`backdrop-filter: blur(14px)`) and a fine gold border (`border: 1px solid rgba(212, 175, 55, 0.38)`).
   - Premium depth shadow: `0 22px 50px -18px rgba(0, 0, 0, 0.55), 0 4px 14px -3px rgba(0, 0, 0, 0.2)` with a delicate white top inner hairline.

3. **Typography & High Contrast:**
   - High-contrast espresso/charcoal text for quotes (`#241e17`, contrast > 12:1 against light card surface).
   - Dark headings for publication names (`#1a1714`) with uppercase cinzel tracking.
   - Warm bronze descriptor text (`#5e513e`, contrast > 5.5:1).
   - Removed legacy dark-card text-shadow to ensure crisp, clean typography.

4. **Accents & Avatars:**
   - Five warm gold filled stars (`#c4931a`) displayed prominently on each card.
   - Circular initials avatar badge (`GR` for Guest Review) rendered in warm gold tones (`#5c4613` on `#eddcc5` to `#dfc9ad` gradient).
   - Subdued quote mark and sequence counter (`01 / 05`).

5. **Motion & Interaction:**
   - Preserved inward tilt perspective (`2.5deg` left, `-2.5deg` right) at 768px and up.
   - Smooth hover elevation (`translateY(-3px)`, enhanced gold border, lifted shadow).
   - Accessible keyboard focus ring (`outline: 2px solid #d4af37; outline-offset: 4px`).
   - Motion transitions disabled under `prefers-reduced-motion`.

## Preservation of Layout and Burger Visibility

- **Two-Sided Navigation:** Left sequence contains cards 1 to 3; right sequence contains cards 4 to 5. Both arrows operate independently and wrap within their sequence.
- **Burger Visibility:** The cards occupy the left and right columns. The central gap remains wide open (361.9px at 1440, 331.4px at 1024, 251.1px at 768), keeping the commercial burger footage unobstructed.
- **Content Integrity:** All five placeholder cards and disclaimer notices are preserved without modifications.

## Measurements

| Viewport | Left Card Size | Right Card Size | Center Gap (Burger Area) | Border Radius | Horizontal Scroll |
| --- | --- | --- | --- | --- | --- |
| 1440x900 | 288px x 311px | 288px x 286px | 361.9px | 20px | None |
| 1024x768 | 240px x 326px | 240px x 301px | 331.4px | 20px | None |
| 768x1024 | 208px x 311px | 208px x 311px | 251.1px | 20px | None |
| 390x844 | 342px x 226px | 342px x 226px | Stacked in-flow | 18px | None |
| 320x640 | 298px x 250px | 298px x 226px | Stacked in-flow | 18px | None |

## Verification

- `npm run lint` passes (`tsc --noEmit`).
- `npm run build` passes cleanly.
- Left arrow rotates cards: 1 -> 2 -> 3 -> 1. Right card remains unchanged during left navigation.
- Right arrow rotates cards: 4 -> 5 -> 4. Left card remains unchanged during right navigation.
- Star ratings (5 gold stars) and initials avatars (`GR`) render on both cards.
- Dark text on light card surface meets WCAG AA contrast standards throughout.
- No horizontal scrollbars or overflow at any tested viewport.

## Files

- `src/components/sections/Testimonials.jsx` (TestimonialCard component with stars, initials avatar, typography)
- `src/index.css` (testimonial-card gradient, 20px radius, shadow, hover/focus, and mobile rules)
- `changes/testimonials-card-redesign.md`
