import React, { useEffect, useRef } from 'react';
import { Quote } from 'lucide-react';

/**
 * Words of Appreciation — stacked testimonial deck (Courses-style), 5 cards.
 *
 * The whole effect is pure CSS — no scroll listeners, no GSAP:
 *  - Each testimonial sits in a 90vh panel that is `position: sticky` with
 *    `top: 5vh`. The card is flex-centred inside that panel, so it always
 *    settles exactly on the viewport centre line (5vh + 90vh / 2 = 50vh),
 *    no matter how long the quote is.
 *  - The panels pin one after another, so the incoming card slides up into the
 *    same central position and covers the previous card. z-index grows per card,
 *    guaranteeing each incoming card paints above the one before it.
 *  - A small per-card `--stack-offset` (-36 / -18 / 0 / +18 / +36px) staggers the
 *    pile, so earlier cards keep a visible top edge instead of vanishing
 *    completely while the pile as a whole stays vertically centred.
 *  - The first panel only is shortened (top 15vh / height 70vh, see the
 *    `:first-child` rule in src/index.css) so the first card sits closer to the
 *    section heading while still settling on the 50vh centre line.
 *  - The 40vh spacer after the last panel lets the last card hold for a moment
 *    before the whole deck is released and normal page scrolling resumes.
 *  - prefers-reduced-motion (and viewports shorter than 560px, where a card may
 *    not fit inside a panel) falls back in CSS to a plain centred column with
 *    nothing pinned — all five testimonials stay fully readable.
 *
 * A muted looping film (an 8 s Cloudinary clip of miniature chefs preparing
 * biryani) sits behind the deck. A sticky, viewport-sized wrapper keeps it at
 * 100vh while the ~5-viewport section scrolls past, `object-cover` crops it to
 * every screen, and the tint / top / bottom / vignette stack fades it into the
 * section above (#08090a) and the footer below (#070708) with no visible edge.
 * Playback is gated by IntersectionObserver so the 1.8 MB clip stays off the
 * critical path of the hero frames.
 *
 * See the `.testimonial-stack*` rules in src/index.css.
 */
const STACK_STAGGER = 18; // px each card sits below the previous card in the pile

/* Ambient film behind the deck. Muted, looping, no controls — it is decoration,
   so it is marked aria-hidden and can never take pointer events or focus. */
const TESTIMONIAL_VIDEO =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/v1792497626/Miniature_chefs_preparing_biryani_20261020165447.mp4';

/* Card shell — identical for all five cards: same padding, radius, shadow and
   internal structure. Only the colour theme alternates. */
const CARD_BASE =
  'testimonial-stack__card w-full max-w-[22rem] md:max-w-[18rem] lg:max-w-[22rem] mx-auto flex flex-col justify-between p-6 sm:p-7 rounded-lg relative transition-colors shadow-[0_24px_50px_-28px_rgba(0,0,0,0.95)]';

/**
 * The two alternating card themes. Both are built only from colours already
 * used by this section, so no new palette is introduced:
 *
 *  A — cards 1, 3, 5 (original testimonial theme)
 *      charcoal card #121316, #232019 border, muted gold quote mark (#d4af37/30),
 *      warm off-white quote text #ece5d8, #221f18 divider, neutral-400 meta.
 *
 *  B — cards 2 and 4 (gold-accented counterpart)
 *      warm card #1f1d18 (the section's own border colour), gold border
 *      #d4af37/40, brighter gold quote mark (#d4af37/60), heading white
 *      #f6efe4 quote text, gold-tinted divider (#d4af37/20), neutral-400 meta.
 *
 * Contrast on the B surface: #f6efe4 on #1f1d18 ≈ 14:1, #f2e6cf ≈ 13:1,
 * neutral-400 ≈ 6:1 — all comfortably legible.
 */
const CARD_THEMES = [
  {
    card: 'bg-[#121316] border border-[#232019] hover:border-[#d4af37]/40',
    mark: 'text-[#d4af37]/30',
    quote: 'text-[#ece5d8]',
    divider: 'border-[#221f18]',
    publication: 'text-[#f2e6cf]',
    /* neutral-400 (#a3a3a3) is 7.36:1 on #121316; neutral-500 was 3.92:1. */
    meta: 'text-neutral-400',
  },
  {
    card: 'bg-[#1f1d18] border border-[#d4af37]/40 hover:border-[#d4af37]/70',
    mark: 'text-[#d4af37]/60',
    quote: 'text-[#f6efe4]',
    divider: 'border-[#d4af37]/20',
    publication: 'text-[#f2e6cf]',
    meta: 'text-neutral-400',
  },
];

export const Testimonials = () => {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);

  /* Playback is gated on two things so the 1.8 MB clip never fights the hero
     frames for bandwidth at first paint, and never runs off-screen:
       1. IntersectionObserver — only buffer/play within one viewport of the
          section (preload is "metadata", so only the header bytes stream before).
       2. prefers-reduced-motion — pause, leaving the section on its dark base.
     A blocked autoplay (battery saver, strict policy) leaves the first decoded
     frame in place, which is why the failure path is silent. */
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return undefined;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let near = false;

    const applyPlayback = () => {
      if (near && !motionQuery.matches) {
        const attempt = video.play();
        if (attempt && typeof attempt.catch === 'function') {
          attempt.catch(() => {});
        }
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        near = entries.some((entry) => entry.isIntersecting);
        applyPlayback();
      },
      /* Start loading a little before the deck arrives, keep playing for as long
         as any part of the section is on screen. */
      { rootMargin: '100% 0px' },
    );

    /* Deep links (#experience) and restored scroll positions can mount with the
       section already on screen, before the observer's first delivery. */
    const rect = section.getBoundingClientRect();
    near = rect.top < window.innerHeight * 2 && rect.bottom > -window.innerHeight;
    applyPlayback();

    observer.observe(section);
    motionQuery.addEventListener('change', applyPlayback);

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener('change', applyPlayback);
    };
  }, []);

  /*
   * Placeholder content only. No real guest comment or press endorsement has
   * been supplied, so each card says exactly that. Quote lengths stay close to
   * the previous set so the measured card heights in the stacked deck hold.
   */
  const testimonials = [
    {
      id: '1',
      quote:
        'Sample guest feedback placeholder. A real comment from a diner will appear here once it has been collected and approved for publication by the restaurant. Until then, this card stands in for a genuine review.',
      publication: 'Guest Review Placeholder',
      role: 'Sample Feedback',
      context: 'Not a real review',
    },
    {
      id: '2',
      quote:
        'Guest review placeholder. This card is reserved for a verified comment from a real visitor, and no such comment has been supplied yet. When one is available, it will replace this text.',
      publication: 'Guest Review Placeholder',
      role: 'Sample Feedback',
      context: 'Not a real review',
    },
    {
      id: '3',
      quote:
        'This is placeholder text, not a customer quote. It will be replaced with a real guest comment when one is available and cleared for publication. No endorsement is implied by this card or its placement.',
      publication: 'Guest Review Placeholder',
      role: 'Sample Feedback',
      context: 'Not a real review',
    },
    {
      id: '4',
      quote:
        'Sample feedback placeholder. Nothing on this card comes from a diner, and no review has been collected for it yet. A real comment will appear here once the restaurant has one to publish.',
      publication: 'Guest Review Placeholder',
      role: 'Sample Feedback',
      context: 'Not a real review',
    },
    {
      id: '5',
      quote:
        'Placeholder review. The words above are not a guest\u2019s own, and no real comment has been provided for this card. It will be replaced when a verified comment is available for publication.',
      publication: 'Guest Review Placeholder',
      role: 'Sample Feedback',
      context: 'Not a real review',
    },
  ];

  /* Left column takes the even indexes (1, 3, 5), right the odd (2, 4). The
     per-column counts drive each pile's centring offset. */
  const leftColumnCount = Math.ceil(testimonials.length / 2);
  const rightColumnCount = testimonials.length - leftColumnCount;

  return (
    <section
      ref={sectionRef}
      id="experience"
      className="relative py-14 sm:py-20 px-6 sm:px-12 bg-[#0a0b0d] border-t border-[#1f1d18]"
    >
      {/* Ambient film. The sticky wrapper keeps the clip exactly one viewport
          tall while the ~5-viewport card deck scrolls past — stretching it over
          the whole section would crop the frame to a useless sliver. It sticks
          at the section's top edge, so the edge blends always line up with the
          section boundaries, not with the middle of the scroll.

          The picture is deliberately left untinted: only the two seam blends and
          a whisper-thin vignette sit over it, so the room, the chefs and the
          biryani stay legible. Text contrast is handled locally, behind the
          heading only (see the scrim in the copy block below). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <video
            ref={videoRef}
            src={TESTIMONIAL_VIDEO}
            className="absolute inset-0 h-full w-full object-cover scale-[1.015] brightness-[1.08] saturate-[1.03] contrast-[1.02]"
            muted
            loop
            playsInline
            preload="metadata"
            tabIndex={-1}
            disablePictureInPicture
          />

          {/* Top seam: a short pass from the section above (#08090a) that clears
              long before the cards, so only the very top edge is darkened. */}
          <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,#08090a_0%,rgba(8,9,10,0.62)_45%,transparent_100%)]" />

          {/* Bottom seam: settles into the footer colour (#070708). */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_top,#070708_0%,rgba(7,7,8,0.58)_45%,transparent_100%)]" />

          {/* Vignette: barely there, just enough to stop the bright frame from
              bleeding flat into the page edges. */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_96%_88%_at_50%_46%,transparent_58%,rgba(8,9,10,0.30)_100%)]" />
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Reduced bottom margin (was mb-16) keeps the heading close to the first
            card; the first panel is also shorter so the card starts nearer the top.
            The scrim is local to this block — it is the only copy that sits
            directly on the film, so it is the only place that needs one. */}
        <div className="relative text-center max-w-2xl mx-auto mb-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -inset-y-14 -z-10 bg-[radial-gradient(ellipse_75%_85%_at_50%_46%,rgba(6,7,9,0.92)_0%,rgba(6,7,9,0.82)_42%,rgba(6,7,9,0.42)_68%,transparent_84%)]"
          />

          <div className="flex items-center justify-center gap-2 text-xs font-cinzel tracking-[0.3em] text-[#d4af37] uppercase mb-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            <span>Guest Feedback</span>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <span>Review Placeholders</span>
          </div>
          <h2 className="font-serif-luxury text-4xl sm:text-5xl text-[#f6efe4] font-normal tracking-tight mb-4 drop-shadow-[0_3px_18px_rgba(0,0,0,0.95)]">
            Words of Appreciation
          </h2>
          <p className="text-xs text-neutral-300 font-sans drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            Note: The cards below are placeholders, not real guest reviews or press endorsements.
          </p>
        </div>

        {/* Stacked scroll deck. Cards alternate left / right so the film stays
            open down the centre: 1, 3, 5 pile on the left, 2 and 4 on the right.
            Each column keeps its own small stagger, so the incoming card covers
            the previous one but leaves a top edge showing — the same stacking
            behaviour as before, just split across two columns. */}
        <div className="testimonial-stack">
          {testimonials.map((item, index) => {
            const theme = CARD_THEMES[index % CARD_THEMES.length];

            const isLeft = index % 2 === 0;
            const columnCount = isLeft ? leftColumnCount : rightColumnCount;
            const columnIndex = isLeft ? index / 2 : (index - 1) / 2;

            return (
              <div
                key={item.id}
                className={`testimonial-stack__item testimonial-stack__item--${isLeft ? 'left' : 'right'}`}
                style={{
                  // Later cards paint above earlier cards.
                  zIndex: index + 1,
                  // Staggered around 0 inside its own column, so each pile stays
                  // vertically centred: left -18 / 0 / +18, right -9 / +9.
                  '--stack-offset': `${(columnIndex - (columnCount - 1) / 2) * STACK_STAGGER}px`,
                }}
              >
                <div className={`${CARD_BASE} ${theme.card}`}>
                  <div>
                    <Quote className={`w-7 h-7 mb-4 ${theme.mark}`} />
                    <p className={`font-serif-luxury text-base lg:text-lg italic leading-[1.65] mb-5 ${theme.quote}`}>
                      &ldquo;{item.quote}&rdquo;
                    </p>
                  </div>

                  <div className={`border-t pt-4 ${theme.divider}`}>
                    <div className={`font-cinzel text-xs font-bold tracking-[0.15em] uppercase mb-1 ${theme.publication}`}>
                      {item.publication}
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-sans ${theme.meta}`}>
                      <span>{item.role}</span>
                      <span aria-hidden="true">·</span>
                      <span className="italic">{item.context}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Scroll runway: the last card stays pinned for this distance before
              the whole deck is released and normal scrolling continues. */}
          <div aria-hidden="true" className="testimonial-stack__spacer h-[40vh]" />
        </div>
      </div>
    </section>
  );
};
