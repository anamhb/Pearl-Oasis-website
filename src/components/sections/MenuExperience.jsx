import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
} from 'lucide-react';

// Existing category images. Each tile uses the image that belongs to its
// existing menu section; no new categories or stock photography are added.
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
    title: "Chef's Special Pizza Section",
    categoryTag: 'Stone-Baked Crust',
    description: 'Hand-stretched sourdough pizzas loaded with tikka & mozzarella.',
    image: pizzaImg,
  },
];

const ALL_CARDS_IN_ORDER = [...LEFT_CARDS, ...RIGHT_CARDS].sort((a, b) => a.step - b.step);
const CATEGORY_COUNT = ALL_CARDS_IN_ORDER.length;

const MENU_STEP = 3;
const MENU_GAP = 14;
const MENU_MIN_TILE_WIDTH = 176;
const MENU_MAX_VISIBLE = 6;
const MENU_HOVER_GROWTH = 0.32;
// These portraits sit tight against the card edge; the other tiles keep their
// existing full-bleed treatment.
const IMAGE_INSET_STEPS = new Set([1, 2, 4, 5, 6, 8]);

// Each portrait asset has different transparent padding. These scales trim
// that padding without cutting the dish, while keeping the visible subject
// inside the inset media box.
const IMAGE_FIT_SCALE = {
  1: 1.42,
  2: 1.24,
  4: 1.3,
  5: 1.36,
  6: 1.21,
  8: 1.18,
};

export const MenuExperience = () => {
  const viewportRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const programmaticScrollRef = useRef(false);
  const indexRef = useRef(0);
  const [layout, setLayout] = useState({
    visible: MENU_MAX_VISIBLE,
    tileWidth: 0,
    imageHeight: 0,
    trackWidth: 0,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullMenuModalOpen, setIsFullMenuModalOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const modalRef = useRef(null);
  const modalCloseRef = useRef(null);
  const modalOpenerRef = useRef(null);

  const maxIndex = Math.max(0, CATEGORY_COUNT - layout.visible);
  const navigationStep = isMobile ? 1 : MENU_STEP;
  const canGoBack = activeIndex > 0;
  const canGoForward = activeIndex < maxIndex;

  const readScrollStep = () => {
    const viewport = viewportRef.current;
    const tile = viewport?.querySelector('.menu-tile');
    if (!tile) return 0;

    const track = tile.parentElement;
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    return tile.getBoundingClientRect().width + gap;
  };

  const openFullMenu = (event) => {
    modalOpenerRef.current = event?.currentTarget ?? null;
    setIsFullMenuModalOpen(true);
  };

  const closeFullMenu = () => {
    setIsFullMenuModalOpen(false);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    let frame = 0;

    const measure = () => {
      const width = viewport.clientWidth;
      const mobile = window.matchMedia('(max-width: 767px)').matches;

      setIsMobile(mobile);

      if (mobile || width === 0) {
        setHoveredIndex(null);
        setLayout({
          visible: 1,
          tileWidth: 0,
          imageHeight: 0,
          trackWidth: 0,
        });
        return;
      }

      const visible = Math.min(
        MENU_MAX_VISIBLE,
        Math.max(1, Math.floor((width + MENU_GAP) / (MENU_MIN_TILE_WIDTH + MENU_GAP))),
      );
      const tileWidth = (width - (visible - 1) * MENU_GAP) / visible;
      const imageHeight = Math.round(tileWidth * 0.75);
      const trackWidth = CATEGORY_COUNT * tileWidth + (CATEGORY_COUNT - 1) * MENU_GAP;
      const nextMaxIndex = Math.max(0, CATEGORY_COUNT - visible);

      setLayout({ visible, tileWidth, imageHeight, trackWidth });
      setActiveIndex((previousIndex) => {
        const nextIndex = Math.min(previousIndex, nextMaxIndex);
        indexRef.current = nextIndex;
        return nextIndex;
      });
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(viewport);
    window.addEventListener('resize', scheduleMeasure);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, []);

  /* Keep the mobile index in step with the native scroll position after the
     responsive layout changes. This matters when a tablet/desktop window is
     resized into the phone breakpoint while the row is scrolled. */
  useEffect(() => {
    if (!isMobile) return undefined;

    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const frame = requestAnimationFrame(() => {
      const step = readScrollStep();
      if (!step) return;

      const nextIndex = Math.min(
        maxIndex,
        Math.max(0, Math.round(viewport.scrollLeft / step)),
      );
      indexRef.current = nextIndex;
      setActiveIndex((previousIndex) =>
        previousIndex === nextIndex ? previousIndex : nextIndex,
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [isMobile, layout.visible, maxIndex]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || isMobile || !layout.tileWidth) return;

    const targetIndex = Math.min(indexRef.current, maxIndex);
    const targetScroll = targetIndex * (layout.tileWidth + MENU_GAP);
    if (Math.abs(viewport.scrollLeft - targetScroll) > 1) {
      viewport.scrollLeft = targetScroll;
    }
  }, [isMobile, layout.tileWidth, layout.visible, maxIndex]);

  useEffect(() => () => {
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
  }, []);

  /* Escape closes, Tab stays inside the dialog, and focus returns to the
     tile or footer button that opened it. */
  useEffect(() => {
    if (!isFullMenuModalOpen) return undefined;

    const dialog = modalRef.current;
    const closeButton = modalCloseRef.current;
    const opener = modalOpenerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      dialog ? Array.from(dialog.querySelectorAll(focusableSelector)) : [];

    closeButton?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsFullMenuModalOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const items = getFocusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialog?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [isFullMenuModalOpen]);

  const syncIndexFromScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport || programmaticScrollRef.current) return;

    const step = layout.tileWidth
      ? layout.tileWidth + MENU_GAP
      : readScrollStep();
    if (!step) return;

    const rawIndex = viewport.scrollLeft / step;
    const nextIndex = Math.min(maxIndex, Math.max(0, Math.round(rawIndex)));
    indexRef.current = nextIndex;
    setActiveIndex((previousIndex) =>
      previousIndex === nextIndex ? previousIndex : nextIndex,
    );
  };

  const scrollToIndex = (nextIndex, behavior) => {
    const viewport = viewportRef.current;
    const clampedIndex = Math.min(maxIndex, Math.max(0, nextIndex));
    indexRef.current = clampedIndex;
    setActiveIndex(clampedIndex);
    setHoveredIndex(null);

    if (!viewport) return;

    const step = layout.tileWidth
      ? layout.tileWidth + MENU_GAP
      : readScrollStep();
    if (!step) return;

    programmaticScrollRef.current = true;
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);

    viewport.scrollTo({
      left: clampedIndex * step,
      behavior,
    });

    scrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, behavior === 'smooth' ? 700 : 40);
  };

  const goToPrevious = () => {
    scrollToIndex(activeIndex - navigationStep, prefersReducedMotion ? 'auto' : 'smooth');
  };

  const goToNext = () => {
    scrollToIndex(activeIndex + navigationStep, prefersReducedMotion ? 'auto' : 'smooth');
  };

  const hoverEnabled =
    !isMobile &&
    !prefersReducedMotion &&
    layout.tileWidth > 0 &&
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const hoverWidth = layout.tileWidth * (1 + MENU_HOVER_GROWTH);
  const peerWidth =
    layout.tileWidth * (1 - MENU_HOVER_GROWTH / Math.max(1, layout.visible - 1));

  const handleTilePointerEnter = (index, event) => {
    if (!hoverEnabled || event.pointerType !== 'mouse') return;
    setHoveredIndex(index);
  };

  const handleTilePointerLeave = (index, event) => {
    if (event.pointerType !== 'mouse') return;
    setHoveredIndex((currentIndex) => (currentIndex === index ? null : currentIndex));
  };

  const handleTileFocus = (index) => {
    if (isMobile || !layout.tileWidth) return;

    const firstVisible = activeIndex;
    const lastVisible = activeIndex + layout.visible - 1;

    if (index < firstVisible) {
      scrollToIndex(index, 'instant');
    } else if (index > lastVisible) {
      scrollToIndex(index - layout.visible + 1, 'instant');
    }
  };

  const trackStyle = layout.tileWidth
    ? {
        '--menu-tile-width': `${layout.tileWidth}px`,
        '--menu-image-height': `${layout.imageHeight}px`,
        '--menu-track-width': `${layout.trackWidth}px`,
        '--menu-hover-width': `${hoverWidth}px`,
        '--menu-peer-width': `${peerWidth}px`,
      }
    : undefined;

  return (
    <section
      id="menu"
      className="relative bg-[#08090a] text-[#e5e2db] border-t border-[#1d1b16]"
      aria-labelledby="menu-heading"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/4 top-32 w-96 h-96 rounded-full bg-[#d4af37]/8 blur-[140px]" />
        <div className="absolute right-1/4 bottom-32 w-96 h-96 rounded-full bg-[#ffd875]/6 blur-[130px]" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#d4af37]/15 to-transparent" />
      </div>

      <div className="relative max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20">
        <div className="menu-carousel__header">
          <div className="max-w-3xl">
            <p className="text-[10px] font-cinzel text-[#ffd875] tracking-[0.2em] uppercase mb-3">
              Kohat Culinary Collection
            </p>
            <h2
              id="menu-heading"
              className="font-serif-luxury text-3xl sm:text-4xl lg:text-5xl text-[#fcf9f2] font-normal tracking-tight max-w-2xl"
            >
              A Taste for Every Craving.
            </h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-[#d4af37] via-[#ffd875] to-transparent mt-5 mb-4 opacity-80" />
            <p className="text-sm sm:text-[15px] lg:text-base text-[#d8d0c2] font-sans leading-relaxed tracking-wide max-w-2xl">
              Discover the flavours of Pearl Oasis, from satisfying favourites to dishes made for sharing.
            </p>
          </div>

          <div
            className="menu-carousel__controls"
            role="group"
            aria-label="Menu carousel controls"
          >
            <button
              type="button"
              onClick={goToPrevious}
              disabled={!canGoBack}
              aria-label="Previous menu item"
              aria-controls="menu-carousel-viewport"
              className="menu-carousel__arrow"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={!canGoForward}
              aria-label="Next menu item"
              aria-controls="menu-carousel-viewport"
              className="menu-carousel__arrow"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className="menu-carousel"
          role="group"
          aria-roledescription="carousel"
          aria-label="Menu categories"
        >
          <div
            id="menu-carousel-viewport"
            ref={viewportRef}
            className="menu-carousel__viewport"
            onScroll={syncIndexFromScroll}
          >
            <div className="menu-carousel__track" style={trackStyle}>
              {ALL_CARDS_IN_ORDER.map((card, index) => {
                const isVisibleTile =
                  index >= activeIndex && index < activeIndex + layout.visible;
                const isHovered = hoveredIndex === index;
                const isPeer = hoveredIndex !== null && isVisibleTile && !isHovered;
                const hasImageInset = IMAGE_INSET_STEPS.has(card.step);
                const tileClassName = [
                  'menu-tile',
                  isHovered ? 'menu-tile--hovered' : '',
                  isPeer ? 'menu-tile--peer' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={openFullMenu}
                    onFocus={() => handleTileFocus(index)}
                    onPointerEnter={(event) => handleTilePointerEnter(index, event)}
                    onPointerLeave={(event) => handleTilePointerLeave(index, event)}
                    className={tileClassName}
                    aria-label={`Open full menu: ${card.title}`}
                  >
                    <span
                      className={`menu-tile__media${
                        hasImageInset ? ' menu-tile__media--inset' : ''
                      }`}
                      style={
                        hasImageInset
                          ? { '--menu-image-fit-scale': IMAGE_FIT_SCALE[card.step] }
                          : undefined
                      }
                    >
                      <img
                        src={card.image}
                        alt=""
                        loading={index < 6 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                      <span className="menu-tile__step" aria-hidden="true">
                        {card.stepNumber}
                      </span>
                    </span>
                    <span className="menu-tile__body">
                      <span className="menu-tile__tag">{card.categoryTag}</span>
                      <span className="menu-tile__title">{card.title}</span>
                      <span className="menu-tile__description">{card.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {isMobile
              ? `Showing ${Math.min(
                  activeIndex + 1,
                  CATEGORY_COUNT,
                )} of ${CATEGORY_COUNT} menu categories`
              : `Showing ${Math.min(
                  activeIndex + 1,
                  CATEGORY_COUNT,
                )} to ${Math.min(
                  activeIndex + layout.visible,
                  CATEGORY_COUNT,
                )} of ${CATEGORY_COUNT} menu categories`}
          </p>

          <div className="menu-carousel__footer">
            <button
              type="button"
              onClick={openFullMenu}
              className="gold-cta inline-flex items-center justify-center gap-2.5 min-h-11 px-7 py-3 rounded bg-[#d4af37] bg-gradient-to-r from-[#d4af37] via-[#ffd875] to-[#b8860b] text-[#0a0a0b] font-cinzel text-xs font-bold uppercase tracking-[0.18em] shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition-[transform,box-shadow] duration-300 hover:shadow-[0_6px_28px_rgba(212,175,55,0.45)] active:scale-[0.98] cursor-pointer"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>See Menu Sections</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {isFullMenuModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={closeFullMenu}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="full-menu-title"
            className="relative max-w-4xl w-full max-h-[90vh] bg-[#111317] border border-[#d4af37]/50 rounded-xl p-6 sm:p-8 text-[#e5e2db] shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

            <button
              ref={modalCloseRef}
              onClick={closeFullMenu}
              className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Close full menu"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6 pr-8">
              <span className="text-[10px] font-cinzel text-[#d4af37] uppercase tracking-[0.25em] block mb-1">
                Pearl Oasis Grand Dining
              </span>
              <h3 id="full-menu-title" className="font-serif-luxury text-2xl sm:text-3xl text-[#fbf6ec]">
                Menu Sections
              </h3>
              <p className="text-xs sm:text-sm text-[#a39b8e] font-sans mt-2 max-w-xl mx-auto">
                Explore our full culinary portfolio: Pakistani traditional karahis &amp; clay handis, fresh tandoor flatbreads, wok stir-fries, live charcoal BBQ, and artisanal pizzas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {ALL_CARDS_IN_ORDER.map((item) => (
                <div
                  key={item.id}
                  className="p-3 sm:p-3.5 rounded-xl bg-[#16181d] border border-[#2b271f] flex items-center gap-3.5 transition-colors"
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
                    <p className="text-xs text-[#9c9384] font-sans mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-[#232018] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[#a09789]">
                <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
                <span>Freshly prepared to order in Kohat</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeFullMenu}
                  className="inline-flex items-center justify-center min-h-11 px-4 py-2 rounded border border-[#3b362c] text-xs font-cinzel text-[#c2baa8] hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Close
                </button>
                <a
                  href="tel:+923327515538"
                  onClick={closeFullMenu}
                  className="inline-flex items-center justify-center min-h-11 px-5 py-2 rounded bg-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#0a0a0b] font-cinzel text-xs font-bold uppercase tracking-wider hover:shadow-lg transition-all cursor-pointer"
                >
                  Call to Reserve
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
