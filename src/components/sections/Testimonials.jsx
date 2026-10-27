import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

/**
 * Words of Appreciation: one looping carousel on a shared arc.
 *
 * All five cards sit on a single circular arc whose centre is below the stage.
 * The active card is upright and centred; neighbours sit lower, rotate outward
 * and fade with distance. The motion is one continuous `position` value driven
 * by `requestAnimationFrame`, so cards travel along the arc instead of sliding
 * in a straight line. Moving past the last card wraps to the first.
 *
 * The burger film is the section background. It sits behind the heading and the
 * carousel in its own layer, and uses `object-fit: cover` with centered framing
 * (`object-position: 50% 50%`). The active card keeps an opaque dark surface so
 * the moving video cannot reduce its text contrast; inactive cards fade along
 * the arc by design. The film has no tint, vignette or filter. A separate soft
 * scrim sits under the heading only and fades before the burger's center.
 */
const TESTIMONIAL_VIDEO =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/v1792900563/Burger_layers_assemble_together_20261025085531.mp4';
const TESTIMONIAL_VIDEO_MOBILE =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/w_720,q_auto/v1792900563/Burger_layers_assemble_together_20261025085531.mp4';
const TESTIMONIAL_POSTER =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/so_0,w_1280,q_auto/v1792900563/Burger_layers_assemble_together_20261025085531.jpg';
const TESTIMONIAL_POSTER_MOBILE =
  'https://res.cloudinary.com/z8nlnc6b/video/upload/so_0,w_720,q_auto/v1792900563/Burger_layers_assemble_together_20261025085531.jpg';
const MOBILE_VIDEO_QUERY = '(max-width: 767px)';

const AUTOPLAY_MS = 3500;
const DRAG_THRESHOLD = 8;
const SWIPE_PROJECTION_MS = 170;
const CLICK_GUARD_MS = 380;
const DURATION_MS = 650;

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const getInitials = (name) => {
  if (!name) return 'GP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/* Placeholder content only. No real guest comment or press endorsement has
   been supplied, so every card says exactly that. The copy is unchanged. */
const TESTIMONIALS = [
  {
    id: '1',
    quote:
      'Sample guest feedback placeholder. A real comment from a diner will appear here once it has been collected and approved for publication by the restaurant. Until then, this card stands in for a genuine review.',
    publication: 'Guest Review Placeholder',
    role: 'Sample Feedback',
    context: 'Not a real review',
  },
  {
    id: '2',
    quote:
      'Guest review placeholder. This card is reserved for a verified comment from a real visitor, and no such comment has been supplied yet. When one is available, it will replace this text.',
    publication: 'Guest Review Placeholder',
    role: 'Sample Feedback',
    context: 'Not a real review',
  },
  {
    id: '3',
    quote:
      'This is placeholder text, not a customer quote. It will be replaced with a real guest comment when one is available and cleared for publication. No endorsement is implied by this card or its placement.',
    publication: 'Guest Review Placeholder',
    role: 'Sample Feedback',
    context: 'Not a real review',
  },
  {
    id: '4',
    quote:
      'Sample feedback placeholder. Nothing on this card comes from a diner, and no review has been collected for it yet. A real comment will appear here once the restaurant has one to publish.',
    publication: 'Guest Review Placeholder',
    role: 'Sample Feedback',
    context: 'Not a real review',
  },
  {
    id: '5',
    quote:
      'Placeholder review. The words above are not a guest\u2019s own, and no real comment has been provided for this card. It will be replaced when a verified comment is available for publication.',
    publication: 'Guest Review Placeholder',
    role: 'Sample Feedback',
    context: 'Not a real review',
  },
];

const TOTAL = TESTIMONIALS.length;

/* Continuous indices are unbounded so stepping never has to reverse across
   the wrap point. Offsets are folded into [-TOTAL/2, TOTAL/2) for the arc. */
const wrapOffset = (delta) => {
  const shifted = ((delta % TOTAL) + TOTAL) % TOTAL;
  return shifted > TOTAL / 2 ? shifted - TOTAL : shifted;
};

const TestimonialCard = memo(function TestimonialCard({
  item,
  index,
  active,
  setCardRef,
  onSelect,
}) {
  const initials = getInitials(item.publication);
  const cardRef = useCallback(
    (element) => {
      setCardRef(index, element);
    },
    [index, setCardRef],
  );
  const handleClick = useCallback(() => onSelect(index), [index, onSelect]);

  return (
    <article
      ref={cardRef}
      className="testimonial-card"
      role="group"
      aria-roledescription="slide"
      aria-label={`Testimonial ${index + 1} of ${TOTAL}`}
      aria-hidden={active ? undefined : 'true'}
      aria-current={active ? 'true' : undefined}
      onClick={handleClick}
    >
      <div className="testimonial-card__body">
        <div>
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <span
              aria-hidden="true"
              className="font-cinzel text-[10px] leading-none tracking-[0.16em] text-[#d4af37]/85"
            >
              {String(index + 1).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')}
            </span>
            <Quote aria-hidden="true" className="h-4 w-4 shrink-0 text-[#d4af37]/75" />
          </div>
          <p className="testimonial-card__quote">&ldquo;{item.quote}&rdquo;</p>
        </div>

        <div className="testimonial-card__footer">
          <div aria-hidden="true" className="testimonial-card__avatar">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="testimonial-card__publication">{item.publication}</div>
            <div className="testimonial-card__meta">
              <span>{item.role}</span>
              <span aria-hidden="true">·</span>
              <span className="italic">{item.context}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});

export const Testimonials = () => {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const arcRef = useRef(null);
  const cardRefs = useRef([]);
  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const animationRef = useRef(0);
  const measurementRef = useRef(0);
  const tweenRef = useRef({ from: 0, to: 0, start: 0 });
  const lastInnerWidthRef = useRef(0);
  const lastWidthRef = useRef(0);
  const spacingRef = useRef(278);
  const radiusRef = useRef(1450);
  const stepRef = useRef(11);
  const xCompressionRef = useRef(1);
  const activeRef = useRef(0);
  const reduceRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const dragCleanupRef = useRef(null);
  const autoplayStepRef = useRef(null);
  const handleSelectRef = useRef(null);
  const dragState = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startPosition: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    axis: null,
    moved: false,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );
  const [interactionTick, setInteractionTick] = useState(0);
  const [mobileVideo, setMobileVideo] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(MOBILE_VIDEO_QUERY).matches,
  );

  /* Writes one frame of the arc to the DOM. Only five elements are touched,
     and only when the position actually changes, so React never re-renders
     per frame. The active/side classes move with the arc; the committed
     active index only changes when a move settles. */
  const render = () => {
    const position = positionRef.current;
    const step = stepRef.current;
    const radius = radiusRef.current;
    const xCompression = xCompressionRef.current;
    const rounded = ((Math.round(position) % TOTAL) + TOTAL) % TOTAL;

    for (let index = 0; index < cardRefs.current.length; index += 1) {
      const element = cardRefs.current[index];
      if (!element) continue;

      const offset = wrapOffset(index - position);
      const abs = Math.abs(offset);
      const radians = (offset * step * Math.PI) / 180;
      const x = radius * Math.sin(radians) * xCompression;
      const y = radius * (1 - Math.cos(radians));
      const rotate = offset * step * 0.82;
      const scale = 1 - Math.min(abs, 2) * 0.035;

      /* The active card is fully opaque. All four arc positions keep enough
         opacity to read as cards; only the brief wrap transition fades the
         card that is travelling past the outer edge. */
      let opacity = 0;
      if (abs <= 1) {
        opacity = 1 - abs * 0.1;
      } else if (abs <= 2) {
        opacity = 0.9 - (abs - 1) * 0.08;
      } else {
        opacity = Math.max(0, (0.82 * (2.2 - abs)) / 0.2);
      }

      element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotate.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      element.style.opacity = opacity.toFixed(3);
      element.style.visibility = 'visible';
      element.style.zIndex = String(10 - Math.round(abs * 2));
      element.style.pointerEvents = abs <= 1.05 ? 'auto' : 'none';
      element.style.cursor = abs > 0.45 && abs <= 1.05 ? 'pointer' : 'default';
      element.classList.toggle('testimonial-card--active', index === rounded);
      element.classList.toggle('testimonial-card--side', index !== rounded);
    }
  };

  const commitActive = () => {
    const rounded = ((Math.round(positionRef.current) % TOTAL) + TOTAL) % TOTAL;
    if (rounded === activeRef.current) return;
    activeRef.current = rounded;
    setActiveIndex(rounded);
  };

  const startAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }

    const tween = tweenRef.current;
    tween.from = positionRef.current;
    tween.to = targetRef.current;
    tween.start = 0;

    if (Math.abs(tween.to - tween.from) < 0.001) {
      positionRef.current = tween.to;
      render();
      commitActive();
      return;
    }

    const tick = (now) => {
      if (tween.start === 0) tween.start = now;
      const elapsed = Math.max(0, now - tween.start);
      const progress = Math.min(1, elapsed / DURATION_MS);
      const eased = easeInOutCubic(progress);

      positionRef.current = tween.from + (tween.to - tween.from) * eased;
      render();

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      positionRef.current = tween.to;
      render();
      animationRef.current = 0;
      commitActive();
    };

    animationRef.current = requestAnimationFrame(tick);
  };

  const moveTo = (next, interaction = false) => {
    targetRef.current = next;
    if (interaction) setInteractionTick((tick) => tick + 1);

    if (reduceRef.current) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
      tweenRef.current.start = 0;
      positionRef.current = next;
      render();
      commitActive();
      return;
    }

    startAnimation();
  };

  const nearestEquivalent = (index) =>
    index + TOTAL * Math.round((positionRef.current - index) / TOTAL);

  const moveBy = (direction) => {
    const from = Math.round(targetRef.current);
    moveTo(from + direction, true);
  };

  autoplayStepRef.current = () => {
    /* Skip a tick if the previous move has not settled. Slow or throttled
       frames must not let autoplay queue up several cards at once. */
    if (Math.abs(targetRef.current - positionRef.current) > 0.06) return;
    moveTo(Math.round(targetRef.current) + 1, false);
  };

  const handleSelectLatest = (index) => {
    if (performance.now() < suppressClickUntilRef.current) return;
    const offset = Math.round(wrapOffset(index - positionRef.current));
    if (offset === 0 || Math.abs(offset) > 1) return;
    moveTo(nearestEquivalent(index), true);
  };

  useLayoutEffect(() => {
    handleSelectRef.current = handleSelectLatest;
  });

  const handleSelect = useCallback((index) => {
    handleSelectRef.current?.(index);
  }, []);

  const setCardRef = useCallback((index, element) => {
    cardRefs.current[index] = element;
  }, []);

  const detachDragListeners = () => {
    if (dragCleanupRef.current) {
      dragCleanupRef.current();
      dragCleanupRef.current = null;
    }
  };

  const endDrag = (cancelled) => {
    const drag = dragState.current;
    if (!drag.active) return;
    drag.active = false;
    drag.pointerId = null;
    detachDragListeners();
    setDragging(false);

    const movedHorizontally = drag.moved && drag.axis === 'x';
    if (!movedHorizontally) {
      drag.moved = false;
      drag.axis = null;
      /* A tap that interrupted an in-flight move should still settle on the
         nearest card instead of leaving the arc between two positions. */
      if (Math.abs(positionRef.current - Math.round(positionRef.current)) > 0.001) {
        moveTo(Math.round(positionRef.current), true);
      } else {
        commitActive();
      }
      return;
    }

    suppressClickUntilRef.current = performance.now() + CLICK_GUARD_MS;

    if (cancelled) {
      drag.moved = false;
      drag.axis = null;
      moveTo(Math.round(positionRef.current), true);
      return;
    }

    const spacing = spacingRef.current || 1;
    const velocity = Math.max(-3, Math.min(3, drag.velocity));
    const projected =
      positionRef.current - (velocity * SWIPE_PROJECTION_MS) / spacing;
    const current = Math.round(positionRef.current);
    const next = Math.max(current - 1, Math.min(current + 1, Math.round(projected)));

    drag.moved = false;
    drag.axis = null;
    moveTo(next, true);
  };

  const handlePointerMove = (event) => {
    const drag = dragState.current;
    if (!drag.active || event.pointerId !== drag.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.axis) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (drag.axis === 'x') drag.moved = true;
    }

    if (drag.axis !== 'x') return;

    const now = event.timeStamp || performance.now();
    const elapsed = now - drag.lastTime;
    if (elapsed > 0) {
      const instant = (event.clientX - drag.lastX) / elapsed;
      drag.velocity = drag.velocity * 0.65 + instant * 0.35;
      drag.lastTime = now;
      drag.lastX = event.clientX;
    }

    positionRef.current =
      drag.startPosition - dx / (spacingRef.current || 1);
    targetRef.current = positionRef.current;
    render();
  };

  const handlePointerUp = () => endDrag(false);
  const handlePointerCancel = () => endDrag(true);
  const handleWindowBlur = () => endDrag(true);

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    detachDragListeners();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = 0;
    tweenRef.current.start = 0;

    const position = wrapOffset(positionRef.current);
    positionRef.current = position;
    targetRef.current = position;

    dragState.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
      lastX: event.clientX,
      lastTime: event.timeStamp || performance.now(),
      velocity: 0,
      axis: null,
      moved: false,
    };

    setDragging(true);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('blur', handleWindowBlur);

    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('blur', handleWindowBlur);
    };
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveBy(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveBy(1);
    }
  };

  const handleFocus = (event) => {
    let focusVisible = true;
    try {
      focusVisible = event.target.matches(':focus-visible');
    } catch {
      focusVisible = true;
    }
    setFocusPaused(focusVisible);
  };

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocusPaused(false);
    }
  };

  const measure = () => {
    const arc = arcRef.current;
    if (!arc) return;
    lastInnerWidthRef.current = window.innerWidth;

    /* Height is content-driven first, so the tallest quote sets one shared
       card height. Without this, short and long placeholders would misalign. */
    arc.style.removeProperty('--tc-card-h');
    const heights = cardRefs.current
      .filter(Boolean)
      .map((element) => element.offsetHeight);
    const tallest = Math.max(0, ...heights);
    if (tallest > 0) arc.style.setProperty('--tc-card-h', `${tallest}px`);

    const styles = window.getComputedStyle(arc);
    const card = cardRefs.current[0];
    const cardWidth = card ? card.offsetWidth : 240;
    const gap = Number.parseFloat(styles.getPropertyValue('--tc-gap')) || 16;
    const step = Number.parseFloat(styles.getPropertyValue('--tc-step')) || 11;

    spacingRef.current = cardWidth + gap;
    stepRef.current = step;
    radiusRef.current =
      spacingRef.current / (2 * Math.sin((step / 2) * (Math.PI / 180)));

    const sectionWidth = sectionRef.current?.clientWidth || window.innerWidth;
    const cardHeight = tallest || card?.offsetHeight || 0;

    /* Keep the first neighbours' card bodies inside the section. Below 768 the
       outer pair can sit at the viewport edge as visible cards, but no
       visibility threshold removes them from the five-card arc. */
    const firstX = radiusRef.current * Math.sin(step * (Math.PI / 180));
    const maxNeighborX = Math.max(0, sectionWidth / 2 - cardWidth / 2 - 24);
    let xCompression =
      firstX > 0 ? Math.min(1, maxNeighborX / firstX) : 1;

    const secondRotation = (2 * step * 0.82 * Math.PI) / 180;
    const secondBBoxHalf =
      (cardWidth * Math.abs(Math.cos(secondRotation)) +
        cardHeight * Math.abs(Math.sin(secondRotation))) /
      2;
    const secondXBase =
      radiusRef.current * Math.sin(2 * step * (Math.PI / 180));

    /* From the 768 layout upward, fit both outer rotated frames inside the
       section as well. This is horizontal spacing only: card width, height,
       rotation and vertical drop stay unchanged, so five cards remain present
       instead of being deleted at tablet and desktop widths. */
    if (window.innerWidth >= 768 && secondXBase > 0) {
      const secondFitX = Math.max(0, sectionWidth / 2 - secondBBoxHalf - 12);
      xCompression = Math.min(xCompression, secondFitX / secondXBase);
    } else if (secondXBase > 0) {
      /* On phones the full rotated frames cannot fit. Keep both card bodies
         inside the section edge so the five-card arc stays readable, while the
         rotated outer corners use the remaining viewport width. */
      const secondBodyX = Math.max(0, sectionWidth / 2 - cardWidth / 2);
      xCompression = Math.min(xCompression, secondBodyX / secondXBase);
    }

    xCompressionRef.current = xCompression;

    const secondDrop =
      radiusRef.current * (1 - Math.cos(2 * step * (Math.PI / 180)));

    /* The arc height always allows the outer pair. It is never shortened by
       hiding those cards, so the section height is driven by the real arc. */
    arc.style.setProperty('--tc-arc-drop', `${Math.ceil(secondDrop)}px`);
    lastWidthRef.current = arc.clientWidth;
    render();
  };

  const scheduleMeasure = () => {
    if (measurementRef.current) return;
    measurementRef.current = requestAnimationFrame(() => {
      measurementRef.current = 0;
      measure();
    });
  };

  /* Geometry is measured once before paint, then again after webfonts load and
     whenever the stage width changes. No idle loop runs after settling. */
  useLayoutEffect(() => {
    lastInnerWidthRef.current = window.innerWidth;
    measure();
  }, []);

  useEffect(() => {
    const onResize = () => {
      const width = window.innerWidth;
      if (width === lastInnerWidthRef.current) return;
      lastInnerWidthRef.current = width;
      scheduleMeasure();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    let observer;
    if (typeof ResizeObserver !== 'undefined' && arcRef.current) {
      observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        if (Math.abs(width - lastWidthRef.current) > 0.5) scheduleMeasure();
      });
      observer.observe(arcRef.current);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (observer) observer.disconnect();
      if (measurementRef.current) cancelAnimationFrame(measurementRef.current);
      measurementRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (!document.fonts || !document.fonts.ready) return undefined;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const apply = () => {
      reduceRef.current = mq.matches;
      setPrefersReduced(mq.matches);
      if (mq.matches) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
        tweenRef.current.start = 0;
        targetRef.current = Math.round(positionRef.current);
        positionRef.current = targetRef.current;
        render();
        commitActive();
      }
    };

    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const arc = arcRef.current;
    if (!arc || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.01 },
    );
    observer.observe(arc);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* Autoplay: paused for reduced motion, hover, keyboard focus, active drag,
     an off-screen stage, or a hidden tab. Manual actions restart the timer. */
  useEffect(() => {
    if (
      prefersReduced ||
      hovered ||
      focusPaused ||
      dragging ||
      !inView ||
      !pageVisible
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (autoplayStepRef.current) autoplayStepRef.current();
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [
    prefersReduced,
    hovered,
    focusPaused,
    dragging,
    inView,
    pageVisible,
    interactionTick,
  ]);

  useEffect(
    () => () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (measurementRef.current) cancelAnimationFrame(measurementRef.current);
      if (dragCleanupRef.current) dragCleanupRef.current();
    },
    [],
  );

  useEffect(() => {
    const query = window.matchMedia(MOBILE_VIDEO_QUERY);
    const onChange = (event) => setMobileVideo(event.matches);
    setMobileVideo(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return undefined;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let near = false;

    const applyPlayback = () => {
      if (near && !motionQuery.matches) {
        const attempt = video.play();
        if (attempt && typeof attempt.catch === 'function') {
          attempt.catch(() => {});
        }
      } else {
        video.pause();
      }
    };

    /* A source swap can replace the video element before it has decoded
       enough data for play(). Retry when the new source is ready. */
    video.addEventListener('canplay', applyPlayback);
    video.addEventListener('loadeddata', applyPlayback);

    const observer = new IntersectionObserver(
      (entries) => {
        near = entries.some((entry) => entry.isIntersecting);
        applyPlayback();
      },
      { rootMargin: '100% 0px' },
    );

    /* Deep links (#experience) and restored scroll positions can mount with the
       section already on screen, before the observer's first delivery. */
    const rect = section.getBoundingClientRect();
    near = rect.top < window.innerHeight * 2 && rect.bottom > -window.innerHeight;
    applyPlayback();

    observer.observe(section);
    motionQuery.addEventListener('change', applyPlayback);

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener('change', applyPlayback);
      video.removeEventListener('canplay', applyPlayback);
      video.removeEventListener('loadeddata', applyPlayback);
    };
  }, [mobileVideo]);

  const videoSource = mobileVideo ? TESTIMONIAL_VIDEO_MOBILE : TESTIMONIAL_VIDEO;
  const videoPoster = mobileVideo ? TESTIMONIAL_POSTER_MOBILE : TESTIMONIAL_POSTER;

  return (
    <section
      ref={sectionRef}
      id="experience"
      aria-labelledby="testimonials-heading"
      className="relative isolate overflow-hidden border-t border-[#1f1d18] bg-[#0a0b0d]"
    >
      {/* The film is the section background, not a band below the heading. It
          is the first child of the section so its absolute box covers the whole
          section; the heading and carousel paint above it. No overlay or filter
          is applied, so the burger remains visible around the cards. */}
      <div aria-hidden="true" className="testimonial-film">
        <video
          key={videoSource}
          ref={videoRef}
          src={videoSource}
          poster={videoPoster}
          className="testimonial-film__video"
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
          disablePictureInPicture
        />
      </div>

      <div className="testimonial-header relative z-10 mx-auto max-w-3xl px-6 pt-10 pb-4 text-center sm:px-12 sm:pt-12 sm:pb-5">
        <p className="mb-3 font-cinzel text-[11px] uppercase tracking-[0.2em] text-[#ead9ac] sm:text-xs sm:tracking-[0.3em]">
          Guest Feedback{' '}
          <span aria-hidden="true" className="text-[#ead9ac]/55">
            ·
          </span>{' '}
          Review Placeholders
        </p>
        <h2
          id="testimonials-heading"
          className="mb-4 font-serif-luxury text-4xl font-normal tracking-tight text-[#f6efe4] sm:text-5xl"
        >
          Words of Appreciation
        </h2>
        <p className="font-sans text-xs text-neutral-200">
          Note: The cards below are placeholders, not real guest reviews or press endorsements.
        </p>
      </div>

      <div className="testimonial-stage">
        <div
          className="testimonial-carousel"
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') setHovered(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setHovered(false);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          <div
            ref={arcRef}
            className="testimonial-arc"
            tabIndex={0}
            role="group"
            aria-roledescription="carousel"
            aria-label="Guest testimonials. Use the left and right arrow keys, or drag, to browse."
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
          >
            {TESTIMONIALS.map((item, index) => (
              <TestimonialCard
                key={item.id}
                item={item}
                index={index}
                active={activeIndex === index}
                onSelect={handleSelect}
                setCardRef={setCardRef}
              />
            ))}
          </div>

          <div className="testimonial-controls">
            <button
              type="button"
              className="testimonial-arrow"
              aria-label="Previous testimonial"
              onClick={() => moveBy(-1)}
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <p aria-hidden="true" className="testimonial-progress">
              <span className="testimonial-progress__current">
                {String(activeIndex + 1).padStart(2, '0')}
              </span>
              <span className="testimonial-progress__divider"> / </span>
              {String(TOTAL).padStart(2, '0')}
            </p>
            <button
              type="button"
              className="testimonial-arrow"
              aria-label="Next testimonial"
              onClick={() => moveBy(1)}
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            Testimonial {activeIndex + 1} of {TOTAL}:{' '}
            {TESTIMONIALS[activeIndex].publication}. {TESTIMONIALS[activeIndex].role}.{' '}
            {TESTIMONIALS[activeIndex].context}.
          </p>
        </div>
      </div>
    </section>
  );
};
