import React from 'react';
import { BrandWordmark } from '../brand/BrandWordmark.jsx';
import { MapPin, Phone, Clock, Instagram, Facebook, Twitter, ArrowUp } from 'lucide-react';

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#070708] border-t border-[#1d1b16] pt-14 pb-10 px-6 sm:px-12 text-[#b0a99d]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-4">
            {/* Same logo asset and wordmark treatment as the navbar, rendered
                with a static (non-rotating) crest. */}
            <div className="flex items-start">
              <BrandWordmark animate={false} />
            </div>
            <p className="text-xs text-[#8c8477] font-sans leading-relaxed pt-2">
              An architectural dining sanctuary where fine gastronomy, amber warmth, and timeless hospitality converge.
            </p>
            {/* No social profile URLs have been supplied, so these are not
                links: they are static icons with a visible "Coming soon" label. */}
            <div
              role="group"
              aria-label="Social media links, coming soon"
              className="flex flex-wrap items-center gap-3 pt-2"
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

          <div className="space-y-3">
            <h4 className="font-cinzel text-xs font-bold tracking-[0.2em] text-[#faedd4] uppercase mb-4">
              Explore
            </h4>
            <ul className="space-y-0.5 text-xs font-sans">
              <li>
                <a href="#story" className="inline-flex items-center min-h-11 py-1.5 hover:text-[#d4af37] transition-colors">
                  Our Story
                </a>
              </li>
              <li>
                <a href="#signature" className="inline-flex items-center min-h-11 py-1.5 hover:text-[#d4af37] transition-colors">
                  Featured Dishes
                </a>
              </li>
              <li>
                <a href="#menu" className="inline-flex items-center min-h-11 py-1.5 hover:text-[#d4af37] transition-colors">
                  Menu
                </a>
              </li>
              <li>
                <a href="#experience" className="inline-flex items-center min-h-11 py-1.5 hover:text-[#d4af37] transition-colors">
                  Testimonials
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-cinzel text-xs font-bold tracking-[0.2em] text-[#faedd4] uppercase mb-4">
              Opening Hours
            </h4>
            <div className="space-y-2 text-xs font-sans">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">Daily Hours</div>
                  <div className="text-[#a39a8c]">Mon – Sun: 2:00 PM – 11:00 PM</div>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Clock className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">Lunch and Afternoon Service</div>
                  <div className="text-[#a39a8c]">Mon – Sun: 2:00 PM – 5:00 PM</div>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Clock className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium">Dinner and Evening Service</div>
                  <div className="text-[#a39a8c]">Mon – Sun: 5:00 PM – 11:00 PM</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-cinzel text-xs font-bold tracking-[0.2em] text-[#faedd4] uppercase mb-4">
              Sanctuary Location
            </h4>
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

        <div className="border-t border-[#1d1b16] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#a39a8c]">
          <div>
            © {new Date().getFullYear()} Pearl Oasis Restaurant. All rights reserved. Culinary and address details are editable placeholders.
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
