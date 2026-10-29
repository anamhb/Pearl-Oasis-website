import React, { useEffect } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import { PROGRAMMATIC_SCROLL_DURATION } from './scroll.js';

/**
 * One Lenis instance for the whole page.
 *
 * The app has several independent scroll-linked animation loops, so Lenis is
 * kept out of them. It owns only the page scroll; each section still reads
 * window.scrollY and schedules its own work exactly as before.
 *
 * Touch remains native. Lenis smooths wheel input only, which is the part of
 * the scroll model this experiment is meant to test.
 */
const LENIS_OPTIONS = {
  autoRaf: true,
  autoResize: true,
  smoothWheel: true,
  syncTouch: false,
  respectReducedMotion: true,
  anchors: false,
};

/**
 * Route same-page anchors through the shared Lenis instance.
 *
 * Lenis 1.3.27's `anchors` option does not prevent the browser's native anchor
 * jump, so it is disabled above and handled here instead. The URL and history
 * entry are updated explicitly to keep back/forward behavior equivalent to a
 * normal anchor link.
 */
const AnchorScroll = () => {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return undefined;

    const scrollToTarget = (target, immediate = false) => {
      lenis.scrollTo(target, {
        duration: PROGRAMMATIC_SCROLL_DURATION,
        immediate,
      });
    };

    const initialId = decodeURIComponent(window.location.hash.slice(1));
    const initialTarget = initialId
      ? document.getElementById(initialId)
      : null;
    if (initialTarget) scrollToTarget(initialTarget, true);

    const handleClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const element =
        event.target instanceof Element
          ? event.target.closest('a[href]')
          : null;
      if (!element || element.hasAttribute('download')) return;
      if (element.target && element.target !== '_self') return;

      const url = new URL(element.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        !url.hash
      ) {
        return;
      }

      const id = decodeURIComponent(url.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;

      event.preventDefault();
      scrollToTarget(target);

      if (url.hash !== window.location.hash) {
        window.history.pushState(null, '', url.hash);
      }
    };

    const handleHistoryNavigation = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      scrollToTarget(target || 0);
    };

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handleHistoryNavigation);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handleHistoryNavigation);
    };
  }, [lenis]);

  return null;
};

export const SmoothScroll = ({ children }) => (
  <ReactLenis root options={LENIS_OPTIONS}>
    <AnchorScroll />
    {children}
  </ReactLenis>
);
