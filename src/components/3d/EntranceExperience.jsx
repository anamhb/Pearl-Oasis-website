import React, { useCallback, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLenis } from 'lenis/react';
import { PROGRAMMATIC_SCROLL_DURATION } from '../ui/scroll.js';

/**
 * One continuous, scroll-driven walkthrough.
 *
 * The hero is a fixed sequence of local frames. Scroll position, not elapsed
 * time, is the source of truth: progress picks the frame index and drives the
 * hand-over between the two content overlays.
 *
 * Frames are never played. Mapping progress straight to an index gives the
 * same frame for a given scroll position on the way down and on the way back
 * up, and the final index is held at the end. The previous film scrub seeked
 * a paused video on every step: each seek was a range fetch plus a keyframe
 * decode, only one seek could be in flight, and the queued target snapped
 * when it landed, so the walk lagged behind the scroll. Here a paint is one
 * `drawImage` of an image already fetched and decoded ahead of the scroll
 * position, which keeps the display in step in both directions.
 *
 * Downloads run in batches ordered by distance from the current index, and
 * only a small window around that index is decoded ahead; the rest stay
 * compressed (about 90 KB each, 6.1 MB for all 70) until they approach it.
 * Decoded rasters stay browser-managed and are evicted under memory pressure,
 * so the full-resolution sequence is never all decoded at once. A frame that
 * fails to load is skipped with one warning: the stage keeps the last good
 * frame, then the first-frame poster, then its own background, so it never
 * blanks.
 */

/** `public/video-frames-hero`: 2560x1440 JPEG, `ezgif-frame-001` .. `070`. */
const FRAME_COUNT = 70;
const frameUrl = (index) =>
  `/video-frames-hero/ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`;

/** Frames decoded ahead of the current index; behind covers reverse scrolls. */
const DECODE_BEHIND = 2;
const DECODE_AHEAD = 5;

/** One download batch matches the browser's per-host connection pool. */
const DOWNLOAD_BATCH = 6;

/** Canvas backing cap; the sequence is photographic, 3x buys no detail. */
const MAX_CANVAS_DPR = 2;

/**
 * The track keeps the length the walkthrough has always used: 70 frames at
 * 3.27vh each plus one viewport, so the hero releases at the same point on
 * the page.
 */
const TRACK_HEIGHT_VH = 328.9;

/**
 * The copy hand-over sits at frame 24 of 70 (23 / 69 of progress), the same
 * reading beat the walkthrough has always used: the entrance copy holds for
 * the first third of the walk and the dining copy takes over from there.
 */
const CONTENT_HANDOVER_PROGRESS = 23 / 69;

/** Half-width of the content dissolve, in scroll progress. */
const TRANSITION_HALF_WIDTH = 0.04;

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

/** 3u² - 2u³: eases both ends of the content dissolve. */
const smoothstep = (value) => value * value * (3 - 2 * value);

export const EntranceExperience = () => {
  const trackRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasCtxRef = useRef(null);
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
  /* Frame machinery: one record per index (download and decode state) and
     the index the scroll position asks for. */
  const framesRef = useRef([]);
  const frameIndexRef = useRef(0);
  const paintedRef = useRef({ drawn: -1, target: 0 });
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  const downloadsRef = useRef({ running: false, done: false, errors: 0 });
  const aliveRef = useRef(false);
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

  /** Indexes whose decode the current scroll position can use next. */
  const isInDecodeWindow = useCallback((index) => {
    const current = frameIndexRef.current;
    return (
      index >= current - DECODE_BEHIND && index <= current + DECODE_AHEAD
    );
  }, []);

  /** Canvas backing size in device pixels for the current stage box. */
  const renderSize = useCallback(() => {
    const { width, viewport } = metricsRef.current;
    if (!width || !viewport) return { w: 0, h: 0 };
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR);
    return {
      w: Math.max(1, Math.round(width * dpr)),
      h: Math.max(1, Math.round(viewport * dpr)),
    };
  }, []);

  /**
   * Nearest index to `current` that can be drawn: an already-decoded frame
   * first, so a paint never waits on a synchronous decode, then any loaded
   * frame (drawImage decodes those synchronously as a last resort).
   */
  const nearestPaintable = useCallback((current) => {
    const frames = framesRef.current;
    const scan = (decodedOnly) => {
      const usable = (index) => {
        const frame = frames[index];
        if (!frame || frame.status !== 'ready') return false;
        return decodedOnly ? Boolean(frame.decoded) : true;
      };
      if (usable(current)) return current;
      for (let offset = 1; offset < FRAME_COUNT; offset += 1) {
        const back = current - offset;
        const forward = current + offset;
        if (back >= 0 && usable(back)) return back;
        if (forward < FRAME_COUNT && usable(forward)) return forward;
      }
      return -1;
    };
    const decoded = scan(true);
    return decoded !== -1 ? decoded : scan(false);
  }, []);

  /**
   * Draw the frame for the current index. Nothing is cleared when the index
   * and size are unchanged, so there is no blank between paints; a resize
   * clears the canvas, and it either repaints in the same tick or steps aside
   * so the poster shows.
   */
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w: width, h: height } = renderSize();
    if (!width || !height) return;

    let ctx = canvasCtxRef.current;
    if (!ctx) {
      ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return; // No 2D context: the poster below carries the stage.
      canvasCtxRef.current = ctx;
    }

    const resized =
      canvasSizeRef.current.w !== width || canvasSizeRef.current.h !== height;
    if (resized) {
      canvas.width = width;
      canvas.height = height;
      canvasSizeRef.current = { w: width, h: height };
    }

    const target = frameIndexRef.current;
    const painted = paintedRef.current;
    let drawn = nearestPaintable(target);
    /* Never step opposite to the scroll direction: hold the frame already on
       screen rather than jump backwards when a nearer index is briefly not
       paintable (an unreadily decoded overshoot, an evicted neighbour). */
    if (painted.drawn >= 0 && drawn >= 0) {
      const movingForward = target >= painted.target;
      if (movingForward ? drawn < painted.drawn : drawn > painted.drawn) {
        drawn = painted.drawn;
      }
    }
    const changed = drawn !== painted.drawn;
    painted.target = target;
    if (!resized && !changed) return;

    if (drawn === -1) {
      /* Nothing is loaded yet: step aside so the first-frame poster shows
         instead of a cleared (black) canvas. */
      canvas.style.opacity = '0';
      paintedRef.current = { drawn: -1, target };
      return;
    }

    const img = framesRef.current[drawn].img;
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    try {
      ctx.drawImage(
        img,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    } catch {
      /* An undrawable source falls back to the poster rather than a hole. */
      canvas.style.opacity = '0';
      paintedRef.current = { drawn: -1, target };
      return;
    }
    canvas.style.opacity = '1';
    canvas.dataset.frame = String(drawn);
    paintedRef.current = { drawn, target };
  }, [nearestPaintable, renderSize]);

  /**
   * Decode `index` ahead of the scroll position. `img.decode()` resolves off
   * the critical path (measured ~15 ms versus 170-250 ms for an equivalent
   * `createImageBitmap` resize on the main thread), so scrolling never pays
   * for a decode it did not ask for.
   */
  const decodeFrame = useCallback(
    (index) => {
      const frame = framesRef.current[index];
      if (!frame || frame.status !== 'ready') return;
      if (frame.decoded || frame.decoding || frame.decodeFailed) return;
      frame.decoding = true;
      frame.img
        .decode()
        .then(() => {
          frame.decoded = true;
          frame.decoding = false;
          if (index === frameIndexRef.current) paint();
        })
        .catch(() => {
          /* Data the browser declines to decode: drawImage retries it
             synchronously when the frame is actually needed. */
          frame.decoding = false;
          frame.decodeFailed = true;
        });
    },
    [paint],
  );

  const syncDecodeWindow = useCallback(() => {
    const current = frameIndexRef.current;
    const from = Math.max(0, current - DECODE_BEHIND);
    const to = Math.min(FRAME_COUNT - 1, current + DECODE_AHEAD);
    for (let index = from; index <= to; index += 1) {
      decodeFrame(index);
    }
  }, [decodeFrame]);

  /** Start one frame's download; `settled` resolves on load or error. */
  const ensureFrame = useCallback(
    (index) => {
      let frame = framesRef.current[index];
      if (frame) return frame;

      const img = new Image();
      img.decoding = 'async';
      let settle = () => {};
      const settled = new Promise((resolve) => {
        settle = resolve;
      });
      frame = { img, status: 'loading', settled };

      img.onload = () => {
        frame.status = 'ready';
        settle();
        if (isInDecodeWindow(index)) decodeFrame(index);
        if (index === frameIndexRef.current) paint();
      };
      img.onerror = () => {
        frame.status = 'error';
        settle();
        downloadsRef.current.errors += 1;
        if (downloadsRef.current.errors === 1) {
          console.warn('[Hero frames] frame failed to load', {
            frame: index + 1,
            url: frameUrl(index),
          });
        }
      };

      framesRef.current[index] = frame;
      img.src = frameUrl(index);
      return frame;
    },
    [decodeFrame, isInDecodeWindow, paint],
  );

  /** Progress picks the index; nothing else in the pipeline stores it. */
  const applyFrameProgress = useCallback(
    (nextProgress) => {
      const progress = clamp01(Number.isFinite(nextProgress) ? nextProgress : 0);
      const index = Math.round(progress * (FRAME_COUNT - 1));
      if (index !== frameIndexRef.current) {
        frameIndexRef.current = index;
        syncDecodeWindow();
      }
      paint();
    },
    [paint, syncDecodeWindow],
  );

  /**
   * Fetch every frame in batches ordered by distance from the current index,
   * re-sorted between batches so downloads chase the scroll instead of racing
   * it. One bounded pass over a fixed set: it stops when all 70 have a record
   * or the component unmounts.
   */
  const runDownloads = useCallback(async () => {
    const downloads = downloadsRef.current;
    if (downloads.running || downloads.done) return;
    downloads.running = true;
    try {
      while (aliveRef.current) {
        const pending = [];
        for (let index = 0; index < FRAME_COUNT; index += 1) {
          if (!framesRef.current[index]) pending.push(index);
        }
        if (pending.length === 0) {
          downloads.done = true;
          if (downloads.errors > 0) {
            console.warn('[Hero frames] sequence incomplete', {
              failed: downloads.errors,
              total: FRAME_COUNT,
            });
          }
          break;
        }
        const current = frameIndexRef.current;
        /* Forward frames win ties: reverse scrolls lean on the frames the
           decode window already fetched behind the current index. */
        const distance = (index) => {
          const gap = index - current;
          return gap >= 0 ? gap : -gap * 1.5;
        };
        pending.sort((a, b) => distance(a) - distance(b));
        const batch = pending.slice(0, DOWNLOAD_BATCH);
        await Promise.all(batch.map((index) => ensureFrame(index).settled));
      }
    } finally {
      downloads.running = false;
    }
  }, [ensureFrame]);

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track || !visibleRef.current) return;

    // Only a resize (including a mobile URL bar collapse) can change these.
    if (metricsRef.current.viewport !== window.innerHeight) measure();

    const { top, scrollDistance } = metricsRef.current;
    const progress =
      scrollDistance > 0 ? clamp01((window.scrollY - top) / scrollDistance) : 0;

    /* -------------------------- frames -------------------------- */
    applyFrameProgress(progress);

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
  }, [applyFrameProgress, measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    measure();

    /* Reduced motion: keep the sequence user-driven, but swap the copy
       abruptly instead of dissolving/sliding it. */
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
    aliveRef.current = true;
    runDownloads();
    update();

    return () => {
      observer.disconnect();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      motionQuery.removeEventListener?.('change', syncMotionPreference);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      /* The download loop checks this between batches and stops. */
      aliveRef.current = false;
    };
  }, [update, measure, runDownloads]);

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
      {/* Pinned stage: the frames never leave the viewport while the track
          scrolls past it, so the camera walk reads as one continuous take. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#090a0c] select-none">
        {/* First-frame poster under the canvas: the stage is filled from the
            first paint and stays up if the canvas or a frame cannot load. */}
        <img
          src={frameUrl(0)}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Scroll only picks indices. The canvas is revealed after its first
            successful draw, so the poster handover is pixel-identical. */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          style={{ opacity: 0 }}
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
