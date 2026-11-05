import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronRight, X, CheckCircle2 } from 'lucide-react';

// Menu section images. Cards 1, 2 and 4 use the owner-supplied photos
// (soup.jpg, chawmen.jpg, malai-boti.jpg); the other cards keep the assets
// they already used.
import soupImg from '../../assets/images/soup.jpg';
import chineseImg from '../../assets/images/chawmen.jpg';
import handiImg from '../../assets/images/royal_dum_biryani_1792250482066.jpg';
import bbqImg from '../../assets/images/malai-boti.jpg';
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

/* Two desktop rows: the first four sections in step order, which the
   12-column grid pairs as 7+5 then the flipped 5+7. Every rendered card now
   uses a full-bleed photo, so all of them take `cover`. The full-menu modal
   keeps listing every section; only the grid is trimmed. */
const GRID_CARDS = ALL_CARDS_IN_ORDER.slice(0, 4);

/* Zigzag pairing for the 12-column desktop grid: an even row runs
   large + small, the next row flips to small + large, so the widths
   alternate down the section (7,5 / 5,7 / 7,5 …). */
const isLargeCard = (index) => {
  const rowIsEven = Math.floor(index / 2) % 2 === 0;
  const isFirstInRow = index % 2 === 0;
  return rowIsEven ? isFirstInRow : !isFirstInRow;
};

export const MenuExperience = () => {
  const [isFullMenuModalOpen, setIsFullMenuModalOpen] = useState(false);
  const modalRef = useRef(null);
  const modalCloseRef = useRef(null);
  const modalOpenerRef = useRef(null);

  const openFullMenu = (event) => {
    modalOpenerRef.current = event?.currentTarget ?? null;
    setIsFullMenuModalOpen(true);
  };

  const closeFullMenu = () => {
    setIsFullMenuModalOpen(false);
  };

  /* Escape closes, Tab stays inside the dialog, and focus returns to the
     card or footer button that opened it. */
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
        <div className="mb-6 max-w-3xl lg:mb-10">
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

        <div className="menu-grid">
          {GRID_CARDS.map((card, index) => {
            const sizeClass = isLargeCard(index)
              ? ' menu-card--large'
              : ' menu-card--small';

            return (
              <button
                key={card.id}
                type="button"
                onClick={openFullMenu}
                className={`menu-card${sizeClass}`}
                aria-label={`Open full menu: ${card.title}`}
              >
                <span className="menu-card__media">
                  <img
                    src={card.image}
                    alt=""
                    loading={index < 2 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                </span>
                <span className="menu-card__scrim" />
                <span className="menu-card__tag">{card.categoryTag}</span>
                <span className="menu-card__body">
                  <span className="menu-card__title">{card.title}</span>
                  <span className="menu-card__description">{card.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center lg:mt-10">
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
            data-lenis-prevent
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
