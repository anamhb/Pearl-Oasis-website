import React from 'react';
import { BrandWordmark } from '../brand/BrandWordmark.jsx';
import { MapPin, Phone, Clock, Instagram, Facebook, Twitter, ArrowUp } from 'lucide-react';
import { useLenis } from 'lenis/react';
import { PROGRAMMATIC_SCROLL_DURATION } from '../ui/scroll.js';

export const Footer = () => {
  const lenis = useLenis();

  const scrollToTop = () => {
    /* Reduced-motion users jump; everyone else keeps the existing glide. */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lenis) {
      lenis.scrollTo(0, {
        duration: PROGRAMMATIC_SCROLL_DURATION,
        immediate: reduceMotion,
      });
    } else {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <footer className="relative bg-[#070708] border-t border-[#1d1b16] pt-6 pb-6 sm:pt-14 sm:pb-10 px-6 sm:px-12 text-[#b0a99d]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 sm:gap-12 sm:mb-16">
          <div className="space-y-3 sm:space-y-4">
            {/* Same logo asset, 3D crest, gold material and lighting as the
                navbar. The crest turns continuously while the footer is on
                screen and pauses its loop once scrolled away. */}
            <div className="flex items-start">
              <BrandWordmark animate pauseWhenOffscreen />
            </div>
            <p className="hidden sm:block text-xs text-[#8c8477] font-sans leading-relaxed pt-1 sm:pt-2">
              An architectural dining sanctuary where fine gastronomy, amber warmth, and timeless hospitality converge.
            </p>
            {/* No social profile URLs have been supplied, so these are not
                links: they are static icons with a visible "Coming soon" label. */}
            <div
              role="group"
              aria-label="Social media links, coming soon"
              className="flex flex-wrap items-center gap-3 pt-1 sm:pt-2"
            >
              <span
                aria-hidden="true"
                className="w-8 h-8 rounded-full bg-[#141517] border border-[#2b261d] flex items-center justify-center text-[#d4af37]/60"
              >
                <Instagram className="w-4 h-4" />
              </span>
              <span
                aria-hidden="true"
                className="w-8 h-8 rounded-full bg-[#141517] border border-[#2b261d] flex items-center justify-center text-[#d4af37]/60"
              >
                <Facebook className="w-4 h-4" />
              </span>
              <span
                aria-hidden="true"
                className="w-8 h-8 rounded-full bg-[#141517] border border-[#2b261d] flex items-center justify-center text-[#d4af37]/60"
              >
                <Twitter className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-sans uppercase tracking-[0.15em] text-[#a39a8c]">
                Coming soon
              </span>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-3">
            <h3 className="font-cinzel text-xs font-bold tracking-[0.2em] text-[#faedd4] uppercase mb-1.5 sm:mb-4">
              Explore
            </h3>
            <ul className="flex flex-nowrap items-center justify-between gap-x-3 whitespace-nowrap sm:block sm:space-y-0.5 text-xs font-sans">
              <li>
                <a href="/#story" className="inline-flex items-center min-h-11 min-w-11 py-1.5 hover:text-[#d4af37] transition-colors">
                  Our Story
                </a>
              </li>
              <li>
                <a href="/#signature" className="inline-flex items-center min-h-11 min-w-11 py-1.5 hover:text-[#d4af37] transition-colors">
                  Featured Dishes
                </a>
              </li>
              <li>
                <a href="/#menu" className="inline-flex items-center min-h-11 min-w-11 py-1.5 hover:text-[#d4af37] transition-colors">
                  Menu
                </a>
              </li>
              {/* Testimonials stays reachable from the top navigation, so the
                  phone-width row keeps three links, unwrapped and unscrolled. */}
              <li className="hidden sm:block">
                <a href="/#experience" className="inline-flex items-center min-h-11 min-w-11 py-1.5 hover:text-[#d4af37] transition-colors">
                  Testimonials
                </a>
              </li>
              <li className="hidden sm:block">
                <a href="/book-a-table" className="inline-flex items-center min-h-11 min-w-11 py-1.5 hover:text-[#d4af37] transition-colors">
                  Book a Table
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-1.5 sm:space-y-3">
            <h3 className="font-cinzel text-xs font-bold tracking-[0.2em] text-[#faedd4] uppercase mb-1.5 sm:mb-4">
              Opening Hours
            </h3>
            {/* Phone widths show each row as label · time on one line
                (wrapping only when the width demands it); sm+ restores the
                stacked rows with the full "Mon – Sun" day prefix. */}
            <div className="space-y-1 sm:space-y-2 text-xs font-sans">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <div className="flex flex-wrap items-baseline gap-x-2 sm:block">
                  <div className="text-white font-medium">Daily Hours</div>
                  <div className="text-[#a39a8c]">
                    <span className="sm:hidden">11:00 AM – 11:00 PM</span>
                    <span className="hidden sm:inline">Mon – Sun: 11:00 AM – 11:00 PM</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 sm:pt-2">
                <Clock className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <div className="flex flex-wrap items-baseline gap-x-2 sm:block">
                  <div className="text-white font-medium">Friday Prayer Break</div>
                  <div className="text-[#a39a8c]">
                    <span className="sm:hidden">1:00 PM – 2:30 PM</span>
                    <span className="hidden sm:inline">Fri: 1:00 PM – 2:30 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-3">
            <h3 className="font-cinzel text-xs font-bold tracking-[0.2em] text-[#faedd4] uppercase mb-1.5 sm:mb-4">
              Sanctuary Location
            </h3>
            <div className="space-y-2 text-xs font-sans">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <span>
                  Kohat City Centre, near KDA Gate No. 1, Kohat, Khyber Pakhtunkhwa, Pakistan
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Phone className="w-4 h-4 text-[#d4af37] shrink-0" />
                <a href="tel:+923327515538" className="inline-flex items-center min-h-11 py-1 hover:text-[#d4af37] transition-colors">
                  +92 332 7515538
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#1d1b16] pt-4 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-[11px] text-[#a39a8c]">
          <div>
            © {new Date().getFullYear()} Pearl Oasis Restaurant. All rights reserved.
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 min-h-11 py-1 text-[#d4af37] hover:text-[#fff3cf] transition-colors"
          >
            <span>Return to Top Entrance</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
