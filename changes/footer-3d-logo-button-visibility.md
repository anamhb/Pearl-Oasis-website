# Footer 3D logo + gold CTA visibility

Two fixes, both verified in headless Chrome at 320, 390, 430, 768, 1024 and
1440 px wide:

1. The footer now turns the same 3D crest as the navbar, and stops its render
   loop when the footer is off screen.
2. The Hero "Enter Restaurant" and Menu "See Menu Sections" buttons keep a
   visible fill and label even when the Tailwind v4 gradient cannot render.
   The same one-token fill fallback was applied to the two other live gold
   CTAs that share the identical pattern.

Nothing was committed or pushed.

---

## Files changed

| File | Change |
| --- | --- |
| `src/components/brand/BrandWordmark.jsx` | `Crest3D` gained an opt-in `pauseWhenOffscreen` prop and a single `syncAnimation()` gate; `BrandWordmark` forwards the prop. Navbar defaults are unchanged. |
| `src/components/sections/Footer.jsx` | Footer crest changed from `animate={false}` to `animate pauseWhenOffscreen`; comment updated. |
| `src/components/3d/EntranceExperience.jsx` | Hero button only: added `gold-cta` and `bg-[#d4af37]`. |
| `src/components/sections/MenuExperience.jsx` | "See Menu Sections" button: added `gold-cta` and `bg-[#d4af37]`. "Call to Reserve" modal CTA: added `bg-[#d4af37]`. |
| `src/components/ui/Navigation.jsx` | Desktop "View Menu" CTA: added `bg-[#d4af37]`. |
| `src/index.css` | Added `.gold-cta:focus-visible` (2px `#ffd875`, 3px offset). |
| `changes/footer-3d-logo-button-visibility.md` | This report. |

`ReservationSection.jsx` was edited and then reverted: it is not imported by
the app (dead code, confirmed by search), so a change there could not be
verified.

The other modified files in the working tree (`SignatureDishes.jsx`,
`Testimonials.jsx`, the hero video logic in `EntranceExperience.jsx`, the menu
card logic in `MenuExperience.jsx`, `changes/testimonials-fullwidth-video.md`,
and the footer mobile spacing from the previous task) are pre-existing work and
were left alone.

Evidence lives in `changes/evidence/`:

- `logo-verification.json`, `logo-draws.json`, `logo-320-inview.json`
- `logo-footer-{320,390,430,768,1024,1440}-a.png`
- `btn-probe.json` (pre-fix computed styles)
- `btn-{hero,menu}-{normal,broken-sim,fallback,focus}.png`
- `btn-hero-tab-focus.png`
- `button-verification.json`, `button-interactions.json`,
  `button-keyboard-obstruction.json`, `button-final-checks.json`,
  `button-hover.json`, `button-tab-focus.json`

---

## Part 1 — footer 3D logo

### How the navbar crest was reused

The footer already imported the shared `BrandWordmark`; it was passing
`animate={false}`. That means the footer crest was already the same
`PO-logo.glb`, rendered by the same `Crest3D` with the same gold material, the
same key/fill lighting, the same camera fit, and the same `CREST_STYLE`
position above the "l". The only difference was that the loop never started,
so the crest sat still.

The change is:

```jsx
// Footer.jsx
<BrandWordmark animate pauseWhenOffscreen />
```

No second model, no second copy of the renderer, no new dependency. The
rotation is literally the navbar loop: same `ROTATION_SPEED`, same
`currentAngle` accumulation, same direction, same 30 fps / 1.5× DPR cap on
narrow viewports.

### Cleanup and reduced motion

`Crest3D` now has one function that decides whether the loop should run:

```js
const syncAnimation = () => {
  if (animate && !prefersReducedMotion && isVisible && model) {
    lastTime = performance.now();
    startLoop();
  } else {
    stopLoop();
    if (model) renderer.render(scene, camera);
  }
};
```

- `pauseWhenOffscreen` defaults to `false`, so the navbar takes exactly the
  old path (`isVisible` starts `true`, no observer is created).
- The footer creates an `IntersectionObserver` with `rootMargin: '80px'`; it
  starts the loop just before the crest enters the viewport and stops it once
  the crest leaves.
- The observer is disconnected in the effect cleanup, alongside the existing
  `ResizeObserver`, motion listener and WebGL disposal.
- `prefers-reduced-motion: reduce` still stops the loop and draws one static
  frame. The footer crest is still visible in that mode.
- If `IntersectionObserver` is unavailable, the footer falls back to
  animating rather than freezing.

### Layout and visual results

The crest is absolutely positioned inside the wordmark, so it adds no footer
height. Measured footer heights are unchanged from the previous footer work:

| Width | Footer height | Crest size | Crest above wordmark | Overlaps description | Horizontal overflow |
| --- | --- | --- | --- | --- | --- |
| 320 | 871 px | 16.6 × 30.2 px | 11.9 px | no | no |
| 390 | 851.5 px | 16.6 × 30.2 px | 11.9 px | no | no |
| 430 | 851.5 px | 16.6 × 30.2 px | 11.9 px | no | no |
| 768 | 664.5 px | 20.8 × 37.8 px | 14.9 px | no | no |
| 1024 | 503 px | 20.8 × 37.8 px | 14.9 px | no | no |
| 1440 | 456.5 px | 20.8 × 37.8 px | 14.9 px | no | no |

Footer top padding is 36 px below 640 px and 56 px at 640 px and up, so the
crest's 11.9/14.9 px overhang clears the footer's top border. The crest
renders correctly at all six widths (not blank, clipped or distorted).

### Rotation and pause evidence

Screenshots of a WebGL canvas without `preserveDrawingBuffer` are not reliable
frame-to-frame (the hashes stayed identical even while the loop was running),
so I counted per-canvas `drawElements` / `drawArrays` calls instead.

| Scenario | Footer draws | Navbar draws |
| --- | --- | --- |
| 1440, footer in view (1.3 s) | 50 | 50 |
| 1440, footer off screen (1.3 s) | 0 | 74 |
| 1440, footer back in view (1.3 s) | 67 | 67 |
| 320, crest scrolled into view (1.3 s) | 29 | 29 |
| 390, crest in view (1.3 s) | 76 | 76 |
| 430, crest in view (1.3 s) | 129 | 129 |
| 768, crest in view (1.3 s) | 65 | 65 |
| 1024, crest in view (1.3 s) | 52 | 52 |
| 1440, crest in view (1.3 s) | 59 | 59 |
| Reduced motion, crest in view (1.3 s) | 0 | 0 |

The footer runs at the same cadence as the navbar whenever the crest is
visible, stops completely when it is not, and resumes from the same angle
(the loop resets `lastTime` on start, so there is no jump). Under reduced
motion both loops stop and the crest stays drawn.

At 320 × 700 the footer is 871 px tall, so scrolling to the footer's end puts
the crest above the fold; the zero draws there are the pause working
correctly. Scrolling the logo itself into view gives 29 draws in 1.3 s, the
same as the navbar.

### Navbar unchanged

`Navigation.jsx` still renders `<BrandWordmark />`. `pauseWhenOffscreen` is
`false` by default, so the navbar gets the same loop, the same size and
position, and the same reduced-motion behaviour as before. Its draw counts in
the table above match the footer's, which is the expected result of the shared
component.

---

## Part 2 — button visibility

### Root cause, investigated separately

Both buttons had the same underlying failure, but I checked each one
independently rather than assuming.

**Hero "Enter Restaurant"** — `<button class="hero-cta ... bg-gradient-to-r ...
text-[#0e0f12]">`. Before the fix its computed styles were:

- `background-color: rgba(0, 0, 0, 0)`
- `background-image: linear-gradient(to right in oklab, ...)`
- `color` / `-webkit-text-fill-color`: `rgb(14, 15, 18)`
- no border; `box-shadow` present

**Menu "See Menu Sections"** — `<button ... bg-gradient-to-r ...
text-[#0a0a0b]">`. Before the fix:

- `background-color: rgba(0, 0, 0, 0)`
- `background-image: linear-gradient(to right in oklab, ...)`
- `color` / `-webkit-text-fill-color`: `rgb(10, 10, 11)`
- no border; `box-shadow` present

So neither button had a label-fill problem: the label was a normal opaque
near-black. The fill was the only thing that could disappear, and it was
supplied entirely by `background-image`.

Tailwind v4 compiles `bg-gradient-to-r` to:

```css
.bg-gradient-to-r {
  --tw-gradient-position: to right in oklab;
  background-image: linear-gradient(var(--tw-gradient-stops));
}
```

`--tw-gradient-stops` is built from `var(--tw-gradient-from-position)` and
friends, which rely on registered `@property` initial values:

```css
@property --tw-gradient-from-position { syntax: "<length-percentage>"; inherits: false; initial-value: 0%; }
@property --tw-gradient-via-position  { syntax: "<length-percentage>"; inherits: false; initial-value: 50%; }
@property --tw-gradient-to-position   { syntax: "<length-percentage>"; inherits: false; initial-value: 100%; }
```

On a browser below Tailwind v4's baseline (the documented target is Safari
16.4+, Chrome 111+, Firefox 128+):

- without `@property`, the position variables are undefined; the `var()` chain
  becomes invalid at computed-value time and `background-image` computes to
  `none`;
- `in oklab` gradient interpolation is also part of that baseline.

With a transparent `background-color`, a dropped gradient leaves no fill at
all. The dark label then sits on the dark page, and the `box-shadow` still
paints — which is exactly "only the border/shadow is visible".

This is not a `<button>` vs `<a>` or Preflight problem: the desktop navbar CTA
uses the same gradient and is equally affected on the same browsers. On a
phone the navbar CTA is `hidden sm:inline-flex`, and the mobile drawer's
"View Menu" is a solid gold button, so the two reported buttons were the only
gradient CTAs a phone user would see. That explains why only these two were
noticed.

**Reproduction.** Forcing `background-image: none` on the current buttons
reproduces the reported state exactly: the menu button shows only its shadow
and no label; the hero label is barely readable on the video. Forcing
`background-image: none` plus `background-color: transparent` reproduces the
original state.

### Fix

For both reported buttons:

- added `bg-[#d4af37]` alongside the existing `bg-gradient-to-r`. This sets
  `background-color`, a different property from `background-image`, so it
  survives a failed gradient. The gradient still paints on top where it is
  supported, so the modern appearance is unchanged.
- added `gold-cta` and a `.gold-cta:focus-visible` rule in `index.css`:

```css
.gold-cta:focus-visible {
  outline: 2px solid #ffd875;
  outline-offset: 3px;
}
```

This matches the gold outline already used by the carousel controls.

Because the root cause is the shared Tailwind v4 gradient pattern, the same
single-token `bg-[#d4af37]` fallback was added to the two other live gold
CTAs:

- the desktop navbar "View Menu" link;
- the full-menu modal "Call to Reserve" link.

No other button or section was changed.

Contrast of the label against the solid fallback:

| Button | Label | Fill | Contrast |
| --- | --- | --- | --- |
| Hero | `#0e0f12` | `#d4af37` | 9.11:1 |
| Menu | `#0a0a0b` | `#d4af37` | 9.41:1 |
| Navbar | `#12110d` | `#d4af37` | 8.98:1 |

All are above WCAG AAA for normal text.

### What was preserved

Gradient stops, label colours, Cinzel typography, padding, radius, `min-h-11`,
shadows, hover/active transitions, click handlers and destinations are
unchanged.

- Hero size: 198 × 44 px below 768 px; 287 × 52 px at 768 px and up.
- Menu size: 276 × 44 px at every width.
- Hero hover: 287 → 301.27 px (1.05×) with
  `rgba(212, 175, 55, 0.65) 0 6px 32px`.
- Menu hover: `rgba(212, 175, 55, 0.45) 0 6px 28px`.
- No layout shift: the solid colour is painted by the same box, and the
  gradient still covers it.

### Verification

| Check | 320 | 390 | 430 | 768 | 1024 | 1440 |
| --- | --- | --- | --- | --- | --- | --- |
| Hero in viewport, not covered | yes | yes | yes | yes | yes | yes |
| Menu in viewport, not covered | yes | yes | yes | yes | yes | yes |
| Label not clipped | yes | yes | yes | yes | yes | yes |
| Solid gold base + gradient present | yes | yes | yes | yes | yes | yes |
| No horizontal overflow | yes | yes | yes | yes | yes | yes |

At 320 px the menu button sits below the fold when the section is centred; it
is not clipped and is not covered once scrolled to. The hit test at 320
returns the button's own `<span>` (`covered: false`).

State checks:

- **Normal:** every live gold CTA computes
  `background-color: rgb(212, 175, 55)` plus its gradient.
- **Gradient dropped** (`background-image: none`): both reported buttons show
  a solid gold fill with a readable dark label.
  `btn-hero-fallback.png`, `btn-menu-fallback.png`.
- **Original failure simulated** (`background-image: none` +
  `background-color: transparent`): menu shows only the shadow; hero label
  nearly disappears. `btn-hero-broken-sim.png`, `btn-menu-broken-sim.png`.
- **Focus:** real Tab focus settles on
  `2px solid rgb(255, 216, 117)` at `3px` offset (the 300 ms `transition-all`
  makes an early reading look like the default ring).
  `btn-hero-tab-focus.png`, `btn-menu-focus.png`.
- **Hover:** hero scales and both shadows are the gold values above.
- **Desktop click:** hero → `scrollY 2857`, story top 103 = header height 103
  (lands just below the fixed header); menu → modal opens, then closes.
- **Touch at 390:** hero tap → `scrollY 2689`, story top 87 = header 87; menu
  tap → modal opens.
- **Keyboard:** Enter activates both (hero scrolls, menu opens the modal);
  Space activates the hero.
- **Reduced motion:** footer and navbar crest loops both stop; the crest stays
  drawn and no layout changes.

---

## Lint and build

- `npm run lint` (`tsc --noEmit`): clean.
- `npm run build` (`vite build`): succeeds. The only warning is the
  pre-existing "chunks larger than 500 kB" message for the main bundle.

## Remaining limitations

- Verification is headless Chrome only. No physical phone, Safari or Firefox
  was available. The old-browser failure was reproduced by forcing
  `background-image: none`, which is what an unsupported gradient computes to;
  it was not observed on a real old browser.
- WebGL canvas screenshots without `preserveDrawingBuffer` do not reliably
  capture frame-to-frame changes, so rotation and pausing were proven with
  per-canvas draw-call counts rather than image diffs.
- At 320 × 700 the footer is 871 px tall, taller than the viewport. The logo
  is fully visible when scrolled to, but the whole footer cannot fit at once.
  This predates the logo change and is unchanged.
- The desktop navbar and modal CTAs received the fill fallback but not the new
  `gold-cta` focus class; they keep the browser's default focus ring. Only the
  two reported buttons needed the explicit ring.
