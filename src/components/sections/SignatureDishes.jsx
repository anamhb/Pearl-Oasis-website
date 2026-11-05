import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// ============================================================================
// 1. Configurable Featured Dish Images Array
// Paths are cleanly organized here so they can be changed without touching motion logic
// ============================================================================
import chickenFriedRiceImg from '../../assets/images/Chicken_Fried_Rice.png';
import chickenSoupImg from '../../assets/images/Chicken_soup.png';
import chowmeinImg from '../../assets/images/Chowmen.png';
import seekhKababImg from '../../assets/images/Seekh_Kabab-1.png';
import malaiBotiImg from '../../assets/images/Malai_Boti.png';
import lebaneseWrapImg from '../../assets/images/labenese_wrap.png';
import mintImg from '../../assets/images/mint.png';

// Centered Pearl Oasis text logo from navbar
import logoText from '../../assets/images/logo-text.png';

export const FEATURED_DISH_IMAGES = [
  {
    id: 'chicken-fried-rice',
    name: 'Chicken Fried Rice',
    src: chickenFriedRiceImg,
    alt: 'Pearl Oasis Chicken Fried Rice',
  },
  {
    id: 'chicken-soup',
    name: 'Chicken Soup',
    src: chickenSoupImg,
    alt: 'Pearl Oasis Chicken Soup',
  },
  {
    id: 'chowmein',
    name: 'Chowmein',
    src: chowmeinImg,
    alt: 'Pearl Oasis Chowmein',
  },
  {
    id: 'seekh-kabab',
    name: 'Seekh Kabab',
    src: seekhKababImg,
    alt: 'Pearl Oasis Seekh Kabab',
  },
  {
    id: 'malai-boti',
    name: 'Malai Boti',
    src: malaiBotiImg,
    alt: 'Pearl Oasis Malai Boti',
  },
  {
    id: 'lebanese-wrap',
    name: 'Lebanese Wrap',
    src: lebaneseWrapImg,
    alt: 'Pearl Oasis Lebanese Wrap',
  },
  {
    id: 'mint-margarita',
    name: 'Mint Margarita',
    src: mintImg,
    alt: 'Pearl Oasis Mint Margarita',
  },
];

const TAU = Math.PI * 2;
const ORBIT_START_ANGLE = -Math.PI / 2;
const DISH_COUNT = FEATURED_DISH_IMAGES.length;

/* Desktop layout constants (>=1024), all in CSS px:
   - the hub's outer dashed ring is `lg:w-52` plus `md:-inset-5`, so its radius
     is 104 + 20 = 124;
   - DESKTOP_GAP is the clear space kept between that ring and the nearest
     visible pixel of every dish, so the seven gaps match instead of drifting
     with the ellipse the way they used to;
   - DESKTOP_STAGE_HEIGHT is the stage those numbers need so the tallest dish
     clears both the hub and the stage edge. */
const HUB_RING_RADIUS = 124;
const DESKTOP_GAP = 60;
const DESKTOP_STAGE_HEIGHT = 780;
const DESKTOP_EDGE_MARGIN = 8;
/* Until an image reports its real footprint, assume the largest box the CSS
   can give it (`lg:w-44` by `lg:max-h-[220px]`), which never understates. */
const FALLBACK_DISH_FOOTPRINT = { hx: 88, hy: 110, dx: 0, dy: 0 };
/* Boundary samples used when measuring a footprint, and bisection steps used
   when solving a station radius. Both are far past what layout needs: the
   residual error is below 0.1px. */
const FOOTPRINT_SAMPLES = 96;
const RADIUS_SOLVE_STEPS = 32;
/* Boundary directions reused by every dish and every bisection step, so the
   solve never pays for trig in its inner loop. */
const FOOTPRINT_UNIT_CIRCLE = Array.from({ length: FOOTPRINT_SAMPLES }, (_, step) => {
  const t = (step / FOOTPRINT_SAMPLES) * TAU;
  return [Math.cos(t), Math.sin(t)];
});

/* Opaque bounds of a dish image, in natural pixels. The assets ship with large
   transparent margins (the mint glass is only 32% opaque), so the element box
   overstates what the eye sees. Cached per asset: each is scanned once. */
const opaqueBoundsCache = new Map();
const readOpaqueBounds = (img) => {
  const cached = opaqueBoundsCache.get(img.src);
  if (cached !== undefined) return cached;
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  let bounds = null;
  if (naturalWidth && naturalHeight) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(img, 0, 0);
      const { data } = context.getImageData(0, 0, naturalWidth, naturalHeight);
      let minX = naturalWidth;
      let maxX = -1;
      let minY = naturalHeight;
      let maxY = -1;
      for (let y = 0; y < naturalHeight; y += 1) {
        const row = y * naturalWidth * 4;
        for (let x = 0; x < naturalWidth; x += 1) {
          if (data[row + x * 4 + 3] > 16) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX >= minX) {
        bounds = {
          width: maxX - minX + 1,
          height: maxY - minY + 1,
          dx: (minX + maxX + 1) / 2 - naturalWidth / 2,
          dy: (minY + maxY + 1) / 2 - naturalHeight / 2,
        };
      }
    } catch {
      bounds = null; // unreadable pixels: fall back to the element box below
    }
  }
  opaqueBoundsCache.set(img.src, bounds);
  return bounds;
};

/* A dish's visible footprint in CSS px: the element box scaled by how
   object-contain fits the image into it, then trimmed to the opaque bounds.
   Returns null while the image has no layout or has not loaded, so callers can
   fall back to the largest possible box. */
const toFootprint = (img) => {
  const boxWidth = img.offsetWidth;
  const boxHeight = img.offsetHeight;
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  if (!boxWidth || !boxHeight || !img.complete || !naturalWidth || !naturalHeight) return null;
  const scale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
  const bounds = readOpaqueBounds(img);
  if (!bounds) return { hx: boxWidth / 2, hy: boxHeight / 2, dx: 0, dy: 0 };
  return {
    hx: (bounds.width / 2) * scale,
    hy: (bounds.height / 2) * scale,
    dx: bounds.dx * scale,
    dy: bounds.dy * scale,
  };
};

/* Structural comparison so re-measuring the same boxes never re-renders. */
const sameFootprint = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.hx === b.hx && a.hy === b.hy && a.dx === b.dx && a.dy === b.dy;
};

/* Closest distance from the hub centre to a dish's visible footprint. The
   footprint is the ellipse inscribed in the opaque bounds (the plates are
   round, so the box corners are transparent), offset from the station centre
   by (dx, dy). Sampling that ellipse's boundary is accurate enough for
   layout without solving a quartic. */
const footprintDistance = (radius, angle, footprint) => {
  const { hx, hy, dx, dy } = footprint;
  const centreX = Math.cos(angle) * radius + dx;
  const centreY = Math.sin(angle) * radius + dy;
  let closest = Infinity;
  for (let step = 0; step < FOOTPRINT_SAMPLES; step += 1) {
    const [unitX, unitY] = FOOTPRINT_UNIT_CIRCLE[step];
    const x = centreX + unitX * hx;
    const y = centreY + unitY * hy;
    const distance = Math.hypot(x, y);
    if (distance < closest) closest = distance;
  }
  return closest;
};

/* Station radius that leaves exactly `target` clear space between the hub and
   the dish. Distance grows monotonically along the ray, so a bisection over
   the radius converges quickly. */
const solveStationRadius = (angle, footprint, target) => {
  let low = 0;
  let high = 900;
  for (let step = 0; step < RADIUS_SOLVE_STEPS; step += 1) {
    const mid = (low + high) / 2;
    if (footprintDistance(mid, angle, footprint) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
};

/* Largest radius that still keeps the dish's opaque box inside the stage, so a
   station can never be pushed past the section edge. */
const fitRadius = (angle, footprint, halfWidth, halfHeight, margin) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const limitX = halfWidth - margin - footprint.hx;
  const limitY = halfHeight - margin - footprint.hy;
  if (limitX <= 0 || limitY <= 0) return 0;
  let bound = Infinity;
  if (cos > 0) bound = Math.min(bound, (limitX - footprint.dx) / cos);
  else if (cos < 0) bound = Math.min(bound, (-limitX - footprint.dx) / cos);
  else if (Math.abs(footprint.dx) > limitX) return 0;
  if (sin > 0) bound = Math.min(bound, (limitY - footprint.dy) / sin);
  else if (sin < 0) bound = Math.min(bound, (-limitY - footprint.dy) / sin);
  else if (Math.abs(footprint.dy) > limitY) return 0;
  return Math.max(0, bound);
};

// The orbit is shared by every dish. Only the stage dimensions, the breakpoint
// and the dish index decide a station; there are no hand-picked coordinates.
// Every station reports its own rx/ry so entrance and exit follow the same
// curve the dish rests on.
const getOrbitGeometry = (stageWidth, stageHeight, viewportWidth, footprints) => {
  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth < 1024;
  const dishHalfWidth = isMobile ? 40 : isTablet ? 64 : 88;
  const edgeHalfHeight = isMobile ? 46 : isTablet ? 70 : 92;

  const maxRx = Math.max(0, stageWidth / 2 - dishHalfWidth - 6);
  const maxRy = Math.max(0, stageHeight / 2 - edgeHalfHeight - 8);
  const rx = Math.min(
    isMobile ? 150 : isTablet ? 330 : 430,
    stageWidth * (isMobile ? 0.36 : 0.38),
    maxRx,
  );
  const ry = Math.min(isMobile ? 150 : isTablet ? 184 : 210, maxRy);

  const stations = Array.from({ length: DISH_COUNT }, (_, index) => {
    const angle = ORBIT_START_ANGLE + (TAU * index) / DISH_COUNT;

    /* Phone and tablet keep the original ellipse: that layout already reads
       well and is measured at 21px of gap spread on its own. */
    if (isTablet) {
      return { angle, rx, ry, x: Math.cos(angle) * rx, y: Math.sin(angle) * ry };
    }

    /* Desktop: push each dish out along its own ray until its visible edge
       clears the hub ring by DESKTOP_GAP. Because the radius depends on that
       dish's real footprint, all seven gaps come out equal, and because the
       angle is untouched the centres stay evenly spaced. */
    const footprint = footprints?.[index] ?? FALLBACK_DISH_FOOTPRINT;
    const radius = Math.min(
      solveStationRadius(angle, footprint, HUB_RING_RADIUS + DESKTOP_GAP),
      fitRadius(angle, footprint, stageWidth / 2, stageHeight / 2, DESKTOP_EDGE_MARGIN),
    );
    return { angle, rx: radius, ry: radius, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

  if (isTablet) return { stations, guideRx: rx, guideRy: ry };

  /* The guide sits on the mean station radius. Footprints differ per dish, so
     no single curve can pass through every station; the mean keeps it centred
     and within ~10px of all of them. */
  const meanRadius = stations.reduce((sum, station) => sum + station.rx, 0) / DISH_COUNT;
  return { stations, guideRx: meanRadius, guideRy: meanRadius };
};

export const SignatureDishes = () => {
  const containerRef = useRef(null);
  const dishDomRefs = useRef([]);
  const dishImgRefs = useRef([]);
  const rafIdRef = useRef(null);
  const startTimeRef = useRef(null);
  /* Visibility and pause bookkeeping for the orbit loop. These are refs so the
     IntersectionObserver can start/stop the loop without re-rendering the
     section. */
  const visibleRef = useRef(true);
  const pausedAtRef = useRef(0);

  const [stageSize, setStageSize] = useState({ width: 1000, height: 600 });
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === 'undefined' ? 1440 : window.innerWidth
  ));
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  /* One visible footprint per dish; null until the image can be measured.
     The desktop orbit solves its radii from these, so every dish's real
     rendered size feeds the spacing instead of a guessed constant. */
  const [footprints, setFootprints] = useState(() => FEATURED_DISH_IMAGES.map(() => null));

  /* One geometry snapshot for both the animation effect and the render, so the
     stations the dishes rest on and the guide drawn around them can never come
     from different inputs, and the radius solve runs once per change instead
     of twice. */
  const orbit = useMemo(
    () => getOrbitGeometry(stageSize.width, stageSize.height, viewportWidth, footprints),
    [stageSize, viewportWidth, footprints],
  );

  const syncFootprints = useCallback(() => {
    /* Only the desktop orbit solves radii from footprints, so below 1024 the
       alpha scan would be pure overhead on the devices least able to afford
       it. Resize back above the breakpoint and it measures again. */
    if (window.innerWidth < 1024) return;
    const next = dishImgRefs.current.map((img) => (img ? toFootprint(img) : null));
    setFootprints((prev) => (
      prev.every((value, index) => sameFootprint(value, next[index])) ? prev : next
    ));
  }, []);

  // Update container dimensions responsively
  const updateStageSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.max(300, rect.width);
      const vw = window.innerWidth;
      // Keep the stage height and the CSS dish breakpoints in step.
      const h = vw < 640 ? 540 : vw < 1024 ? 560 : DESKTOP_STAGE_HEIGHT;
      setStageSize({ width: w, height: h });
      setViewportWidth(vw);
      /* The CSS dish box changes with the breakpoint, so the measured
         footprints have to follow it. */
      syncFootprints();
    }
  }, [syncFootprints]);

  useEffect(() => {
    updateStageSize();
    window.addEventListener('resize', updateStageSize);
    return () => window.removeEventListener('resize', updateStageSize);
  }, [updateStageSize]);

  /* Images can finish loading after the first measure; measure again then. */
  useEffect(() => {
    syncFootprints();
    const images = dishImgRefs.current.filter(Boolean);
    const onLoad = () => syncFootprints();
    images.forEach((img) => {
      if (!img.complete) img.addEventListener('load', onLoad);
    });
    return () => images.forEach((img) => img.removeEventListener('load', onLoad));
  }, [syncFootprints]);

  /* Match the rest of the site: honor the user's reduced-motion setting. */
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setPrefersReducedMotion(motionQuery.matches);
    syncMotion();
    motionQuery.addEventListener?.('change', syncMotion);
    return () => motionQuery.removeEventListener?.('change', syncMotion);
  }, []);

  // ============================================================================
  // Continuous orbit sequence:
  // - Every dish owns one evenly spaced station on the shared orbit.
  // - A dish enters from just outside the orbit and settles on its station.
  // - It rests, then spirals inward and is absorbed by the central hub.
  // - The next dish follows at a fixed interval, so the loop never stops.
  // ============================================================================
  useEffect(() => {
    const totalDishes = DISH_COUNT;
    const cycleDuration = 8.4;
    const staggerStep = cycleDuration / totalDishes;
    const entranceEnd = 0.12;
    // The exit now starts 0.02 cycle earlier while ending at the same point,
    // lengthening the centre-bound glide from 1.008s to 1.176s (+16.7%).
    // It remains shorter than the 1.2s stagger, so only one dish is absorbed
    // at a time and the sequence cadence is unchanged.
    const exitStart = 0.86;
    const { stations } = orbit;

    // Reduced motion: no orbit, no fade. Every dish sits at its calculated
    // station at full size, so the section still reads as a composed plate.
    if (prefersReducedMotion) {
      for (let i = 0; i < totalDishes; i++) {
        const el = dishDomRefs.current[i];
        if (!el) continue;
        const point = stations[i];
        el.style.transform = `translate3d(calc(-50% + ${point.x.toFixed(2)}px), calc(-50% + ${point.y.toFixed(2)}px), 0) scale(1)`;
        el.style.opacity = '1';
        el.style.zIndex = 25;
      }
      startTimeRef.current = null;
      pausedAtRef.current = 0;
      return undefined;
    }

    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
    const easeInOutCubic = (x) => (
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
    );

    const renderDish = (el, x, y, scale, opacity, zIndex) => {
      el.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), 0) scale(${scale.toFixed(3)})`;
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = String(zIndex);
    };

    let cancelled = false;

    const animate = (currentTime) => {
      if (cancelled || !visibleRef.current) {
        rafIdRef.current = null;
        return;
      }
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }
      const elapsedTime = (currentTime - startTimeRef.current) / 1000;

      for (let i = 0; i < totalDishes; i++) {
        const el = dishDomRefs.current[i];
        if (!el) continue;

        const station = stations[i];
        const dishStartTime = i * staggerStep;

        if (elapsedTime < dishStartTime) {
          renderDish(el, station.x, station.y, 0, 0, 10);
          continue;
        }

        // Local cycle progress. The wrap happens only while the dish is fully
        // transparent, so the reset to the outer entry point is never visible.
        const u = ((elapsedTime - dishStartTime) / cycleDuration) % 1;

        if (u < entranceEnd) {
          // Enter from outside the orbit, curving into the station.
          const p = u / entranceEnd;
          const e = easeOutCubic(p);
          const radial = 1.3 - 0.3 * e;
          const angle = station.angle - 0.1 * (1 - e);
          renderDish(
            el,
            Math.cos(angle) * station.rx * radial,
            Math.sin(angle) * station.ry * radial,
            0.55 + 0.45 * e,
            e,
            26,
          );
        } else if (u < exitStart) {
          // Rest on the station. All positions are exact, so the ring of dishes
          // stays symmetrical between beats.
          renderDish(el, station.x, station.y, 1, 1, 25);
        } else {
          // Spiral into the hub. Opacity stays at 1 until the dish reaches the
          // centre, then it fades out behind the stationary logo disc.
          const p = (u - exitStart) / (1 - exitStart);
          const e = easeInOutCubic(p);
          const radial = 1 - e;
          const angle = station.angle + 0.55 * e;
          const opacity = p < 0.82 ? 1 : Math.max(0, 1 - (p - 0.82) / 0.18);
          renderDish(
            el,
            Math.cos(angle) * station.rx * radial,
            Math.sin(angle) * station.ry * radial,
            1 - 0.48 * e,
            opacity,
            10,
          );
        }
      }

      if (!cancelled && visibleRef.current) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
      }
    };

    const startLoop = () => {
      if (cancelled || rafIdRef.current || !visibleRef.current) return;
      rafIdRef.current = requestAnimationFrame(animate);
    };

    const stopLoop = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = null;
    };

    const pause = () => {
      stopLoop();
      /* Remember when the orbit stopped so resume() can keep its phase instead
         of jumping forward by the time spent offscreen. */
      if (startTimeRef.current !== null && pausedAtRef.current === 0) {
        pausedAtRef.current = performance.now();
      }
    };

    const resume = () => {
      if (pausedAtRef.current !== 0 && startTimeRef.current !== null) {
        startTimeRef.current += performance.now() - pausedAtRef.current;
      }
      pausedAtRef.current = 0;
      startLoop();
    };

    const setVisible = (nextVisible) => {
      if (nextVisible === visibleRef.current) return;
      visibleRef.current = nextVisible;
      if (nextVisible) resume();
      else pause();
    };

    const container = containerRef.current;
    let observer = null;

    if (typeof IntersectionObserver === 'undefined' || !container) {
      /* Without an observer, keep the original always-on behavior. */
      visibleRef.current = true;
      resume();
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          setVisible(entries.some((entry) => entry.isIntersecting));
        },
        { rootMargin: '200px 0px' },
      );
      observer.observe(container);

      /* The first observer callback is asynchronous. Seed visibility from the
         current layout so the loop does not run while the stage is offscreen. */
      const margin = 200;
      const rect = container.getBoundingClientRect();
      const initiallyVisible =
        rect.bottom > -margin && rect.top < window.innerHeight + margin;
      visibleRef.current = initiallyVisible;
      if (initiallyVisible) resume();
      else pause();
    }

    return () => {
      cancelled = true;
      stopLoop();
      if (observer) observer.disconnect();
    };
  }, [orbit, prefersReducedMotion]);

  return (
    <section
      id="signature"
      className="relative py-12 sm:py-16 px-4 sm:px-8 lg:px-12 bg-[#08090b] border-t border-[#1e1c18] overflow-hidden select-none"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[450px] bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.06)_0%,_rgba(15,16,19,0.3)_50%,_transparent_75%)] blur-3xl" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/25 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/15 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 1. Heading and Introduction */}
        <div className="mb-10 sm:mb-14">
          <h2 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#f6efe4] font-normal tracking-tight">
            Our Featured Dishes
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#b8b1a4] max-w-2xl font-sans leading-relaxed font-light">
            Discover the flavors, crafted with passion and served to make every moment unforgettable.
          </p>
        </div>

        {/* 2. Motion Experience Stage. No card border or shadow: the orbit and
            the dishes should sit directly on the section. */}
        <div
          ref={containerRef}
          className="relative isolate w-full rounded-xl bg-gradient-to-b from-[#0c0d10] via-[#090a0d] to-[#07080a] overflow-hidden flex items-center justify-center"
          style={{ minHeight: `${stageSize.height}px` }}
        >
          {/* Faint orbit guide, centred on the hub. On desktop it sits on the
              mean station radius; each dish carries its own radius so that its
              visible gap to the hub matches every other dish's. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: `${orbit.guideRx * 2}px`,
              height: `${orbit.guideRy * 2}px`,
              zIndex: 5,
            }}
          >
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${orbit.guideRx * 2} ${orbit.guideRy * 2}`}
              fill="none"
            >
              <ellipse
                cx={orbit.guideRx}
                cy={orbit.guideRy}
                rx={Math.max(1, orbit.guideRx - 0.5)}
                ry={Math.max(1, orbit.guideRy - 0.5)}
                stroke="#d4af37"
                strokeWidth="0.9"
                strokeDasharray="2 10"
                strokeLinecap="round"
                strokeOpacity="0.3"
              />
            </svg>
          </div>

          {/* ================================================================== */}
          {/* Central Hub: Restored previous visual style, materials & rotating ring */}
          {/* Logo and main circle are STRICTLY STATIONARY. Only outer ring rotates. */}
          {/* ================================================================== */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none flex items-center justify-center"
            style={{ zIndex: 20 }}
          >
            {/* Restored First Rotating Outer Ring (Covis inspired dashed decorative ring) */}
            <div
              className={`absolute -inset-3.5 sm:-inset-4 md:-inset-5 rounded-full pointer-events-none${prefersReducedMotion ? '' : ' animate-spin-slow'}`}
              style={{ animationDuration: '45s' }}
            >
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="#d4af37"
                  strokeWidth="0.8"
                  strokeDasharray="3 5"
                  strokeOpacity="0.45"
                />
                {/* 4 subtle cardinal accent pips on the rotating ring */}
                <circle cx="50" cy="2" r="1.3" fill="#ffd875" opacity="0.75" />
                <circle cx="50" cy="98" r="1.3" fill="#ffd875" opacity="0.75" />
                <circle cx="2" cy="50" r="1.3" fill="#ffd875" opacity="0.75" />
                <circle cx="98" cy="50" r="1.3" fill="#ffd875" opacity="0.75" />
              </svg>
            </div>

            {/* Main Central Circle (stationary; reduced only on narrow phones so
                the orbit stays clear of the logo) */}
            <div
              className="relative w-28 h-28 sm:w-44 sm:h-44 lg:w-52 lg:h-52 rounded-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#18191d] via-[#111215] to-[#0a0a0d] border border-[#d4af37]/45 shadow-[0_12px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]"
            >
              {/* Restored delicate inner hairline accent ring */}
              <div className="absolute inset-2 sm:inset-2.5 rounded-full border border-[#d4af37]/20 pointer-events-none" />

              {/* Centered original Pearl Oasis text-logo from navbar (Stationary) */}
              <img
                src={logoText}
                alt="Pearl Oasis"
                draggable={false}
                className="w-[82%] max-w-[170px] h-auto max-h-[65%] object-contain select-none"
              />
            </div>
          </div>

          {/* ================================================================== */}
          {/* 3. Seven Animated Featured-Dish Images */}
          {/* Each wrapper is only a transform shell: no card surface, border, */}
          {/* outline or shadow. The image and its shell move as one element. */}
          {/* ================================================================== */}
          {FEATURED_DISH_IMAGES.map((dish, index) => (
            <div
              key={dish.id}
              ref={(el) => {
                dishDomRefs.current[index] = el;
              }}
              className="absolute top-1/2 left-1/2 will-change-transform pointer-events-none select-none border-0 bg-transparent shadow-none outline-none"
              style={{
                transform: 'translate3d(-50%, -50%, 0) scale(0)',
                opacity: 0,
              }}
            >
              {/* Actual dish only: natural aspect ratio, no card chrome. The
                  ref is how the desktop gap math reads each dish's real
                  rendered box. */}
              <img
                ref={(el) => {
                  dishImgRefs.current[index] = el;
                }}
                src={dish.src}
                alt={dish.alt || dish.name}
                draggable={false}
                className="w-20 sm:w-32 lg:w-44 max-w-[190px] h-auto max-h-[110px] sm:max-h-[160px] lg:max-h-[220px] object-contain contrast-[1.02] pointer-events-none"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
