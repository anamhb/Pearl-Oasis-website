import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  ChevronRight, 
  X,
  CheckCircle2,
  Utensils
} from 'lucide-react';

// Relevant Existing Dish Image Assets for the 10 Categories
import soupImg from '../../assets/images/Chicken_soup.png';
import chineseImg from '../../assets/images/Chowmen.png';
import handiImg from '../../assets/images/royal_dum_biryani_1792250482066.jpg';
import bbqImg from '../../assets/images/Malai_Boti.png';
import bbqPlattersImg from '../../assets/images/Seekh_Kabab-1.png';

import riceImg from '../../assets/images/Chicken_Fried_Rice.png';
import karahiImg from '../../assets/images/royal_shinwari_karahi_1792250528045.jpg';
import tandoorImg from '../../assets/images/mint.png';
import fastFoodImg from '../../assets/images/labenese_wrap.png';
import pizzaImg from '../../assets/images/truffle_artisan_burger_1792250513993.jpg';

/**
 * Exact 10 Categories in the Requested Reveal Sequence:
 * 
 * LEFT COLUMN:
 * 1. Soup
 * 2. Chinese Cuisine
 * 3. Traditional Handi
 * 4. Traditional BBQ
 * 5. BBQ Platters
 * 
 * RIGHT COLUMN:
 * 6. Oasis Rice
 * 7. Pakistani Karahi
 * 8. Traditional Tandoor
 * 9. Fast Food
 * 10. Chief Special Pizza Section
 */
const LEFT_CARDS = [
  {
    id: 'soup',
    step: 1,
    stepNumber: '01',
    title: 'Soup',
    categoryTag: 'Warm Comfort',
    description: 'Hot & Sour, Chicken Corn & slow-simmered broths.',
    image: soupImg,
  },
  {
    id: 'chinese-cuisine',
    step: 2,
    stepNumber: '02',
    title: 'Chinese Cuisine',
    categoryTag: 'Imperial Wok',
    description: 'Classic Chicken Chow Mein, Dragon Sizzlers & wok dishes.',
    image: chineseImg,
  },
  {
    id: 'traditional-handi',
    step: 3,
    stepNumber: '03',
    title: 'Traditional Handi',
    categoryTag: 'Clay Pot Heritage',
    description: 'Desi Murgh Handi & Paneer Handi simmered in cashew cream.',
    image: handiImg,
  },
  {
    id: 'traditional-bbq',
    step: 4,
    stepNumber: '04',
    title: 'Traditional BBQ',
    categoryTag: 'Live Embers',
    description: 'Reshmi Malai Boti marinated 24 hrs over fiery coals.',
    image: bbqImg,
  },
  {
    id: 'bbq-platters',
    step: 5,
    stepNumber: '05',
    title: 'BBQ Platters',
    categoryTag: 'Grand Feast',
    description: 'Royal Seekh Kababs, tandoori cuts & charred mint dips.',
    image: bbqPlattersImg,
  },
];

const RIGHT_CARDS = [
  {
    id: 'oasis-rice',
    step: 6,
    stepNumber: '06',
    title: 'Oasis Rice',
    categoryTag: 'Aromatic Grains',
    description: 'Special Chicken Fried Rice & Royal Dum Biryani.',
    image: riceImg,
  },
  {
    id: 'pakistani-karahi',
    step: 7,
    stepNumber: '07',
    title: 'Pakistani Karahi',
    categoryTag: 'Shinwari Heritage',
    description: 'Shinwari Karahi cooked in pure fat, ripe tomatoes & black pepper.',
    image: karahiImg,
  },
  {
    id: 'traditional-tandoor',
    step: 8,
    stepNumber: '08',
    title: 'Traditional Tandoor',
    categoryTag: 'Clay Oven Fresh',
    description: 'Roghani Naan, Garlic Butter Naan & crisp Kalonji Kulchas.',
    image: tandoorImg,
  },
  {
    id: 'fast-food',
    step: 9,
    stepNumber: '09',
    title: 'Fast Food',
    categoryTag: 'Gourmet Street',
    description: 'Lebanese Shawarma Wraps, smash burgers & loaded fries.',
    image: fastFoodImg,
  },
  {
    id: 'chief-special-pizza-section',
    step: 10,
    stepNumber: '10',
    title: 'Chief Special Pizza Section',
    categoryTag: 'Stone-Baked Crust',
    description: 'Hand-stretched sourdough pizzas loaded with tikka & mozzarella.',
    image: pizzaImg,
  },
];

const ALL_CARDS_IN_ORDER = [...LEFT_CARDS, ...RIGHT_CARDS].sort((a, b) => a.step - b.step);

/**
 * Desktop scroll-driven reveal timing.
 *
 * These three values are deliberately independent of the 360vh pinned track, so
 * revealing a single card never costs a large slice of the track: the full
 * sequence (10 cards + button) is always exactly 11 identical steps long.
 *
 * MENU_REVEAL_TRIGGER_LINE  Vertical fraction of the viewport the "Our Menu"
 *                           heading must reach for the sequence to start.
 *                           0.2 = the top area of the screen, with the card
 *                           grid already visible below the heading.
 * MENU_REVEAL_STEP_LENGTH   Scrolling cost of ONE step, as a fraction of the
 *                           viewport height (0.15 ≈ one mouse-wheel notch on a
 *                           typical display, and it scales on other screens).
 * MENU_REVEAL_LAST_STEP     Final step: cards 1..10 then the button (step 11).
 */
const MENU_REVEAL_TRIGGER_LINE = 0.2;
const MENU_REVEAL_STEP_LENGTH = 0.15;
const MENU_REVEAL_LAST_STEP = 11;

export const MenuExperience = () => {
  const sectionRef = useRef(null);
  const introHeadingRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  // Mobile cards are revealed by their own IntersectionObserver, exactly like cards 2..10:
  // nothing is hardcoded as visible, so Card 1 also has to come into view to appear.
  const [mobileRevealedSteps, setMobileRevealedSteps] = useState(new Set());
  const [isFullMenuModalOpen, setIsFullMenuModalOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check prefers-reduced-motion accessibility preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Desktop Pinned Scroll-Driven Step Tracker
  // Important: Section root MUST NOT have overflow: hidden, allowing sticky top: 0 to pin smoothly to viewport
  const updateDesktopScroll = useCallback(() => {
    if (prefersReducedMotion) {
      setActiveStep(MENU_REVEAL_LAST_STEP);
      return;
    }

    // The sequence is anchored to the "Our Menu" heading. The heading sits in normal
    // flow above the pinned track, so it moves 1:1 with the page scroll for the whole
    // section (before, during and after the pin) and is therefore a stable reference
    // that increases monotonically while scrolling down and unwinds when scrolling up.
    const headingEl = introHeadingRef.current;
    if (!headingEl) return;

    const headingRect = headingEl.getBoundingClientRect();

    // Below md the desktop intro is display:none (height 0): the mobile
    // IntersectionObserver drives those cards instead, so this system stays inert.
    if (headingRect.height === 0) return;

    // ── ONE progress calculation for every card ───────────────────────────────
    // Distance scrolled since the moment the heading reached the trigger line,
    // expressed in whole reveal steps of identical length.
    const stepLength = window.innerHeight * MENU_REVEAL_STEP_LENGTH;
    const scrolledPastTrigger = window.innerHeight * MENU_REVEAL_TRIGGER_LINE - headingRect.top;
    const stepsDone = Math.floor(scrolledPastTrigger / stepLength);

    // ── ONE ordered ladder: card 1 → card 10 → button ─────────────────────────
    // stepsDone <  0 : heading has not reached the trigger line yet → nothing shown
    // stepsDone =  0 : Card 1 (Soup) begins revealing the instant the heading arrives
    // stepsDone =  n : cards 1..n+1 (each identical step adds exactly one card)
    // stepsDone >= 10: all 10 cards plus "Explore Full Menu". The button always takes
    //                  one full step AFTER card 10, so scrolling up hides the button
    //                  first and then unwinds the cards 10 → 1 in reverse order.
    const step = Math.min(MENU_REVEAL_LAST_STEP, Math.max(0, stepsDone + 1));

    setActiveStep((prev) => (prev !== step ? step : prev));
  }, [prefersReducedMotion]);

  useEffect(() => {
    let rafId;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateDesktopScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    updateDesktopScroll();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [updateDesktopScroll]);

  // Mobile In-View Step Reveal
  useEffect(() => {
    if (prefersReducedMotion) {
      setMobileRevealedSteps(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
      return;
    }

    const cardElements = document.querySelectorAll('[data-mobile-step]');
    if (!cardElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const stepVal = parseInt(entry.target.getAttribute('data-mobile-step') || '0', 10);
          if (stepVal > 0) {
            setMobileRevealedSteps((prev) => {
              const next = new Set(prev);
              if (entry.isIntersecting) {
                next.add(stepVal);
              } else {
                if (entry.boundingClientRect.top > window.innerHeight * 0.75) {
                  next.delete(stepVal);
                }
              }
              return next;
            });
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    cardElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  // Explore Full Menu Button takes one full step after the 10th card (step 11), so it is
  // never visible unless Card 10 is, and scrolling up hides it before any card disappears.
  const isExploreButtonVisibleDesktop = prefersReducedMotion || activeStep >= MENU_REVEAL_LAST_STEP;
  const isExploreButtonVisibleMobile = prefersReducedMotion || mobileRevealedSteps.has(10) || mobileRevealedSteps.has(11);

  return (
    <section
      id="menu"
      ref={sectionRef}
      className="relative bg-[#08090a] text-[#e5e2db] border-t border-[#1d1b16]"
      style={{
        // Desktop uses extended scroll track to drive the pinned 10-step reveal experience smoothly.
        // Mobile resets to auto so normal vertical page scrolling remains fluid without dead space.
      }}
      aria-label="Our Menu"
    >
      {/* Ambient background glows (clipped inside its own container so section remains overflow: visible for sticky) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-1/4 top-32 w-96 h-96 rounded-full bg-[#d4af37]/8 blur-[140px]" />
        <div className="absolute right-1/4 bottom-32 w-96 h-96 rounded-full bg-[#ffd875]/6 blur-[130px]" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#d4af37]/15 to-transparent" />
      </div>

      {/* =========================================================================
          DESKTOP SECTION INTRODUCTION (md and above)
          - Kept in normal flow ABOVE the pinned track (same markup, typography
            and styling as before, only repositioned).
          - The pinned stage is exactly 100vh tall, so the intro must not consume
            space inside it: otherwise the bottom of the 5-row, 2-column grid and
            the "Explore Full Menu" button overflow past the bottom of the
            viewport and get cut off on shorter screens (e.g. a 1366x768 display
            with browser chrome + taskbar reduce the real viewport height).
         ========================================================================= */}
      <div className="menu-desktop-intro px-4 sm:px-6 lg:px-8 pt-8 pb-2">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#161512] border border-[#d4af37]/30 text-[10px] font-cinzel text-[#ffd875] tracking-[0.2em] uppercase mb-1.5 shadow-sm">
            <Sparkles className="w-2.5 h-2.5 text-[#d4af37]" />
            <span>Kohat Culinary Collection</span>
          </div>

          <h2
            ref={introHeadingRef}
            className="font-serif-luxury text-3xl sm:text-4xl lg:text-5xl text-[#fcf9f2] font-normal tracking-tight mb-2"
          >
            Our Menu
          </h2>

          <div className="w-20 h-0.5 mx-auto bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mb-2.5 opacity-80" />

          <p className="text-sm sm:text-[15px] lg:text-base text-[#d8d0c2] font-sans leading-relaxed tracking-wide max-w-2xl mx-auto">
            Pearl Oasis offers a rich variety of Pakistani traditional dishes, authentic Chinese cuisine, live charcoal BBQ, fragrant rice specialties, fresh tandoor breads, gourmet fast food, and signature pizzas.
          </p>
        </div>
      </div>

      {/* =========================================================================
          DESKTOP PINNED PRESENTATION (md and above)
          - Track height 360vh: provides plenty of scroll distance (~260vh of travel).
          - Inner sticky container pinned at top-0 h-screen: stays locked in view
            while the user scrolls, showing cards revealing one by one.
          - Stage content is only the balanced 2-column grid (5 left + 5 right)
            plus the "Explore Full Menu" button, so all five rows of both columns
            and the button always fit inside the visible area of the viewport.
          - "Explore Full Menu" button reveals cleanly once all 10 cards are revealed.
         ========================================================================= */}
      {/* The pinned stage is pulled up under the intro so the gap between the
          intro paragraph and the first card row is small. The pull is bounded:
          it stops at 14vh and never moves the cards above (navbar height + 24px)
          while pinned, so the first row is never hidden behind the fixed navbar. */}
      <div className="menu-desktop-stage mt-[min(0px,max(-14vh,calc(340px-50vh)))]" style={{ height: '360vh' }}>
        <div className="sticky top-0 h-screen w-full flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 pt-12 pb-3 select-none">
          <div className="max-w-5xl w-full mx-auto flex flex-col items-center justify-center gap-2.5 lg:gap-3.5 my-auto">

            {/* 1. Balanced Two-Column Cards Grid */}
            <div className="grid grid-cols-2 gap-3.5 lg:gap-5 w-full">
              
              {/* LEFT COLUMN: Categories 1 through 5 */}
              <div className="flex flex-col space-y-2 lg:space-y-2.5">
                {LEFT_CARDS.map((card) => {
                  const isRevealed = prefersReducedMotion || activeStep >= card.step;
                  return (
                    <div
                      key={card.id}
                      className={`relative flex items-center gap-3.5 py-2 px-3 lg:py-2.5 lg:px-4 rounded-xl border transition-all duration-500 ease-out will-change-transform ${
                        isRevealed
                          ? 'opacity-100 translate-y-0 scale-100 bg-[#121419]/95 border-[#d4af37]/45 shadow-[0_4px_18px_rgba(0,0,0,0.6)] backdrop-blur-md hover:border-[#ffd875]/70'
                          : 'opacity-0 translate-y-3 scale-95 pointer-events-none bg-[#0e1014]/20 border-transparent'
                      }`}
                    >
                      {/* Dish Thumbnail */}
                      <div className="relative w-12 h-12 lg:w-13 lg:h-13 rounded-lg overflow-hidden shrink-0 border border-[#d4af37]/40 bg-black/70 shadow-sm">
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/90 text-[8.5px] font-mono text-[#ffd875] border border-[#d4af37]/30 leading-none">
                          {card.stepNumber}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 leading-none">
                          <span className="text-[10px] lg:text-[10.5px] font-cinzel text-[#ffd875] tracking-[0.14em] uppercase font-semibold truncate">
                            {card.categoryTag}
                          </span>
                          <span className="text-[9px] font-mono text-[#d4af37]/80 shrink-0">
                            Course {card.stepNumber}
                          </span>
                        </div>
                        <h3 className="font-serif-luxury text-sm lg:text-[15px] xl:text-base text-[#ffffff] font-medium leading-snug truncate mt-0.5">
                          {card.title}
                        </h3>
                        <p className="text-[11px] lg:text-xs text-[#b5ada0] font-sans line-clamp-1 leading-tight mt-0.5">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT COLUMN: Categories 6 through 10 */}
              <div className="flex flex-col space-y-2 lg:space-y-2.5">
                {RIGHT_CARDS.map((card) => {
                  const isRevealed = prefersReducedMotion || activeStep >= card.step;
                  return (
                    <div
                      key={card.id}
                      className={`relative flex items-center gap-3.5 py-2 px-3 lg:py-2.5 lg:px-4 rounded-xl border transition-all duration-500 ease-out will-change-transform ${
                        isRevealed
                          ? 'opacity-100 translate-y-0 scale-100 bg-[#121419]/95 border-[#d4af37]/45 shadow-[0_4px_18px_rgba(0,0,0,0.6)] backdrop-blur-md hover:border-[#ffd875]/70'
                          : 'opacity-0 translate-y-3 scale-95 pointer-events-none bg-[#0e1014]/20 border-transparent'
                      }`}
                    >
                      {/* Dish Thumbnail */}
                      <div className="relative w-12 h-12 lg:w-13 lg:h-13 rounded-lg overflow-hidden shrink-0 border border-[#d4af37]/40 bg-black/70 shadow-sm">
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/90 text-[8.5px] font-mono text-[#ffd875] border border-[#d4af37]/30 leading-none">
                          {card.stepNumber}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 leading-none">
                          <span className="text-[10px] lg:text-[10.5px] font-cinzel text-[#ffd875] tracking-[0.14em] uppercase font-semibold truncate">
                            {card.categoryTag}
                          </span>
                          <span className="text-[9px] font-mono text-[#d4af37]/80 shrink-0">
                            Course {card.stepNumber}
                          </span>
                        </div>
                        <h3 className="font-serif-luxury text-sm lg:text-[15px] xl:text-base text-[#ffffff] font-medium leading-snug truncate mt-0.5">
                          {card.title}
                        </h3>
                        <p className="text-[11px] lg:text-xs text-[#b5ada0] font-sans line-clamp-1 leading-tight mt-0.5">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* 2. "Explore Full Menu" Button: Appears only after all 10 cards appear */}
            <div className="flex justify-center items-center h-11 shrink-0 mt-1">
              <button
                type="button"
                onClick={() => setIsFullMenuModalOpen(true)}
                className={`inline-flex items-center gap-2.5 px-7 py-2.5 rounded-full font-cinzel text-xs font-bold uppercase tracking-[0.2em] transition-all duration-500 shadow-xl cursor-pointer ${
                  isExploreButtonVisibleDesktop
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto bg-gradient-to-r from-[#d4af37] via-[#ffd875] to-[#b8860b] text-[#0a0a0b] shadow-[0_4px_25px_rgba(212,175,55,0.45)] hover:scale-105 hover:shadow-[0_6px_30px_rgba(212,175,55,0.6)] active:scale-95'
                    : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#0a0a0b]" />
                <span>Explore Full Menu</span>
                <ChevronRight className="w-4 h-4 text-[#0a0a0b]" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* =========================================================================
          SINGLE-COLUMN PRESENTATION (phones, and landscape phones where the
          pinned desktop stage would be cut off — see .menu-mobile in index.css)
          - Clean introductory header with improved typography
          - Single vertical column in exact order 1 through 10
          - Smooth natural touch scrolling without trapping
          - Cards reveal gracefully as visitor scrolls down
         ========================================================================= */}
      <div className="menu-mobile px-4 py-12 sm:py-14">
        {/* Mobile Header */}
        <div className="text-center max-w-md mx-auto mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161512] border border-[#d4af37]/30 text-[10px] font-cinzel text-[#ffd875] tracking-widest uppercase mb-3">
            <Sparkles className="w-3 h-3 text-[#d4af37]" />
            <span>Kohat Culinary Collection</span>
          </div>
          <h2 className="font-serif-luxury text-3xl sm:text-4xl text-[#fcf9f2] mb-2.5 font-normal">
            Our Menu
          </h2>
          <div className="w-16 h-0.5 mx-auto bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mb-3 opacity-80" />
          <p className="text-sm text-[#d0c8b9] font-sans leading-relaxed">
            Pearl Oasis offers Pakistani traditional dishes, authentic Chinese cuisine, live BBQ, fragrant rice, tandoor specialties, fast food, and signature pizzas.
          </p>
        </div>

        {/* 10 Vertical Cards */}
        <div className="max-w-md mx-auto space-y-3.5">
          {ALL_CARDS_IN_ORDER.map((card) => {
            const isRevealed = prefersReducedMotion || mobileRevealedSteps.has(card.step);
            return (
              <div
                key={card.id}
                data-mobile-step={card.step}
                className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all duration-500 ease-out ${
                  isRevealed
                    ? 'opacity-100 translate-y-0 bg-[#121418]/95 border-[#d4af37]/45 shadow-lg'
                    : 'opacity-0 translate-y-5 pointer-events-none bg-black/40 border-transparent'
                }`}
              >
                <div className="relative w-15 h-15 rounded-lg overflow-hidden shrink-0 border border-[#d4af37]/40 bg-black/50">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono text-[#ffd875]">
                    #{card.stepNumber}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-cinzel text-[#ffd875] tracking-wider uppercase font-semibold block">
                    {card.categoryTag}
                  </span>
                  <h4 className="font-serif-luxury text-base sm:text-lg text-[#ffffff] font-medium leading-snug truncate">
                    {card.title}
                  </h4>
                  <p className="text-xs text-[#a89f92] font-sans line-clamp-1 mt-0.5">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Explore Full Menu Button on Mobile (appears after card 10) */}
          <div data-mobile-step="11" className="pt-6 pb-2 text-center">
            <button
              type="button"
              onClick={() => setIsFullMenuModalOpen(true)}
              className={`inline-flex items-center gap-2 px-7 py-3 rounded-full font-cinzel text-xs font-bold uppercase tracking-wider transition-all duration-500 shadow-xl cursor-pointer ${
                isExploreButtonVisibleMobile
                  ? 'opacity-100 scale-100 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#0a0a0b] shadow-[0_4px_20px_rgba(212,175,55,0.4)] active:scale-95'
                  : 'opacity-0 scale-90 pointer-events-none'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0a0a0b]" />
              <span>Explore Full Menu</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#0a0a0b]" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FULL MENU MODAL (Triggered by "Explore Full Menu")
         ========================================================================= */}
      {isFullMenuModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setIsFullMenuModalOpen(false)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] bg-[#111317] border border-[#d4af37]/50 rounded-2xl p-6 sm:p-8 text-[#e5e2db] shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gold line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

            {/* Close button */}
            <button
              onClick={() => setIsFullMenuModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close full menu"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-6 pr-8">
              <span className="text-[10px] font-cinzel text-[#d4af37] uppercase tracking-[0.25em] block mb-1">
                Pearl Oasis Grand Dining
              </span>
              <h3 className="font-serif-luxury text-2xl sm:text-3xl text-[#fbf6ec]">
                Complete Culinary Catalog
              </h3>
              <p className="text-xs sm:text-sm text-[#a39b8e] font-sans mt-2 max-w-xl mx-auto">
                Explore our full culinary portfolio: Pakistani traditional karahis & clay handis, fresh tandoor flatbreads, wok stir-fries, live charcoal BBQ, and artisanal pizzas.
              </p>
            </div>

            {/* 10 Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {ALL_CARDS_IN_ORDER.map((item) => (
                <div
                  key={item.id}
                  className="p-3 sm:p-3.5 rounded-xl bg-[#16181d] border border-[#2b271f] flex items-center gap-3.5 hover:border-[#d4af37]/40 transition-colors"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-14 h-14 rounded-lg object-cover border border-[#d4af37]/30 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-cinzel text-[#d4af37] uppercase tracking-wider font-semibold">
                        Section {item.stepNumber}
                      </span>
                      <span className="text-[9px] font-mono text-[#ffd875] bg-black/50 px-1.5 py-0.2 rounded">
                        {item.categoryTag}
                      </span>
                    </div>
                    <h4 className="font-serif-luxury text-base text-[#fbf6ec] font-medium leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#9c9384] font-sans mt-0.5 leading-relaxed line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer Call-To-Action */}
            <div className="mt-6 pt-5 border-t border-[#232018] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[#a09789]">
                <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
                <span>100% Zabiha Halal • Freshly prepared to order in Kohat</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFullMenuModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#3b362c] text-xs font-cinzel text-[#c2baa8] hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Close
                </button>
                <a
                  href="tel:+923327515538"
                  onClick={() => setIsFullMenuModalOpen(false)}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#0a0a0b] font-cinzel text-xs font-bold uppercase tracking-wider hover:shadow-lg transition-all cursor-pointer"
                >
                  Reserve Table & Order
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

    </section>
  );
};
