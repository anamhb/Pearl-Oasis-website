# Testimonials: centre-focused carousel

Section: `#experience` ("Words of Appreciation"). This replaces the sticky stacked-card
deck with one centre-focused, overlapping carousel. The ambient film, the five placeholder
cards, the placeholder note, the section copy, and the `#experience` nav/footer links are
preserved. The earlier `testimonials-five-cards.md` and `testimonials-two-column-layout.md`
notes still describe the copy and video history; the card presentation here supersedes them.

## Files changed

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | Carousel state, looping controls, side-card activation, swipe and keyboard handling, focus management, polite live region, new control bar; the five quotes, themes and placeholder disclosure stay unchanged. |
| `src/index.css` | The old `.testimonial-stack*` block is replaced by `.testimonial-carousel*` grid, transform, responsive, hover, focus and reduced-motion rules. |
| `changes/testimonials-center-carousel.md` | This note. |

No other section was changed, and no dependency was added. The video source, `IntersectionObserver`
playback gating and reduced-motion pause are retained. The section keeps its `#experience` id and
`scroll-margin-top`, so the existing nav and footer links still clear the fixed header.

## Design

* **One grid cell.** All five cards occupy the same grid area, so the row height is always the
  tallest quote and the section height does not jump when the active slide changes.
* **Centre focus.** The active card is unscaled and centred. Side cards are `0.88` scale, shifted
  `78%` of the card width, filtered to `saturate(0.65) brightness(0.8)`, and placed behind the
  active card. Far cards are `0` opacity, `aria-hidden`, non-focusable and `pointer-events: none`.
* **Clear active state.** The active card alone carries the gold border and the stronger elevation.
  Theme B now uses a muted `#2a261d` border instead of a gold border, so gold means active or focus,
  not "this card happens to use the warm theme".
* **Full-bleed stage.** The stage uses the section's negative gutters and `overflow-x: clip` with
  `overflow-y: visible`, so side cards are cut at the screen edges while the card shadows stay
  visible above and below.
* **Controls.** A dark pill groups the 44px previous/next buttons and the visual `01 / 05` counter.
  The counter is `aria-hidden`; a polite live region announces the active position and the
  placeholder context. There is no autoplay.
* **Input paths.** Previous/next wrap infinitely. Visible side cards have full-card action buttons.
  Touch swipes use a 48px horizontal threshold, `touch-action: pan-y`, a 400ms post-swipe click
  guard, and `user-select: none` on the stage. `ArrowLeft`/`ArrowRight` work while the stage or a
  control inside the carousel has focus; focus returns to the stage after a side-card change.
* **Tab order.** Rendered cards are sorted by signed offset, so DOM order matches the visual
  left-to-right order: stage, left side action, right side action, previous, next.
* **Film.** The Cloudinary biryani clip remains an absolute, section-height background with the
  existing portfolio tint and a local heading scrim. The observer still starts playback only near
  the section, and reduced motion keeps the video paused.

## Verification

Commands: `npm run lint` (`tsc --noEmit`) passed, and `npm run build` passed. The only build warning
is the pre-existing >500 kB chunk warning. Browser checks used headless Chrome through raw CDP on the
production preview at `http://127.0.0.1:4173`.

| Viewport | Horizontal overflow | Card clipping | Active centre at rest / after next | Controls in first view | Side card visible outside active |
| --- | ---: | ---: | ---: | --- | ---: |
| 320x800 | 0 | none | 0 / 0 | no, pill starts at 798.2 | 12.5% (29px) |
| 390x844 | 0 | none | 0 / 0 | yes | 12.5% (35px) |
| 768x1024 | 0 | none | 0 / 0 | yes | 67.1% |
| 1024x768 | 0 | none | 0 / 0 | no, pill bottom 22px below viewport | 81.8% |
| 1440x900 | 0 | none | 0 / 0 | yes | 81.8% |
| 320x640 | 0 | none | 0 / 0 | no | 12.5% (29px) |

The active-card centre delta was `0px` at rest and after the next control at every width. Next moved
the active index to 1 and the counter to `02 / 05`; previous returned it to 0 and `01 / 05`.

| Interaction | Result |
| --- | --- |
| Loop | Pointer next steps: 1, 2, 3, 4, 0. Previous from 0 wrapped to 4 with `05 / 05`. |
| Side cards at 1440 | Right side click: 4 to 0, focus moved to the stage. Left side click: 0 to 4. |
| Side cards at 320 | Right click at the 29px peek: 0 to 1, focus moved to the stage. Left click: 1 to 0. |
| Arrow keys | 0 to 1, then 1 to 0, with focus retained on the stage. |
| Tab order | Stage, `Show testimonial 5 of 5`, `Show testimonial 2 of 5`, previous, next. All focus rings visible. |
| Side card Enter | Activating `Show testimonial 2 of 5` moved to index 1 and focused the stage. |
| Autoplay | Active index stayed at 1 after a wait. |
| Reduced motion | Card `transition-duration: 0s`, `transition-property: none`; video paused; next still moved 0 to 1 and centred at 0. |
| Touch | Left swipe 0 to 1, right swipe 1 to 0, centre 0. Vertical swipe left the active at 0 and scrolled the page by 125px. |
| Anchor | `#experience` section top 104.1px with header bottom 103px on desktop; 87.9px with header bottom 87px on mobile. |
| Console | No app errors. The only failed request was the existing `favicon.ico` 404. |

Accessibility checks: the five cards are semantic `article` elements with slide roles and labels;
the active card exposes `aria-current`; far cards expose `aria-hidden` and no focusable children; the
stage is a labelled focusable region; side cards are native buttons with labels; the live region is
polite; the control buttons are 44px with gold focus rings. Contrast on the card surfaces remains
high: active quote 14.83:1 (theme A) and 14.74:1 (theme B), active meta 7.36:1 and 6.68:1, active
publication 15.03:1 and 13.63:1. The side cards, after the 0.8 brightness filter, measure 9.62:1 and
9.80:1 for the quote and 4.99:1 and 4.66:1 for the meta. The section's heading scrim keeps the
heading, eyebrow and note readable over the film.

## Limitations

* Headless Chrome through CDP is not a physical phone or a real touchscreen. The touch results use
  synthesized events. No real screen reader, VoiceOver, NVDA, Safari or Firefox pass was run.
* At 320x800 and 1024x768 the control pill is below the first viewport (the 1024 buttons are still
  visible and clickable; the pill bottom is cut). The 320 and 320x640 user needs a short scroll, or
  can swipe. At 320/390 the visible side-card peek is only 29px/35px wide; the 44px previous/next
  buttons and swipe are the primary mobile paths.
* The 320 eyebrow wraps to two lines at 11px tracking; the h2 and the longest quote also take more
  lines at 320. The full section still scrolls normally and no card content is clipped.
* At 1024 and 1440 the side cards are 81.8% visible outside the active card. They are dimmed and
  behind it, but the overlap is deliberately moderate; see audit-003 for this observation.
* Far cards finish a 420ms fade. The 600ms post-change check measured `0.0012` opacity on one of
  them; it is visually zero, `aria-hidden`, and non-interactive.
* The heading scrim is a soft rectangle behind the heading. It is a legibility device over the
  film, not a global tint.
* The video is remote, so network or Cloudinary availability can remove the film; the section keeps
  its dark base in that case.
* Screenshots and the CDP test script are in the temporary workspace, not in the repository:
  `C:\Users\Nomanz\AppData\Local\Temp_sewit\opencode\pearl-carousel-shots`.
