import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Our Story — scroll-scrubbed kitchen sequence.
 *
 * The section is a tall track with a pinned full-bleed stage, exactly like the
 * hero walkthrough: scrolling does not move the stage, it scrubs the 56-frame
 * kitchen sequence underneath the copy. The pin releases on its own once the
 * last frame is reached, and the page continues into the menu.
 *
 * The copy is not stacked above the footage any more. It is overlaid on it in
 * two beats driven by the same progress value:
 *   1. "Our Story" + the first paragraph on the left, in from the start;
 *   2. the flavour paragraph at the bottom right, in once the scrub is halfway.
 * Both stay on screen until the section releases.
 *
 * Frames are 1280×720 and ~36 KB each (≈2 MB for the set), so the whole
 * sequence is warmed up front; the two stacked <img> layers still only swap
 * once the incoming frame has decoded, so a scrub never shows a blank stage.
 */

const FRAME_COUNT = 56;
/** 56 × 2 vh = 112 vh of pinned travel (the track is 212 vh tall). */
const SCROLL_VH_PER_FRAME = 2;

/** Reveal windows in progress (0 → 1 across the pinned travel). */
const STORY_IN = [0.02, 0.12];
const FLAVOUR_IN = [0.46, 0.62];
const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);
const smoothstep = (t) => t * t * (3 - 2 * t);
const windowMix = (progress, [from, to]) => smoothstep(clamp01((progress - from) / (to - from)));

const frameSrc = (index) =>
  `/video-frames-second/ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`;

export const WelcomeStory = () => {
  const trackRef = useRef(null);
  const frameLayersRef = useRef({ a: null, b: null });
  const activeFrameRef = useRef('a');
  const requestedIndexRef = useRef(0);
  const lastGoodIndexRef = useRef(0);
  const storyCopyRef = useRef(null);
  const flavourCopyRef = useRef(null);
  const rafRef = useRef(0);
  const reducedMotionRef = useRef(false);

  /**
   * Double-buffered frame swap: the next frame loads into the hidden layer and
   * only replaces the visible one once it has decoded. A failed request leaves
   * the current frame on screen and lets the next scroll retry.
   */
  const showFrame = useCallback((rawIndex) => {
    const safe = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(rawIndex)));
    if (safe === requestedIndexRef.current) return;
    requestedIndexRef.current = safe;

    const activeKey = activeFrameRef.current;
    const nextKey = activeKey === 'a' ? 'b' : 'a';
    const next = frameLayersRef.current[nextKey];
    const current = frameLayersRef.current[activeKey];
    if (!next || !current) return;

    const target = frameSrc(safe);
    const reveal = () => {
      if (requestedIndexRef.current !== safe) return;
      if (next.getAttribute('src') !== target) return;
      next.style.opacity = '1';
      current.style.opacity = '0';
      activeFrameRef.current = nextKey;
      lastGoodIndexRef.current = safe;
    };

    next.onload = reveal;
    next.onerror = () => {
      if (requestedIndexRef.current !== safe) return;
      requestedIndexRef.current = lastGoodIndexRef.current;
    };
    next.src = target;

    if (next.complete && next.naturalWidth > 0 && next.currentSrc.endsWith(target)) {
      reveal();
    }
  }, []);

  /* Warm the whole sequence once; it is small and this keeps the scrub smooth. */
  useEffect(() => {
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      const image = new Image();
      image.decoding = 'async';
      image.src = frameSrc(index);
    }
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => {
      reducedMotionRef.current = motionQuery.matches;
    };
    syncMotion();

    const update = () => {
      const track = trackRef.current;
      if (!track) return;

      const scrollDistance = track.offsetHeight - window.innerHeight;
      const rect = track.getBoundingClientRect();
      const progress = scrollDistance > 0 ? clamp01(-rect.top / scrollDistance) : 0;

      showFrame(progress * (FRAME_COUNT - 1));

      const reducedMotion = reducedMotionRef.current;

      /* The left copy also fades in while the section is still coming up the
         viewport, so it is already in place when the stage pins instead of
         blinking in a moment later. */
      const entry = clamp01((window.innerHeight - rect.top) / (window.innerHeight * 0.45));
      const story = reducedMotion
        ? 1
        : Math.max(entry, windowMix(progress, STORY_IN));
      const flavour = reducedMotion
        ? progress >= FLAVOUR_IN[0]
          ? 1
          : 0
        : windowMix(progress, FLAVOUR_IN);

      const storyCopy = storyCopyRef.current;
      if (storyCopy) {
        storyCopy.style.opacity = String(story);
        storyCopy.style.transform = reducedMotion
          ? 'none'
          : `translateY(${(18 * (1 - story)).toFixed(2)}px)`;
      }

      const flavourCopy = flavourCopyRef.current;
      if (flavourCopy) {
        flavourCopy.style.opacity = String(flavour);
        flavourCopy.style.transform = reducedMotion
          ? 'none'
          : `translateY(${(18 * (1 - flavour)).toFixed(2)}px)`;
      }
    };

    /* Coalesce scroll events into one rAF pass; re-post on every event so the
       loop cannot wedge if a frame is skipped. */
    const schedule = () => {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        update();
      });
    };

    const onMotionChange = () => {
      syncMotion();
      schedule();
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    motionQuery.addEventListener?.('change', onMotionChange);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      motionQuery.removeEventListener?.('change', onMotionChange);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [showFrame]);

  return (
    <section
      id="story"
      ref={trackRef}
      className="relative w-full bg-[#090a0c]"
      style={{ height: `${100 + FRAME_COUNT * SCROLL_VH_PER_FRAME}vh` }}
      aria-label="Our Story"
    >
      {/* Pinned stage — full-bleed, so the whole sequence is the section, not a
          picture in the right-hand column. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#090a0c]">
        <img
          ref={(node) => {
            frameLayersRef.current.a = node;
          }}
          src={frameSrc(0)}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          style={{ opacity: 1 }}
        />
        <img
          ref={(node) => {
            frameLayersRef.current.b = node;
          }}
          src={frameSrc(0)}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          style={{ opacity: 0 }}
        />

        {/* A light grade only; the footage is already dark (~48–70 luma). */}
        <div className="absolute inset-0 pointer-events-none bg-black/10" />

        {/* Left wash: carries the "Our Story" copy without flattening the
            kitchen behind it. */}
        <div className="absolute inset-y-0 left-0 w-[78%] pointer-events-none bg-[linear-gradient(to_right,rgba(9,10,12,0.66)_0%,rgba(9,10,12,0.34)_42%,transparent_100%)]" />

        {/* Bottom-right wash for the flavour copy. */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_62%_48%_at_100%_100%,rgba(9,10,12,0.7)_0%,rgba(9,10,12,0.34)_55%,transparent_84%)]" />

        {/* Short blend under the fixed header, as in the hero. */}
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none bg-[linear-gradient(to_bottom,rgba(9,10,12,0.92)_0%,rgba(9,10,12,0.5)_58%,transparent_100%)]" />

        {/* Beat 1 — left copy, in from the first pixels of the scrub. */}
        <div className="story-beat story-beat--primary absolute inset-0 z-20 flex items-start px-5 sm:px-8 lg:px-14 xl:px-20 pt-28 sm:pt-32 lg:pt-36 pointer-events-none">
          <div
            ref={storyCopyRef}
            className="max-w-[21rem] sm:max-w-md lg:max-w-xl will-change-[opacity,transform]"
            style={{ opacity: 0, transform: 'translateY(18px)' }}
          >
            <div className="story-eyebrow inline-flex items-center gap-2.5 text-[11px] sm:text-sm font-cinzel tracking-[0.3em] text-[#d4af37] uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              <span className="w-8 h-px bg-[#d4af37]/60" />
              <span>Sanctuary of Hospitality</span>
            </div>

            <h2 className="mt-3 sm:mt-4 font-serif-luxury text-4xl sm:text-5xl lg:text-6xl text-[#fffdfa] font-normal tracking-tight leading-[1.15] drop-shadow-[0_3px_18px_rgba(0,0,0,0.95)]">
              Our Story
            </h2>

            <p className="mt-4 sm:mt-5 border-l-2 border-[#d4af37]/50 pl-4 sm:pl-5 text-[#f0e9dd] font-serif-luxury text-base sm:text-lg lg:text-xl leading-relaxed font-light italic drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
              Every great meal carries an essence — the subtle aroma of spices, the richness of
              texture, and the warmth of shared moments. It is the heart of human connection, of
              community, and of life’s simple pleasures.
            </p>
          </div>
        </div>

        {/* Beat 2 — bottom-right copy, in once the scrub is halfway. */}
        <div className="story-beat story-beat--secondary absolute inset-0 z-20 flex items-end justify-end px-5 sm:px-8 lg:px-14 xl:px-20 pb-8 sm:pb-10 lg:pb-14 pointer-events-none">
          <div
            ref={flavourCopyRef}
            className="max-w-[21rem] sm:max-w-lg lg:max-w-xl text-right will-change-[opacity,transform]"
            style={{ opacity: 0, transform: 'translateY(18px)' }}
          >
            <p className="border-r-2 border-[#d4af37]/50 pr-4 sm:pr-5 text-[#ece4d7] font-serif-luxury text-base sm:text-lg lg:text-xl leading-relaxed font-light italic drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
              ‘Pearl Oasis’ unveils a vibrant tapestry of flavors in Kohat: an exceptional fusion of
              authentic Pakistani heritage, refined Chinese specialties, and artisan fast food,
              served with devoted precision to every detail of taste, service, and atmosphere.
            </p>

            <p className="mt-3 sm:mt-4 text-[#c2baac] font-serif-luxury text-base sm:text-lg lg:text-xl leading-relaxed font-light drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
              Pearl Oasis is a sanctuary for families, a venue for celebrations, and a space for
              cherished conversations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
