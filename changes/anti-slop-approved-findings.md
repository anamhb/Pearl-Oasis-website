# Anti-Slop approved findings (2, 3, 4, 5, 6, 7, 10, 13, 15, 22)

Targeted pass only. No redesign, no new dependencies, no `DESIGN.md`, no commit,
and no changes outside the approved findings.

## Files changed

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | Replaced the five fabricated press quotes with neutral, self-labelled placeholders. Eyebrow now reads “Guest Feedback · Review Placeholders”; note states the cards are not real reviews or press endorsements. Theme A meta text moved from `neutral-500` to `neutral-400`. Stack structure, card dimensions, video and scroll CSS untouched. |
| `src/components/sections/Footer.jsx` | Social icons are now non-interactive `<span>`s inside a labelled group, with a visible “Coming soon” label; the dead `#social` links are gone. Legal line and three opening-hours values moved to `#a39a8c`. Explore, phone and “Return to Top Entrance” targets are now at least 44px tall. |
| `src/components/sections/MenuExperience.jsx` | Full-menu modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus moved to the close button, Tab/Shift+Tab trapped, Escape closes, focus restored to the opener. Backdrop, X, footer Close and phone CTA all use one close path. Hidden “Explore Full Menu” buttons are `tabIndex={-1}` + `aria-hidden` until revealed. Mobile CTA and modal footer buttons are ≥44px. Reduced motion now renders the seven dishes at fixed stations instead of orbiting. |
| `src/components/ui/Navigation.jsx` | “Order Now” → “View Menu”; shopping-bag icon removed. Mobile menu links are full-height 44px targets; mobile toggle is 44×44; mobile CTA is ≥44px. |
| `src/components/brand/BrandWordmark.jsx` | Crest loop does not start under `prefers-reduced-motion`; it stops/starts if the preference changes while mounted. A single static render remains. |
| `src/index.css` | Under `prefers-reduced-motion`, continuous decorative CSS animations (bounce, spin-slow, spin-reverse-slow, spin-ring-accent, rotate-3d) are set to `none`. Scroll-driven sequences keep their own handling. |
| `index.html` | Description and `og:description` no longer promise tasting menus or reservations; they describe the real Kohat restaurant and its menu. Title/`og:title` deliberately untouched (finding 1 was not approved). |

## Contrast measurements

Measured with the WCAG relative-luminance formula (`node`, since Python is not installed).

| Element | Surface | Before | After | Result |
| --- | --- | --- | --- | --- |
| Footer legal line, 11px | `#070708` | `#787164` — 4.17:1 | `#a39a8c` — **7.25:1** | PASS |
| Footer hours, 12px | `#070708` | `#737373` — 4.25:1 | `#a39a8c` — **7.25:1** | PASS |
| Testimonial meta, 12px | `#121316` | `#737373` — 3.92:1 | `#a3a3a3` — **7.36:1** | PASS |

Lighthouse mobile (412×823) `color-contrast`: **1.00**.

## Verification

Commands: `npm run build` ✓ (1685 modules, 6.8s) · `npm run lint` (`tsc --noEmit`) ✓.

Browser runs used headless Chromium 151 over CDP at exact device metrics
(320, 375, 390, 430, 768, 1440 wide), with reduced motion emulated where noted:

| Check | Evidence |
| --- | --- |
| Horizontal overflow | `scrollWidth == innerWidth` at all six widths; no section crossed the viewport edge. |
| Runtime errors | No page exceptions and no console errors/warnings in any run. |
| Hidden CTA | 1440 normal: before reveal `tabIndex -1`, `aria-hidden="true"`, opacity 0; after scrolling through the deck `0` / `"false"` / opacity 1; after scrolling back `-1` / `"true"` / opacity 0. |
| Modal | 375 reduced: opens from the CTA, focus lands on “Close full menu”; real Tab order is X → Close → phone → X; Shift+Tab reverses; Escape, backdrop, X and footer Close all close and return focus to “Explore Full Menu”. X is 44×44; footer Close 44px; phone CTA 48px. |
| Reduced motion | `matchMedia(...).matches === true`; bounce and ring `animation-name: none`; ring loses `animate-spin-slow`; all 7 dishes have opacity 1 and fixed station transforms. Switching the preference live at 1440 produced the same static state. |
| Crest | Pixel capture of the header crest canvas was byte-identical across 1.2s under reduced motion, and different across 1.2s with normal motion. |
| Testimonial deck | 1440 normal: all five cards measure 324px (the previous deck height); as the section scrolls they pin at 270 / 279 / 288 / 307px with z-index 1–5; five placeholder cards present; none of Michelin, Financial Times, Architectural Digest, DAWN or The Express Tribune appears in the page text. |
| Tap targets | 375 reduced: nav links 45px, mobile CTA 44px, toggle 44×44, footer links 44px, footer top button 44px. |
| SEO | Title unchanged; description and `og:description` returned by the browser match the new text. |

Lighthouse (mobile): accessibility **0.98**, best practices **1.00**, SEO **0.83**;
`color-contrast` and `target-size` both **1.00**. The three remaining failures are
pre-existing and outside the approved list: `heading-order` (footer `h4`),
`label-content-name-mismatch` (hero “Unfold the Story” cue), and `robots.txt`
(the dev server returns the SPA HTML for `/robots.txt`).

## Not tested

- Headed browser and real OS-level reduced-motion. The GUI browser tab was not
  visible to the tool, so the interaction checks ran in headless Chromium with
  CDP media emulation. Keyboard input (real Tab / Shift+Tab / Escape) was
  delivered through CDP and worked.
- Firefox, Safari, and mobile hardware.
- WebGL crest appearance on a GPU (headless uses SwiftShader); rotation state
  was still proven by the pixel comparison.

## Remaining issues (not approved, not changed)

- Footer credit still says “Culinary and address details are editable
  placeholders” although the owner has verified those details.
- The modal phone link still reads “Reserve Table & Order”. It is a `tel:` call,
  not a booking flow, but the wording may imply one.
- Em dashes remain in the page title and `og:title`; en dashes remain in the
  hours (finding 1 was not approved).
- Desktop nav links and the desktop CTA are below 44px, but they are pointer
  targets, not mobile ones.
- `robots.txt` should be supplied by the production host rather than the SPA
  fallback.
