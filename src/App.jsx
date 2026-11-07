/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useLenis } from 'lenis/react';
import { Navigation } from './components/ui/Navigation.jsx';
import { EntranceExperience } from './components/3d/EntranceExperience.jsx';
import { WelcomeStory } from './components/sections/WelcomeStory.jsx';
import { SignatureDishes } from './components/sections/SignatureDishes.jsx';
import { MenuExperience } from './components/sections/MenuExperience.jsx';
import { Testimonials } from './components/sections/Testimonials.jsx';
import { BookATablePage } from './components/sections/BookATablePage.jsx';
import { Footer } from './components/sections/Footer.jsx';
import {
  BOOKING_PATH,
  interceptInternalLinkClicks,
  useRoutePath,
} from './utils/router.js';

/**
 * Two routes, no router library: the landing sections for "/" (and any
 * unknown path) and the dedicated booking stepper for "/book-a-table".
 * Deep links work through Vite's SPA fallback in dev/preview; static
 * hosting needs a rewrite of unknown paths to index.html (see
 * changes/dedicated-booking-stepper.md).
 */
export default function App() {
  const routePath = useRoutePath();
  const lenis = useLenis();
  const previousRouteRef = useRef(routePath);

  /* Internal links become single-page navigations. Same-page hash links
     stay with AnchorScroll inside SmoothScroll (see utils/router.js). */
  useEffect(() => {
    document.addEventListener('click', interceptInternalLinkClicks);
    return () => document.removeEventListener('click', interceptInternalLinkClicks);
  }, []);

  /* A route change swaps the entire page: land at the top, or at the
     requested hash, instead of inheriting the previous page's scroll.
     Only actual path changes scroll — Lenis becoming available after
     mount must not move a refreshed, scroll-restored page. */
  useLayoutEffect(() => {
    if (previousRouteRef.current === routePath) return;
    previousRouteRef.current = routePath;

    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;

    if (lenis) {
      /* Lenis caches its scroll limit and only re-measures on ResizeObserver
         (next frame). The landing page is much taller than the booking page,
         so without a synchronous re-measure here the jump gets clamped to the
         previous page's limit. */
      lenis.resize();
      lenis.scrollTo(target || 0, { immediate: true });
    } else if (target) {
      target.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [routePath, lenis]);

  const isBookingPage = routePath === BOOKING_PATH;

  return (
    <div className="min-h-screen bg-[#08090a] text-[#e5e2db] flex flex-col font-sans selection:bg-[#d4af37]/30 selection:text-[#fef08a]">
      <Navigation />

      <main className="flex-1">
        {isBookingPage ? (
          <BookATablePage />
        ) : (
          <>
            <EntranceExperience />
            <WelcomeStory />
            <SignatureDishes />
            <MenuExperience />
            <Testimonials />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
