# Testimonials: single looping arc carousel

Section: `#experience`, "Words of Appreciation". This replaces the split side-card
layout with one centered arc stage. All five placeholder entries sit on the same
arc in their existing order. The active card is centered and upright; the cards
beside it drop, rotate outward and fade. The burger film, the heading, the
placeholder disclosure and the anchor are unchanged. No dependency or new asset
was added.

## Files changed

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | Arc geometry, one continuous position driven by `requestAnimationFrame`, wrapped looping, pointer drag and swipe, click-to-center, keyboard input, autoplay, reduced-motion handling, measurement on resize, live region. The video observer and all five entries are retained. |
| `src/index.css` | The old testimonial block is replaced by the stage, film, arc, card, control and focus rules. The film keeps its full width and height. |
| `changes/testimonials-arc-carousel.md` | This report. |
| `changes/evidence/testimonials-arc-*-top.png`, `changes/evidence/testimonials-arc-*-cards.png` | Viewport evidence at the five checked widths. Untracked. |

No other section changed. The uncommitted `changes/testimonials-fullwidth-video.md`
edit was already present before this work and was left alone.

## Layout and geometry

The heading stays in normal flow. The film is an absolute full-width band inside
the stage. The carousel begins in the lower part of that band, so the burger is
visible above the active card and the card tops overlap the bottom of the film.
The arc center sits below the stage. The component calculates card positions from
one spacing value:

```
spacing = cardWidth + gap
radius  = spacing / (2 * sin(step / 2))
x       = radius * sin(offset * step)
y       = radius * (1 - cos(offset * step))
```

Only transforms, opacity, visibility and z-index are written per card. Card sizes
come from CSS variables. The component measures the tallest rendered card and
sets `--tc-card-h` so all five cards share one height.

| Viewport | Card | Step | Arc drop | Visible cards | Horizontal overflow |
| --- | --- | --- | --- | --- | --- |
| 1440 x 900 | 260 x 350 | 11 deg | 106px | 5 (active, one, two each side) | none |
| 1024 x 768 | 252 x 340 | 11 deg | 103px | 5 | none |
| 768 x 1024 | 240 x 334 | 10.8 deg | 25px | 3 (active plus one each side) | none |
| 390 x 844 | 240 x 320 | 10.5 deg | 24px | 3 | none |
| 320 x 640 | 210 x 320 | 10.5 deg | 21px | 3 | none |

The active card center delta was `0px` at every width, before and after resizing
the same page. The second card on each side is shown only when at least 24px of
it would be visible. At 768px and below only one card each side is exposed. The
neighbor cards never cover the active card: the active card keeps the highest
z-index, full opacity, no rotation and the largest scale.

The measured heights at 390 and 320 are 320px, so the active card remains fully
rendered and readable. The page is long enough that the heading, film, cards and
controls do not all fit in one 640px or 900px viewport at once, but the card is
not clipped by the stage; the card shots in `changes/evidence/` show the full
card and the controls at each width.

### Resize check

One page was resized in place from 1440 to 390, 768, 320, 1024 and back to 1440.
Each result updated the card width, height, step, drop and visible-card count,
kept the active center at `0px`, and kept `scrollWidth` equal to the viewport:

| Width after resize | Card | Height | Step | Drop | Visible | Active center |
| --- | --- | --- | --- | --- | --- | --- |
| 390 | 240 | 320 | 10.5 deg | 24px | 3 | 0px |
| 768 | 240 | 334 | 10.8 deg | 25px | 3 | 0px |
| 320 | 210 | 320 | 10.5 deg | 21px | 3 | 0px |
| 1024 | 252 | 340 | 11 deg | 103px | 5 | 0px |
| 1440 | 260 | 350 | 11 deg | 106px | 5 | 0px |

The component caches spacing, radius, step and second-card visibility. It
remeasures on window resize, on arc width changes through `ResizeObserver`, and
once after `document.fonts.ready`.

## Motion and input

- **One position value.** Cards share a continuous position. A step moves the
  target by one card; the position eases toward it with an exponential factor and
  stops when it is within `0.001`. No frame loop runs while the carousel is at
  rest.
- **Wrapping.** Positions are folded into the five-card range for the arc, and
  movement uses unbounded targets, so forward and backward movement both loop
  without reversing halfway across the wrap point.
- **Drag and swipe.** Horizontal pointer movement changes the position by
  `dx / spacing`. On release, the release velocity is projected forward, clamped
  to at most one card from the nearest card, then the carousel eases to that
  card. A drag over 8px suppresses the following click. A tap that interrupts an
  in-flight move settles on the nearest card. Vertical movement is ignored, and
  `touch-action: pan-y` keeps page scrolling.
- **Click to center.** Cards within one position of the active card are
  clickable and center themselves. Faded second neighbors have
  `pointer-events: none`.
- **Keyboard.** The stage is focusable. `ArrowLeft` and `ArrowRight` move one
  card; focus stays on the stage.
- **Autoplay.** A 3500ms interval advances one card when the section is in view,
  the tab is visible, the pointer is not over the carousel, focus is not inside
  it, and no drag is active. A tick is skipped if the previous move has not
  settled to within `0.06`. Manual movement restarts the interval.
- **Reduced motion.** When `prefers-reduced-motion: reduce` matches, the carousel
  snaps to whole cards, transitions are off, and autoplay does not run. The
  existing video behavior also stays paused under reduced motion.
- **Cleanup.** The animation frame, measurement frame, autoplay interval, resize
  listener, media-query listener, intersection observer, visibility listener and
  drag listeners are all removed on unmount or when their input ends.

## Accessibility

- The arc is `role="group"`, `aria-roledescription="carousel"`, `tabIndex="0"`,
  and has a label that explains the arrow keys and dragging.
- The active card has `aria-current="true"`. Inactive cards are `aria-hidden`.
  Cards more than one position away are not focusable or clickable.
- Previous and next are native buttons with `aria-label` and 44 x 44px targets.
  They have hover, active, and gold `:focus-visible` rings.
- The stage has a 2px gold focus ring when keyboard-focused.
- A polite live region announces the active position and the placeholder
  context.
- Contrast, computed from the rendered colors, passes WCAG AA:

| Text | Background | Ratio |
| --- | --- | ---: |
| Card quote, top of gradient | `#faf6ee` | 15.30:1 |
| Card quote, bottom of gradient | `#f0e7da` | 13.47:1 |
| Card meta | `#faf6ee` | 7.16:1 |
| Card publication | `#faf6ee` | 16.56:1 |
| Card index, top | `#faf6ee` | 5.17:1 |
| Card index, bottom | `#f0e7da` | 4.55:1 |
| Avatar initials | `#eddcc5` to `#dfc9ad` | 6.68:1 to 5.60:1 |
| Arrow icon on dark | `#0a0b0d` | 12.10:1 |
| Arrow icon, worst case over white | `#4f5051` | 4.97:1 |
| Progress current | `#0a0b0d` | 15.45:1 |

## Preserved content and video

The five quotes, their order, `Guest Review Placeholder`, `Sample Feedback`,
`Not a real review` and the disclosure ("Note: The cards below are placeholders,
not real guest reviews or press endorsements.") are unchanged. No names, roles,
ratings, reviews or photos were invented. The avatar initials are derived from
the placeholder label, are decorative, and are hidden from assistive technology.
The five gold rating stars were removed because there is no rating data.

The video source, `muted`, `loop`, `playsInline`, `preload="metadata"`,
`disablePictureInPicture`, `tabIndex="-1"`, `object-fit: cover`,
`object-position: 50% 50%`, `filter: none` and the existing observer behavior are
retained:

```
https://res.cloudinary.com/z8nlnc6b/video/upload/v1792855493/Creating_commercial_video_of_burger_20261024202438.mp4
```

The film is full width at every checked size (1440, 1024, 768, 390, 320) with the
same container heights: 612px, 522.23px, 432px, 219.38px and 180px. There is no
tint, gradient, vignette or brightness filter. The video does not create side
gaps or horizontal overflow. The section keeps its `#experience` id,
`scroll-margin-top` and the heading "Words of Appreciation".

## Interaction evidence

These results come from a raw CDP session at 1440 x 900 with the 3D crest
disabled and the video paused for deterministic frames. The carousel itself ran
its normal motion path.

| Test | Result |
| --- | --- |
| Next then previous | 1 to 2 to 1, progress `02 / 05` to `03 / 05` to `02 / 05` |
| Keyboard Right then Left | 1 to 2 to 1 |
| Five Next steps | 2, 3, 4, 0, 1, wrapping from the last card to the first |
| Neighbor click | Active 2, click on the right neighbor at index 3, active 3, progress `04 / 05` |
| Faded second-neighbor click | Active 0, click on the second neighbor at index 2, active stayed 0; computed `pointer-events: none`, opacity 0.113 |
| Active card click | Active 0, click on the active card, active stayed 0 |
| Drag left 132px | Active 3 to 4, no recenter from the synthetic click |
| Five rapid Next clicks | Active 4, five queued steps from 4 returned to 4, settled with no overshoot |
| Autoplay idle | 4 to 0 after 4.8s, one step |
| Hover pause | 0 to 0 after 4.8s with the pointer over the stage |
| Hover leave | 0 to 1 after 4.8s |
| Focus pause | 1 to 1 after 4.6s with the stage focused |
| Reduced motion | Next moved 1 to 2 in 120ms; active stayed at 2 after 4.7s; card `transition-duration: 0s`; video paused |
| Touch swipe left | 1 to 2 |
| Touch cancel | 2 to 2 after a cancelled 54px swipe |
| Touch vertical drag | Page scrolled 105px, active stayed 2 |
| Video in view | `paused: false`, `readyState: 4` before the test paused it |

The anchor was also checked, including the fixed header:

| Viewport | Section top | Header bottom | Heading below header |
| --- | ---: | ---: | ---: |
| 1440 x 900 | 104.09px | 103px | 94.09px |
| 390 x 844 | 87.67px | 87px | 78.17px |

## Checks and console

- `npm run lint` (`tsc --noEmit`) passed.
- `npm run build` passed. The only warning is the pre-existing chunk over
  500kB warning.
- The interaction run produced no console messages from the carousel. It did
  show the pre-existing `inert` warning from `EntryExperience.jsx` and the
  existing Edge tracking-prevention messages for the Cloudinary host. A
  test-only WebGL override produced three.js renderer errors; those do not occur
  in a normal browser and are not from this section.
- No commit or push was made.

## Test notes

- Headless Edge through CDP is not a physical touchscreen and no real screen
  reader was run. Touch evidence uses synthesized pointer and touch events.
- A few full-viewport screenshots in this environment showed the known headless
  text-raster smearing over the playing video and 3D crest. The card shots were
  clean, and the same artifact appears in older screenshots of this section, so
  it is not a layout or DOM issue. The evidence images are kept as captured.
- At 1024px and 1440px the second neighbors are partly clipped by the viewport
  on purpose. They are faint and non-interactive.

## Delivery Gate

Dials and direction: ENERGY 2 / RHYTHM 2 / MOTION 2, with the Design Read
declared before the build. The section uses the existing warm dark and gold
language, a serif editorial voice, one focal card per view, and motion limited to
the arc.

### Block 1: Hard Gate

| Item | Status | Evidence |
| --- | --- | --- |
| R-02 em dash | PASS | No em dash in the new JSX, CSS comments or this report; the new section text uses commas, periods and hyphens. |
| R-03 overflow or broken mobile layout | PASS | `scrollWidth` equals the viewport at 320, 390, 768, 1024 and 1440; card text stays inside the cards; all five card shots show readable content. |
| R-17 unsourced statistics | PASS | No statistics added. |
| R-18 fictional testimonials | PASS | All five entries are the existing placeholders; no names, roles, ratings or photos were invented. |
| R-23 assets created without instruction | PASS | No asset was created; the initials are derived from the placeholder label, decorative and `aria-hidden`; the existing video is reused. |
| R-24 dead navbar links | PASS | No navbar link changed; the `#experience` anchor was tested and clears the fixed header. |
| R-25 contrast | PASS | Measured ratios are 15.30:1 and 13.47:1 for the quote, 7.16:1 for meta, 16.56:1 for publication, 5.17:1 and 4.55:1 for the index, 6.68:1 and 5.60:1 for initials, and 4.97:1 worst case for the arrow. |
| R-26 dead controls | PASS | Next, previous, drag, keyboard, neighbor click and autoplay each changed the active card in the interaction run. |
| R-27 missing states | PASS | The carousel is a static five-entry list; there is no async collection. A failed video leaves the dark stage base, and no empty state is possible. |
| R-28 generic FAQ | PASS | No FAQ exists in this section. |
| R-32 keyboard or focus failure | PASS | The stage is focusable; ArrowRight and ArrowLeft were exercised; the stage and both arrows have visible focus rings. |
| R-33 external patch | PASS | All changes are in source files; no script or stylesheet was injected to patch the page. |
| R-34 theme toggle | PASS | No theme toggle exists. |
| R-35 not run or not built | PASS | Lint and build passed; a CDP click-through covered both arrows, a neighbor card, drag, keyboard, autoplay and reduced motion. |
| R-36 fabricated claims | PASS | No security, compliance, performance or customer claims were added. |
| R-37 no direction | PASS | The Design Read and the three dials were declared before the build. |
| R-38 fabricated content | PASS | All copy is existing placeholder copy with the disclosure retained. |

### Block 2: Purpose-Gate

| Item | Status | Evidence |
| --- | --- | --- |
| R-01 gradients or glows | PASS | No gradient or glow was added as decoration. The existing cream card surface uses a subtle gradient for surface depth, with a written reason in the CSS. |
| R-04 generic icons | PASS | The only icons are chevrons for previous and next and a quote mark for the testimonial content. |
| R-06 uppercase or tracking | PASS | The uppercase tracking belongs to the existing eyebrow, publication and index label system, not a new default. |
| R-07 grid or dot pattern | PASS | No background pattern was added. |
| R-08 decorative arrows | PASS | The chevrons are the navigation affordance, not decoration. |
| R-09 capsule badges | PASS | No capsule badges or AI labels were added. |
| R-10 glassmorphism | PASS | Glass is limited to the two arrow buttons. The cards no longer use `backdrop-filter`. |
| R-12 large shadow on every component | PASS | The card shadow communicates elevation over the film; the controls use a separate, smaller shadow. |
| R-13 glow on everything | PASS | No glow system was added. |
| R-14 identical feature cards | PASS | These are carousel slides, identical by function. The hierarchy is spatial: active, one neighbor, two neighbor. |
| R-19 template animations | PASS | The only motion is the arc movement; no fade-up, float, scale or bounce stack. |
| R-22 generic illustration | PASS | No illustration was added; the existing burger film is the visual. |

### Block 3: Liveliness

| Item | Status | Evidence |
| --- | --- | --- |
| Dials explicit | PASS | ENERGY 2 / RHYTHM 2 / MOTION 2. |
| Output matches dials | PASS | Restrained motion, one active card, measured spacing and one gold accent. |
| Clear focal point | PASS | The centered, upright, full-opacity active card is the focal point; neighbors recede. |
| Structural whitespace | PASS | The film band, the stage height and the gap under the arc separate the heading, cards and controls. |
| One deliberate accent | PASS | Gold is the only accent; the cream cards and dark stage are the core palette. |
| Identity motif | PASS | The shared arc, numbered editorial cards and burger film carry the section's identity. |
| Design Read declared | PASS | Declared before generation: luxury restaurant testimonials, warm dark gold editorial, dials 2/2/2. |

### Block 4: Craftsmanship and Quality Locks

| Item | Status | Evidence |
| --- | --- | --- |
| C-1 AI-default decision | PASS | The arc, card surface and motion each have a stated reason in this report. |
| C-2 dead interactive element | PASS | Every control has a tested behavior. |
| C-3 template-only section | PASS | The section presents the five approved placeholder entries; the arc serves that content. |
| C-4 break in a state or breakpoint | PASS | Five widths, keyboard, touch, reduced motion and resize were exercised; no horizontal overflow or component console error. |
| C-5 fabricated evidence | PASS | No fabricated testimonial, stat or claim; the placeholder note is visible. |
| R-05 AI template layout | PASS | One arc stage replaces a generic card grid; the section rhythm follows the existing page. |
| R-11 all pills | PASS | Card radii, avatar and arrow radii differ; cards are rounded rectangles. |
| R-15 generic CTAs | PASS | No generic CTA was added. |
| R-16 AI buzzwords | PASS | No buzzwords were added; the copy is unchanged. |
| R-20 logo-swap test | PASS | The warm gold, serif voice, burger film and placeholder copy are specific to this restaurant. |
| R-21 forced dark mode | PASS | Dark is the existing brand direction; this change adds no theme toggle and forces no new mode. |
| R-29 too many colors | PASS | Dark neutrals, cream and one gold accent. |
| R-30 clone of another product | PASS | The arc carousel is a custom composition for this section. |
| R-31 unexplained visual decision | PASS | The layout, palette, type and motion reasons are stated in this report. |
