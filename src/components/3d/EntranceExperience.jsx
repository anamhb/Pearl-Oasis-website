import React, { useCallback, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const BASE = import.meta.env.BASE_URL || '/';

/**
 * One continuous, scroll-driven walkthrough.
 *
 * The merged sequence in /public/video-frames-final holds both halves of the
 * walk (ezgif-frame-001 ... -299, 1920x1080, 299 contiguous files):
 *
 *   frames 1 - 161   restaurant entrance  (exterior → glass doors)
 *   frames 162 - 299 the grand dining hall (inside the room)
 *
 * Scroll position - not elapsed time - is the only source of truth: it picks
 * the frame AND drives the hand-over between the two content overlays.
 *
 * NOTE: the count must match the folder exactly. Requesting one frame past
 * the end returns the dev server's index.html (200 text/html) instead of a
 * JPEG, which decodes to nothing and shows the stage's black background.
 */
const FRAME_COUNT = 299;

/**
 * Pinned scroll distance per frame, in vh.
 *
 * The original 56-frame entrance hero travelled 2.2vh per frame (≈123vh for
 * the whole entrance). The merged sequence samples that same footage about
 * 4.2x more densely, so the per-frame distance is scaled down to keep the
 * same scroll distance for the same footage: 161 frames x 0.765vh ≈ 123vh
 * of pinned travel for the entrance, ≈105vh for the dining room.
 */
const SCROLL_VH_PER_FRAME = 0.765;

/** First dining-room frame, 1-based 162 → 0-based 161 (the hard cut). */
const DINING_ROOM_FRAME = 161;

/**
 * Half-width of the content dissolve, in scroll progress. The dissolve is
 * centred on the frame boundary, so it spans roughly one wheel notch and
 * hands over exactly as the doors give way to the dining room.
 */
const TRANSITION_HALF_WIDTH = 0.04;

const frameSrc = (index) =>
  `${BASE}video-frames-final/ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`;

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

/** 3u² - 2u³ — eases both ends of the content dissolve. */
const smoothstep = (value) => value * value * (3 - 2 * value);

export const EntranceExperience = () => {
  const trackRef = useRef(null);
  const frameLayersRef = useRef({ a: null, b: null });
  const activeFrameRef = useRef('a');
  const requestedIndexRef = useRef(0);
  const lastGoodIndexRef = useRef(0);
  const entranceContentRef = useRef(null);
  const diningContentRef = useRef(null);
  const centerScrimRef = useRef(null);
  const bottomScrimRef = useRef(null);
  const entranceCueRef = useRef(null);
  const rafRef = useRef(0);
  const reducedMotionRef = useRef(false);

  /**
   * Double-buffered frame swap.
   *
   * A single <img> stops painting the moment its src changes (the old bitmap
   * is not available until the new one decodes), and a failed request leaves
   * it permanently blank. Two stacked layers avoid both: the next frame loads
   * into the hidden layer and only replaces the visible one once it has
   * decoded, so the last good frame stays on screen throughout. A failed
   * request simply keeps the current frame.
   */
  const showFrame = useCallback((index) => {
    const safe = Math.min(Math.max(index, 0), FRAME_COUNT - 1);
    if (safe === requestedIndexRef.current) return;
    requestedIndexRef.current = safe;

    const nextKey = activeFrameRef.current === 'a' ? 'b' : 'a';
    const next = frameLayersRef.current[nextKey];
    if (!next) return;

    const reveal = () => {
      // A newer frame was requested while this one was loading.
      if (requestedIndexRef.current !== safe) return;
      const current = frameLayersRef.current[activeFrameRef.current];
      next.style.opacity = '1';
      if (current && current !== next) current.style.opacity = '0';
      activeFrameRef.current = nextKey;
      lastGoodIndexRef.current = safe;
    };

    const target = frameSrc(safe);
    next.onload = () => {
      if (next.getAttribute('src') !== target) return;
      reveal();
    };
    next.onerror = () => {
      if (requestedIndexRef.current !== safe) return;
      // Keep whatever is already on screen; let the next scroll retry.
      requestedIndexRef.current = lastGoodIndexRef.current;
    };
    next.src = target;

    // Already decoded for this exact URL: re-assigning the same src does not
    // restart the request, so no load event will follow. (`currentSrc` still
    // points at the *previous* frame after a real change, which is what keeps
    // this from revealing a stale bitmap.)
    if (next.complete && next.naturalWidth > 0 && next.currentSrc.endsWith(target)) {
      reveal();
    }
  }, []);

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const scrollDistance = track.offsetHeight - window.innerHeight;
    const rect = track.getBoundingClientRect();
    const progress =
      scrollDistance > 0 ? clamp01(-rect.top / scrollDistance) : 0;

    /* ---------------- frames ---------------- */
    showFrame(Math.round(progress * (FRAME_COUNT - 1)));

    /* -------------- content hand-over -------------- */
    const boundary = DINING_ROOM_FRAME / (FRAME_COUNT - 1);
    const reducedMotion = reducedMotionRef.current;
    const mix = reducedMotion
      ? progress >= boundary
        ? 1
        : 0
      : smoothstep(
          clamp01(
            (progress - (boundary - TRANSITION_HALF_WIDTH)) /
              (TRANSITION_HALF_WIDTH * 2),
          ),
        );

    const entrance = entranceContentRef.current;
    if (entrance) {
      entrance.style.opacity = String(1 - mix);
      entrance.style.transform = reducedMotion
        ? 'none'
        : `translateY(${(-14 * mix).toFixed(2)}px)`;
      entrance.style.pointerEvents = mix < 0.5 ? 'auto' : 'none';
    }

    const dining = diningContentRef.current;
    if (dining) {
      dining.style.opacity = String(mix);
      dining.style.transform = reducedMotion
        ? 'none'
        : `translateY(${(20 * (1 - mix)).toFixed(2)}px)`;
      dining.style.pointerEvents = mix >= 0.5 ? 'auto' : 'none';
    }

    /* Each phase carries its own contrast scrim: the ellipse behind the
       centred entrance copy fades away as the dining copy drops to the
       bottom, where its own scrim takes over. The middle of the frame is
       left clear once the entrance copy is gone. */
    const centerScrim = centerScrimRef.current;
    if (centerScrim) centerScrim.style.opacity = String(1 - mix);
    const bottomScrim = bottomScrimRef.current;
    if (bottomScrim) bottomScrim.style.opacity = String(mix);

    /* The entrance scroll cue sits exactly where the dining copy lands, so it
       clears out over the first 20 % of the dissolve — long before the dining
       heading is readable — and the two "continue" labels never overlap. */
    const cue = entranceCueRef.current;
    if (cue) cue.style.opacity = String(clamp01(1 - mix / 0.2));
  }, [showFrame]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    /* Reduced motion: keep the frames (the user drives them) but swap the
       copy abruptly instead of dissolving/sliding it. */
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches;
      update();
    };
    motionQuery.addEventListener?.('change', syncMotionPreference);
    syncMotionPreference();

    /* Progressive warm-up: the first dozen frames go out immediately, the
       rest trickle in during idle time, so scrubbing never has to wait on
       the network but the page is not flooded with 15 MB at once. */
    let cancelled = false;
    let next = 1; // frame 001 is already requested by the <img> itself
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : (callback) => window.setTimeout(callback, 80);

    const warmBatch = (size) => {
      if (cancelled || next >= FRAME_COUNT) return;
      const end = Math.min(next + size, FRAME_COUNT);
      for (; next < end; next += 1) {
        fetch(frameSrc(next)).catch(() => {});
      }
    };

    warmBatch(11);
    const warmNext = () => {
      if (cancelled) return;
      warmBatch(6);
      if (next < FRAME_COUNT) idle(warmNext);
    };
    idle(warmNext);

    // One measurement per animation frame: coalesce scroll bursts into a
    // single read/write pass, and re-posting on every event means the
    // listener can never wedge on a callback the browser chose not to run
    // (e.g. while the tab is hidden).
    const onScroll = () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        update();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    return () => {
      cancelled = true;
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      motionQuery.removeEventListener?.('change', syncMotionPreference);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [update]);

  const handleEnterClick = () => {
    const secondSection = document.getElementById('story');
    if (!secondSection) return;
    // Land the section just below the fixed header instead of under it, which
    // is where scrollIntoView() would leave it.
    const header = document.querySelector('header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const alignment =
      secondSection.dataset.scrollAlign === 'top' ? 0 : headerHeight;
    const targetY =
      secondSection.getBoundingClientRect().top + window.scrollY - alignment;
    window.scrollTo({ top: Math.max(targetY, 0), behavior: 'smooth' });
  };

  return (
    <div
      id="entrance"
      ref={trackRef}
      className="relative w-full bg-[#090a0c]"
      style={{ height: `${100 + FRAME_COUNT * SCROLL_VH_PER_FRAME}vh` }}
      aria-label="Pearl Oasis walkthrough"
    >
      {/* Pinned stage: the frame never leaves the viewport while the track
          scrolls past it, so the camera walk reads as one continuous take. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#090a0c] select-none">
        {/* The frame is swapped from scroll progress only, through two stacked
            layers (see showFrame). The last decoded frame stays visible until
            its replacement is ready, and the final frame is retained at the
            end of the track — the stage never goes black. */}
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
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          style={{ opacity: 0 }}
        />

        {/* Light cinematic tint. This used to be black/40, which flattened the
            footage into a near-black backdrop; 10% keeps the warm tones and
            still lets the frames read as one graded sequence. */}
        <div className="absolute inset-0 pointer-events-none bg-black/10" />

        {/* Entrance text scrim: contrast is bought locally, behind the centred
            copy, instead of darkening the whole frame. Fades out with the
            entrance phase (see update). */}
        <div
          ref={centerScrimRef}
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_48%_38%_at_50%_50%,rgba(9,10,12,0.36)_0%,rgba(9,10,12,0.2)_55%,transparent_80%)]"
          style={{ opacity: 1 }}
        />

        {/* Dining text scrim: the dining copy sits at the bottom, so its
            contrast comes from a low ellipse that is anchored to the bottom
            edge (the copy is positioned in px, not %) and fades in with it. */}
        <div
          ref={bottomScrimRef}
          className="absolute inset-x-0 bottom-0 h-[19rem] pointer-events-none bg-[radial-gradient(ellipse_62%_78%_at_50%_48%,rgba(9,10,12,0.5)_0%,rgba(9,10,12,0.3)_55%,transparent_86%)]"
          style={{ opacity: 0 }}
        />

        {/* Edge vignette, eased right down (was 0.85 at the edges, which made
            the corners ~91% black once combined with the flat tint). */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_58%,rgba(9,10,12,0.4)_100%)]" />

        {/* Bottom fade for the scroll cue only — floor and furniture stay
            legible (was black/80 across the whole lower half). */}
        <div className="absolute inset-x-0 bottom-0 h-[36%] pointer-events-none bg-[linear-gradient(to_top,rgba(9,10,12,0.62)_0%,rgba(9,10,12,0.18)_45%,transparent_100%)]" />

        {/* Top blend under the fixed header so header and hero meet without
            a visible seam. Now a short gradient below the header line rather
            than a solid 96px block of #090a0c over the top of the shot. */}
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none bg-[linear-gradient(to_bottom,rgba(9,10,12,0.92)_0%,rgba(9,10,12,0.5)_58%,transparent_100%)]" />

        {/* Phase A — Restaurant Entrance content */}
        <div
          ref={entranceContentRef}
          className="hero-copy absolute inset-0 z-20 flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 text-center will-change-[opacity,transform]"
          style={{ opacity: 1, transform: 'none', pointerEvents: 'auto' }}
        >
          <div className="flex flex-col items-center max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full">
            {/* Meaningful Eyebrow */}
            <span className="hero-eyebrow text-[10px] sm:text-xs md:text-sm font-cinzel tracking-[0.25em] sm:tracking-[0.35em] text-[#fed766] uppercase font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] mb-2 sm:mb-3">
              Fine Dining &amp; Flame-Grilled Cuisine
            </span>

            {/* Heading */}
            <h1 className="hero-title font-serif-luxury text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-[#fffdfa] font-normal tracking-tight max-w-3xl leading-[1.12] mb-3 sm:mb-5 drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
              An Architectural Dining Sanctuary
            </h1>

            {/* High-visibility luxury paragraph */}
            <p className="hero-lead font-serif-luxury text-xs sm:text-base md:text-lg lg:text-xl text-[#f6efe4] font-light italic tracking-wide max-w-xs sm:max-w-lg md:max-w-xl mb-5 sm:mb-7 leading-relaxed drop-shadow-[0_3px_16px_rgba(0,0,0,0.95)] px-2">
              Step beyond the threshold into a world of refined gastronomy, golden light, and timeless hospitality.
            </p>

            {/* Enter Restaurant button with no icon, navigates to second section */}
            <button
              onClick={handleEnterClick}
              className="hero-cta px-6 py-2.5 sm:px-8 sm:py-3.5 md:px-10 md:py-4 rounded bg-gradient-to-r from-[#d4af37] via-[#f5d78e] to-[#aa8010] text-[#0e0f12] font-cinzel text-[11px] sm:text-xs md:text-sm font-bold tracking-[0.18em] sm:tracking-[0.25em] uppercase shadow-[0_4px_24px_rgba(212,175,55,0.4)] hover:shadow-[0_6px_32px_rgba(212,175,55,0.65)] hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Enter Restaurant
            </button>
          </div>

          {/* "UNFOLD THE STORY" scroll cue — travels with the entrance copy */}
          <div
            ref={entranceCueRef}
            className="hero-cue absolute bottom-4 sm:bottom-6 md:bottom-8 inset-x-0 flex flex-col items-center justify-center px-4"
            style={{ opacity: 1 }}
          >
            <button
              onClick={handleEnterClick}
              className="flex flex-col items-center gap-1 sm:gap-2 group cursor-pointer"
              aria-label="Scroll to Our Story"
            >
              <span className="hero-cue-label text-[9px] sm:text-xs md:text-sm font-cinzel font-bold tracking-[0.22em] sm:tracking-[0.28em] text-[#ffd875] group-hover:text-white transition-colors uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                UNFOLD THE STORY
              </span>
              <div className="hero-cue-mouse w-4 h-6 sm:w-5 sm:h-8 rounded-full border border-[#d4af37]/60 shadow-[0_0_12px_rgba(212,175,55,0.35)] flex items-start justify-center p-0.5 sm:p-1 bg-black/40 backdrop-blur-sm group-hover:border-[#ffd875]">
                <div className="w-1 sm:w-1.5 h-1.5 sm:h-2.5 rounded-full bg-[#ffd875] animate-bounce" />
              </div>
            </button>
          </div>
        </div>

        {/* Phase B/C — The Grand Dining Hall content */}
        <div
          ref={diningContentRef}
          className="absolute inset-0 z-20 flex flex-col items-center justify-end px-4 sm:px-6 pb-10 sm:pb-12 md:pb-16 text-center will-change-[opacity,transform]"
          style={{ opacity: 0, transform: 'translateY(20px)', pointerEvents: 'none' }}
        >
          <button
            onClick={handleEnterClick}
            className="flex flex-col items-center gap-3 sm:gap-5 group cursor-pointer"
            aria-label="Continue to Our Story and Menus"
          >
            <span className="font-script text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-gold-shimmer drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
              The Grand Dining Hall
            </span>

            <span className="h-px w-24 sm:w-32 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />

            <span className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm font-cinzel font-semibold tracking-[0.18em] sm:tracking-[0.25em] text-[#ffd875] group-hover:text-white transition-colors uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              <span>Continue to Our Story &amp; Menus</span>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-bounce text-[#ffd875]" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
