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
 * Frames are 1280×720 and ~36 KB each (≈2 MB for the set). A small decoded
 * pool follows the scrub and predicts the next jump, instead of loading the
 * whole set at mount alongside the hero. The visible layer only swaps once a
 * replacement has decoded, so a scrub never shows a blank stage.
 */

const FRAME_COUNT = 56;
/** 56 × 2 vh = 112 vh of pinned travel (the track is 212 vh tall). */
const SCROLL_VH_PER_FRAME = 2;

/** Visible layer plus a small decoded buffer, as in the hero walkthrough. */
const MAX_LAYERS = 5;
const NARROW_LAYERS = 4;
const MAX_PREDICT_STEP = 16;
const DECODE_FALLBACK_MS = 300;

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
  const storyCopyRef = useRef(null);
  const flavourCopyRef = useRef(null);
  /* Several scroll ticks can land in one frame with identical copy values.
     Writing the same inline style again still dirties style and layout. */
  const styleCacheRef = useRef({});
  const rafRef = useRef(0);
  const reducedMotionRef = useRef(false);
  /** False while the story stage is more than about a viewport away. */
  const visibleRef = useRef(false);
  const metricsRef = useRef({ top: 0, scrollDistance: 0, viewport: 0 });
  const narrowRef = useRef(false);
  const poolSizeRef = useRef(NARROW_LAYERS);

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

  /** Show the closest decoded frame while the exact target is on its way. */
  const showBest = useCallback(() => {
    const target = targetIndexRef.current;
    const direction = directionRef.current || 1;
    const currentDistance = Math.abs(visibleIndexRef.current - target);
    let best = null;

    for (const layer of layersRef.current) {
      if (!layer.ready || layer.index === null) continue;
      const delta = layer.index - target;
      const ahead = delta * direction > 0;
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
   * Decode one frame into an inactive layer. Per-layer tokens keep an older
   * load from revealing after the layer has been reassigned.
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
   * Predictive buffer: the step is the last target jump, so a steady scrub
   * preloads the frames the next events will ask for instead of a fixed
   * 9-frame window that can only be used once.
   */
  const schedule = useCallback(() => {
    if (!visibleRef.current) return;
    const target = targetIndexRef.current;
    const active = layersRef.current[activeLayerRef.current];
    const slots = Math.max(0, poolSizeRef.current - 1);
    const direction = directionRef.current || 1;
    const step = Math.max(1, Math.min(stepRef.current, MAX_PREDICT_STEP));
    const desired = [];

    for (let offset = 0; offset <= slots; offset += 1) {
      const index = Math.min(
        FRAME_COUNT - 1,
        Math.max(0, target + direction * step * offset),
      );
      if (!desired.includes(index)) desired.push(index);
    }

    const desiredSet = new Set(desired);
    for (const index of desired) {
      const present = layersRef.current.some(
        (layer) => layer.index === index && (layer.loading || layer.ready),
      );
      if (present) continue;

      let layer = layersRef.current.find(
        (candidate) => candidate !== active && !candidate.loading && !candidate.ready,
      );

      if (!layer) {
        const candidates = layersRef.current.filter((candidate) => candidate !== active);
        if (!candidates.length) break;

        // Replace a decoded frame outside the window; wait for in-flight
        // frames instead of cancelling a nearby load for a farther one.
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

      if (!layer) continue;
      loadLayer(layer, index);
    }
  }, [loadLayer]);

  /**
   * Free every prefetched bitmap once the story stage is a viewport away.
   * Keeping 1280x720 decoded frames alive while Hero, menu and the rest of the
   * page are on screen adds avoidable memory pressure on phones. The visible
   * frame is kept; the pool refills on entry.
   */
  const releaseIdleLayers = useCallback(() => {
    const active = layersRef.current[activeLayerRef.current];
    for (const layer of layersRef.current) {
      if (layer === active) continue;
      window.clearTimeout(layer.timer);
      layer.token += 1;
      layer.loading = false;
      layer.ready = false;
      layer.index = null;
      if (layer.node) {
        layer.node.style.opacity = '0';
        layer.node.removeAttribute('src');
      }
    }
    window.clearTimeout(settleTimerRef.current);
    stepRef.current = 1;
  }, []);

  const showFrame = useCallback(
    (rawIndex) => {
      const safe = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(rawIndex)));
      const previous = targetIndexRef.current;

      if (safe !== previous) {
        const delta = safe - previous;
        directionRef.current = delta > 0 ? 1 : -1;
        stepRef.current = Math.max(1, Math.min(Math.abs(delta), MAX_PREDICT_STEP));
        targetIndexRef.current = safe;

        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = window.setTimeout(() => {
          stepRef.current = 1;
          scheduleRef.current?.();
        }, 180);

        /* Only a new target needs a lane lookup. The copy hand-over still
           runs on every tick because its progress is continuous. */
        schedule();
        showBest();
      }
    },
    [schedule, showBest],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    narrowRef.current =
      window.matchMedia('(max-width: 1023px)').matches ||
      window.matchMedia('(pointer: coarse)').matches;
    poolSizeRef.current = narrowRef.current ? NARROW_LAYERS : MAX_LAYERS;
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
    visibleRef.current = false;
    scheduleRef.current = schedule;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => {
      reducedMotionRef.current = motionQuery.matches;
    };
    syncMotion();

    const update = () => {
      if (!visibleRef.current) return;

      if (metricsRef.current.viewport !== window.innerHeight) measure();

      const { top, scrollDistance } = metricsRef.current;
      const scrollY = window.scrollY;
      const progress =
        scrollDistance > 0 ? clamp01((scrollY - top) / scrollDistance) : 0;
      const rectTop = top - scrollY;

      showFrame(progress * (FRAME_COUNT - 1));

      const reducedMotion = reducedMotionRef.current;

      /* The left copy also fades in while the section is still coming up the
         viewport, so it is already in place when the stage pins instead of
         blinking in a moment later. */
      const entry = clamp01((window.innerHeight - rectTop) / (window.innerHeight * 0.45));
      const story = reducedMotion
        ? 1
        : Math.max(entry, windowMix(progress, STORY_IN));
      const flavour = reducedMotion
        ? progress >= FLAVOUR_IN[0]
          ? 1
          : 0
        : windowMix(progress, FLAVOUR_IN);

      const cache = styleCacheRef.current;
      const setStyle = (node, key, property, value) => {
        if (!node || cache[key] === value) return;
        cache[key] = value;
        node.style[property] = value;
      };

      setStyle(storyCopyRef.current, 'storyOpacity', 'opacity', String(story));
      setStyle(
        storyCopyRef.current,
        'storyTransform',
        'transform',
        reducedMotion ? 'none' : `translateY(${(18 * (1 - story)).toFixed(2)}px)`,
      );

      setStyle(
        flavourCopyRef.current,
        'flavourOpacity',
        'opacity',
        String(flavour),
      );
      setStyle(
        flavourCopyRef.current,
        'flavourTransform',
        'transform',
        reducedMotion ? 'none' : `translateY(${(18 * (1 - flavour)).toFixed(2)}px)`,
      );
    };

    /* Coalesce scroll events into one rAF pass. One pending frame only: a burst
       of touch events used to post several callbacks, each re-measuring the
       track and re-writing both copy layers in the same frame. */
    const queueUpdate = () => {
      if (!visibleRef.current || rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        update();
      });
    };

    const onMotionChange = () => {
      syncMotion();
      queueUpdate();
    };

    const onResize = () => {
      measure();
      queueUpdate();
    };

    /* Skip the per-scroll work while the stage is more than a viewport away;
       the catch-up pass runs as it re-enters. */
    const observer = new IntersectionObserver(
      (entries) => {
        const near = entries.some((entry) => entry.isIntersecting);
        if (near === visibleRef.current) return;
        visibleRef.current = near;
        if (near) {
          measure();
          update();
          scheduleRef.current?.();
        } else {
          releaseIdleLayers();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(track);

    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', onResize);
    motionQuery.addEventListener?.('change', onMotionChange);

    return () => {
      layers.forEach((layer) => {
        window.clearTimeout(layer.timer);
        layer.token += 1;
        layer.loading = false;
      });
      scheduleRef.current = null;
      window.clearTimeout(settleTimerRef.current);
      observer.disconnect();
      window.removeEventListener('scroll', queueUpdate);
      window.removeEventListener('resize', onResize);
      motionQuery.removeEventListener?.('change', onMotionChange);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [showFrame, measure, schedule, releaseIdleLayers]);

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
              Every great meal carries an essence. The subtle aroma of spices, the richness of
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
