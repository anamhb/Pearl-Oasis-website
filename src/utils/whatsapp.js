/**
 * WhatsApp click-to-chat helpers shared by the booking flow.
 *
 * Configurable restaurant WhatsApp number:
 *   - VITE_WHATSAPP_NUMBER in .env / environment variables (international
 *     format without '+' e.g. '923327515538')
 *   - Falls back to Pearl Oasis contact line: +92 332 7515538
 */
import { formatReservationDate } from './booking.js';

export const DEFAULT_WHATSAPP_NUMBER = '923327515538';

/**
 * Formatted message body for a table booking request.
 *
 * The wording is deliberate: this is a *request*, never an automatic
 * confirmation. The guest must press Send, and the restaurant confirms
 * availability by replying.
 */
export function buildTableBookingMessage(data) {
  const lines = [
    '🏛️ *Pearl Oasis — Table Booking Request*',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Hello! I would like to request a table at Pearl Oasis.',
    '',
    `*Total Guests:* ${data.totalGuests}`,
    `*Kids:* ${data.kids}`,
    `*Male:* ${data.male}`,
    `*Female:* ${data.female}`,
    `*Reservation Date:* ${formatReservationDate(data.date)}`,
    `*Seating Time:* ${data.time}`,
    `*Guest Name:* ${data.name.trim()}`,
    `*Telephone:* ${data.phone.trim()}`,
  ];

  if (data.notes && data.notes.trim()) {
    lines.push(`*Special Requests:* ${data.notes.trim()}`);
  }

  lines.push(
    '',
    'Please note: this is a booking request, not an automatically confirmed reservation. My table is confirmed only once the restaurant replies to this message.',
    '',
    'Thank you.',
  );

  return lines.join('\n');
}

/** wa.me click-to-chat URL with the message URL-encoded in the text param. */
export function getTableBookingWhatsAppUrl(data) {
  const rawNumber =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_WHATSAPP_NUMBER) ||
    DEFAULT_WHATSAPP_NUMBER;
  const cleanNumber = String(rawNumber).replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(buildTableBookingMessage(data))}`;
}
