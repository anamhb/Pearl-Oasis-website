# Anti-Slop audit 001 remaining findings

- Date: 2026-10-23
- Source: `anti-slop/audit-001-2026-10-22.md`
- Approved findings: 1, 3, 6, 10, 12 (finding 12 only the title typo)
- Status: implemented and checked in the working tree. Not committed or pushed.
- Base: `5d276c0` plus the uncommitted audit-001 fix pass.

## Owner decision

The owner explicitly approved retaining the five clearly labelled testimonial placeholders until genuine reviews are available. No customer review, name, rating, quote, or endorsement was invented.

The `#experience` anchor and its header and footer links are unchanged.

## Changes

| Finding | Change | Files |
| --- | --- | --- |
| 1. Em dash | Browser title and `og:title` use `Pearl Oasis: Immersive 3D Restaurant`. The Beat 1 story sentence uses a full stop after "essence". | `index.html`, `src/components/sections/WelcomeStory.jsx` |
| 3. Testimonials | No code change. The five labelled placeholders and the visible disclosure remain. | `src/components/sections/Testimonials.jsx` |
| 6. Halal claim | Removed "100% Zabiha Halal" and its bullet. The modal now says "Freshly prepared to order in Kohat". Removed "Culinary and address details are editable placeholders." from the footer legal line. Contact and address remain. | `src/components/sections/MenuExperience.jsx`, `src/components/sections/Footer.jsx` |
| 10. Menu modal | Heading is "Menu Sections". Removed `line-clamp-1` from the desktop, mobile, and modal descriptions. Existing descriptions wrap; no data or reveal sequence changed. | `src/components/sections/MenuExperience.jsx` |
| 12. Typo | Changed "Chief Special Pizza Section" to "Chef's Special Pizza Section" in the data and the sequence comment. The shared data value updates desktop cards, mobile cards, modal, and image alt text. The slug is unchanged. | `src/components/sections/MenuExperience.jsx` |

The audit's finding 1 points to `WelcomeStory.jsx`; the implementation instruction named `EntranceExperience.jsx`. The sentence is in `WelcomeStory.jsx`, so that is the file changed. `EntranceExperience.jsx` was not edited in this pass; its frames, timing, and artwork are untouched.

The audit's finding 12 also contains a copy rewrite. That rewrite was not approved in this pass. The "vibrant tapestry" paragraph and the rest of the story copy are unchanged. Only the typo is fixed.

## Checks

Commands:

- `npm run lint` passed with exit code 0.
- `npm run build` passed with exit code 0: 1685 modules, 19.72s, `dist/assets/index-DhsZZy25.js` and `dist/assets/index-JRnWfSY9.css`. The only warning is the pre-existing >500 kB chunk warning.

Browser runs used headless Chrome 156 through raw CDP at 320x568, 390x844, 768x1024, and 1440x900.

| Check | Result |
| --- | --- |
| Horizontal overflow | 0 at 320, 390, 768, and 1440. |
| Menu cards | 10 active cards at each width. |
| Description clamp | Computed `-webkit-line-clamp: none` on all 10. Each description's `scrollHeight` matches its `clientHeight`; no clipped descriptions. |
| Card overlap | No overlap in either desktop column and no overlap in the mobile list. |
| Desktop stage | At 768 the content runs 294.5px to 765.5px in a 1024px viewport. At 1440 it runs 232px to 704px in a 900px viewport. The fixed header ends at 103px. All cards and the CTA fit. |
| CTA | Reads "See Menu Sections", is visible after the 10th card, and opens the modal. |
| Modal title | "Menu Sections" at all four widths, with `aria-labelledby="full-menu-title"`. |
| Modal descriptions | 10 descriptions, no clamp, none clipped. |
| Modal scrolling | At 320 the content is 1750px in a 509px modal; at 390 it is 1467px in 758px; at 1440 it is 877px in 808px. The modal is `overflow-y: auto` and scrolls. At 768 the content fits (877px in 877px), so no scroll was needed. |
| Modal focus | Focus moves to "Close full menu". Escape closes the modal and returns focus to "See Menu Sections". |
| Title and OG title | Both read `Pearl Oasis: Immersive 3D Restaurant`. |
| Story punctuation | Beat 1 reads "Every great meal carries an essence. The subtle aroma..." and contains no em dash. |
| Halal text | No `Zabiha` or `100% Halal` in the page or modal. The modal says "Freshly prepared to order in Kohat". |
| Footer | No "editable placeholders". "All rights reserved" remains. The `tel:+923327515538` link and the Kohat address remain. |
| Testimonials | Five placeholder cards and the note "The cards below are placeholders, not real guest reviews or press endorsements." remain. `#experience`, the header links, and the footer link remain. |
| Chef title | "Chef's Special Pizza Section" appears in the desktop, mobile, and modal cards and in the image alt text. "Chief Special Pizza Section" does not appear. |
| Console | No page exceptions. The only failed request was the pre-existing `/favicon.ico` 404 at 320. |

## Limits

- Headless Chrome 156 only. No physical phone, tablet, screen reader, Firefox, or Safari.
- Finding 3 is a recorded content override. The page still has no real reviews.
- Finding 12's copy cluster remains unapproved and unchanged.
- The menu CTA control was not restyled in this pass.

## Git

This pass changed `index.html`, `src/components/sections/WelcomeStory.jsx`, `src/components/sections/MenuExperience.jsx`, and `src/components/sections/Footer.jsx`. The earlier uncommitted changes in the other source files are preserved.

No commit, push, reset, or stash was made.
