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
  const hoveredDishIndexRef = useRef(null);
  const rafIdRef = useRef(null);
  const startTimeRef = useRef(null);

  const [stageSize, setStageSize] = useState({ width: 1000, height: 600 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Update container dimensions responsively
  const updateStageSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.max(300, rect.width);
      // Adaptive height according to viewport width
      const h = w < 640 ? 500 : w < 1024 ? 560 : 620;
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
  // Covis Knowledge Reference Sequence:
  // - Central hub with stationary logo and continuously rotating outer decorative ring
  // - Phase 1: Hub establishes itself first
  // - Phase 2: Staggered entrance of dish images to their designated stations
  // - Phase 3: Brief stay/hold at stationary positions (NO orbital spinning)
  // - Phase 4: Smooth exit transition converging toward the central hub
  // - Phase 5: Continuous staggered loop
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
    const dishHalfWidth = isMobile ? 56 : isTablet ? 72 : 88;
    const maxRadius = Math.max(0, w / 2 - dishHalfWidth - 6);
    const rx = Math.min(
      isMobile ? 160 : isTablet ? 330 : 430,
      w * (isMobile ? 0.36 : 0.38),
      maxRadius,
    );

    const ry = isMobile ? 135 : isTablet ? 155 : 180;

    const stations = STATIONS.map((station) => ({
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
      return undefined;
    }

    // Easing helpers
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
    const easeInQuad = (x) => x * x;

    const animate = (currentTime) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }
      const elapsedTime = (currentTime - startTimeRef.current) / 1000;

      for (let i = 0; i < totalDishes; i++) {
        const el = dishDomRefs.current[i];
        if (!el) continue;

        const point = stations[i] || { x: 0, y: 0 };
        const baseX = point.x;
        const baseY = point.y;

        // Individual timeline offset for staggered choreography
        const dishStartTime = initialHubDelay + i * staggerStep;

        if (elapsedTime < dishStartTime) {
          // Pre-appearance phase: hidden
          el.style.opacity = '0';
          el.style.transform = `translate3d(calc(-50% + ${baseX.toFixed(2)}px), calc(-50% + ${baseY.toFixed(2)}px), 0) scale(0)`;
          continue;
        }

        // Cycle progress for this dish: u in [0, 1)
        const timeInCycle = (elapsedTime - dishStartTime) % cycleDuration;
        const u = timeInCycle / cycleDuration;

        let scale = 1.0;
        let opacity = 1.0;
        let curX = baseX;
        let curY = baseY;
        let zIndex = 25;

        // Check if user is currently hovering this dish (freeze/hold)
        const isHovered = hoveredDishIndexRef.current === i;

        if (u < 0.16) {
          // ------------------------------------------------------------------
          // Phase 2: Staggered Entrance
          // Smoothly blooms into its designated stationary location
          // ------------------------------------------------------------------
          const p = u / 0.16;
          const e = easeOutCubic(p);

          // Subtle radial settle from 1.10x outward to 1.00x station
          const radialBloom = 1.1 - 0.1 * e;
          curX = baseX * radialBloom;
          curY = baseY * radialBloom;

          scale = 0.45 + 0.55 * e;
          opacity = e;
          zIndex = 25;
        } else if (u < 0.65 || isHovered) {
          // ------------------------------------------------------------------
          // Phase 3: Stationary Stay / Hold
          // Remains at its designated position briefly.
          // IMPORTANT: Does NOT orbit or travel around the circle!
          // Gentle organic floating micro-motion gives it elegance.
          // ------------------------------------------------------------------
          const floatOffset = Math.sin(elapsedTime * 1.8 + i * 1.1) * 3.5;
          curX = baseX;
          curY = baseY + floatOffset;

          scale = isHovered ? 1.08 : 1.0;
          opacity = 1.0;
          zIndex = 25;
        } else if (u < 0.90) {
          // ------------------------------------------------------------------
          // Phase 4: Exit Transition toward the Center Hub
          // Moves smoothly inward toward the central hub, fading as it reaches
          // the central circle, visually being absorbed behind the brand disc.
          // ------------------------------------------------------------------
          const p = (u - 0.65) / 0.25;
          const e = easeInQuad(p);

          // Converge towards central hub (from 1.0 down to ~0.18 at hub edge)
          const radialFactor = Math.max(0.12, 1.0 - 0.88 * e);
          curX = baseX * radialFactor;
          curY = baseY * radialFactor;

          scale = 1.0 - 0.52 * e; // Shrinks down to ~0.48
          opacity = Math.max(0, 1.0 - e * 1.1); // Smoothly fades out to 0
          zIndex = 10; // Passes behind central circle (which is z-index 20)
        } else {
          // ------------------------------------------------------------------
          // Phase 5: Offscreen pause before next loop cycle
          // ------------------------------------------------------------------
          opacity = 0;
          scale = 0;
          zIndex = 10;
        }

        el.style.transform = `translate3d(calc(-50% + ${curX.toFixed(2)}px), calc(-50% + ${curY.toFixed(2)}px), 0) scale(${scale.toFixed(3)})`;
        el.style.opacity = opacity.toFixed(3);
        el.style.zIndex = zIndex;
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    startTimeRef.current = null;
    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [stageSize, prefersReducedMotion]);

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
          className="relative w-full rounded-2xl bg-gradient-to-b from-[#0c0d10] via-[#090a0d] to-[#07080a] border border-[#1f1d18] shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex items-center justify-center"
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
              onMouseEnter={() => {
                hoveredDishIndexRef.current = index;
              }}
              onMouseLeave={() => {
                if (hoveredDishIndexRef.current === index) {
                  hoveredDishIndexRef.current = null;
                }
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
                className="w-28 sm:w-36 md:w-44 max-w-[190px] h-auto max-h-[160px] sm:max-h-[190px] md:max-h-[220px] object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.85)] filter contrast-[1.02] hover:scale-105 transition-transform duration-300 pointer-events-auto cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
