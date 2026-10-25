import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

/**
 * Words of Appreciation: one card per side, with independent sequences.
 *
 * The heading stays in normal section flow. Below it, the biryani film spans
 * the full section width at a reduced height. One glass card sits on the left
 * and one on the right, leaving the centre open. The cards tilt inward with a
 * restrained perspective and flatten on hover or keyboard focus.
 *
 * The left sequence contains cards 1-3; the right sequence contains cards 4-5.
 * `leftIndex` and `rightIndex` are separate state values. Each side's arrow
 * advances only that side and wraps within its own sequence. No autoplay.
 *
 * The film keeps its source, muted/loop/playsInline flags and its
 * IntersectionObserver playback gate. `object-fit: cover` crops the frame to
 * the full-width band, with a bottom-biased focal point that keeps the copper
 * bowl and its base visible. No tint, gradient, vignette or filter is applied;
 * the glass cards carry the contrast.
 */
const TESTIMONIAL_VIDEO =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/v1792855493/Creating_commercial_video_of_burger_20261024202438.mp4';

const CARD_BASE =
  'testimonial-card relative flex flex-col overflow-hidden rounded-xl';

/* Placeholder content only. No real guest comment or press endorsement has
   been supplied, so every card says exactly that. The copy is unchanged. */
const TESTIMONIALS = [
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

const TOTAL = TESTIMONIALS.length;
const LEFT_TESTIMONIALS = TESTIMONIALS.slice(0, 3);
const RIGHT_TESTIMONIALS = TESTIMONIALS.slice(3);

const TestimonialCard = ({ item, index, side, position, sequenceTotal }) => (
  <article
    tabIndex={0}
    aria-label={`${side === 'right' ? 'Right' : 'Left'} testimonial ${position} of ${
      sequenceTotal
    } (entry ${index + 1} of ${TOTAL}): ${item.publication}. ${item.role}. ${
      item.context
    }.`}
    className={`${CARD_BASE} testimonial-card--${side}`}
  >
    <div className={`testimonial-card__body testimonial-card__body--${side}`}>
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <Quote aria-hidden="true" className="h-7 w-7 shrink-0 text-[#d4af37]/55" />
          <span
            aria-hidden="true"
            className="font-cinzel text-[10px] tracking-[0.2em] text-[#d4af37]/80"
          >
            {String(index + 1).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')}
          </span>
        </div>
        <p className="mb-5 font-serif-luxury text-[0.95rem] italic leading-[1.62] text-[#f6efe4] lg:text-base">
          &ldquo;{item.quote}&rdquo;
        </p>
      </div>

      <div className="border-t border-[#d4af37]/20 pt-4">
        <div className="mb-1 font-cinzel text-[11px] font-bold uppercase tracking-[0.15em] text-[#f4e7ce]">
          {item.publication}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs text-[#ddd6c8]">
          <span>{item.role}</span>
          <span aria-hidden="true">·</span>
          <span className="italic">{item.context}</span>
        </div>
      </div>
    </div>
  </article>
);

export const Testimonials = () => {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(0);

  const leftItem = LEFT_TESTIMONIALS[leftIndex];
  const rightItem = RIGHT_TESTIMONIALS[rightIndex];
  const showNextLeft = () =>
    setLeftIndex((index) => (index + 1) % LEFT_TESTIMONIALS.length);
  const showNextRight = () =>
    setRightIndex((index) => (index + 1) % RIGHT_TESTIMONIALS.length);

  /* Playback is gated on two things so the 2.3 MB clip never fights the hero
     frames for bandwidth at first paint, and never runs off-screen:
       1. IntersectionObserver: only buffer/play within one viewport of the
          section (preload is "metadata", so only the header bytes stream before).
       2. prefers-reduced-motion: pause, leaving the section on its dark base.
     The film is a reduced-height layer inside this section. A blocked autoplay
     (battery saver, strict policy) leaves the first decoded frame in place,
     which is why the failure path is silent. */
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

  return (
    <section
      ref={sectionRef}
      id="experience"
      aria-labelledby="testimonials-heading"
      className="relative isolate overflow-hidden border-t border-[#1f1d18] bg-[#0a0b0d]"
    >
      <div className="testimonial-header relative z-10 mx-auto max-w-3xl px-6 pt-12 pb-8 text-center sm:px-12 sm:pt-16 sm:pb-10">
        <p className="mb-3 font-cinzel text-[11px] uppercase tracking-[0.2em] text-[#ead9ac] sm:text-xs sm:tracking-[0.3em]">
          Guest Feedback{' '}
          <span aria-hidden="true" className="text-[#ead9ac]/55">
            ·
          </span>{' '}
          Review Placeholders
        </p>
        <h2
          id="testimonials-heading"
          className="mb-4 font-serif-luxury text-4xl font-normal tracking-tight text-[#f6efe4] sm:text-5xl"
        >
          Words of Appreciation
        </h2>
        <p className="font-sans text-xs text-neutral-200">
          Note: The cards below are placeholders, not real guest reviews or press endorsements.
        </p>
      </div>

      <div className="testimonial-stage">
        {/* The reduced-height film spans the section edge to edge. The 16:9
            burger footage is cropped vertically on wide screens, so the crop
            is centered on the burger rather than biased toward the table.
            No overlay or filter. */}
        <div aria-hidden="true" className="testimonial-film">
          <video
            ref={videoRef}
            src={TESTIMONIAL_VIDEO}
            className="testimonial-film__video"
            muted
            loop
            playsInline
            preload="metadata"
            tabIndex={-1}
            disablePictureInPicture
          />
        </div>

        <div className="testimonial-stage__grid mx-auto max-w-6xl px-6 sm:px-12">
          <div
            role="group"
            aria-label="Left testimonial"
            className="testimonial-column testimonial-column--left"
          >
            <TestimonialCard
              key={leftItem.id}
              item={leftItem}
              index={leftIndex}
              side="left"
              position={leftIndex + 1}
              sequenceTotal={LEFT_TESTIMONIALS.length}
            />
          </div>

          <div className="testimonial-nav testimonial-nav--left">
            <button
              type="button"
              onClick={showNextLeft}
              className="testimonial-arrow"
              aria-label="Show next left testimonial"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <div className="testimonial-stage__center" aria-hidden="true" />

          <div
            role="group"
            aria-label="Right testimonial"
            className="testimonial-column testimonial-column--right"
          >
            <TestimonialCard
              key={rightItem.id}
              item={rightItem}
              index={LEFT_TESTIMONIALS.length + rightIndex}
              side="right"
              position={rightIndex + 1}
              sequenceTotal={RIGHT_TESTIMONIALS.length}
            />
          </div>

          <div className="testimonial-nav testimonial-nav--right">
            <button
              type="button"
              onClick={showNextRight}
              className="testimonial-arrow"
              aria-label="Show next right testimonial"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          Showing left testimonial {leftIndex + 1} of {LEFT_TESTIMONIALS.length} and
          right testimonial {rightIndex + 1} of {RIGHT_TESTIMONIALS.length}.
        </p>
      </div>
    </section>
  );
};
