# Testimonials: dark cards and full-section burger film

Section: `#experience`, "Words of Appreciation".

This fixes the existing arc carousel without rebuilding it. The five cards now
use a warm dark surface with restrained gold accents, the burger film is the
background of the whole section, and the source is the supplied burger clip.
The arc geometry, card sizes, card positions, heading, content, controls,
autoplay and reduced-motion behavior are unchanged.

This report supersedes the card palette, film-band description and video URL in
`changes/testimonials-arc-carousel.md`. That report's arc behavior, placeholder
content and interaction evidence remain valid.

## Root cause

The film was not hidden by an oversized `z-index`. It was a band inside the
stage:

- `inset: 0 0 auto`
- `height: var(--testimonial-film-height)` at `68vh` desktop and `42vh` mobile
- an opaque section background below the band
- carousel top padding sized to the band's lower edge

The film was already layer 0 and the carousel was already layer 10, so the
apparent layering fault was geometry: the video stopped above most of the
section. The cream card surface came from the previous pale gradient card rules.

## Files changed

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | New video URL, film moved to the section root as the first child, dark card gold accents. Arc logic and content untouched. |
| `src/index.css` | Full-section film layer, explicit layer order, card surface and text palette, local heading scrim, progress shadow. |
| `changes/testimonials-dark-theme-video-layering.md` | This report. |
| `changes/evidence/testimonials-dark-*-top.png`, `changes/evidence/testimonials-dark-*-cards.png` | Viewport evidence at the five checked widths. Untracked. |

No other section changed. The uncommitted `changes/testimonials-fullwidth-video.md`
edit was already present and was left alone.

## Background layer

The film is now the first child of the section, not a child of the stage. It is
absolutely positioned against the section:

```css
.testimonial-film {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
}
```

The video keeps `width: 100%`, `height: 100%`, `object-fit: cover` and
`object-position: 50% 50%`. The section keeps its `#0a0b0d` fallback behind the
film; the film uses `#08090a` behind the video. The stage, carousel and card
surfaces no longer add an opaque section-wide fill.

Layer order:

| Layer | Position | `z-index` | Notes |
| --- | --- | ---: | --- |
| Film | absolute, section | 0 | Behind everything in the section |
| Stage | relative | 1 | Contains the carousel and controls |
| Heading | relative | 10 | Above the film and stage |
| Carousel and cards | relative / absolute | 10 | Cards paint above the stage |
| Controls | relative | 20 | Above cards inside the stage |

The header and carousel are separate foreground layers. The film is not given a
large arbitrary number; 0, 1, 10 and 20 describe the actual order. The heading
and cards were checked visually over the live video, not just by reading
`z-index`.

A soft radial scrim sits under the heading only:

```css
.testimonial-header::before {
  background: radial-gradient(
    ellipse at 50% 38%,
    rgba(8, 9, 10, 0.52) 0%,
    rgba(8, 9, 10, 0.28) 48%,
    rgba(8, 9, 10, 0) 78%
  );
  pointer-events: none;
}
```

It protects the eyebrow, heading and note on bright sauce frames. It fades out
before the burger's center, does not cover the cards or controls, and adds no
filter to the video. The progress line keeps its existing colors and gains a
dark text shadow so it remains legible over the table footage.

## Card theme

The active card has an opaque warm near-black surface. The low sheen, gold
hairline and inset highlight separate it from the video without a glass pane or
bright fill.

| Element | Value |
| --- | --- |
| Card surface | `#17130f` |
| Top sheen | `rgba(246, 239, 228, 0.035)` to transparent at 32% |
| Border | `rgba(212, 175, 55, 0.34)` |
| Quote | `#f4ecdf` |
| Publication | `#efdfb9` |
| Meta | `#b7a78f` |
| Avatar | `#211a10` fill, `#e8cf8a` initials |
| Index | `#d4af37` at 85% |
| Quote icon | `#d4af37` at 75% |
| Shadow | `0 24px 54px -20px rgba(0, 0, 0, 0.85)` plus smaller contact layers |

No cream, white or pastel card surface remains. The gold is limited to the
border, index, quote icon, avatar and controls. Inactive cards keep their
existing arc opacity and become the opaque active card when centered.

## Geometry preserved

The old film-band height is still used as the card-placement offset, renamed to
`--testimonial-stage-offset` so the name matches its current job. The carousel
padding is still:

```css
padding-top: calc(var(--testimonial-stage-offset) - clamp(4rem, 8vw, 7rem));
```

That keeps the active card where it was. The section is not given a new height,
and the video does not affect layout.

| Viewport | Section height | Card width x height | Active top from section | Active center delta |
| --- | ---: | ---: | ---: | ---: |
| 1440 x 900 | 1294.59px | 260 x 350px | 729px | 0px |
| 1024 x 768 | 1221.91px | 252 x 340px | 669.32px | 0px |
| 768 x 1024 | 1065.59px | 240 x 334px | 597px | 0px |
| 390 x 844 | 814.47px | 240 x 320px | 368.88px | 0px |
| 320 x 640 | 828.59px | 210 x 320px | 386px | 0px |

`scrollWidth` equalled `innerWidth` at every width. The film covered the section
content box at every width, with the section's 1px top border remaining outside
it.

## Video

The source is exactly:

```text
https://res.cloudinary.com/z8nlnc6b/video/upload/v1792900563/Burger_layers_assemble_together_20261025085531.mp4
```

There is one video element in the section. `muted`, `loop`, `playsInline`,
`preload="metadata"`, `disablePictureInPicture`, `tabIndex="-1"`, `object-fit:
cover`, `object-position: 50% 50%` and `filter: none` are retained. Playback is
still gated by the existing intersection and reduced-motion logic.

Final loads at all five widths reported `readyState: 4`, no media error, and a
playing video. The source was identical in `src` and `currentSrc`.

## Contrast

Computed from the rendered colors. The active card is opaque, so the video frame
does not change these values.

| Text | Ratio |
| --- | ---: |
| Quote | 15.76:1 |
| Publication | 14.01:1 |
| Meta | 7.86:1 |
| Avatar initials | 11.25:1 |
| Card index | 6.66:1 |
| Quote icon | 5.42:1 |
| Arrow icon on its dark fill | 12.10:1 |
| Progress current over the dark table area | 9.81:1 |

All normal text passes 4.5:1 and the graphical accents pass 3:1. The heading and
note were checked over the brightest captured sauce frame at 320 and 390; the
local scrim keeps them readable. The faded neighbor cards are intentional arc
previews, use the existing opacity behavior, and become fully opaque when they
are the active card.

## Interaction and anchor checks

| Test | Result |
| --- | --- |
| Next then previous | 1 to 2 to 1, progress `02 / 05` to `03 / 05` to `02 / 05` |
| Keyboard Right then Left | 1 to 2 to 1 |
| Five Next steps | 2, 3, 4, 0, 1, wrapping correctly |
| Neighbor click | Active 2 to 3, progress `04 / 05` |
| Faded second-neighbor click | Active stayed 0; `pointer-events: none` |
| Active card click | Active stayed 0 |
| Drag left | Active 3 to 4, no synthetic click after the drag |
| Five rapid Next clicks | Returned to the start after five queued steps, settled without overshoot |
| Autoplay idle | Advanced one card after 4.8s |
| Hover pause and leave | Paused while hovered, resumed after leaving |
| Focus pause | Paused while the stage had keyboard focus |
| Reduced motion | Step settled immediately; autoplay stayed off; video paused |
| Touch swipe left | Active 1 to 2 |
| Touch cancel | Active stayed 2 |
| Touch vertical drag | Page scrolled, active stayed 2 |
| Video in view | `paused: false`, `readyState: 4` |

The fixed-header anchor still clears correctly:

| Viewport | Section top | Header bottom | Heading below header |
| --- | ---: | ---: | ---: |
| 1440 x 900 | 104.09px | 103px | 94.09px |
| 390 x 844 | 87.67px | 87px | 78.17px |

## Checks and console

- `npm run lint` (`tsc --noEmit`) passed.
- `npm run build` passed. The only build warning is the pre-existing chunk over
  500kB warning.
- The interaction run produced no carousel or video errors. Pre-existing noise
  remains: the React `inert` warning from `EntryExperience.jsx`, the favicon 404,
  and test-only WebGL messages from the harness that disables the 3D crest.
- One early headless page load hit a transient Cloudinary media error while the
  new upload was warming. An isolated video element played the same URL
  immediately afterwards, and every final page load reported `readyState: 4`
  with no error. The section still has a dark fallback if the video ever fails.

## Evidence

Viewport screenshots, header hidden only to expose the full section width:

- `changes/evidence/testimonials-dark-1440x900-top.png`
- `changes/evidence/testimonials-dark-1440x900-cards.png`
- `changes/evidence/testimonials-dark-1024x768-top.png`
- `changes/evidence/testimonials-dark-1024x768-cards.png`
- `changes/evidence/testimonials-dark-768x1024-top.png`
- `changes/evidence/testimonials-dark-768x1024-cards.png`
- `changes/evidence/testimonials-dark-390x844-top.png`
- `changes/evidence/testimonials-dark-390x844-cards.png`
- `changes/evidence/testimonials-dark-320x640-top.png`
- `changes/evidence/testimonials-dark-320x640-cards.png`

The video is playing in these captures and autoplay is paused by pointer hover so
the cards are at rest. The faint cards at the far edges of the 1440 view are the
intentional second neighbors, not duplicated content.

## Delivery Gate

Design Read: luxury restaurant guest feedback with a cinematic burger film,
warm dark surfaces, restrained gold, and one quiet arc. Dials: ENERGY 2,
RHYTHM 2, MOTION 2.

### Block 1: Hard Gate

| Check | Result | Evidence |
| --- | --- | --- |
| R-02 em dash | PASS | No em dash in the new JSX, CSS comments, report or evidence labels. |
| R-03 broken mobile layout | PASS | 320 and 390 have no horizontal overflow; cards, quote text and controls stay inside. |
| R-17 unsourced statistics | PASS | No statistics were added. |
| R-18 fictional testimonials | PASS | Five labeled placeholders; no invented names, roles, ratings or reviews. |
| R-23 unsupported assets | PASS | No new asset was created; the supplied video is the only media change. |
| R-24 dead navigation | PASS | `#experience` exists and the existing anchor still clears the header. |
| R-25 low contrast text | PASS | Measured 15.76:1 to 5.42:1 on readable surfaces; heading and controls checked over bright frames. |
| R-26 dead controls | PASS | Arrows, cards, drag, keyboard and autoplay all respond. |
| R-27 missing states | PASS | Cards are static placeholders; the decorative video has a dark fallback. |
| R-28 generic FAQ | PASS | No FAQ exists. |
| R-32 keyboard path | PASS | Arrow keys, focus pause, visible focus ring and 44px controls. |
| R-33 patched scripts | PASS | JSX and CSS were edited directly; no patch scripts were used. |
| R-34 theme toggle | PASS | No toggle; the fixed dark theme suits the restaurant identity. |
| R-35 unrun build | PASS | Lint and production build passed; interaction run recorded live results. |
| R-36 fabricated claims | PASS | Placeholder copy is explicit and the disclosure is unchanged. |
| R-37 directionless design | PASS | Design Read and the existing gold-on-dark identity guided the change. |
| R-38 invented reviews | PASS | Placeholder labels and disclosure remain in place. |

### Block 2: Style Gate

| Check | Result | Evidence |
| --- | --- | --- |
| R-01 gradients and glows | PASS | Card sheen and heading scrim are functional, warm and low-contrast; no blue or purple glow. |
| R-04 irrelevant icons | PASS | Quote mark and chevrons match the testimonial and carousel actions. |
| R-06 generic typography | PASS | Existing Cormorant and Cinzel pairing carries the editorial identity. |
| R-07 background grid | PASS | No grid; the burger film is the content-specific background. |
| R-08 decorative arrows | PASS | Two arrows are the only arrows and both control the carousel. |
| R-09 badge overload | PASS | The index is plain text, not a capsule badge. |
| R-10 glassmorphism | PASS | Card surfaces are opaque at full opacity; only the two arrows use the existing modest blur. |
| R-12 floating everything | PASS | Shadows are limited to the cards and controls to establish elevation. |
| R-13 glow | PASS | No glow; gold is an accent, not a light source. |
| R-14 identical feature cards | PASS | Five cards share one arc intentionally; active and faded states provide hierarchy. |
| R-19 animation stack | PASS | One rAF arc motion and one timed autoplay, both with a stated purpose. |
| R-22 decorative illustrations | PASS | No illustration was added. |

### Block 3: Composition Gate

| Check | Result | Evidence |
| --- | --- | --- |
| Explicit dials | PASS | ENERGY 2, RHYTHM 2, MOTION 2; one focal arc, no second hero. |
| Consistency | PASS | Warm dark surfaces, gold lines and ivory text are repeated across cards and controls. |
| Focal point | PASS | The centered active card remains the single focal point; the burger supports it. |
| Whitespace | PASS | Heading, card arc and controls have deliberate separation; no free-floating filler. |
| One accent | PASS | Gold is the only accent color. |
| Identity motif | PASS | The arc, numbered editorial cards and burger film carry the section's identity. |

### Block 4: Craft Gate

| Check | Result | Evidence |
| --- | --- | --- |
| C-1 default decisions | PASS | Near-black cards, gold hairline and full-section film were chosen for this restaurant section, with reasons above. |
| C-2 interactions | PASS | Buttons, keyboard, drag, swipe, autoplay, hover, focus and reduced motion were exercised. |
| C-3 template-only section | PASS | The section keeps its five approved placeholders and one custom arc, not a generic feature grid. |
| C-4 hostile conditions | PASS | Checked 320 to 1440, touch and keyboard, reduced motion, video failure fallback. |
| C-5 fabricated content | PASS | Placeholders are labeled; no names, photos, ratings or claims were invented. |
| R-05 AI template layout | PASS | One arc stage serves the existing content; no new template section was inserted. |
| R-11 radius spam | PASS | Cards use 1rem to 1.25rem; avatars and arrows use circles. |
| R-15 multiple primary CTAs | PASS | The section has no CTA; arrows are secondary navigation. |
| R-16 buzzwords | PASS | No marketing filler was added to the section. |
| R-20 interchangeable identity | PASS | The gold-on-dark arc and burger film belong to this restaurant section. |
| R-21 unchecked dark mode | PASS | The fixed dark theme is the intended brand mode; no theme toggle is introduced. |
| R-29 overused palette | PASS | Near-black, gold, ivory and muted warm grey; no purple, neon or default blue. |
| R-30 cloned composition | PASS | The arc and full-section film are specific to this brief. |
| R-31 unexplained craft | PASS | The root cause, layer order, palette, scrim and card-offset reasons are documented above. |

**Gate result: PASS.**
