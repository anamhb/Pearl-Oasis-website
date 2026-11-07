/** Booking domain data and date helpers for the table booking flow. */

export const TIME_SLOTS = [
  '12:30 PM (Lunch)',
  '1:15 PM (Lunch)',
  '2:00 PM (Lunch)',
  '2:45 PM (Afternoon)',
  '6:00 PM (Dinner)',
  '6:45 PM (Dinner)',
  '7:30 PM (Dinner)',
  '8:15 PM (Dinner)',
  '9:00 PM (Dinner)',
  '9:45 PM (Late Seating)',
];

/**
 * Bounds for the total-guest picker on the People step: circular buttons
 * cover 1-12, the More dropdown covers 13 up to this maximum.
 */
export const GUEST_MIN = 1;
export const GUEST_MAX = 30;

/** Local "YYYY-MM-DD" for today; also the date picker's min attribute. */
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local "YYYY-MM-DD" for tomorrow; powers the Tomorrow quick-pick card. */
export function getTomorrowDateString() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Short readable date for the date option cards, e.g. "Fri, 6 Nov". */
export function formatShortDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Human-readable reservation date, e.g. "Friday, 20 November 2026".
 *
 * The ISO string is rebuilt as a local date (not via new Date(iso), which
 * would read it as UTC and can shift the day).
 */
export function formatReservationDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
