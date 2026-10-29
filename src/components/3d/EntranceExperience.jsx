import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLenis } from 'lenis/react';
import { PROGRAMMATIC_SCROLL_DURATION } from '../ui/scroll.js';

/**
 * One continuous, scroll-driven walkthrough.
 *
 * The hero footage is one remote film. Scroll position, not elapsed time, is
 * the source of truth: progress picks the video timestamp and drives the
 * hand-over between the two content overlays.
 *
 * The film is never played. Seeking a paused video gives the same frame for a
 * given scroll position on the way down and on the way back up, and the last
 * seek is held at the end. The original upload had a single sync sample at 0,
 * so every paused seek decoded from the start. This derived Cloudinary URL
 * re-encodes the same film with a 1 s keyframe interval (ki_1) and best
 * automatic quality, so a seek starts no more than one second away. Requests
 * are coalesced so only one seek is in flight at a time. The first-frame
 * poster keeps the stage filled while metadata, data, or a seek is arriving.
 *
 * The H.264 MP4 is the primary source. Browsers without H.264 get the
 * validated VP9 WebM before the first load. If the MP4 reports support but
 * then fails with a decode or source error, one controlled switch to WebM is
 * allowed. Seek cancellations and aborted range requests do not switch.
 */
const VIDEO_MP4_URL =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/q_auto:best,ki_1/v1792936612/new-video-Camera_moving_through_hotel_lobby_20261023081539.mp4';
const VIDEO_WEBM_URL =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/v1793251281/hero-lobby-20261029-vp9-6148df8e.webm';
const VIDEO_POSTER =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/so_0,w_1280,h_720,c_fill/v1792936612/new-video-Camera_moving_through_hotel_lobby_20261023081539.jpg';
const VIDEO_MP4_TYPE = 'video/mp4; codecs="avc1.42E01E"';
const VIDEO_WEBM_TYPE = 'video/webm; codecs="vp9"';
const MEDIA_ERR_DECODE = 3;
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

const canPlayVideoType = (type) => {
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('video');
  return typeof probe.canPlayType === 'function' && Boolean(probe.canPlayType(type));
};

const getInitialVideoSource = () => {
  if (canPlayVideoType(VIDEO_MP4_TYPE)) return VIDEO_MP4_URL;
  if (canPlayVideoType(VIDEO_WEBM_TYPE)) return VIDEO_WEBM_URL;
  return VIDEO_MP4_URL;
};

/**
 * Keep the same 329vh track as the previous 70-frame sequence (70 x 3.27vh
 * plus one viewport), so the hero releases at the same point on the page.
 */
const TRACK_HEIGHT_VH = 328.9;

/**
 * The copy hand-over stays where it was in the frame sequence: frame 24 of 70,
 * or the first third of the walk. The supplied film is one continuous shot, so
 * this boundary now marks the same reading beat rather than a hard visual cut.
 */
const CONTENT_HANDOVER_PROGRESS = 23 / 69;

/** Half-width of the content dissolve, in scroll progress. */
const TRANSITION_HALF_WIDTH = 0.04;

/**
 * The supplied film is 24 fps (measured: 0.041667 s between frames), so one
 * source frame is 1/24 s. A target change smaller than a frame stays on the
 * same displayed image and is not worth a seek.
 */
const SOURCE_FRAME_DURATION = 1 / 24;
const SEEK_EPSILON = SOURCE_FRAME_DURATION;

/** Stop just before the end so the final frame stays visible. */
const END_FRAME_OFFSET = SOURCE_FRAME_DURATION;

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

/** 3u² - 2u³: eases both ends of the content dissolve. */
const smoothstep = (value) => value * value * (3 - 2 * value);

export const EntranceExperience = () => {
  const [videoSource, setVideoSource] = useState(getInitialVideoSource);
  const trackRef = useRef(null);
  const videoRef = useRef(null);
  const videoSourceRef = useRef(videoSource);
  const previousVideoSourceRef = useRef(videoSource);
  const fallbackAttemptedRef = useRef(videoSource === VIDEO_WEBM_URL);
  const entranceContentRef = useRef(null);
  const diningContentRef = useRef(null);
  const centerScrimRef = useRef(null);
  const bottomScrimRef = useRef(null);
  const entranceCueRef = useRef(null);
  /* Last value written to each scroll-driven style. Several scroll ticks can
     land inside one frame bucket with the same values, and writing an
     unchanged inline style still dirties style and layout for the next frame. */
  const styleCacheRef = useRef({});
  const rafRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const videoReadyRef = useRef(false);
  const durationRef = useRef(0);
  const progressRef = useRef(0);
  /**
   * False while the hero is far outside the viewport. The scroll listener is
   * global, so without this every scroll anywhere in the ~16 000 px document
   * still measured this track and wrote six styles, even with the stage 10
   * viewports away.
   */
  const visibleRef = useRef(true);
  /**
   * Layout values that only change on resize, cached so a scroll frame does not
   * have to read the track's height or bounding rect.
   */
  const metricsRef = useRef({ top: 0, scrollDistance: 0, viewport: 0, width: 0 });
  const lenis = useLenis();
  const lenisRef = useRef(null);

  /* Keep the resize correction on the same scroll controller as the rest of
     the page without making the main effect restart when Lenis mounts. */
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  /* A source swap must not inherit the old film's metadata or pending seek.
     Progress stays put; the new source resumes at the same scroll position. */
  useEffect(() => {
    videoSourceRef.current = videoSource;
    if (previousVideoSourceRef.current === videoSource) return;
    previousVideoSourceRef.current = videoSource;
    videoReadyRef.current = false;
    durationRef.current = 0;
    videoRef.current?.load();
  }, [videoSource]);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    metricsRef.current = {
      top: track.getBoundingClientRect().top + window.scrollY,
      scrollDistance: Math.max(0, track.offsetHeight - window.innerHeight),
      viewport: window.innerHeight,
      width: window.innerWidth,
    };
  }, []);

  /**
   * Apply the current progress to the film. Only one seek is allowed in
   * flight: while it runs, newer positions wait for seeked, which then applies
   * the latest value. This avoids cancelling and restarting seeks on every
   * scroll event.
   */
  const applyVideoProgress = useCallback((nextProgress = progressRef.current) => {
    const progress = clamp01(Number.isFinite(nextProgress) ? nextProgress : 0);
    progressRef.current = progress;

    const video = videoRef.current;
    const duration = durationRef.current;
    if (!video || !videoReadyRef.current) return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (video.seeking) return;

    const end = Math.max(0, duration - END_FRAME_OFFSET);
    const target = progress * end;
    if (Math.abs(video.currentTime - target) < SEEK_EPSILON) return;

    try {
      video.currentTime = target;
    } catch {
      // Keep the current frame and poster; the next scroll or seek retries.
    }
  }, []);

  const handleVideoMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const currentSource = video.currentSrc || video.src;
    if (currentSource && currentSource !== videoSourceRef.current) return;
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    durationRef.current = duration;
    videoReadyRef.current = true;
    applyVideoProgress();
  }, [applyVideoProgress]);

  const handleVideoSeeked = useCallback(() => {
    applyVideoProgress();
  }, [applyVideoProgress]);

  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    videoReadyRef.current = false;
    durationRef.current = 0;

    const error = video.error;
    if (!error) return;

    const source = video.currentSrc || video.src || videoSource;
    const errorCode = error.code;
    const canUseFallback =
      videoSource === VIDEO_MP4_URL &&
      !fallbackAttemptedRef.current &&
      (errorCode === MEDIA_ERR_DECODE || errorCode === MEDIA_ERR_SRC_NOT_SUPPORTED) &&
      canPlayVideoType(VIDEO_WEBM_TYPE);

    console.warn('[Hero video] media failure', {
      source,
      errorCode,
      errorMessage: error.message || '',
      readyState: video.readyState,
      networkState: video.networkState,
      fallback: canUseFallback ? VIDEO_WEBM_URL : null,
    });

    if (!canUseFallback) return;

    fallbackAttemptedRef.current = true;
    setVideoSource(VIDEO_WEBM_URL);
  }, [videoSource]);

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track || !visibleRef.current) return;

    // Only a resize (including a mobile URL bar collapse) can change these.
    if (metricsRef.current.viewport !== window.innerHeight) measure();

    const { top, scrollDistance } = metricsRef.current;
    const progress =
      scrollDistance > 0 ? clamp01((window.scrollY - top) / scrollDistance) : 0;

    /* -------------------------- film -------------------------- */
    applyVideoProgress(progress);

    /* -------------------- content hand-over -------------------- */
    const boundary = CONTENT_HANDOVER_PROGRESS;
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

    const cache = styleCacheRef.current;
    const setStyle = (node, key, property, value) => {
      if (!node || cache[key] === value) return;
      cache[key] = value;
      node.style[property] = value;
    };
    /* Keep the tab order in step with the visible phase. The copy that has
       faded out must not stay reachable, and the dining copy must stay out of
       the tab order until it is actually on screen. */
    const setInert = (node, key, hidden) => {
      if (!node || cache[key] === hidden) return;
      cache[key] = hidden;
      if (hidden) {
        node.setAttribute('inert', '');
        node.setAttribute('aria-hidden', 'true');
      } else {
        node.removeAttribute('inert');
        node.removeAttribute('aria-hidden');
      }
    };

    setStyle(
      entranceContentRef.current,
      'entranceOpacity',
      'opacity',
      String(1 - mix),
    );
    setStyle(
      entranceContentRef.current,
      'entranceTransform',
      'transform',
      reducedMotion ? 'none' : `translateY(${(-14 * mix).toFixed(2)}px)`,
    );
    setStyle(
      entranceContentRef.current,
      'entrancePointer',
      'pointerEvents',
      mix < 0.5 ? 'auto' : 'none',
    );

    setStyle(diningContentRef.current, 'diningOpacity', 'opacity', String(mix));
    setStyle(
      diningContentRef.current,
      'diningTransform',
      'transform',
      reducedMotion ? 'none' : `translateY(${(20 * (1 - mix)).toFixed(2)}px)`,
    );
    setStyle(
      diningContentRef.current,
      'diningPointer',
      'pointerEvents',
      mix >= 0.5 ? 'auto' : 'none',
    );

    /* Each phase carries its own contrast scrim: the ellipse behind the
       centred entrance copy fades away as the dining copy drops to the
       bottom, where its own scrim takes over. The middle of the frame is
       left clear once the entrance copy is gone. */
    setStyle(centerScrimRef.current, 'centerScrim', 'opacity', String(1 - mix));
    setStyle(bottomScrimRef.current, 'bottomScrim', 'opacity', String(mix));

    /* The entrance scroll cue sits exactly where the dining copy lands, so it
       clears out over the first 20 % of the dissolve, long before the dining
       heading is readable, and the two "continue" labels never overlap. */
    setStyle(
      entranceCueRef.current,
      'cueOpacity',
      'opacity',
      String(clamp01(1 - mix / 0.2)),
    );

    /* Opacity is the source of truth: once a layer has effectively faded, it
       leaves the keyboard order until it fades back in. */
    setInert(entranceContentRef.current, 'entranceInert', mix > 0.95);
    setInert(diningContentRef.current, 'diningInert', mix < 0.05);
    setInert(entranceCueRef.current, 'cueInert', mix >= 0.2);
  }, [applyVideoProgress, measure]);

  useEffect(() => {
    const track = trackRef.current;
    const video = videoRef.current;
    if (!track) return;

    /* A cached film can already have metadata when the effect runs. */
    if (
      video &&
      Number.isFinite(video.duration) &&
      video.duration > 0
    ) {
      durationRef.current = video.duration;
      videoReadyRef.current = true;
    }
    measure();

    /* Reduced motion: keep the film user-driven, but swap the copy abruptly
       instead of dissolving/sliding it. */
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches;
      update();
    };
    motionQuery.addEventListener?.('change', syncMotionPreference);
    syncMotionPreference();

    /* One measurement per animation frame. Re-posting the callback on every
       event (as this used to) cancels a pending frame before it can run, so a
       burst of wheel or touch events can starve the scrub. */
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        update();
      });
    };

    /* Orientation changes only re-measure. The track height is in vh, so keep
       the same point of the walk after a width change instead of letting an
       unchanged scrollY land near the final frame. A height-only resize (mobile
       URL bar) is left alone. */
    const onResize = () => {
      const previous = metricsRef.current;
      const progress =
        previous.scrollDistance > 0
          ? clamp01((window.scrollY - previous.top) / previous.scrollDistance)
          : 0;
      const widthChanged =
        previous.width > 0 && window.innerWidth !== previous.width;
      measure();
      if (widthChanged && visibleRef.current) {
        const { top, scrollDistance } = metricsRef.current;
        /* Force this correction to land in one step. The document uses smooth
           scrolling for user-facing jumps; animating this correction would
           scrub the film through every intermediate frame on an orientation
           change. */
        const activeLenis = lenisRef.current;
        if (activeLenis) {
          activeLenis.resize();
          activeLenis.scrollTo(top + progress * scrollDistance, {
            immediate: true,
          });
        } else {
          const root = document.documentElement;
          const previousBehavior = root.style.scrollBehavior;
          root.style.scrollBehavior = 'auto';
          window.scrollTo(0, top + progress * scrollDistance);
          root.style.scrollBehavior = previousBehavior;
        }
      }
      onScroll();
    };

    /* Stop doing per-scroll work entirely once the stage is a viewport away.
       The margin keeps the hand-over seamless: the observer fires before the
       stage re-enters and runs one catch-up pass. */
    const observer = new IntersectionObserver(
      (entries) => {
        const near = entries.some((entry) => entry.isIntersecting);
        if (near === visibleRef.current) return;
        visibleRef.current = near;
        if (near) {
          measure();
          update();
        }
      },
      { rootMargin: '0px 0px' },
    );
    observer.observe(track);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    update();

    return () => {
      observer.disconnect();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      motionQuery.removeEventListener?.('change', syncMotionPreference);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [update, measure]);

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
    /* Reduced-motion users jump straight there; everyone else keeps the
       existing glide. The scroll target and header offset are unchanged. */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollTarget = Math.max(targetY, 0);
    if (lenis) {
      lenis.scrollTo(scrollTarget, {
        duration: PROGRAMMATIC_SCROLL_DURATION,
        immediate: reduceMotion,
      });
    } else {
      window.scrollTo({
        top: scrollTarget,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }
  };

  return (
    <div
      id="entrance"
      ref={trackRef}
      className="relative w-full bg-[#090a0c]"
      style={{ height: `${TRACK_HEIGHT_VH}vh` }}
      aria-label="Pearl Oasis walkthrough"
    >
      {/* Pinned stage: the film never leaves the viewport while the track
          scrolls past it, so the camera walk reads as one continuous take. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#090a0c] select-none">
        {/* One video layer, never played. Scroll only seeks it; the poster is
            the first frame, so the stage is not blank while data arrives or if
            the film cannot load. */}
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          src={videoSource}
          poster={VIDEO_POSTER}
          preload="auto"
          muted
          playsInline
          aria-hidden="true"
          tabIndex={-1}
          onLoadedMetadata={handleVideoMetadata}
          onCanPlay={handleVideoMetadata}
          onSeeked={handleVideoSeeked}
          onError={handleVideoError}
        />

        {/* Light cinematic tint. This used to be black/40, which flattened the
            footage into a near-black backdrop; 10% keeps the warm tones and
            still lets the film read as one graded sequence. */}
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
            contrast comes from a short, soft wash anchored to the bottom
            edge. It covers the copy and fades out well above it; the old
            19rem scrim plus the 36%-tall bottom fade stacked into a flat dark
            band across the lower third of the frame. */}
        <div
          ref={bottomScrimRef}
          className="absolute inset-x-0 bottom-0 h-[13rem] sm:h-[15rem] max-h-[32vh] pointer-events-none bg-[linear-gradient(to_top,rgba(9,10,12,0.52)_0%,rgba(9,10,12,0.3)_38%,rgba(9,10,12,0.1)_70%,transparent_100%)]"
          style={{ opacity: 0 }}
        />

        {/* Edge vignette, eased right down (was 0.85 at the edges, which made
            the corners ~91% black once combined with the flat tint). */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_58%,rgba(9,10,12,0.4)_100%)]" />

        {/* The scroll cue keeps its own text shadow; the wide 36% bottom fade
            that used to sit here has been removed so the floor of the shot
            stays visible underneath the copy. */}

        {/* Top blend under the fixed header so header and hero meet without
            a visible seam. Now a short gradient below the header line rather
            than a solid 96px block of #090a0c over the top of the shot. */}
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none bg-[linear-gradient(to_bottom,rgba(9,10,12,0.92)_0%,rgba(9,10,12,0.5)_58%,transparent_100%)]" />

        {/* Phase A: Restaurant Entrance content */}
        <div
          ref={entranceContentRef}
          className="hero-copy absolute inset-0 z-20 flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 text-center will-change-[opacity,transform]"
          style={{ opacity: 1, transform: 'none', pointerEvents: 'auto' }}
        >
          <div className="flex flex-col items-center max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full">
            {/* Meaningful Eyebrow. The soft local scrim keeps the 10px gold
                label above 4.5:1 over the brightest frames without darkening
                the rest of the shot. */}
            <span className="hero-eyebrow relative isolate inline-flex items-center justify-center mb-2 sm:mb-3 text-[10px] sm:text-xs md:text-sm font-cinzel tracking-[0.25em] sm:tracking-[0.35em] text-[#fed766] uppercase font-semibold">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-7 -inset-y-2 -z-10 rounded-full bg-[#090a0c]/70 blur-sm"
              />
              <span className="relative drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                Fine Dining &amp; Flame-Grilled Cuisine
              </span>
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
              className="gold-cta hero-cta inline-flex items-center justify-center min-h-11 px-6 py-2.5 sm:px-8 sm:py-3.5 md:px-10 md:py-4 rounded bg-[#d4af37] bg-gradient-to-r from-[#d4af37] via-[#f5d78e] to-[#aa8010] text-[#0e0f12] font-cinzel text-[11px] sm:text-xs md:text-sm font-bold tracking-[0.18em] sm:tracking-[0.25em] uppercase shadow-[0_4px_24px_rgba(212,175,55,0.4)] hover:shadow-[0_6px_32px_rgba(212,175,55,0.65)] hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Enter Restaurant
            </button>
          </div>

          {/* "UNFOLD THE STORY" scroll cue, travels with the entrance copy */}
          <div
            ref={entranceCueRef}
            className="hero-cue absolute bottom-4 sm:bottom-6 md:bottom-8 inset-x-0 flex flex-col items-center justify-center px-4"
            style={{ opacity: 1 }}
          >
            <button
              onClick={handleEnterClick}
              className="flex min-h-11 flex-col items-center justify-center gap-1 sm:gap-2 group cursor-pointer"
              aria-label="Unfold the story: scroll to Our Story"
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

        {/* Phase B/C: The Grand Dining Hall content */}
        <div
          ref={diningContentRef}
          className="absolute inset-0 z-20 flex flex-col items-center justify-end px-4 sm:px-6 pb-10 sm:pb-12 md:pb-16 text-center will-change-[opacity,transform]"
          style={{ opacity: 0, transform: 'translateY(20px)', pointerEvents: 'none' }}
          inert
          aria-hidden="true"
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
