import React, { useEffect, useRef, useState, useCallback } from 'react';

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

// The orbit is shared by every dish. Only the stage dimensions and the dish
// index decide a station; there are no hand-picked or random coordinates.
const getOrbitGeometry = (stageWidth, stageHeight, viewportWidth) => {
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

  return { rx, ry };
};

export const SignatureDishes = () => {
  const containerRef = useRef(null);
  const dishDomRefs = useRef([]);
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

  // Update container dimensions responsively
  const updateStageSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.max(300, rect.width);
      const vw = window.innerWidth;
      // Keep the stage height and the CSS dish breakpoints in step.
      const h = vw < 640 ? 540 : vw < 1024 ? 560 : 620;
      setStageSize({ width: w, height: h });
      setViewportWidth(vw);
    }
  }, []);

  useEffect(() => {
    updateStageSize();
    window.addEventListener('resize', updateStageSize);
    return () => window.removeEventListener('resize', updateStageSize);
  }, [updateStageSize]);

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
    const { rx, ry } = getOrbitGeometry(stageSize.width, stageSize.height, viewportWidth);

    const stations = Array.from({ length: totalDishes }, (_, index) => {
      const angle = ORBIT_START_ANGLE + (TAU * index) / totalDishes;
      return { angle, x: Math.cos(angle) * rx, y: Math.sin(angle) * ry };
    });

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
            Math.cos(angle) * rx * radial,
            Math.sin(angle) * ry * radial,
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
            Math.cos(angle) * rx * radial,
            Math.sin(angle) * ry * radial,
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
  }, [stageSize, viewportWidth, prefersReducedMotion]);

  const orbit = getOrbitGeometry(stageSize.width, stageSize.height, viewportWidth);

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
          {/* Faint orbit guide, aligned to the same ellipse the dishes use. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: `${orbit.rx * 2}px`,
              height: `${orbit.ry * 2}px`,
              zIndex: 5,
            }}
          >
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${orbit.rx * 2} ${orbit.ry * 2}`}
              fill="none"
            >
              <ellipse
                cx={orbit.rx}
                cy={orbit.ry}
                rx={Math.max(1, orbit.rx - 0.5)}
                ry={Math.max(1, orbit.ry - 0.5)}
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
              {/* Actual dish only: natural aspect ratio, no card chrome. */}
              <img
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
