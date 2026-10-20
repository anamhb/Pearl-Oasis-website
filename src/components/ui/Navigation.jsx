import React, { useState, useEffect } from 'react';
import { BrandWordmark } from '../brand/BrandWordmark.jsx';
import { Menu, X, ShoppingBag } from 'lucide-react';

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 pt-5 pb-0.5 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        isScrolled
          ? 'bg-[#090a0c] border-[#2a261c] shadow-2xl'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between gap-8">
        <a
          href="#entrance"
          className="whitespace-nowrap shrink-0 group flex items-center gap-3 transition-opacity hover:opacity-90"
          aria-label="Pearl Oasis Homepage"
        >
          <BrandWordmark />
        </a>

        <nav className="hidden lg:flex items-center gap-8 text-xs font-cinzel tracking-[0.2em] text-[#d6d3cd] uppercase">
          <a
            href="#story"
            className="hover:text-[#d4af37] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#d4af37]"
          >
            Our Story
          </a>
          <a
            href="#signature"
            className="hover:text-[#d4af37] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#d4af37]"
          >
            Featured Dishes
          </a>
          <a
            href="#menu"
            className="hover:text-[#d4af37] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#d4af37]"
          >
            Menu
          </a>
          <a
            href="#experience"
            className="hover:text-[#d4af37] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#d4af37]"
          >
            Testimonial
          </a>
        </nav>

        <div className="flex items-center gap-4 shrink-0">
          <a
            href="#menu"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded bg-gradient-to-r from-[#d4af37] via-[#f3d47d] to-[#aa8010] text-[#12110d] font-cinzel text-xs font-bold tracking-[0.18em] uppercase shadow-[0_2px_12px_rgba(212,175,55,0.25)] hover:shadow-[0_4px_20px_rgba(212,175,55,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#12110d]" />
            <span>Order Now</span>
          </a>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-[#d4af37] hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#0e0f12] border-b border-[#2b271d] px-6 py-6 transition-all max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain">
          <nav className="flex flex-col gap-4 text-sm font-cinzel tracking-[0.2em] text-[#d6d3cd] uppercase">
            <a
              href="#story"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 border-b border-white/5 hover:text-[#d4af37]"
            >
              Our Story
            </a>
            <a
              href="#signature"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 border-b border-white/5 hover:text-[#d4af37]"
            >
              Featured Dishes
            </a>
            <a
              href="#menu"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 border-b border-white/5 hover:text-[#d4af37]"
            >
              Menu
            </a>
            <a
              href="#experience"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 border-b border-white/5 hover:text-[#d4af37]"
            >
              Testimonial
            </a>
            <a
              href="#menu"
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 py-3 rounded bg-[#d4af37] text-[#0d0e10] font-bold text-xs tracking-[0.2em]"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Order Now</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};
