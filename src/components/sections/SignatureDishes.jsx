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

// 7 Designated Stationary Stations around the Central Hub (angles in radians)
// Carefully balanced so dishes are evenly spaced and visible across screen widths
const STATIONS = [
  { angle: -Math.PI * 0.5 + 0.12 }, // Station 0: High Top
  { angle: -Math.PI * 0.18 },       // Station 1: Upper Right
  { angle: Math.PI * 0.14 },        // Station 2: Lower Right
  { angle: Math.PI * 0.46 },        // Station 3: Bottom Right
  { angle: Math.PI * 0.78 },        // Station 4: Bottom Left
  { angle: Math.PI * 1.10 },        // Station 5: Lower Left
  { angle: Math.PI * 1.42 },        // Station 6: Upper Left
];

export const SignatureDishes = () => {
  const containerRef = useRef(null);
  const dishDomRefs = useRef([]);
  const rafIdRef = useRef(null);
  const startTimeRef = useRef(null);
  const settledRef = useRef(false);
  const replayRef = useRef(null);

  const [stageSize, setStageSize] = useState({ width: 1000, height: 600 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Update container dimensions responsively
  const updateStageSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.max(300, rect.width);
      // Adaptive height according to viewport width
      const h = w < 640 ? 540 : w < 1024 ? 560 : 620;
      setStageSize({ width: w, height: h });
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
  // Featured dish sequence:
  // - Central hub with the stationary logo and the slow decorative ring
  // - The hub establishes itself first
  // - Dishes make one staggered entrance to their designated stations
  // - They settle there and stay put; the animation loop then stops
  // - Hovering or tapping the stage replays the entrance once
  // ============================================================================
  useEffect(() => {
    const totalDishes = FEATURED_DISH_IMAGES.length;
    const cycleDuration = 8.0; // 8 seconds per dish full cycle
    const initialHubDelay = 0.8; // Let central hub establish itself first
    const staggerStep = cycleDuration / totalDishes; // ~1.14s stagger between dishes

    const w = stageSize.width;
    const isMobile = w < 640;
    const isTablet = w >= 640 && w < 1024;

    // Radial boundaries tailored to stage proportions. The horizontal radius
    // is additionally clamped so the widest dish (half of its box) can never
    // be pushed past the stage's rounded, overflow-hidden edge — at 320px the
    // raw 0.36 × width pushed the left-most dish 10px outside the frame and
    // the stage clipped it.
    const dishHalfWidth = isMobile ? 48 : isTablet ? 72 : 88;
    const maxRadius = Math.max(0, w / 2 - dishHalfWidth - 6);
    const rx = Math.min(
      isMobile ? 150 : isTablet ? 330 : 430,
      w * (isMobile ? 0.36 : 0.38),
      maxRadius,
    );

    const ry = isMobile ? 135 : isTablet ? 155 : 180;

    // On mobile the original STATIONS angles (tuned for a wide desktop ellipse)
    // cluster two dishes at the narrow top of the constrained orbit — stations 0
    // and 6 sit only ~21° apart, producing a ~46px center-to-center gap at mobile
    // rx values, while dish images are 96px wide. Evenly spacing all seven positions
    // around the full circle (51.4° per step) guarantees every adjacent pair
    // maintains equal arc distance and eliminates the overlap at any mobile width.
    const stations = isMobile
      ? Array.from({ length: STATIONS.length }, (_, i) => ({
          x: Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / STATIONS.length) * rx,
          y: Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / STATIONS.length) * ry,
        }))
      : STATIONS.map((station) => ({
          x: Math.cos(station.angle) * rx,
          y: Math.sin(station.angle) * ry,
        }));

    // Reduced motion: no orbit, no float, no fade. Every dish sits at its
    // station at full size, so the section still reads as a composed plate.
    if (prefersReducedMotion) {
      for (let i = 0; i < totalDishes; i++) {
        const el = dishDomRefs.current[i];
        if (!el) continue;
        const point = stations[i] || { x: 0, y: 0 };
        el.style.transform = `translate3d(calc(-50% + ${point.x.toFixed(2)}px), calc(-50% + ${point.y.toFixed(2)}px), 0) scale(1)`;
        el.style.opacity = '1';
        el.style.zIndex = 25;
      }
      settledRef.current = true;
      replayRef.current = null;
      return undefined;
    }

    // Easing helper for the one-shot entrance.
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
    const holdEnd = 0.65;

    const placeAtStation = (el, point) => {
      el.style.transform = `translate3d(calc(-50% + ${point.x.toFixed(2)}px), calc(-50% + ${point.y.toFixed(2)}px), 0) scale(1)`;
      el.style.opacity = '1';
      el.style.zIndex = 25;
    };

    const animate = (currentTime) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }
      const elapsedTime = (currentTime - startTimeRef.current) / 1000;
      let pending = 0;

      for (let i = 0; i < totalDishes; i++) {
        const el = dishDomRefs.current[i];
        if (!el) continue;

        const point = stations[i] || { x: 0, y: 0 };
        const baseX = point.x;
        const baseY = point.y;

        // Individual timeline offset for the staggered entrance.
        const dishStartTime = initialHubDelay + i * staggerStep;

        if (elapsedTime < dishStartTime) {
          // Pre-appearance phase: hidden.
          el.style.opacity = '0';
          el.style.transform = `translate3d(calc(-50% + ${baseX.toFixed(2)}px), calc(-50% + ${baseY.toFixed(2)}px), 0) scale(0)`;
          pending += 1;
          continue;
        }

        // One-shot progress. Unlike the old loop, this never wraps.
        const u = (elapsedTime - dishStartTime) / cycleDuration;

        if (u >= holdEnd) {
          placeAtStation(el, point);
          continue;
        }

        pending += 1;

        if (u < 0.16) {
          // Staggered entrance: bloom into the designated station.
          const p = u / 0.16;
          const e = easeOutCubic(p);
          const radialBloom = 1.1 - 0.1 * e;

          el.style.transform = `translate3d(calc(-50% + ${(baseX * radialBloom).toFixed(2)}px), calc(-50% + ${(baseY * radialBloom).toFixed(2)}px), 0) scale(${(0.45 + 0.55 * e).toFixed(3)})`;
          el.style.opacity = e.toFixed(3);
          el.style.zIndex = 25;
        } else {
          // Stationary hold with a gentle float. The float ends when the dish
          // settles, so the resting composition is completely still.
          const floatOffset = Math.sin(elapsedTime * 1.8 + i * 1.1) * 3.5;
          el.style.transform = `translate3d(calc(-50% + ${baseX.toFixed(2)}px), calc(-50% + ${(baseY + floatOffset).toFixed(2)}px), 0) scale(1)`;
          el.style.opacity = '1';
          el.style.zIndex = 25;
        }
      }

      if (pending === 0) {
        rafIdRef.current = null;
        settledRef.current = true;
        return;
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    const replay = () => {
      /* Only replay a finished composition. A pointer moving over the stage
         during the entrance should not restart it mid-flight. */
      if (prefersReducedMotion || !settledRef.current) return;
      settledRef.current = false;
      startTimeRef.current = null;
      rafIdRef.current = requestAnimationFrame(animate);
    };
    replayRef.current = replay;

    startTimeRef.current = null;
    settledRef.current = false;
    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = null;
      replayRef.current = null;
    };
  }, [stageSize, prefersReducedMotion]);

  /* Hover or tap replays the one-shot entrance. Touch pointerenter is
     suppressed so a single tap does not fire both pointer events. */
  const handleStageReplay = (event) => {
    if (event.type === 'pointerenter' && event.pointerType === 'touch') return;
    replayRef.current?.();
  };

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

        {/* 2. Motion Experience Stage */}
        <div
          ref={containerRef}
          onPointerEnter={handleStageReplay}
          onPointerDown={handleStageReplay}
          className="relative w-full rounded-xl bg-gradient-to-b from-[#0c0d10] via-[#090a0d] to-[#07080a] border border-[#1f1d18] shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex items-center justify-center"
          style={{ minHeight: `${stageSize.height}px` }}
        >
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

            {/* Main Central Circle (Stationary, kept at exact current size) */}
            <div
              className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full flex items-center justify-center p-5 sm:p-6 bg-gradient-to-b from-[#18191d] via-[#111215] to-[#0a0a0d] border border-[#d4af37]/45 shadow-[0_12px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]"
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
          {/* Staggered entrance, brief stay at stationary designated positions, */}
          {/* and exit transition converging toward the central hub. */}
          {/* NO cards, NO backgrounds, NO borders, NO captions, NO labels. */}
          {/* ================================================================== */}
          {FEATURED_DISH_IMAGES.map((dish, index) => (
            <div
              key={dish.id}
              ref={(el) => {
                dishDomRefs.current[index] = el;
              }}
              className="absolute top-1/2 left-1/2 will-change-transform pointer-events-auto select-none"
              style={{
                transform: 'translate3d(-50%, -50%, 0) scale(0)',
                opacity: 0,
              }}
            >
              {/* Actual Dish Image only: Natural aspect ratio and visual quality preserved */}
              <img
                src={dish.src}
                alt={dish.alt || dish.name}
                draggable={false}
                className="w-24 sm:w-36 md:w-44 max-w-[190px] h-auto max-h-[130px] sm:max-h-[190px] md:max-h-[220px] object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.85)] filter contrast-[1.02] pointer-events-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
