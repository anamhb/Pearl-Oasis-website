import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export const ReservationSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    guests: '2',
    date: '2026-10-20',
    time: '19:30',
    seatingArea: 'Grand Dining Hall',
    notes: '',
  });

  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeSlots = [
    '12:30 PM (Lunch)',
    '1:15 PM (Lunch)',
    '6:00 PM (Dinner)',
    '7:00 PM (Dinner)',
    '7:30 PM (Dinner)',
    '8:15 PM (Dinner)',
    '9:00 PM (Late Seating)',
  ];

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = 'Valid email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Contact telephone is required';
    if (!formData.date) newErrors.date = 'Reservation date is required';
    if (!formData.time) newErrors.time = 'Time slot is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const generatedRef = 'PO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      setSubmittedBooking({
        reference: generatedRef,
        details: { ...formData },
      });
    }, 600);
  };

  return (
    <section id="reservations" className="relative py-28 px-6 sm:px-12 bg-[#090a0c] border-t border-[#1f1d18]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 text-xs font-cinzel tracking-[0.3em] text-[#d4af37] uppercase mb-3">
            <span>Table Reservations</span>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <span>Sanctuary Bookings</span>
          </div>
          <h2 className="font-serif-luxury text-4xl sm:text-5xl text-[#f6efe4] font-normal tracking-tight mb-4">
            Reserve Your Experience
          </h2>
          <p className="text-xs text-neutral-400 font-sans leading-relaxed">
            Join us for an unforgettable evening of culinary craft. This interactive form operates in demonstration mode until connected to your live booking API (SevenRooms / OpenTable).
          </p>
        </div>

        <div className="bg-[#121316] border border-[#2b271f] rounded-xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#d4af37]/10 to-transparent pointer-events-none" />

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2">
                  Party Size
                </label>
                <div className="relative">
                  <select
                    value={formData.guests}
                    onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                    className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] focus:border-[#d4af37] focus:outline-none transition-colors"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                      <option key={num} value={num.toString()}>
                        {num} {num === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] focus:border-[#d4af37] focus:outline-none transition-colors"
                />
                {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
              </div>

              <div>
                <label className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2">
                  Seating Time
                </label>
                <select
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] focus:border-[#d4af37] focus:outline-none transition-colors"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                {errors.time && <p className="text-red-400 text-xs mt-1">{errors.time}</p>}
              </div>

              <div>
                <label className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2">
                  Dining Area
                </label>
                <select
                  value={formData.seatingArea}
                  onChange={(e) => setFormData({ ...formData, seatingArea: e.target.value })}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] focus:border-[#d4af37] focus:outline-none transition-colors"
                >
                  <option value="Grand Dining Hall">Grand Dining Hall</option>
                  <option value="Chef's Robata Counter">Chef's Robata Counter</option>
                  <option value="Private Wine Salon">Private Wine Salon</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#232019]">
              <div>
                <label className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lord Sterling Hayes"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none transition-colors"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none transition-colors"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2">
                  Telephone *
                </label>
                <input
                  type="tel"
                  placeholder="+44 20 7946 0912"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none transition-colors"
                />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-cinzel tracking-[0.15em] text-[#e0b84c] uppercase mb-2">
                Special Requests or Dietary Requirements (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Anniversary celebration, window preference, allergies, or wine pairing requests..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-[#18191d] border border-[#302c22] rounded px-4 py-3 text-sm text-[#f5efe6] placeholder:text-neutral-600 focus:border-[#d4af37] focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#232019]">
              <div className="text-xs text-neutral-500 font-sans">
                * Cancellation policy: 24 hours complimentary notice.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-10 py-3.5 rounded bg-gradient-to-r from-[#d4af37] via-[#f3d47d] to-[#aa8010] text-[#12110d] font-cinzel text-xs font-bold tracking-[0.2em] uppercase shadow-[0_4px_20px_rgba(212,175,55,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Requesting Table...' : 'Confirm Table Request'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {submittedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121316] border border-[#d4af37]/60 rounded-xl max-w-lg w-full p-8 relative shadow-2xl">
            <button
              onClick={() => setSubmittedBooking(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-[#d4af37]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-cinzel text-base font-bold text-[#faedd4] uppercase tracking-wider">
                  Reservation Request Logged
                </h3>
                <span className="text-xs font-mono text-[#d4af37]">
                  Ref: {submittedBooking.reference} (Demo Mode)
                </span>
              </div>
            </div>

            <div className="space-y-3 bg-[#181a1f] p-4 rounded border border-white/5 text-xs text-[#cfc8bc] mb-6">
              <div className="flex justify-between">
                <span className="text-neutral-500">Guest Name:</span>
                <span className="font-medium text-white">{submittedBooking.details.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Party Size:</span>
                <span className="font-medium text-white">{submittedBooking.details.guests} Guests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date & Time:</span>
                <span className="font-medium text-white">
                  {submittedBooking.details.date} · {submittedBooking.details.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Seating Area:</span>
                <span className="font-medium text-white">{submittedBooking.details.seatingArea}</span>
              </div>
              {submittedBooking.details.notes && (
                <div className="flex justify-between border-t border-white/5 pt-2">
                  <span className="text-neutral-500">Notes:</span>
                  <span className="font-medium text-white italic">{submittedBooking.details.notes}</span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded bg-[#1f1b13] border border-[#d4af37]/30 text-xs text-[#d6b772] mb-6">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Demonstration Notice: This confirmation is simulated for demonstration and design evaluation. No live booking backend is connected.
              </span>
            </div>

            <button
              onClick={() => setSubmittedBooking(null)}
              className="w-full py-3 rounded bg-[#d4af37] text-[#0f1012] font-cinzel text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#fae08c] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
