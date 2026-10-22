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

/**
 * A small pool of decoded layers. One is visible; the others hold the next
 * predicted scroll positions so a fast scrub can hand over without waiting
 * for a single serial download. Five full-size frames is the memory ceiling.
 */
const MAX_LAYERS = 5;
const NARROW_LAYERS = 4;
const MAX_PREDICT_STEP = 32;
const DECODE_FALLBACK_MS = 300;
/** A handful of evenly spaced fallback frames, fetched once at startup. */
const LADDER_STEP = 38;
/** Only this far behind the scrub is an in-flight frame worth abandoning. */
const STALE_DISTANCE = 80;
/**
 * Narrow screens only. A cold frame needs roughly 200-250 ms, and three lanes
 * started together finish together, so only one of the three can be shown per
 * round trip. Requesting the frame the scrub will be reading on arrival, and
 * starting the lanes a little apart, turns that batch into a steady stream.
 */
const MAX_PREDICT_LEAD = 64;
const LOAD_PACING_MS = 80;
/** Observed round trip before the first frame reports back, in ms. */
const INITIAL_LATENCY = 120;

const frameSrc = (index) =>
  `${BASE}video-frames-final/ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`;

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

/** 3u² - 2u³ — eases both ends of the content dissolve. */
const smoothstep = (value) => value * value * (3 - 2 * value);

export const EntranceExperience = () => {
  const trackRef = useRef(null);
  const layersRef = useRef(
    Array.from({ length: MAX_LAYERS }, () => ({
      node: null,
      index: null,
      loading: false,
      ready: false,
      token: 0,
      timer: 0,
    })),
  );
  const activeLayerRef = useRef(0);
  const visibleIndexRef = useRef(0);
  const targetIndexRef = useRef(0);
  const directionRef = useRef(1);
  const stepRef = useRef(1);
  const settleTimerRef = useRef(0);
  const scheduleRef = useRef(null);
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
  const metricsRef = useRef({ top: 0, scrollDistance: 0, viewport: 0 });
  /** Phones and touch tablets get a smaller decode pool. */
  const narrowRef = useRef(false);
  const poolSizeRef = useRef(NARROW_LAYERS);
  /** Keep the last frame decoded while a fling can still reach it. */
  const keepFinalRef = useRef(false);
  /**
   * Measured scroll speed in frames per ms and the measured request-to-decoded
   * time. Narrow screens use them to ask for the frame the scrub will be on
   * when the bytes land, instead of the frame it is already leaving.
   */
  const velocityRef = useRef(0);
  const latencyRef = useRef(INITIAL_LATENCY);
  const lastTargetAtRef = useRef(0);
  const lastLoadAtRef = useRef(0);
  const paceTimerRef = useRef(0);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    metricsRef.current = {
      top: track.getBoundingClientRect().top + window.scrollY,
      scrollDistance: Math.max(0, track.offsetHeight - window.innerHeight),
      viewport: window.innerHeight,
    };
  }, []);

  const revealLayer = useCallback((layer) => {
    const node = layer.node;
    if (!node || layer.index === null || !layer.ready) return;
    const active = layersRef.current[activeLayerRef.current];
    if (active === layer) {
      visibleIndexRef.current = layer.index;
      return;
    }

    node.style.opacity = '1';
    if (active?.node) active.node.style.opacity = '0';
    activeLayerRef.current = layersRef.current.indexOf(layer);
    visibleIndexRef.current = layer.index;
  }, []);

  /**
   * Show the closest decoded frame instead of waiting for the exact target.
   * The exact target still wins when it is ready; a nearby frame just keeps
   * the stage moving while the next one decodes.
   */
  const showBest = useCallback(() => {
    const target = targetIndexRef.current;
    const direction = directionRef.current || 1;
    /* Once the end artwork is up and the scrub is still moving forward, keep
       it. Letting the nearest-ready rule pick a later-decoded middle frame
       flipped the visible sequence 299 -> 262 -> 299 at the end of a drag. */
    if (
      visibleIndexRef.current === FRAME_COUNT - 1 &&
      direction > 0 &&
      target >= FRAME_COUNT - 1 - LADDER_STEP * 2
    ) {
      return;
    }
    const currentDistance = Math.abs(visibleIndexRef.current - target);
    let best = null;

    for (const layer of layersRef.current) {
      if (!layer.ready || layer.index === null) continue;
      // A pre-decoded final frame is a fallback for the end of a fling, not
      // for the middle of the artwork. Do not jump the whole sequence early
      // just because that frame happens to be ready.
      if (
        layer.index === FRAME_COUNT - 1 &&
        target < FRAME_COUNT - 1 - LADDER_STEP * 2
      ) {
        continue;
      }
      const delta = layer.index - target;
      const ahead = delta * direction > 0;
      // Prefer the frame at or just behind the scrub; a frame ahead is still
      // better than a stale one, hence the small tie-breaker.
      const score = Math.abs(delta) + (ahead ? 0.35 : 0);
      if (!best || score < best.score) best = { layer, score };
    }

    if (!best) return;
    if (best.layer === layersRef.current[activeLayerRef.current]) {
      visibleIndexRef.current = best.layer.index;
      return;
    }
    if (best.score >= currentDistance - 0.25) return;
    revealLayer(best.layer);
  }, [revealLayer]);

  /**
   * Load one frame into an inactive layer. Each layer has its own token, so
   * replacing a stale request cannot let an older callback reveal the wrong
   * bitmap. The frame is decoded before it joins the ready pool.
   */
  const loadLayer = useCallback(
    (layer, index) => {
      const node = layer.node;
      if (!node) return;

      const token = layer.token + 1;
      layer.token = token;
      layer.index = index;
      layer.loading = true;
      layer.ready = false;
      window.clearTimeout(layer.timer);
      const requestedAt = performance.now();

      const src = frameSrc(index);
      if ('fetchPriority' in node) node.fetchPriority = 'high';

      const finish = () => {
        if (layer.token !== token || !layer.loading) return;
        if (node.getAttribute('src') !== src || node.naturalWidth === 0) {
          layer.loading = false;
          layer.ready = false;
          return;
        }
        layer.loading = false;
        layer.ready = true;
        window.clearTimeout(layer.timer);
        // Request to decoded bitmap, queueing included.
        const elapsed = performance.now() - requestedAt;
        latencyRef.current = Math.min(
          1500,
          Math.max(20, latencyRef.current * 0.7 + elapsed * 0.3),
        );
        showBest();
        scheduleRef.current?.();
      };

      const fail = () => {
        if (layer.token !== token) return;
        window.clearTimeout(layer.timer);
        layer.loading = false;
        layer.ready = false;
        layer.index = null;
      };

      node.onload = () => {
        if (layer.token !== token) return;
        layer.timer = window.setTimeout(finish, DECODE_FALLBACK_MS);
        if (typeof node.decode === 'function') node.decode().then(finish, finish);
        else finish();
      };
      node.onerror = fail;
      node.src = src;

      if (node.complete && node.naturalWidth > 0 && node.currentSrc.endsWith(src)) {
        if (typeof node.decode === 'function') node.decode().then(finish, finish);
        else finish();
      }
    },
    [showBest],
  );

  /**
   * Keep a small predictive buffer filled. The step is the last scroll jump,
   * so a steady scrub preloads the exact frames the next few events will ask
   * for; a slow scrub falls back to consecutive frames.
   */
  const schedule = useCallback(() => {
    const target = targetIndexRef.current;
    const active = layersRef.current[activeLayerRef.current];
    const slots = Math.max(0, poolSizeRef.current - 1);
    const direction = directionRef.current || 1;
    const step = Math.max(1, Math.min(stepRef.current, MAX_PREDICT_STEP));
    const narrow = narrowRef.current;

    const push = (list, index) => {
      const clamped = Math.min(FRAME_COUNT - 1, Math.max(0, index));
      if (!list.includes(clamped)) list.push(clamped);
    };

    const desired = [];
    if (narrow) {
      /* The end of the walk is the one frame a fling cannot improvise, so it
         is asked for before anything else while the last stretch is in reach. */
      if (keepFinalRef.current) push(desired, FRAME_COUNT - 1);
      /* Ask for the frame the scrub will be reading on arrival, not the one
         it is already leaving. */
      const lead = Math.max(
        1,
        Math.min(
          MAX_PREDICT_LEAD,
          Math.round(velocityRef.current * latencyRef.current),
        ),
      );
      const gap = Math.max(1, Math.round(velocityRef.current * LOAD_PACING_MS));
      push(desired, target + direction * lead);
      const ladder = Math.min(
        FRAME_COUNT - 1,
        Math.max(0, Math.round(target / LADDER_STEP) * LADDER_STEP),
      );
      push(desired, ladder);
      push(desired, target + direction * (lead + gap));
      push(desired, target + direction * (lead + gap * 2));
    } else {
      push(desired, target);
      for (let lane = 1; lane <= slots; lane += 1) {
        push(desired, target + direction * step * lane);
      }
    }

    /* Three lanes started together finish together, so only the nearest of
       the batch can ever be shown. Space the starts instead. The end frame is
       never made to wait for a lane slot. */
    const endWaiting =
      narrow &&
      desired[0] === FRAME_COUNT - 1 &&
      !layersRef.current.some(
        (layer) =>
          layer.index === FRAME_COUNT - 1 && (layer.loading || layer.ready),
      );
    if (narrow && !endWaiting) {
      const now = performance.now();
      const anyLoading = layersRef.current.some((layer) => layer.loading);
      const wait = LOAD_PACING_MS - (now - lastLoadAtRef.current);
      if (anyLoading && wait > 0) {
        if (!paceTimerRef.current) {
          paceTimerRef.current = window.setTimeout(() => {
            paceTimerRef.current = 0;
            scheduleRef.current?.();
          }, wait);
        }
        return;
      }
    }

    const desiredSet = new Set(desired);
    for (const index of desired.slice(0, slots + 1)) {
      const present = layersRef.current.some(
        (layer) => layer.index === index && (layer.loading || layer.ready),
      );
      if (present) continue;

      let layer = layersRef.current.find(
        (candidate) => candidate !== active && !candidate.loading && !candidate.ready,
      );

      const candidates = layersRef.current.filter((candidate) => candidate !== active);
      if (!candidates.length) break;

      // A decoded frame that is outside the desired window can be replaced
      // immediately. In-flight frames are left alone while they are near the
      // scrub; only a frame that has fallen far behind is abandoned, so a
      // sudden jump cannot leave the stage pinned to an old frame while four
      // stale downloads finish.
      if (!layer) {
        const recyclable = candidates.filter(
          (candidate) => candidate.ready && !desiredSet.has(candidate.index),
        );
        if (recyclable.length) {
          recyclable.sort((a, b) => {
            const aDistance = a.index === null ? Infinity : Math.abs(a.index - target);
            const bDistance = b.index === null ? Infinity : Math.abs(b.index - target);
            return bDistance - aDistance;
          });
          layer = recyclable[0];
        }
      }

      if (!layer) {
        const stale = candidates.filter(
          (candidate) =>
            candidate.loading &&
            candidate.index !== null &&
            (candidate.index - target) * direction < -STALE_DISTANCE,
        );
        if (stale.length) {
          stale.sort((a, b) => {
            const aDistance = a.index === null ? Infinity : Math.abs(a.index - target);
            const bDistance = b.index === null ? Infinity : Math.abs(b.index - target);
            return bDistance - aDistance;
          });
          layer = stale[0];
        }
      }

      if (!layer) continue;
      loadLayer(layer, index);
      if (narrow) {
        lastLoadAtRef.current = performance.now();
        break;
      }
    }
  }, [loadLayer]);

  const showFrame = useCallback(
    (index) => {
      const safe = Math.min(Math.max(index, 0), FRAME_COUNT - 1);
      const previous = targetIndexRef.current;

      if (safe !== previous) {
        const delta = safe - previous;
        const now = performance.now();
        const elapsed = lastTargetAtRef.current
          ? Math.max(8, now - lastTargetAtRef.current)
          : 16;
        lastTargetAtRef.current = now;
        velocityRef.current =
          velocityRef.current * 0.6 + (Math.abs(delta) / elapsed) * 0.4;
        const nextStep = Math.max(1, Math.min(Math.abs(delta), MAX_PREDICT_STEP));
        directionRef.current = delta > 0 ? 1 : -1;
        stepRef.current = nextStep;
        targetIndexRef.current = safe;

        if (narrowRef.current) {
          keepFinalRef.current =
            nextStep >= MAX_PREDICT_STEP ||
            safe >= FRAME_COUNT - 1 - LADDER_STEP * 2;
        }

        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = window.setTimeout(() => {
          stepRef.current = 1;
          velocityRef.current = 0;
          scheduleRef.current?.();
        }, 180);

        /* A scroll can fire several times inside one frame bucket. Only a new
           target needs a lane lookup; the content hand-over below still runs
           every time because its progress is continuous. */
        schedule();
        showBest();
      }
    },
    [schedule, showBest],
  );

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track || !visibleRef.current) return;

    // Only a resize (including a mobile URL bar collapse) can change these.
    if (metricsRef.current.viewport !== window.innerHeight) measure();

    const { top, scrollDistance } = metricsRef.current;
    const progress =
      scrollDistance > 0 ? clamp01((window.scrollY - top) / scrollDistance) : 0;

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

    const cache = styleCacheRef.current;
    const setStyle = (node, key, property, value) => {
      if (!node || cache[key] === value) return;
      cache[key] = value;
      node.style[property] = value;
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
       clears out over the first 20 % of the dissolve — long before the dining
       heading is readable — and the two "continue" labels never overlap. */
    setStyle(
      entranceCueRef.current,
      'cueOpacity',
      'opacity',
      String(clamp01(1 - mix / 0.2)),
    );
  }, [showFrame, measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    narrowRef.current =
      window.matchMedia('(max-width: 1023px)').matches ||
      window.matchMedia('(pointer: coarse)').matches;
    poolSizeRef.current = narrowRef.current ? NARROW_LAYERS : MAX_LAYERS;
    keepFinalRef.current = narrowRef.current;
    measure();

    /* Start from one visible frame and an empty prefetch pool. */
    const layers = layersRef.current;
    layers.forEach((layer, index) => {
      window.clearTimeout(layer.timer);
      layer.token += 1;
      layer.loading = false;
      layer.ready = index === 0;
      layer.index = index === 0 ? 0 : null;
      if (layer.node) {
        layer.node.style.opacity = index === 0 ? '1' : '0';
        if (index !== 0) layer.node.removeAttribute('src');
      }
    });
    activeLayerRef.current = 0;
    visibleIndexRef.current = 0;
    targetIndexRef.current = 0;
    directionRef.current = 1;
    stepRef.current = 1;
    velocityRef.current = 0;
    latencyRef.current = INITIAL_LATENCY;
    lastTargetAtRef.current = 0;
    lastLoadAtRef.current = 0;
    window.clearTimeout(paceTimerRef.current);
    paceTimerRef.current = 0;
    scheduleRef.current = schedule;
    /* Seed the pool once at mount so the first notch already has the next
       frame and, on narrow screens, the final artwork in flight. */
    schedule();

    /* One low-priority pass caches the final frame first, then seven evenly
       spaced anchors (frame 0 is already visible). It stops when finished; it
       is a fallback for a hard fling, not a background download. */
    let ladderCancelled = false;
    const warmLadder = async () => {
      const ladderIndexes = [FRAME_COUNT - 1];
      for (let index = LADDER_STEP; index < FRAME_COUNT - 1; index += LADDER_STEP) {
        ladderIndexes.push(index);
      }
      for (const index of ladderIndexes) {
        if (ladderCancelled) return;
        try {
          const response = await fetch(frameSrc(index), { priority: 'low' });
          await response.arrayBuffer();
        } catch {}
      }
    };
    const ladderTimer = narrowRef.current
      ? window.setTimeout(() => {
          void warmLadder();
        }, 400)
      : 0;

    /* Reduced motion: keep the frames (the user drives them) but swap the
       copy abruptly instead of dissolving/sliding it. */
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

    const onResize = () => {
      measure();
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
      { rootMargin: '50% 0px' },
    );
    observer.observe(track);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    schedule();
    update();

    return () => {
      ladderCancelled = true;
      window.clearTimeout(ladderTimer);
      layers.forEach((layer) => {
        window.clearTimeout(layer.timer);
        layer.token += 1;
        layer.loading = false;
      });
      scheduleRef.current = null;
      window.clearTimeout(settleTimerRef.current);
      window.clearTimeout(paceTimerRef.current);
      paceTimerRef.current = 0;
      observer.disconnect();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      motionQuery.removeEventListener?.('change', syncMotionPreference);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [update, measure, schedule]);

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
        {/* The frame is swapped from scroll progress only, through a small
            pool of stacked layers. One is visible, the others hold decoded
            frames near the predicted scroll position. The last good frame
            stays visible until a better one is ready, so the stage never goes
            black. */}
        {layersRef.current.map((layer, index) => (
          <img
            key={index}
            ref={(node) => {
              layer.node = node;
            }}
            src={index === 0 ? frameSrc(0) : undefined}
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            style={{ opacity: index === 0 ? 1 : 0 }}
          />
        ))}

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
