# Audit 001 fix pass

- Date: 2026-10-23
- Source: `anti-slop/audit-001-2026-10-22.md`
- Approved findings: 2, 4, 5, 7, 8, 9, 11, 13, 14, 15, 16, 17
- Status: implemented and checked in the working tree. No commit or push.
- Base: `5d276c0`. The pre-existing Hero sequence, frame assets, and notes are in that commit. This pass did not change them.

## Follow-up 2026-10-23

Findings 1, 3, 6, 10, and 12 were approved in a later pass. Finding 3 was approved as a retained set of five labelled placeholders. Finding 12 was approved for the "Chief" typo only. See `changes/anti-slop-audit-001-remaining-fixes-2026-10-23.md`. The "Not changed" section below records the first pass before that follow-up.

## Scope

Only the twelve approved findings were changed. Audit-001 findings 1, 3, 6, 10, and 12 remain open. Audit-002, the #18 and #19+ items, and finding 22 were not touched. No menu item, price, testimonial, halal claim, source, business detail, or online-booking behaviour was added.

The work stayed inside the existing React and Tailwind patterns. No dependency, route, artwork, frame sequence, scroll mapping, or Our Story markup was changed. The Hero and Our Story animation logic is unchanged except for the reduced-motion scroll behaviour required by finding 14 and the inert state required by finding 5.

## Changes

| Finding | Change | Files |
| --- | --- | --- |
| 2. Tap targets | Hero CTA, hero cue, header View Menu button, and the four footer links now reach 44px minimum height, with `min-w-11` on the footer links. | `EntranceExperience.jsx`, `Navigation.jsx`, `Footer.jsx` |
| 4. Eyebrow contrast | Added a local soft black scrim behind the gold eyebrow, inside the faded entrance copy. Frame selection and the existing entrance fade are unchanged. | `EntranceExperience.jsx` |
| 5. Hidden focus and Escape | The entrance copy, dining copy, and cue toggle `inert` and `aria-hidden` as their opacity crosses the visible thresholds. The mobile menu closes on Escape and returns focus to its toggle, with `aria-controls` and `id` now linked. | `EntranceExperience.jsx`, `Navigation.jsx` |
| 7. Endless dish loop | The dish entrance runs once, settles at the stations, and cancels its rAF. Hover or tap on the stage replays it after it settles. The reduced-motion static state is unchanged. | `SignatureDishes.jsx` |
| 8. Sparkle capsule badge | Removed the Lucide Sparkles icon and the capsule styling (border, background, shadow, pill padding). "Kohat Culinary Collection" remains as a plain uppercase label. | `MenuExperience.jsx` |
| 9. Invisible card blur | Removed `backdrop-blur-md` from the ten revealed menu cards. The modal overlay keeps its blur. | `MenuExperience.jsx` |
| 11. CTA wording | Menu CTAs now read "See Menu Sections". The `tel:` CTA reads "Call to Reserve". | `MenuExperience.jsx` |
| 13. Radius language | Buttons use 4px (`rounded`), cards, panels, and the dish stage use 12px (`rounded-xl`), nested image thumbnails keep 8px, and icon-only controls stay circular. | `EntranceExperience.jsx`, `Navigation.jsx`, `MenuExperience.jsx`, `SignatureDishes.jsx`, `Testimonials.jsx` |
| 14. Reduced-motion scrolling | Under `prefers-reduced-motion: reduce`, `html` uses `scroll-behavior: auto`. The footer Return to Top handler and the Hero Enter Restaurant handler choose `auto` for reduced motion and keep the existing smooth glide otherwise. | `index.css`, `Footer.jsx`, `EntranceExperience.jsx` |
| 15. False affordances | Removed the dish pointer cursor and hover scale, the menu card hover border, the modal item hover border, and the menu thumbnail hover scale. The hover/tap dish replay is now a real behaviour. | `SignatureDishes.jsx`, `MenuExperience.jsx` |
| 16. Cue accessible name | The cue is labelled "Unfold the story: scroll to Our Story", with the visible label first. | `EntranceExperience.jsx` |
| 17. Footer heading order | The three footer column titles changed from `h4` to `h3`. Their classes are unchanged, so the visual size stays at 12px. | `Footer.jsx` |

## Verification

Commands:

- `npm run lint` (`tsc --noEmit`) passed with exit code 0.
- `npm run build` passed with exit code 0: 1685 modules, 6.86s, `dist/assets/index-Copxemur.js` and `dist/assets/index-JRnWfSY9.css`. The only warning is the pre-existing >500 kB chunk warning.

Browser runs used headless Chrome 156 through raw CDP at 320x568, 390x844, 768x1024, and 1440x900. Reduced motion and touch were emulated through CDP media and device-metric overrides.

| Check | Result |
| --- | --- |
| Horizontal overflow | 0 at 320, 390, 768, and 1440. |
| Hero CTA and cue | CTA 198x44 at 320/390, 287x52 at 768+. Cue 128x44 at 320/390, 213x60 at 768+. |
| Header View Menu | 134x44 at 768 and 1440, 4px radius. |
| Footer links | "Our Story" 54x44; "Menu" 44x44; the other two links at least 44px wide and 44px tall. |
| Scrim contrast | At full copy opacity the sampled background behind the label gives 6.43:1 to 6.62:1 with the full text box and 7.09:1 to 7.26:1 with the inner box. At 31% scroll it is 4.72:1 and 5.25:1 respectively. The scrim is `rgba(9,10,12,0.7)` with an 8px blur and a full pill radius. |
| Mobile menu keyboard | At 320 and 768, Escape closed the panel, `aria-expanded` returned to false, and focus returned to the toggle button. `aria-controls="mobile-navigation"` points at the rendered panel. |
| Hero inert states | At the start, the dining copy has `inert` and `aria-hidden="true"`; the entrance copy and cue do not. At the end, the entrance copy and cue are inert; the dining copy is focusable. |
| Cue ARIA | Accessible label "Unfold the story: scroll to Our Story"; visible text "UNFOLD THE STORY". The label contains the visible text. |
| Modal | `role="dialog"`, `aria-modal="true"`, labelled by the menu title. Escape closed it. The overlay keeps `backdrop-blur-md` (blur 12px); the ten card surfaces report `backdrop-filter: none`. |
| CTA wording | Both menu CTAs read "See Menu Sections"; the modal footer reads "Call to Reserve". The old "Explore Full Menu" and "Reserve Table & Order" strings are absent from the page. |
| Menu label | Plain `div`, transparent background, no border, no padding, no SVG icons. |
| Radii | 4px on the hero, header, menu, and modal buttons; 12px on menu cards, modal panel, dish stage, and testimonial cards; 8px on nested menu thumbnails; circular on the icon-only close and menu toggle. |
| Dish settle | After the one-shot finish, all seven dishes are at their stations with opacity 1. Transforms were unchanged across a 1.2s sample, so the loop is stopped. |
| Dish replay | A pointerenter after settling restarted the animation (all seven dishes returned to opacity 0). A later pointerdown also restarted it. Touch pointerenter is suppressed so one tap does not fire twice. |
| Reduced motion | `scroll-behavior` computed to `auto`; the seven dishes were visible at scale 1 with no rAF movement; the hub ring's spin class was absent. |
| Reduced-motion scroll | The Enter Restaurant click landed at 2689px immediately and still read 2689px after 80ms. Normal motion still computes `scroll-behavior: smooth`. |
| Hero frame map | Sampled at 0, 0.25, 0.5, 0.75, and 1.0: visible frames 001, 019, 037, 054, and 070. The mapping and frame assets are unchanged. |
| Footer outline | Three `h3` elements, zero `h4` elements. Computed font size is still 12px. |
| Runtime | No page exceptions or console errors. The only failed requests were a pre-existing `/favicon.ico` 404 and an aborted Cloudinary testimonial video fetch (`ERR_ABORTED`; the video sits below the fold and was cancelled). Neither is caused by this pass. A fresh-profile run produced no 431 responses. |

## Visual review

Screenshots were reviewed at 320, 390, 768, and 1440 for the hero, mobile menu, menu intro, menu cards, modal, signature stage, and footer. The plain "Kohat Culinary Collection" label reads cleanly without the capsule. The 4px buttons and 12px cards are consistent. The footer headings keep their previous visual size.

One capture at the pinned menu boundary needed `--run-all-compositor-stages-before-draw` to avoid a headless Chrome ghosting artifact. With that flag the intro rendered cleanly, and DOM hit-testing showed one visible intro paragraph. This was a screenshot timing issue, not duplicated content.

## Not changed in the first pass

These were open before the follow-up. Finding 12's copy cluster remains unapproved.

- Audit-001 finding 1: em dashes remain in `index.html` and `WelcomeStory.jsx`.
- Audit-001 finding 3: the testimonial placeholders remain as they were.
- Audit-001 finding 6: the halal claim and placeholder details remain.
- Audit-001 finding 10: the modal still calls itself a complete catalog and the card descriptions still use `line-clamp-1`.
- Audit-001 finding 12: the copy cluster and "Chief Special Pizza Section" remain.
- Audit-002 and other unapproved findings, including #18, #19+, and finding 22.
- The pre-existing Hero work in `5d276c0`: frame images, sequence notes, and artwork.

## Limitations

- The checks ran in headless Chrome 156 with CDP input and media emulation. No physical phone, tablet, screen reader, Firefox, or Safari was tested.
- Reduced motion was emulated, not changed at the OS level.
- The dish entrance starts on mount. A visitor who reaches the section after roughly 13 seconds sees the settled composition and can replay it with hover or tap. It does not wait for the section to enter the viewport.
- Keyboard replay was not added. The stage has no focusable control, and adding one only to replay a decorative animation would create a new false affordance. The one-shot "stop after one cycle" branch of finding 7 is met.
- The slow decorative hub ring remains in normal motion. It is separate from the dish entrance and stops under reduced motion. Changing it would alter unrelated section motion, which the approved scope excluded.
- The eyebrow scrim is scoped to the entrance copy, so it fades with the copy. The 4.72:1 sample at 31% scroll assumes a full-opacity label; the label itself is already at 0.887 opacity there. The resting label measures 6.43:1 or better.
