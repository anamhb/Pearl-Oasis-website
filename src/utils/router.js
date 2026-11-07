/**
 * Minimal history-API routing for the two-route app (landing + /book-a-table).
 *
 * The project has no router library and none is added for this: the app only
 * needs two paths, a subscription for useSyncExternalStore, and a
 * document-level click handler that keeps internal links single-page.
 *
 * Division of labour with SmoothScroll.jsx:
 *   - AnchorScroll (capture phase) owns same-page hash links and smooth
 *     scrolling through Lenis. Its handler runs first; when it calls
 *     preventDefault this module stands down via the defaultPrevented check.
 *   - interceptInternalLinkClicks (bubble phase) owns links whose pathname
 *     differs from the current one (landing <-> /book-a-table, and /#section
 *     links clicked from the booking page).
 *   - External links, tel:/mailto:, target="_blank" and download links are
 *     left entirely to the browser.
 */
import { useSyncExternalStore } from 'react';

export const BOOKING_PATH = '/book-a-table';

const ROUTE_CHANGE_EVENT = 'pearloasis:routechange';

/** Trailing slashes must not create a second route ("/book-a-table/"). */
const normalizePath = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

const getRouteSnapshot = () => normalizePath(window.location.pathname);

const subscribeToRoute = (onChange) => {
  /* pushState does not fire popstate, so navigate() dispatches a custom
     event; both paths funnel into the same subscription. */
  window.addEventListener('popstate', onChange);
  window.addEventListener(ROUTE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(ROUTE_CHANGE_EVENT, onChange);
  };
};

const currentLocation = () =>
  window.location.pathname + window.location.search + window.location.hash;

/** Client-side navigation. No-op when the target already is the URL. */
export function navigate(to) {
  if (to === currentLocation()) return;
  window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
}

/** Current normalized path, re-rendering on pushState and back/forward. */
export function useRoutePath() {
  return useSyncExternalStore(subscribeToRoute, getRouteSnapshot, getRouteSnapshot);
}

/**
 * Bubble-phase document click handler for internal links.
 *
 * Same-page anchors never reach the navigation branch below: AnchorScroll
 * either handled them (defaultPrevented) or deliberately let the browser's
 * hash fallback run (target missing on the page).
 */
export function interceptInternalLinkClicks(event) {
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

  const anchor =
    event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!anchor || anchor.hasAttribute('download')) return;
  if (anchor.target && anchor.target !== '_self') return;

  const url = new URL(anchor.href, window.location.href);
  /* External hosts and non-http schemes (tel:, mailto:) keep native behaviour. */
  if (url.origin !== window.location.origin) return;

  if (url.pathname === window.location.pathname) {
    /* Same path: hash links belong to AnchorScroll (or the browser's no-op
       fallback above). A path without a hash would trigger a full reload of
       the page already on screen, so swallow it. */
    if (!url.hash) event.preventDefault();
    return;
  }

  event.preventDefault();
  navigate(normalizePath(url.pathname) + url.search + url.hash);
}
