# Responsive audit — whole site

Scope: navigation, hero walkthrough, Our Story, Featured Dishes, Menu,
Testimonials and footer at desktop, tablet and phone widths, in both
orientations. Desktop visuals, content, animation behaviour and brand elements
are unchanged. No dependencies were added.

---

## 1. How this was measured

The preview tab reports `document.visibilityState === "hidden"`, and Chromium
freezes `scrollTo`, `requestAnimationFrame`, IntersectionObserver delivery and
screenshots in that state. So every number below comes from **layout
measurement of a live render inside a same-origin iframe sized to the exact
viewport** (`width`/`height` in CSS px), not from a screenshot.

For each size the probe collected:

* `document.documentElement.scrollWidth` **with `body { overflow-x: hidden }`
  overridden to `visible`**, so any masked overflow would appear;
* every element whose box crossed the left/right viewport edge, with its
  clipping ancestors resolved (an element only counts as page overflow when no
  ancestor clips it);
* header height, hero eyebrow / H1 / lead / CTA / scroll-cue rects;
* Our Story beat rects, compensated for the scroll-driven `translateY` so the
  settled pinned state is what is compared;
* which menu presentation is active, and whether the pinned stage's content
  fits its 100vh sticky frame;
* the featured-dish ring geometry (radius, image box, overhang past the stage);
* footer column widths and every interactive element's height;
* presence of the Vite error overlay.

`scrollWidth` is compared against `innerWidth − 6px` (classic scrollbar), since
a vertical scrollbar is always present.

---

## 2. Files changed

| File | Change |
| --- | --- |
| `src/index.css` | Anchor `scroll-margin-top`; `.menu-desktop-*` / `.menu-mobile` presentation switch; short-viewport hero rules; short/narrow Our Story rules |
| `src/components/ui/Navigation.jsx` | Mobile dropdown capped to the viewport and made scrollable |
| `src/components/sections/Footer.jsx` | Tap-target padding on text links, phone link and "Return to Top" |
| `src/components/sections/MenuExperience.jsx` | Presentation classes (`menu-desktop-intro`, `menu-desktop-stage`, `menu-mobile`) instead of `hidden md:block` |
| `src/components/sections/WelcomeStory.jsx` | `story-beat` / `story-eyebrow` hooks; missing `src` on the second frame layer |
| `src/components/3d/EntranceExperience.jsx` | `hero-copy` / `hero-eyebrow` / `hero-title` / `hero-lead` / `hero-cta` / `hero-cue` hooks |
| `src/components/sections/SignatureDishes.jsx` | Ring radius clamped to the stage width |

No section, testimonial, dish, menu item or animation was removed.

---

## 3. Fixes

### F1 — Mobile menu dropdown ran past the bottom of the screen (landscape phones)

At 844×390 the opened panel was **100 → 409px** in a 390px viewport. The
"Order Now" row ended at 384px and the panel's own background continued to
409px, so the last rows sat under the bottom edge with no way to reach them
(the header does not scroll).

Fixed with `max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain` on the
panel.

* 844×390: panel now **100 → 378px**, `scrollHeight 308 / clientHeight 277`, so
  its content scrolls inside a box that is fully on screen.
* 320×568: panel 84 → 393px, content 308px — no scrolling needed, unchanged
  appearance.

### F2 — Hero copy sat under the fixed header in short viewports

At 844×390 the eyebrow started at **65px** with a **103px** fixed header, so the
eyebrow and the top of the H1 were behind the navbar. The copy block also ended
at 309px while the scroll cue started at 298px — an **11px overlap**.

Below 560px of viewport height the hero now:

* tightens padding (top 108px / bottom 16px) and type scale;
* keeps the eyebrow visible at 10px;
* puts the scroll cue back **in the flow under the CTA** (`position: static`).

| | before | after |
| --- | --- | --- |
| eyebrow top (header 103) | 65 | **155** |
| copy block bottom | 309 | 278 (CTA) |
| cue top | 298 | 284 |
| copy ↔ cue overlap | 11px | **0** |

932×430 resolves the same way (eyebrow 175, CTA 298, cue 304). Above 560px
height nothing changes — the cue stays pinned to the bottom of the hero.

### F3 — Our Story beats overlapped

Both beats stay on screen by design, so they have to share one viewport height.

* **844×390:** the two copy blocks overlapped by **29px vertically** and 186px
  horizontally (paragraph boxes x 32–480 and x 294–806) — paragraph text printed
  over paragraph text.
* **320×568:** **55px vertical overlap** (the 274px-wide column wraps into many
  more lines, so the block is taller).

Below 560px of height **or** below 360px of width, the copy is compacted
(13px body, 26px heading, tighter margins, 20rem/23rem columns, top padding kept
clear of the header). Measured settled positions:

| viewport | beat 1 | beat 2 | gap |
| --- | --- | --- | --- |
| 844×390 | 108–253 | 259–382 | **6px** |
| 932×430 | 108–253 | 299–422 | **46px** |
| 320×568 | 108–254 | 418–560 | **164px** |

All measured sizes now clear the header (beat 1 top ≥ header height) and stay
inside the stage. 360×640, 375×667, 390×844, 430×932 and every desktop size use
the untouched layout.

### F4 — Pinned menu stage was cut off in landscape

The desktop presentation needs ~480px of height (420px of stage content plus
padding). At 844×390 the content was **420px in a 390px frame — 33px cut off at
the bottom**, with the first row pushed above the top edge.

The presentation is now chosen by width *and* height:

* `≥ 768px` wide and `> 480px` tall → pinned desktop stage (unchanged);
* otherwise → the single-column list, which scrolls with the page.

The desktop scroll tracker already bails out when its heading has zero height
(`headingRect.height === 0`), and the mobile cards are revealed by their own
IntersectionObserver regardless of width, so only one system runs at a time and
nothing had to change in the JS.

Verified: 1024×768 (472 ≤ 768) and 768×1024 (420 ≤ 1024) still pinned and
fitting; 844×390 and 932×430 show the 11-card list.

### F5 — Featured dish ring clipped at the stage edge

The ring radius `0.36 × stageWidth` pushed the outermost dish past the stage's
rounded `overflow-hidden` frame on phones up to ~430px wide:

| stage width | radius before | overhang before | radius after | overhang after |
| --- | --- | --- | --- | --- |
| 282px (320 viewport) | 101.5 | **11.5px** | 79 | **0** |
| 337px (375 viewport) | 121.3 | **2.9px** | 107 | **0** |
| 352px (390 viewport) | 126.7 | 0.5px | 114 | **0** |
| 392px (430 viewport) | 141.1 | **5.8px** | 134 | **0** |
| 698px (768 viewport) | 265.2 | 0 | 265 | **0** |
| 922px (1024 viewport) | 330 (capped) | 0 | 330 | **0** |

The radius is now additionally clamped to `stageWidth / 2 − imageHalfWidth − 6`,
so the dish box always stays inside the frame. Angular timing, stagger, scales
and the logo hub are unchanged. ("Before" overhang is computed from the old
radius formula and the measured image boxes; the fixed radius and the resulting
0px overhang are measured from the rendered stage.)

### F6 — Footer tap targets below the 24px minimum

Footer text links were 15–17px tall (WCAG 2.5.8 asks for 24×24). After adding
vertical padding and tightening the list gap:

| element | before | after |
| --- | --- | --- |
| EXPLORE links (×4) | 15px | **28px** |
| phone link | 16px | **24px** |
| "Return to Top" | 17px | **25px** |
| social buttons | 32px | 32px |

Footer column layout itself was correct (1 column at 320, 2 at 768/844, 4 at
1024+) and no column overflows its cell.

### F7 — Anchor jumps landed under the fixed header

`#story`, `#signature`, `#menu` and `#experience` scrolled their section top to
y=0, i.e. underneath the 103px header (87px on phones). Added
`scroll-margin-top: 6.5rem` (5.5rem below 640px) — measured as **104px / 88px**
computed.

### F8 — Second Our Story frame layer had no `src`

The back buffer `<img>` was rendered without a source (an empty, "broken" image
in the asset audit). It now starts on frame 0 like the front layer; the
double-buffer swap logic is unaffected.

---

## 4. Per-viewport results

`scrollW` is the document scroll width with `overflow-x` unmasked;
`innerWidth − 6` is the usable width, so every value below means **no
horizontal page overflow**. "hero" = eyebrow clears the header and CTA/cue do
not overlap; "story" = beat 1 / beat 2 vertical ranges within the stage.

| Viewport | scrollW | Header | Hero copy | Menu | Dish overhang | Story beats (gap) | Footer min tap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1920×1080 | 1914 | 103 | clear, no overlap | pinned, fits (472 ≤ 1080) | 0 | 144–374 / 813–1024 (439) | 24 |
| 1440×900 | 1434 | 103 | clear | pinned, fits | 0 | 144–374 / 633–844 (259) | 24 |
| 1280×800 | 1274 | 103 | clear | pinned, fits | 0 | 144–374 / 533–744 (159) | 24 |
| 1024×768 | 1018 | 103 | clear | pinned, fits | 0 | 144–374 / 501–712 (127) | 24 |
| 768×1024 | 762 | 103 | clear | pinned, fits (420 ≤ 1024) | 0 | 128–364 / 793–984 (429) | 24 |
| 430×932 | 424 | 87 | clear | list (11 cards) | 0 | 112–311 / 706–900 (395) | 24 |
| 390×844 | 384 | 87 | clear | list | 0 | 112–311 / 618–812 (307) | 24 |
| 375×812 | 369 | 87 | clear | list | 0 | 112–337 / 586–780 (249) | 24 |
| 320×568 | 314 | 87 | clear | list | 0 | 108–254 / 418–560 (164) | 24 |
| 844×390 (landscape) | 838 | 103 | clear, cue in flow | list (was cut off) | 0 | 108–253 / 259–382 (6) | 24 |
| 932×430 (landscape) | 926 | 103 | clear, cue in flow | list | 0 | 108–253 / 299–422 (46) | 24 |

Additional checks that passed at every size:

* zero elements crossing the viewport edge without a clipping ancestor;
* no Vite error overlay in any run;
* the menu modal at 320×568 and 844×390 is 90vh-capped, internally scrollable,
  has no horizontal overflow, a 36×36 close button at the top-right and its
  CTA reachable by scrolling;
* mobile menu: `aria-expanded` flips correctly, links are 37–40px tall,
  "Order Now" is 40px;
* the Our Story `100vh` sticky and the hero `h-screen` stage were re-measured
  at every size; the testimonials deck was not modified in this pass (its
  earlier measurements still apply).

---

## 5. Browser-measured vs code-reviewed

**Measured in a live render (numbers above):** horizontal overflow at all 11
sizes; hero header/CTA/cue geometry; Our Story beat positions and gaps; menu
presentation selection and pinned-stage fit; dish-ring overhang; mobile
dropdown size and scrolling; footer tap-target heights and column counts;
anchor scroll margins; modal size/scrollability; absence of the error overlay.

**Code-reviewed only (not exercised in a browser here):**

* `prefers-reduced-motion` paths — `matchMedia('(prefers-reduced-motion:
  reduce)')` in hero, story, menu and testimonials, plus the CSS fallback at
  `index.css:195`. The harness cannot emulate the media feature, so these were
  not re-tested in this pass; their code was not modified.
* The dish-ring *animation* (rAF is frozen in a hidden document). The ring
  geometry was verified by computing positions from the same constants the
  component uses, and the radius clamp is a pure arithmetic change.
* Keyboard traversal and focus rings — the app has no global `outline: none`
  (only the unused `ReservationSection.jsx` sets it), so default focus
  indicators remain; not tabbed through here.
* Real touch devices, iOS/Safari `100dvh` behaviour and momentum scrolling.
* `npm run build` and `npx tsc --noEmit` pass (last build 18.68s).

---

## 6. Remaining / unverified

1. **Screenshots were not possible** (hidden preview tab). Everything is
   measured, not eyeballed; colour/contrast work from the earlier reports is
   unchanged by this pass.
2. **844×390 story gap is only 6px.** It is positive and both blocks are inside
   the stage, but a longer paragraph edit would re-introduce a collision; the
   compaction values are the tuning point if that copy changes.
3. **Menu card descriptions are clamped to one line** in both the list and the
   modal (existing design). Nothing is cut off horizontally, but the second
   line of a description is only available by design change, not by this fix.
4. `body { overflow-x: hidden }` is still in `index.css`. The audit was run with
   it disabled and found no page overflow at any size, so nothing depends on
   it; it is retained only as a safety net.
5. Pre-existing, untouched: footer social links use `href="#social"`, the footer
   carries the "editable placeholders" line, and the testimonial deck is long on
   mobile.
6. Landscape-only compaction (hero type, story type) is applied below 560px
   height, which also covers short desktop windows. It is intentional and
   reversible at that single breakpoint.
