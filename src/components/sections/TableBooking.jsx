import React, { useState, useId } from 'react';
import { Send, CheckCircle2, MessageCircle, AlertCircle, X, ExternalLink } from 'lucide-react';

/**
 * Table Booking Section with WhatsApp Click-to-Chat Integration.
 *
 * Configurable restaurant WhatsApp number:
 *   - VITE_WHATSAPP_NUMBER in .env / environment variables (international format without '+' e.g. '923327515538')
 *   - Falls back to Pearl Oasis contact line: +92 332 7515538
 */
const DEFAULT_WHATSAPP_NUMBER = '923327515538';
const CANCELLATION_POLICY_NOTE = '* Cancellation policy: 24 hours complimentary notice.';

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TIME_SLOTS = [
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

const DINING_AREAS = [
  'Grand Dining Hall',
  'Family Dining Lounge',
  "Chef's Robata Counter",
  'Private Wine Salon',
];

const GUEST_OPTIONS = [
  { value: '1', label: '1 Guest' },
  { value: '2', label: '2 Guests' },
  { value: '3', label: '3 Guests' },
  { value: '4', label: '4 Guests' },
  { value: '5', label: '5 Guests' },
  { value: '6', label: '6 Guests' },
  { value: '7', label: '7 Guests' },
  { value: '8', label: '8 Guests' },
  { value: '10', label: '10 Guests' },
  { value: '12+', label: '12+ Guests' },
];

export const TableBooking = () => {
  const formId = useId();
  const today = getTodayDateString();

  const [formData, setFormData] = useState({
    guests: '2',
    date: getTomorrowDateString(),
    time: '12:30 PM (Lunch)',
    seatingArea: 'Grand Dining Hall',
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const validate = () => {
    const nextErrors = {};
    const nameClean = formData.name.trim();
    const emailClean = formData.email.trim();
    const phoneClean = formData.phone.trim();

    if (!nameClean) {
      nextErrors.name = 'Full name is required';
    } else if (nameClean.length < 2) {
      nextErrors.name = 'Please provide your complete name';
    }

    if (!emailClean) {
      nextErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!phoneClean) {
      nextErrors.phone = 'Telephone number is required';
    } else if (phoneClean.replace(/[^0-9]/g, '').length < 7) {
      nextErrors.phone = 'Please enter a valid phone number with area code';
    }

    if (!formData.date) {
      nextErrors.date = 'Reservation date is required';
    } else if (formData.date < today) {
      nextErrors.date = 'Date cannot be in the past';
    }

    if (!formData.time) {
      nextErrors.time = 'Seating time is required';
    }

    if (!formData.guests) {
      nextErrors.guests = 'Party size is required';
    }

    if (!formData.seatingArea) {
      nextErrors.seatingArea = 'Dining area is required';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstErrorKey = Object.keys(nextErrors)[0];
      const el = document.getElementById(`${formId}-${firstErrorKey}`);
      el?.focus();
      return false;
    }

    return true;
  };

  const buildWhatsAppMessage = (data) => {
    const lines = [
      '🏛️ *PEARL OASIS — TABLE RESERVATION REQUEST*',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `*Guest Name:* ${data.name.trim()}`,
      `*Party Size:* ${data.guests} ${Number(data.guests) === 1 ? 'Guest' : 'Guests'}`,
      `*Reservation Date:* ${data.date}`,
      `*Seating Time:* ${data.time}`,
      `*Dining Area:* ${data.seatingArea}`,
      `*Contact Phone:* ${data.phone.trim()}`,
      `*Email Address:* ${data.email.trim()}`,
    ];

    if (data.notes && data.notes.trim()) {
      lines.push(`*Special Requests / Dietary:* ${data.notes.trim()}`);
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📌 *Notice:* This request is pending confirmation by the Pearl Oasis reservations host.');

    return lines.join('\n');
  };

  const getWhatsAppUrl = (data) => {
    const rawNumber =
      (typeof import.meta !== 'undefined' &&
        import.meta.env &&
        import.meta.env.VITE_WHATSAPP_NUMBER) ||
      DEFAULT_WHATSAPP_NUMBER;
    const cleanNumber = String(rawNumber).replace(/[^0-9]/g, '');
    const message = buildWhatsAppMessage(data);
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const whatsappUrl = getWhatsAppUrl(formData);

    // Synchronously launch WhatsApp to avoid popup blockers
    try {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // If blocked, the user can still use the modal link below
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionStatus({
        url: whatsappUrl,
        details: { ...formData },
      });
    }, 250);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <section
      id="booking"
      className="relative py-20 sm:py-28 px-6 sm:px-12 bg-[#090a0c] border-t border-[#1f1d18] text-[#f5efe6]"
      aria-labelledby={`${formId}-heading`}
    >
      {/* Anchor alias for #reservations to ensure compatibility with all links */}
      <span id="reservations" className="absolute -top-24 left-0 pointer-events-none" aria-hidden="true" />

      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center justify-center gap-2 text-xs font-cinzel tracking-[0.3em] text-[#d4af37] uppercase mb-3">
            <span className="w-6 h-px bg-[#d4af37]/60" />
            <span>Table Reservations</span>
            <span className="w-6 h-px bg-[#d4af37]/60" />
          </div>
          <h2
            id={`${formId}-heading`}
            className="font-serif-luxury text-3xl sm:text-5xl text-[#f6efe4] font-normal tracking-tight mb-4"
          >
            Reserve Your Experience
          </h2>
          <p className="text-xs sm:text-sm text-[#a8a194] font-sans leading-relaxed">
            Select your preferred dining time and seating area. Your request will be directly routed to our reservations host via WhatsApp for personalized confirmation.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-[#121316] border border-[#2b271f] rounded-xl p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-[#d4af37]/10 to-transparent pointer-events-none"
            aria-hidden="true"
          />

          <form onSubmit={handleSubmit} noValidate className="space-y-6 sm:space-y-8">
            {/* Row 1: Reservation Details (4 Columns on Desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {/* Party Size */}
              <div>
                <label
                  htmlFor={`${formId}-guests`}
                  className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2"
                >
                  Party Size
                </label>
                <div className="relative">
                  <select
                    id={`${formId}-guests`}
                    value={formData.guests}
                    onChange={(e) => handleChange('guests', e.target.value)}
                    className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-colors cursor-pointer"
                    aria-invalid={Boolean(errors.guests)}
                    aria-describedby={errors.guests ? `${formId}-guests-err` : undefined}
                  >
                    {GUEST_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#18191d] text-[#f5efe6]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.guests && (
                  <p id={`${formId}-guests-err`} className="text-red-400 text-xs mt-1.5 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.guests}</span>
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor={`${formId}-date`}
                  className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2"
                >
                  Date
                </label>
                <input
                  id={`${formId}-date`}
                  type="date"
                  min={today}
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-colors [color-scheme:dark]"
                  aria-invalid={Boolean(errors.date)}
                  aria-describedby={errors.date ? `${formId}-date-err` : undefined}
                />
                {errors.date && (
                  <p id={`${formId}-date-err`} className="text-red-400 text-xs mt-1.5 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.date}</span>
                  </p>
                )}
              </div>

              {/* Seating Time */}
              <div>
                <label
                  htmlFor={`${formId}-time`}
                  className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2"
                >
                  Seating Time
                </label>
                <select
                  id={`${formId}-time`}
                  value={formData.time}
                  onChange={(e) => handleChange('time', e.target.value)}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-colors cursor-pointer"
                  aria-invalid={Boolean(errors.time)}
                  aria-describedby={errors.time ? `${formId}-time-err` : undefined}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot} className="bg-[#18191d] text-[#f5efe6]">
                      {slot}
                    </option>
                  ))}
                </select>
                {errors.time && (
                  <p id={`${formId}-time-err`} className="text-red-400 text-xs mt-1.5 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.time}</span>
                  </p>
                )}
              </div>

              {/* Dining Area */}
              <div>
                <label
                  htmlFor={`${formId}-area`}
                  className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2"
                >
                  Dining Area
                </label>
                <select
                  id={`${formId}-area`}
                  value={formData.seatingArea}
                  onChange={(e) => handleChange('seatingArea', e.target.value)}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-colors cursor-pointer"
                  aria-invalid={Boolean(errors.seatingArea)}
                  aria-describedby={errors.seatingArea ? `${formId}-area-err` : undefined}
                >
                  {DINING_AREAS.map((area) => (
                    <option key={area} value={area} className="bg-[#18191d] text-[#f5efe6]">
                      {area}
                    </option>
                  ))}
                </select>
                {errors.seatingArea && (
                  <p id={`${formId}-area-err`} className="text-red-400 text-xs mt-1.5 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.seatingArea}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Guest Details (3 Columns on Desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 pt-5 sm:pt-6 border-t border-[#232019]">
              {/* Full Name */}
              <div>
                <label
                  htmlFor={`${formId}-name`}
                  className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2"
                >
                  Full Name *
                </label>
                <input
                  id={`${formId}-name`}
                  type="text"
                  placeholder="e.g. Lord Sterling Hayes"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] placeholder:text-neutral-600 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-colors"
                  aria-required="true"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? `${formId}-name-err` : undefined}
                />
                {errors.name && (
                  <p id={`${formId}-name-err`} className="text-red-400 text-xs mt-1.5 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label
                  htmlFor={`${formId}-email`}
                  className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2"
                >
                  Email Address *
                </label>
                <input
                  id={`${formId}-email`}
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] placeholder:text-neutral-600 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-colors"
                  aria-required="true"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? `${formId}-email-err` : undefined}
                />
                {errors.email && (
                  <p id={`${formId}-email-err`} className="text-red-400 text-xs mt-1.5 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Telephone */}
              <div>
                <label
                  htmlFor={`${formId}-phone`}
                  className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2"
                >
                  Telephone *
                </label>
                <input
                  id={`${formId}-phone`}
                  type="tel"
                  placeholder="+44 20 7946 0912"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] placeholder:text-neutral-600 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-colors"
                  aria-required="true"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? `${formId}-phone-err` : undefined}
                />
                {errors.phone && (
                  <p id={`${formId}-phone-err`} className="text-red-400 text-xs mt-1.5 flex items-center gap-1" role="alert">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.phone}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Special Requests / Dietary */}
            <div>
              <label
                htmlFor={`${formId}-notes`}
                className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2"
              >
                Special Requests or Dietary Requirements (Optional)
              </label>
              <textarea
                id={`${formId}-notes`}
                rows={3}
                placeholder="Anniversary celebration, window preference, allergies, or wine pairing requests..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] placeholder:text-neutral-600 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-colors resize-y min-h-[5rem]"
              />
            </div>

            {/* Bottom Row: Policy Note & Submit CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#232019]">
              <div className="text-xs text-[#8c8477] font-sans text-center sm:text-left">
                {CANCELLATION_POLICY_NOTE}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 rounded bg-[#d4af37] bg-gradient-to-r from-[#d4af37] via-[#f3d47d] to-[#aa8010] text-[#12110d] font-cinzel text-xs font-bold tracking-[0.2em] uppercase shadow-[0_4px_20px_rgba(212,175,55,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer min-h-11"
              >
                <MessageCircle className="w-4 h-4 text-[#12110d]" />
                <span>{isSubmitting ? 'Opening WhatsApp...' : 'Confirm Table Request'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* WhatsApp Action Feedback Dialog */}
      {submissionStatus && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-modal-title`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
        >
          <div className="bg-[#121316] border border-[#d4af37]/60 rounded-xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl">
            <button
              onClick={() => setSubmissionStatus(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 min-h-11 min-w-11 flex items-center justify-center rounded transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-[#d4af37] shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 id={`${formId}-modal-title`} className="font-cinzel text-base font-bold text-[#faedd4] uppercase tracking-wider">
                  Request Ready for WhatsApp
                </h3>
                <span className="text-xs text-[#d4af37] font-sans">
                  Status: Pending Restaurant Confirmation
                </span>
              </div>
            </div>

            {/* Summary details */}
            <div className="space-y-2.5 bg-[#181a1f] p-4 rounded border border-white/5 text-xs text-[#cfc8bc] mb-5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Guest Name:</span>
                <span className="font-medium text-white">{submissionStatus.details.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Party Size:</span>
                <span className="font-medium text-white">{submissionStatus.details.guests} Guests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date & Time:</span>
                <span className="font-medium text-white">
                  {submissionStatus.details.date} · {submissionStatus.details.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Dining Area:</span>
                <span className="font-medium text-white">{submissionStatus.details.seatingArea}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Contact:</span>
                <span className="font-medium text-white">{submissionStatus.details.phone}</span>
              </div>
              {submissionStatus.details.notes && (
                <div className="flex justify-between border-t border-white/5 pt-2">
                  <span className="text-neutral-500">Special Notes:</span>
                  <span className="font-medium text-white italic max-w-[60%] text-right">{submissionStatus.details.notes}</span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded bg-[#1f1b13] border border-[#d4af37]/30 text-xs text-[#d6b772] mb-6">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Please ensure you press <strong>Send</strong> in WhatsApp. Your table reservation is not confirmed until our reservations team replies with your confirmation details.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={submissionStatus.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 min-h-11 py-3 px-4 rounded bg-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#0f1012] font-cinzel text-xs font-bold tracking-[0.18em] uppercase hover:shadow-lg transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Launch WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setSubmissionStatus(null)}
                className="inline-flex items-center justify-center min-h-11 py-3 px-5 rounded border border-[#333] text-xs font-cinzel text-[#c2baa8] hover:text-white transition-colors uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
