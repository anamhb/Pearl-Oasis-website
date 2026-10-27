# Testimonials film: full-section width

Date: 2026-10-24

Superseded on 2026-10-25 by `testimonials-burger-video.md`: the background source changed to the burger clip and `object-position` moved from `50% 90%` to `50% 50%`. The layout measurements below still describe this revision.

Follows `testimonials-side-by-side-independent-sequences.md`. This revision changes only the film layer; the cards, arrows, sequences, and section heading stay as they were.

## Root cause

The film was not limited by the card grid. The film is a sibling of `.testimonial-stage__grid` and already uses the full-width stage. It was limited by its own rules:

```css
left: 50%;
width: min(100%, calc(var(--testimonial-film-height) * 16 / 9));
aspect-ratio: 16 / 9;
transform: translateX(-50%);
```

At 1440x900 the reduced height was 612px, so the second half of the `min()` produced 1088px. The 16:9 panel was centered with a 50% left offset, leaving 176px of section background on each side. At 1024x768 the panel was 928px wide inside a 1024px section. The dark spaces were the section background outside that inset panel, not letterboxing inside the video.

The grid's `max-w-6xl` only constrains the testimonial content. It was not the source of the film gap.

## Solution

**The film now spans the section, not an inset panel.**

- `.testimonial-film` is absolute at `inset: 0 0 auto`, with `width: 100%` and the existing `height: var(--testimonial-film-height)`.
- The width cap, centering transform, and `aspect-ratio` were removed.
- Side borders were removed; only the existing top and bottom gold hairlines remain.
- The single existing video fills the layer with `width: 100%; height: 100%`.
- `object-fit: cover` replaces `object-fit: contain`.
- `object-position: 50% 50%` centers the video frame so the featured food subject stays in frame across viewports.
- Phones keep the film in normal flow with `inset: auto`, still full width and at the same reduced height.
- The video source, `muted`, `loop`, `playsInline`, `preload`, and IntersectionObserver playback gate are unchanged. There is still one video element.
- No overlay, brightness filter, fixed positioning, or height increase was added.

At 768px and on phones the film ratio already matches the source, so cover produces no meaningful crop. At 1024 and 1440 the extra width is obtained by cropping vertically, not by stretching the video or making the band taller.

## Measurements

| Viewport | Section width | Film width | Film height | Side gap | Heading above film |
| --- | --- | --- | --- | --- | --- |
| 1440x900 | 1440px | 1440px | 612px | 0px | yes |
| 1024x768 | 1024px | 1024px | 522px | 0px | yes |
| 768x1024 | 768px | 768px | 432px | 0px | yes |
| 390x844 | 390px | 390px | 219px | 0px | yes |
| 320x640 | 320px | 320px | 180px | 0px | yes |

The film heights are unchanged from the previous revision. Section heights remain 825px, 735px, 701px, 1141px, and 1207px respectively. The video is 1280x720. At 1440 the film aspect is 2.353 and at 1024 it is 1.961; `cover` crops those wider layers while the centered focus preserves the subject.

## Verification

- `npm run lint` passes.
- `npm run build` passes. The only build warning is the existing chunk-size warning.
- The film and video both start at x = 0 and end at the section's right edge at every tested width. No black side gaps remain inside the section.
- The heading is above the film at every width.
- The video subject is centered and clearly visible at 320, 390, 768, 1024, and 1440.
- The video is not stretched or distorted. `object-fit: cover` with `50% 50%` centering maintains aspect ratio across wide and narrow displays.
- Exactly one card is present in the left slot and one in the right slot.
- The two arrow buttons remain outside their cards and retain their labels.
- Left sequence: 1, 2, 3, then 1. Right sequence: 4, 5, then 4. The opposite card stays unchanged during each sequence. All five entries remain.
- No card content is clipped. No horizontal overflow was measured at any width.
- Cards and arrows keep their previous placements: angled inward at 768px and up, stacked with one arrow below each card on phones.
- Glassmorphism, gold borders, card dimensions, typography, and reduced-motion behavior are unchanged.
- The video plays from its existing Cloudinary source and remains behind the card layer.
- Console output contains no Testimonials exceptions. The existing favicon 404 and the existing React `inert=""` warning from `EntranceExperience.jsx` remain outside this revision.

## Files

- `src/components/sections/Testimonials.jsx` (comments only)
- `src/index.css` (film width, positioning, and cover crop)
- `changes/testimonials-fullwidth-video.md`
- `changes/evidence/testimonials-fullwidth-*.png`

No other section was edited. Nothing was committed or pushed.

## Evidence

- `changes/evidence/testimonials-fullwidth-1440x900.png`
- `changes/evidence/testimonials-fullwidth-1024x768.png`
- `changes/evidence/testimonials-fullwidth-768x1024.png`
- `changes/evidence/testimonials-fullwidth-390x844.png`
- `changes/evidence/testimonials-fullwidth-390x844-bottom.png`
- `changes/evidence/testimonials-fullwidth-320x640.png`
- `changes/evidence/testimonials-fullwidth-320x640-bottom.png`

The 1440 and 1024 images show the film reaching both section edges with the full bowl visible. The 390 and 320 images are paired top and bottom so the full-width film, stacked cards, and both arrows are visible.
