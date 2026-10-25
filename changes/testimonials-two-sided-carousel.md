# Testimonials: two-sided carousel, film left undimmed

Section: `#experience` ("Words of Appreciation"). The centre card is gone. On desktop the
current testimonial sits at the left edge and the next one at the right edge; the biryani
bowl plays untouched between them. Below 1024px the card moves above a framed film panel.
No overlay, gradient, vignette, filter or video-side brightness change dims the clip.

The five placeholder quotes, the placeholder labels, the disclosure, the heading copy, the
`#experience` anchor and the navigation/footer links are unchanged. No autoplay was added.
Nothing was committed or pushed.

## Files changed

| File | Change |
| --- | --- |
| `src/components/sections/Testimonials.jsx` | Replaced the centre-card carousel with a current/next pair, added the desktop stage + framed mobile/tablet film, kept the observer/loop/reduced-motion behaviour, removed every darkening layer and filter, moved the heading onto the section surface. |
| `src/index.css` | Replaced the old `.testimonial-carousel*` offset/centre rules with the two-sided flex row, the panel fallback below 1024px, the card entrance animation and the reduced-motion overrides. |
| `changes/testimonials-two-sided-carousel.md` | This note. |
| `changes/evidence/testimonials-two-sided-*.jpg` | Verification screenshots (listed below). |

No other section, dependency, quote, label or link was changed.

## 1. Why the centre card had to go

The previous carousel stacked all five cards in one grid cell. The active slide sat at the
dead centre of the frame, i.e. directly over the biryani bowl. To keep that card legible the
section carried a 55% flat tint over the whole clip, top/bottom seam gradients, a vignette,
a heading scrim, and a `brightness(1.08) saturate(1.03) contrast(1.02)` filter on the video.
The card and the darkening were two halves of the same problem.

This pass changes the structure instead of the grade: the centre position is not used at all,
so the film needs no help from overlays.

## 2. The two-sided layout

### Desktop, 1024px and up

The film is the background of the stage. It spans the content column (`max-w-6xl`, inside the
section gutters). The two cards are flex items pushed to the outer edges; there is no middle
element or middle grid track, only the flex free space between them.

| Viewport | Card width | Clear centre | Card edges | Mapped bowl (28–63% x) | Result |
| --- | --- | --- | --- | --- | --- |
| 1024×768 | 240px | **448px** | ends 288 / starts 736 | 299–642px | bowl clear by 11px on the left, 94px on the right |
| 1440×900 | 260px | **536px** | ends 452 / starts 988 | 478–868px | bowl clear by 26px on the left, 120px on the right |

The stage floor is `27rem` (432px). At 1440 the bowl occupies 469–647px vertically inside a
stage of 229–661px; at 1024 it occupies 466–622px. The whole bowl is inside the visible
stage at both sizes, and the card rectangles do not intersect it.

Capping the film to the content column matters on wide screens: if the clip scaled with the
whole viewport, the bowl would grow wider than the fixed centre gap (at 1920px its mapped bowl
is about 672px wide against a 632px gap). With the cap, the 1440 and 1024 geometry above still
holds at any wider viewport.

### Tablet, 640–1023px

The pair would squeeze the quotes below 1024px, so the stage becomes one column: a single card
(max `36rem`, centred) above a framed film panel. The panel is `46vh` tall, clamped to
`18rem`–`32rem`. The card is never over the film, so the bowl cannot be covered.

At 768×1024 the card is 576px wide and 247px tall; the panel is 471px tall. The bowl sits at
779–919px, fully inside the panel (524–995px).

### Mobile, below 640px

The same single-card composition, full content width (24px gutters). At 390×844 the card is
342px; the panel is 388px. At 320×640 the card is 272px; the panel is 294px. The bowl is
fully inside the panel at both sizes (390: 762–878px inside 553–941px; 320: 795–882px inside
636–930px). There is no horizontal overflow and no card/film intersection.

This is deliberately **not** the reverted mobile video band: the panel is not sticky, not a
16:9 strip, not masked, and it sits below the card rather than acting as a cropped header.
The clip keeps `object-fit: cover` and `object-position: 50% 50%`.

### Heading contrast

The heading now sits on the section's own `#0a0b0d` surface above the film. That is the
contrast fix: the clip is never darkened for text. The eyebrow, heading and note keep their
existing type, colour and sizes. The section anchor still clears the fixed header
(`scroll-margin-top` in `index.css`): after a real nav jump the section top is at 103.9px
(desktop) / 87.9px (phone), the header bottom is 103px / 87px, and the eyebrow starts at
184.9px / 144.9px.

## 3. All five cards stay reachable

`activeIndex` drives two slots:

- **Current** = `activeIndex` — left card on desktop, the only card on mobile.
- **Next** = `activeIndex + 1` (wrapped) — right card on desktop.

Five `next` steps visit 2 → 3 → 4 → 5 → 1 and return to the start; `previous` walks back.
Every one of the five is reachable as the current card in five steps; nothing is skipped.
(Each card is also shown once as the next card in the preceding step.)

Interaction kept and adapted:

- Previous/next buttons, 44px targets, loops.
- Clicking the whole right-hand card activates that testimonial and keeps focus on the same
  button, so repeated activation keeps advancing.
- ArrowLeft / ArrowRight while focus is inside the section; ignored in form fields and with
  modifier keys.
- Horizontal touch swipe, axis-locked at 8px, 48px threshold, 400ms post-swipe click guard.
  Vertical swipes scroll normally; the same handlers also work on the film panel.
- No autoplay.
- `role="region"` + carousel role description, `aria-roledescription="slide"` and
  `aria-label="Testimonial n of 5"` on each visible card, `aria-current="true"` on the current
  one, and a polite live region that announces the index, publication and "Not a real review".
- The right card's overlay button is named `Show testimonial n of 5: Guest Review Placeholder`.
- The card entrance animation enters from each card's own side, away from the centre. Reduced
  motion removes both the entrance animation and the border transitions, and pauses the video.

## 4. Darkening removed

Removed from `Testimonials.jsx`:

- the flat `bg-[#08090a]/55` full-frame tint;
- the top and bottom seam gradients;
- the vignette;
- the heading scrim;
- `brightness-[1.08] saturate-[1.03] contrast-[1.02]` on the video;
- the `scale-[1.015]` video inset (no longer needed and it shifted the bowl).

The video's computed style in the production build is `filter: none`, `opacity: 1`,
`object-fit: cover`, `object-position: 50% 50%`, `mix-blend-mode: normal`. The film wrapper's
`#08090a` is the fallback behind the video, not an overlay. Text contrast now comes from the
opaque cards (`#121316` / `#1f1d18` surfaces, 6.7:1 or better for meta text and 13:1+ for
quote text) and from the heading's own section surface.

The film wrapper remains `aria-hidden`, `pointer-events-none`, with the video `tabIndex={-1}`;
source, `muted`, `loop`, `playsInline`, `preload="metadata"`, `disablePictureInPicture`,
IntersectionObserver playback and the reduced-motion pause are all unchanged.

## 5. Verification

`npm run lint` passes. `npm run build` passes; the only build warning is the existing
`>500 kB` chunk notice. The only console error in the run is the pre-existing
`/favicon.ico` 404.

Headless Chrome, production preview:

| Check | 320×640 | 320×800 | 390×844 | 768×1024 | 1024×768 | 1440×900 |
| --- | --- | --- | --- | --- | --- | --- |
| horizontal overflow | 0 | 0 | 0 | 0 | 0 | 0 |
| card text clipped (scroll > client) | no | no | no | no | no | no |
| centre gap | card above film | card above film | card above film | card above film | 448px | 536px |
| bowl intersects a card | no | no | no | no | no | no |
| bowl inside the film | yes | yes | yes | yes | yes | yes |
| video playing | yes | yes | yes | yes | yes | yes |

Interaction checks (1440 and 390): next ×5 = 2, 3, 4, 5, 1; previous = 5; right-card click = 1;
ArrowRight = 2; ArrowLeft = 1; swipe left on card = 2; swipe right = 1; vertical swipe leaves
the index unchanged; swipe on the film = 2; the index is unchanged after 2.6s (no autoplay).
Reduced motion: `animation-name: none`, `transition-property: none`, video paused at `0:00`,
and next still advances to 2.

Evidence:

- `changes/evidence/testimonials-two-sided-1440x900.jpg` — desktop pair, clear bowl.
- `changes/evidence/testimonials-two-sided-1024x768.jpg` — 1024 pair, full section.
- `changes/evidence/testimonials-two-sided-1024x768-anchor.jpg` — real nav jump, eyebrow clear
  of the fixed header.
- `changes/evidence/testimonials-two-sided-768x1024.jpg` — tablet card above the film.
- `changes/evidence/testimonials-two-sided-390x844.jpg` — phone card above the film.
- `changes/evidence/testimonials-two-sided-320x640.jpg` — short phone, bowl fully in panel.

Screenshots were taken with a headless Chrome CDP harness; the production preview served the
current `dist` build. No commit or push was made. The other modified files in the working tree
(prior Anti-Slop work) were not touched by this pass.
