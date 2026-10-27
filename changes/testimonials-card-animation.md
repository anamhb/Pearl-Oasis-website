# Testimonial Card Animation — Arc Motion with AnimatePresence

## Summary

Added smooth, arc-inspired animated transitions to the Pearl Oasis testimonial cards using `motion/react`'s `AnimatePresence` and `motion` components. Each card now enters and exits with a combined translate + rotate + fade + scale arc motion. Left and right columns animate independently. Keyboard navigation added.

---

## Files Changed

| File | Change type |
|------|-------------|
| `src/components/sections/Testimonials.jsx` | Motion variants, direction state, AnimatePresence wrappers, keyboard handlers |
| `src/index.css` | CSS grid stacking for AnimatePresence overlap, removed old keyframe animations |

---

## Implementation Details

### Library

`motion/react` (`"motion": "^12.23.24"`) — already in `package.json`. No new dependency added.

Imports used:
```js
import { AnimatePresence, motion } from 'motion/react'
```

---

### Arc Motion Variants

A `createArcVariants(side)` factory produces per-side enter/center/exit variants.

| State | Left card | Right card |
|-------|-----------|------------|
| `enter` | `x: -42, y: 16, rotate: -6.5, scale: 0.94, opacity: 0` | `x: 42, y: -16, rotate: 6.5, scale: 0.94, opacity: 0` |
| `center` | `x: 0, y: 0, rotate: 0, scale: 1, opacity: 1` | same |
| `exit` | `x: -46, y: -18, rotate: 6.5, scale: 0.93, opacity: 0` | `x: 46, y: 18, rotate: -6.5, scale: 0.93, opacity: 0` |

Enter easing: `[0.22, 1, 0.36, 1]` (spring-like cubic) over `0.54s`.
Exit easing: `[0.4, 0, 0.6, 1]` over `0.48s`.

`reducedVariants` — opacity-only fade (`0.28s` enter, `0.22s` exit) for `prefers-reduced-motion: reduce`.

---

### Direction State

```js
const [leftDirection, setLeftDirection]   = useState(1)  // +1 forward, -1 backward
const [rightDirection, setRightDirection] = useState(1)
```

Direction is set before updating the index in each navigation handler so the custom prop is current when `AnimatePresence` resolves the variant.

---

### AnimatePresence Wrappers

Each column's `TestimonialCard` is wrapped with:

```jsx
<AnimatePresence initial={false} custom={leftDirection}>
  <motion.div
    key={item.id}
    custom={leftDirection}
    variants={leftVariants}
    initial="enter"
    animate="center"
    exit="exit"
    style={{ willChange: 'transform, opacity' }}
  >
    <TestimonialCard ... />
  </motion.div>
</AnimatePresence>
```

`initial={false}` skips the enter animation on first mount (motion only where purposeful).
`key={item.id}` (not index) causes React to treat each card as a distinct element, triggering enter/exit on change.

---

### Keyboard Navigation

`handleLeftKeyDown` / `handleRightKeyDown` handle `ArrowLeft` / `ArrowRight` on the `.testimonial-column` divs.

---

### CSS Stacking Grid

`AnimatePresence` renders both outgoing and incoming cards simultaneously during a transition. To prevent layout shift both cards must overlap.

```css
.testimonial-column {
  display: grid;
  grid-template-columns: 1fr;
}
.testimonial-column > * {
  grid-column: 1;
  grid-row: 1;
}
```

Old CSS keyframe animations (`testimonial-card-in-left`, `testimonial-card-in-right`) and their `animation:` rule on `.testimonial-card__body` were removed.

---

## Verification Results

Automated check with Puppeteer across 5 viewports (1440, 1024, 768, 390, 320):

| Check | Result |
|-------|--------|
| No horizontal scroll (all viewports) | Pass |
| Left card present | Pass |
| Right card present | Pass |
| Left nav arrow present | Pass |
| Right nav arrow present | Pass |
| `motion.div` wrapper rendered | Pass |
| Left column `overflow: visible` | Pass |
| Console errors at runtime | 0 |

Navigation cycling:
- Left: 1 of 3 -> 2 of 3 -> 3 of 3 -> 1 of 3 (wraps correctly)
- Right: 1 of 2 -> 2 of 2 -> 1 of 2 (wraps correctly)

---

## Preserved

- "Words of Appreciation" heading, subtitle, section spacing
- Burger video URL, playback settings, focal point
- Left/right card layout and center gap (burger visible)
- All five testimonial entries and placeholder disclosures
- Card appearance, colours, glassmorphism, dimensions
- Navigation arrows and their positions
- Section structure and `#experience` anchor
