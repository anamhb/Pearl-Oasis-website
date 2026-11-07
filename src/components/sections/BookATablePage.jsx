import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  Sun,
  Sunrise,
  X,
} from 'lucide-react';
import {
  GUEST_MAX,
  GUEST_MIN,
  TIME_SLOTS,
  formatReservationDate,
  formatShortDate,
  getTodayDateString,
  getTomorrowDateString,
} from '../../utils/booking.js';
import { getTableBookingWhatsAppUrl } from '../../utils/whatsapp.js';

/**
 * Dedicated /book-a-table page.
 *
 * A five-step stepper (People -> Date -> Time -> Details -> Submit) walks
 * the guest through the booking journey. All form state lives in this
 * component, so entering a step, going back, and returning again preserves
 * every value. Confirmation opens WhatsApp click-to-chat with a pre-filled
 * request message; nothing is booked until the guest sends it and the
 * restaurant replies.
 */

const STEPS = [
  { number: 1, label: 'People', heading: 'Who Is Dining?' },
  { number: 2, label: 'Date', heading: 'Choose Your Date' },
  { number: 3, label: 'Time', heading: 'Choose a Seating Time' },
  { number: 4, label: 'Details', heading: 'Your Details' },
  { number: 5, label: 'Submit', heading: 'Review & Submit' },
];

/** Owning step for each field key, used when re-validation jumps backwards. */
const FIELD_STEP = {
  totalGuests: 1,
  composition: 1,
  date: 2,
  time: 3,
  name: 4,
  phone: 4,
};

const COMPOSITION_FIELDS = new Set(['totalGuests', 'kids', 'male', 'female']);

const COMPOSITION = [
  { key: 'kids', label: 'Kids' },
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
];

/** Circular buttons cover 1-12; expanding More reveals 13 to GUEST_MAX. */
const CIRCULAR_MAX = 12;
const MORE_GUEST_SIZES = Array.from(
  { length: GUEST_MAX - CIRCULAR_MAX },
  (_, index) => CIRCULAR_MAX + 1 + index,
);

const STEP_DESCRIPTIONS = {
  1: 'Choose your party size — 1 to 12 in the circles, or More for 13 to 30 — then confirm the split into kids, male, and female in the Guest Composition popup.',
  2: 'Pick today, tomorrow, or choose another date from the calendar. Past dates are not available.',
  3: 'Choose one seating time from our configured service slots.',
  4: 'Share your name and phone number so our reservations host can reach you about the table.',
  5: 'Check every detail below, then send your request on WhatsApp.',
};

const CANCELLATION_POLICY_NOTE = '* Cancellation policy: 24 hours complimentary notice.';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]';

const inputClassName =
  'w-full rounded border border-[#302c22] bg-[#18191d] px-4 py-3 text-sm text-[#f5efe6] transition-colors placeholder:text-neutral-600 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none';

const fieldLabelClassName =
  'mb-2 block font-cinzel text-xs uppercase tracking-[0.15em] text-[#e0b84c]';

const primaryButtonClassName = `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-[#d4af37] via-[#f3d47d] to-[#aa8010] px-8 py-3.5 font-cinzel text-xs font-bold uppercase tracking-[0.2em] text-[#12110d] shadow-[0_4px_20px_rgba(212,175,55,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 sm:w-auto ${focusRing}`;

const secondaryButtonClassName = `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded border border-[#d4af37]/40 px-6 py-3 font-cinzel text-xs font-bold uppercase tracking-[0.18em] text-[#f5efe6] transition-all hover:border-[#d4af37] hover:text-[#d4af37] sm:w-auto ${focusRing}`;

/* Popup action button: same gold gradient, sized so the full
   "Confirm Guest Composition" label stays on one line in the modal. */
const dialogPrimaryButtonClassName = `inline-flex min-h-11 w-full flex-1 items-center justify-center gap-2 whitespace-nowrap rounded bg-gradient-to-r from-[#d4af37] via-[#f3d47d] to-[#aa8010] px-4 py-3 font-cinzel text-[11px] font-bold uppercase tracking-[0.14em] text-[#12110d] shadow-[0_4px_20px_rgba(212,175,55,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${focusRing}`;

const counterButtonClassName = `flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#3a352a] bg-[#121316] text-[#f5efe6] transition-colors hover:border-[#d4af37] hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[#3a352a] disabled:hover:text-[#f5efe6] ${focusRing}`;

const editButtonClassName = `-my-2 inline-flex min-h-11 items-center gap-1 rounded px-1 font-cinzel text-[11px] uppercase tracking-[0.12em] text-[#d4af37] transition-colors hover:text-[#f3d47d] ${focusRing}`;

const dateCardClassName = (isSelected) =>
  `flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center transition-all ${focusRing} ${
    isSelected
      ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#f6efe4] shadow-[0_0_0_3px_rgba(212,175,55,0.12)]'
      : 'border-[#302c22] bg-[#18191d] text-[#a8a194] hover:border-[#d4af37]/50 hover:text-[#f5efe6]'
  }`;

const timeCircleClassName = (isSelected) =>
  `flex aspect-square w-full max-w-12 items-center justify-center rounded-full border-2 transition-all sm:max-w-16 ${focusRing} ${
    isSelected
      ? 'scale-105 border-[#d4af37] bg-[#d4af37]/15 text-[#f6efe4] shadow-[0_0_0_4px_rgba(212,175,55,0.12)]'
      : 'border-[#3a352a] bg-[#18191d] text-[#f5efe6] hover:-translate-y-0.5 hover:border-[#d4af37]/60 hover:text-[#d4af37]'
  }`;

/** Circular party-size buttons (1-12) on the People step. */
const guestSizeClassName = (isSelected) =>
  `flex aspect-square w-full max-w-16 items-center justify-center justify-self-center rounded-full border font-cinzel text-lg transition-all sm:text-xl ${focusRing} ${
    isSelected
      ? 'scale-105 border-[#d4af37] bg-[#d4af37]/20 text-[#f2dc8a] shadow-[0_0_0_4px_rgba(212,175,55,0.15)]'
      : 'border-[#3a352a] bg-[#18191d] text-[#f5efe6] hover:-translate-y-0.5 hover:border-[#d4af37]/60 hover:text-[#d4af37]'
  }`;

/** Content-sized "More" toggle trailing the circular buttons. Borderless at
    rest; hover and press paint a light background over its own compact
    content area only — never the full grid width. Selected state (party
    over 12) shows in gold text, since the border is gone. */
const moreToggleClassName = (isSelected) =>
  `inline-flex h-11 items-center justify-self-start gap-2 whitespace-nowrap rounded-md px-3 font-cinzel text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${focusRing} ${
    isSelected ? 'text-[#e0b84c] hover:text-[#f2dc8a]' : 'text-[#a8a194] hover:text-[#f5efe6]'
  } hover:bg-white/10 active:bg-white/20`;

/** Label + control + error message for one form field. */
const Field = ({ id, label, error, children, className = '' }) => (
  <div className={className}>
    <label htmlFor={id} className={fieldLabelClassName}>
      {label}
    </label>
    {children}
    {error && (
      <p id={`${id}-err`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </p>
    )}
  </div>
);

/** Summary row for the review cards and the confirmation dialog. */
const DetailRow = ({ label, value, className = '' }) => (
  <div className={`flex items-start justify-between gap-3 border-b border-white/5 py-2 last:border-b-0 ${className}`}>
    <dt className="shrink-0 text-[#a39a8c]">{label}</dt>
    <dd className="min-w-0 break-words text-right font-medium text-[#f5efe6]">{value}</dd>
  </div>
);

/**
 * Progress indicator: five numbered circles on a track, with a gold fill
 * that advances to the active circle. Completed steps are buttons, so the
 * guest can jump back to edit; forward movement still only happens through
 * validated Continue clicks.
 */
const BookingStepper = ({ currentStep, onSelectStep }) => (
  <nav aria-label="Booking progress" className="mx-auto mb-8 max-w-xl sm:mb-12">
    <div className="relative">
      {/* The five list items share the row equally, so their centres sit at
          10%, 30%, 50%, 70% and 90%. The track spans first to last. */}
      <div
        aria-hidden="true"
        className="absolute top-5 left-[10%] right-[10%] h-px bg-[#3a352a] sm:top-[22px]"
      />
      <div
        aria-hidden="true"
        className="absolute top-5 left-[10%] h-px bg-[#d4af37] transition-[width] duration-500 ease-out sm:top-[22px]"
        style={{ width: `${(80 * (currentStep - 1)) / (STEPS.length - 1)}%` }}
      />

      <ol className="relative flex">
        {STEPS.map((s) => {
          const state =
            s.number < currentStep ? 'completed' : s.number === currentStep ? 'current' : 'upcoming';
          const isCompleted = state === 'completed';

          const circle = (
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-cinzel text-sm font-bold transition-colors sm:h-11 sm:w-11 ${
                isCompleted
                  ? 'border-[#d4af37] bg-[#d4af37] text-[#12110d]'
                  : state === 'current'
                    ? 'border-[#d4af37] bg-[#141517] text-[#d4af37] shadow-[0_0_0_4px_rgba(212,175,55,0.12)]'
                    : 'border-[#3a352a] bg-[#141517] text-[#8c8477]'
              }`}
            >
              {isCompleted ? <Check className="h-5 w-5" aria-hidden="true" /> : s.number}
            </span>
          );

          const caption = (
            <span
              className={`mt-2 block w-full px-1 text-center font-cinzel text-[10px] uppercase leading-tight tracking-[0.08em] transition-colors sm:text-[11px] sm:tracking-[0.14em] ${
                isCompleted
                  ? 'text-[#d4af37]'
                  : state === 'current'
                    ? 'text-[#f5efe6]'
                    : 'text-[#8c8477]'
              }`}
            >
              {s.label}
            </span>
          );

          return (
            <li
              key={s.number}
              className="flex min-w-0 flex-1 justify-center"
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {isCompleted ? (
                <button
                  type="button"
                  onClick={() => onSelectStep(s.number)}
                  aria-label={`Edit step ${s.number}: ${s.label}`}
                  className={`flex min-h-11 w-full flex-col items-center rounded transition-opacity hover:opacity-80 ${focusRing}`}
                >
                  {circle}
                  {caption}
                </button>
              ) : (
                <div className="flex w-full flex-col items-center">
                  {circle}
                  {caption}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  </nav>
);

export const BookATablePage = () => {
  const formId = useId();
  const todayIso = getTodayDateString();
  const tomorrowIso = getTomorrowDateString();

  const headingRef = useRef(null);
  const pendingFocusFieldRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const modalPrimaryRef = useRef(null);
  const dateInputRef = useRef(null);
  const isFirstStepRender = useRef(true);
  const compositionDialogPanelRef = useRef(null);
  const compositionDialogLastFocusRef = useRef(null);
  const compositionDialogWasOpenRef = useRef(false);

  const [step, setStep] = useState(1);
  /* The party starts unconfirmed (total 0): the popup is the only writer,
     so nothing reaches the summary or the WhatsApp message before the
     guest picks a size and confirms a complete composition. */
  const [formData, setFormData] = useState({
    totalGuests: 0,
    kids: 0,
    male: 0,
    female: 0,
    date: '',
    time: '',
    name: '',
    phone: '',
    notes: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  /* Reveals the inline 13-30 circles after the first twelve. */
  const [sizesExpanded, setSizesExpanded] = useState(false);
  /* Open Guest Composition popup: { total, kids, male, female } or null. */
  const [compositionDialog, setCompositionDialog] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  /* After a step change, move focus to the new step's heading so keyboard
     and screen-reader users land on the new content. When the change was
     caused by a failed re-validation, the pending field id wins so the
     guest lands on the invalid input instead. */
  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    const pendingField = pendingFocusFieldRef.current;
    if (pendingField) {
      pendingFocusFieldRef.current = null;
      document.getElementById(pendingField)?.focus();
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  /* Opening the calendar moves focus straight into the date input. Runs
     after the step-change effect so a revealed input wins the focus. */
  useEffect(() => {
    if (showDatePicker) dateInputRef.current?.focus();
  }, [showDatePicker]);

  const closeDialog = useCallback(() => {
    setSubmissionStatus(null);
    confirmButtonRef.current?.focus();
  }, []);

  /* Escape closes the dialog and focus returns to the confirm button. */
  useEffect(() => {
    if (!submissionStatus) return undefined;
    modalPrimaryRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeDialog();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [submissionStatus, closeDialog]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      /* Editing any guest count also settles a stale breakdown error. */
      const touchesComposition = COMPOSITION_FIELDS.has(field);
      if (!prev[field] && !(touchesComposition && prev.composition)) return prev;
      const next = { ...prev };
      delete next[field];
      if (touchesComposition) delete next.composition;
      return next;
    });
  };

  /* --- Circular size picker + Guest Composition popup ------------------ */

  const changeDialogCount = (field, delta) => {
    setCompositionDialog((prev) => {
      if (!prev) return prev;
      const assigned = prev.kids + prev.male + prev.female;
      const nextValue = prev[field] + delta;
      /* Counts can never go negative and can never exceed the total:
         + is blocked once every guest is assigned, − at zero. */
      if (nextValue < 0) return prev;
      if (delta > 0 && assigned >= prev.total) return prev;
      return { ...prev, [field]: nextValue };
    });
  };

  /* Prefill rules: re-selecting the confirmed total edits it in place;
     picking a new total carries over whatever fits (each count capped at
     the new total, then trimmed from the largest group) instead of
     silently discarding the previous breakdown. */
  const openCompositionDialog = (total) => {
    let kids;
    let male;
    let female;

    if (total === formData.totalGuests && formData.totalGuests >= GUEST_MIN) {
      ({ kids, male, female } = formData);
    } else {
      kids = Math.min(formData.kids, total);
      male = Math.min(formData.male, total);
      female = Math.min(formData.female, total);
      while (kids + male + female > total) {
        if (female >= male && female >= kids) female -= 1;
        else if (male >= kids) male -= 1;
        else kids -= 1;
      }
    }

    /* Return focus to whatever opened the popup — a size circle, the More
       toggle, or the Edit button — once it closes. */
    const active = document.activeElement;
    compositionDialogLastFocusRef.current =
      active && document.contains(active)
        ? active
        : document.getElementById(`${formId}-totalGuests`);

    setCompositionDialog({ total, kids, male, female });
  };

  /* Closing without confirming (X, Cancel, Escape, scrim tap) leaves the
     previously confirmed composition exactly as it was. */
  const closeCompositionDialog = () => {
    setCompositionDialog(null);
    const restoreTarget = compositionDialogLastFocusRef.current;
    compositionDialogLastFocusRef.current = null;
    if (restoreTarget && document.contains(restoreTarget)) restoreTarget.focus();
  };

  const confirmCompositionDialog = () => {
    if (!compositionDialog) return;
    const { total, kids, male, female } = compositionDialog;
    if (kids + male + female !== total) return;
    setFormData((prev) => ({ ...prev, totalGuests: total, kids, male, female }));
    setErrors((prev) => {
      if (!prev.totalGuests && !prev.composition) return prev;
      const next = { ...prev };
      delete next.totalGuests;
      delete next.composition;
      return next;
    });
    closeCompositionDialog();
  };

  /* Every size selection — circle, expanded 13-30 circle, or Edit —
     opens the popup. */
  const selectGuestSize = (size) => {
    openCompositionDialog(size);
  };

  /* Move focus into the popup only on open (not on every count change)
     so keyboard and screen-reader users land inside the dialog. */
  useEffect(() => {
    if (compositionDialog && !compositionDialogWasOpenRef.current) {
      compositionDialogPanelRef.current?.focus();
    }
    compositionDialogWasOpenRef.current = Boolean(compositionDialog);
  }, [compositionDialog]);

  /* Escape closes the popup through the same path as Cancel. */
  useEffect(() => {
    if (!compositionDialog) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeCompositionDialog();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [compositionDialog]);

  /* Changing the date invalidates a seating time picked for the old date
     instead of silently carrying it over. The date itself is preserved
     whenever the guest only navigates between steps. */
  const handleDateChange = (value) => {
    const dateChanged = value !== formData.date;
    setFormData((prev) => ({
      ...prev,
      date: value,
      time: dateChanged ? '' : prev.time,
    }));
    setErrors((prev) => {
      if (!prev.date && !(dateChanged && prev.time)) return prev;
      const next = { ...prev };
      delete next.date;
      if (dateChanged) delete next.time;
      return next;
    });
  };

  const selectToday = () => {
    setShowDatePicker(false);
    handleDateChange(todayIso);
  };

  const selectTomorrow = () => {
    setShowDatePicker(false);
    handleDateChange(tomorrowIso);
  };

  const openDatePicker = () => {
    if (showDatePicker) {
      dateInputRef.current?.focus();
      return;
    }
    setShowDatePicker(true);
  };

  const collectErrors = (targetStep) => {
    const nextErrors = {};

    if (targetStep === 1) {
      const assigned = formData.kids + formData.male + formData.female;
      if (formData.totalGuests < GUEST_MIN || formData.totalGuests > GUEST_MAX) {
        /* No size picked, or picked but never confirmed in the popup. */
        nextErrors.totalGuests = 'Select your party size and confirm the guest composition';
      } else if (assigned !== formData.totalGuests) {
        /* Safety net — the popup already refuses mismatched breakdowns. */
        const gap = formData.totalGuests - assigned;
        nextErrors.composition =
          gap > 0
            ? `Guest breakdown must add up to the total — assign the remaining ${gap} guest${gap === 1 ? '' : 's'}.`
            : `Guest breakdown must add up to the total — remove ${-gap} guest${-gap === 1 ? '' : 's'} from the breakdown.`;
      }
    }

    if (targetStep === 2) {
      if (!formData.date) nextErrors.date = 'Choose a date for your reservation';
      else if (formData.date < todayIso) nextErrors.date = 'Date cannot be in the past';
    }

    if (targetStep === 3) {
      if (!formData.time) nextErrors.time = 'Choose a seating time to continue';
    }

    if (targetStep === 4) {
      const nameClean = formData.name.trim();
      const phoneClean = formData.phone.trim();

      if (!nameClean) {
        nextErrors.name = 'Name is required';
      } else if (nameClean.length < 2) {
        nextErrors.name = 'Please provide your complete name';
      }

      if (!phoneClean) {
        nextErrors.phone = 'Phone number is required';
      } else if (phoneClean.replace(/[^0-9]/g, '').length < 7) {
        nextErrors.phone = 'Please enter a valid phone number with area code';
      }
    }

    return nextErrors;
  };

  const focusFirstInvalidField = (nextErrors) => {
    const firstKey = Object.keys(nextErrors)[0];
    if (!firstKey) return;
    document.getElementById(`${formId}-${firstKey}`)?.focus();
  };

  const handleContinue = () => {
    /* Reveal the calendar when a date is still missing so the guest can
       fix it right after the validation message appears. */
    if (step === 2 && !formData.date) setShowDatePicker(true);

    const nextErrors = collectErrors(step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSelectStep = (targetStep) => {
    if (targetStep < step) setStep(targetStep);
  };

  const handleConfirm = () => {
    /* Re-validate every previous step before anything leaves the page. */
    const nextErrors = {
      ...collectErrors(1),
      ...collectErrors(2),
      ...collectErrors(3),
      ...collectErrors(4),
    };
    const errorKeys = Object.keys(nextErrors);
    if (errorKeys.length > 0) {
      setErrors(nextErrors);
      if (!formData.date) setShowDatePicker(true);
      pendingFocusFieldRef.current = `${formId}-${errorKeys[0]}`;
      setStep(FIELD_STEP[errorKeys[0]] ?? 1);
      return;
    }

    setIsSubmitting(true);
    const whatsappUrl = getTableBookingWhatsAppUrl(formData);

    /* Launched synchronously inside the click/submit path to avoid popup
       blockers; the dialog below remains the fallback if it is blocked. */
    try {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch {
      /* The Launch WhatsApp link in the dialog covers this case. */
    }

    window.setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionStatus({ url: whatsappUrl, details: { ...formData } });
    }, 250);
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (step === STEPS.length) {
      handleConfirm();
      return;
    }
    handleContinue();
  };

  const selectedIsToday = formData.date === todayIso;
  const selectedIsTomorrow = formData.date === tomorrowIso;
  const selectedIsCustom = Boolean(formData.date) && !selectedIsToday && !selectedIsTomorrow;
  const showCalendarInput = showDatePicker || selectedIsCustom;

  /* The popup writes total and counts atomically, so a total at or above
     the minimum always means a complete, confirmed composition exists. */
  const compositionConfirmed = formData.totalGuests >= GUEST_MIN;
  const dialogRemaining = compositionDialog
    ? compositionDialog.total -
      compositionDialog.kids -
      compositionDialog.male -
      compositionDialog.female
    : 0;

  const hasNotes = Boolean(formData.notes.trim());

  return (
    <section
      className="relative min-h-[80vh] bg-[#090a0c] px-6 pb-20 pt-28 text-[#f5efe6] sm:px-12 sm:pb-28 sm:pt-36"
      aria-label="Book a table"
    >
      <div className="mx-auto max-w-3xl">
        {/* Page header */}
        <div className="mb-8 text-center sm:mb-12">
          <div className="mb-3 inline-flex items-center justify-center gap-2 font-cinzel text-xs uppercase tracking-[0.3em] text-[#d4af37]">
            <span className="h-px w-6 bg-[#d4af37]/60" aria-hidden="true" />
            <span>Table Reservations</span>
            <span className="h-px w-6 bg-[#d4af37]/60" aria-hidden="true" />
          </div>
          <h1 className="mb-4 font-serif-luxury text-4xl font-normal tracking-tight text-[#f6efe4] sm:text-5xl">
            Book a Table
          </h1>
          <p className="mx-auto max-w-xl font-sans text-xs leading-relaxed text-[#a8a194] sm:text-sm">
            Tell us when you would like to dine and we will prepare your request in five short
            steps. A reservations host confirms every table personally over WhatsApp.
          </p>
        </div>

        <BookingStepper currentStep={step} onSelectStep={handleSelectStep} />

        {/* Step panel */}
        <div className="relative overflow-hidden rounded-xl border border-[#2b271f] bg-[#121316] p-6 shadow-2xl sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 h-36 w-36 bg-gradient-to-bl from-[#d4af37]/10 to-transparent"
          />

          <form onSubmit={handleFormSubmit} noValidate className="relative">
            <div key={step} className="booking-step-panel">
              <p className="mb-1.5 font-cinzel text-[11px] uppercase tracking-[0.25em] text-[#d4af37]">
                Step {step} of {STEPS.length}
              </p>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="mb-2 font-serif-luxury text-2xl font-normal text-[#f6efe4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4af37] sm:text-3xl"
              >
                {STEPS[step - 1].heading}
              </h2>
              <p className="mb-6 font-sans text-sm leading-relaxed text-[#a8a194] sm:mb-8">
                {STEP_DESCRIPTIONS[step]}
              </p>

              {/* Step 1 — People: circular size picker + Guest Composition popup */}
              {step === 1 && (
                <div className="flex flex-col gap-5 sm:gap-6">
                  {/* Party size: circular buttons 1–12, then More for 13–30 */}
                  <div
                    id={`${formId}-totalGuests`}
                    tabIndex={-1}
                    role="group"
                    aria-label="Party size"
                    aria-describedby={errors.totalGuests ? `${formId}-totalGuests-err` : undefined}
                    className={`rounded-lg border bg-[#18191d] px-4 py-5 transition-colors sm:px-5 ${focusRing} ${
                      errors.totalGuests ? 'border-red-400/60' : 'border-[#302c22]'
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="font-cinzel text-xs uppercase tracking-[0.15em] text-[#e0b84c]">
                        Party Size
                      </p>
                      <p className="text-[11px] text-[#8c8477]">
                        {compositionConfirmed
                          ? `${formData.totalGuests} guest${formData.totalGuests === 1 ? '' : 's'} selected`
                          : 'Select 1 to 30 guests'}
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
                      {Array.from({ length: CIRCULAR_MAX }, (_, index) => index + 1).map((size) => {
                        const isSelected = formData.totalGuests === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => selectGuestSize(size)}
                            aria-pressed={isSelected}
                            aria-label={`Party size ${size}`}
                            className={guestSizeClassName(isSelected)}
                          >
                            {size}
                          </button>
                        );
                      })}

                      {/* Expanding More appends 13-30 inline — same circles,
                          same grid — and the toggle trails the visible sizes
                          so numbers always read 1 through 30 in order. */}
                      {sizesExpanded &&
                        MORE_GUEST_SIZES.map((size) => {
                          const isSelected = formData.totalGuests === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => selectGuestSize(size)}
                              aria-pressed={isSelected}
                              aria-label={`Party size ${size}`}
                              className={guestSizeClassName(isSelected)}
                            >
                              {size}
                            </button>
                          );
                        })}

                      <button
                        type="button"
                        onClick={() => setSizesExpanded((open) => !open)}
                        aria-expanded={sizesExpanded}
                        className={moreToggleClassName(formData.totalGuests > CIRCULAR_MAX)}
                      >
                        <span>{sizesExpanded ? 'Less' : 'More'}</span>
                        <span className="font-sans text-[10px] normal-case tracking-normal opacity-70">
                          13–30
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${sizesExpanded ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    {errors.totalGuests && (
                      <p
                        id={`${formId}-totalGuests-err`}
                        role="alert"
                        className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-red-400"
                      >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{errors.totalGuests}</span>
                      </p>
                    )}
                  </div>

                  {/* Confirmed composition with an Edit shortcut. The card
                      stays out of the way until a composition exists (the
                      popup — not this card — guides the split). */}
                  {(compositionConfirmed || errors.composition) && (
                    <div
                      id={`${formId}-composition`}
                      tabIndex={-1}
                      role="group"
                      aria-label="Guest composition"
                      aria-describedby={errors.composition ? `${formId}-composition-err` : undefined}
                      className={`rounded-lg border px-4 py-4 transition-colors sm:px-5 ${focusRing} ${
                        errors.composition
                          ? 'border-red-400/60 bg-[#1b1315]'
                          : 'border-[#302c22] bg-[#18191d]'
                      }`}
                    >
                      {compositionConfirmed && (
                        <div className="mb-3 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => openCompositionDialog(formData.totalGuests)}
                            aria-label="Edit guest composition"
                            className={editButtonClassName}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </button>
                        </div>
                      )}

                      {compositionConfirmed && (
                        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#302c22] bg-[#302c22] sm:grid-cols-4">
                          {[
                            { label: 'Total Guests', value: formData.totalGuests },
                            { label: 'Kids', value: formData.kids },
                            { label: 'Male', value: formData.male },
                            { label: 'Female', value: formData.female },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-[#18191d] px-4 py-3 text-center">
                              <dt className="font-cinzel text-[10px] uppercase tracking-[0.14em] text-[#a8a194]">
                                {label}
                              </dt>
                              <dd className="mt-1 font-serif-luxury text-2xl leading-none text-[#d4af37]">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      {errors.composition && (
                        <p
                          id={`${formId}-composition-err`}
                          role="alert"
                          className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-red-400"
                        >
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{errors.composition}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 — Date: today / tomorrow / calendar */}
              {step === 2 && (
                <div
                  id={`${formId}-date`}
                  tabIndex={-1}
                  role="group"
                  aria-label="Reservation date"
                  aria-describedby={errors.date ? `${formId}-date-err` : undefined}
                  className={`flex flex-col gap-4 ${focusRing}`}
                >
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <button
                      type="button"
                      onClick={selectToday}
                      aria-pressed={selectedIsToday}
                      aria-label={`Today, ${formatShortDate(todayIso)}`}
                      className={dateCardClassName(selectedIsToday)}
                    >
                      {selectedIsToday ? (
                        <Check className="h-5 w-5 text-[#d4af37]" aria-hidden="true" />
                      ) : (
                        <Sunrise className="h-5 w-5" aria-hidden="true" />
                      )}
                      <span className="font-cinzel text-[10px] uppercase tracking-[0.1em] sm:text-xs">
                        Today
                      </span>
                      <span className="text-[10px] opacity-70 sm:text-[11px]">
                        {formatShortDate(todayIso)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={selectTomorrow}
                      aria-pressed={selectedIsTomorrow}
                      aria-label={`Tomorrow, ${formatShortDate(tomorrowIso)}`}
                      className={dateCardClassName(selectedIsTomorrow)}
                    >
                      {selectedIsTomorrow ? (
                        <Check className="h-5 w-5 text-[#d4af37]" aria-hidden="true" />
                      ) : (
                        <Sun className="h-5 w-5" aria-hidden="true" />
                      )}
                      <span className="font-cinzel text-[10px] uppercase tracking-[0.1em] sm:text-xs">
                        Tomorrow
                      </span>
                      <span className="text-[10px] opacity-70 sm:text-[11px]">
                        {formatShortDate(tomorrowIso)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={openDatePicker}
                      aria-pressed={selectedIsCustom}
                      aria-label="Choose another date"
                      className={dateCardClassName(selectedIsCustom)}
                    >
                      {selectedIsCustom ? (
                        <Check className="h-5 w-5 text-[#d4af37]" aria-hidden="true" />
                      ) : (
                        <CalendarDays className="h-5 w-5" aria-hidden="true" />
                      )}
                      <span className="font-cinzel text-[10px] uppercase tracking-[0.1em] sm:text-xs">
                        Choose another date
                      </span>
                      <span className="text-[10px] opacity-70 sm:text-[11px]">
                        {selectedIsCustom ? formatShortDate(formData.date) : 'Open calendar'}
                      </span>
                    </button>
                  </div>

                  {showCalendarInput && (
                    <div className="rounded-lg border border-[#302c22] bg-[#18191d] p-4">
                      <label htmlFor={`${formId}-date-input`} className={fieldLabelClassName}>
                        Or choose another date
                      </label>
                      <input
                        id={`${formId}-date-input`}
                        ref={dateInputRef}
                        type="date"
                        min={todayIso}
                        value={formData.date}
                        onChange={(e) => {
                          setShowDatePicker(false);
                          handleDateChange(e.target.value);
                        }}
                        className={`${inputClassName} [color-scheme:dark]`}
                        aria-invalid={Boolean(errors.date)}
                        aria-describedby={errors.date ? `${formId}-date-err` : undefined}
                      />
                    </div>
                  )}

                  {formData.date && (
                    <p role="status" className="text-center text-sm text-[#a8a194]">
                      Selected date:{' '}
                      <span className="font-medium text-[#d4af37]">
                        {formatReservationDate(formData.date)}
                      </span>
                    </p>
                  )}

                  {errors.date && (
                    <p
                      id={`${formId}-date-err`}
                      role="alert"
                      className="flex items-center justify-center gap-1 text-center text-xs text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{errors.date}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Step 3 — Time: circular configured seating slots */}
              {step === 3 && (
                <div
                  id={`${formId}-time`}
                  tabIndex={-1}
                  role="group"
                  aria-label="Seating time options"
                  aria-describedby={errors.time ? `${formId}-time-err` : undefined}
                  className={`flex flex-col gap-5 ${focusRing}`}
                >
                  <h3 className="font-cinzel text-xs uppercase tracking-[0.15em] text-[#e0b84c]">
                    Seating Times
                  </h3>

                  <div className="grid grid-cols-5 justify-items-center gap-1.5 sm:gap-4">
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = formData.time === slot;
                      const timeOnly = slot.replace(/\s*\(.*\)$/, '');
                      const [clock, meridiem] = timeOnly.split(' ');
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => handleChange('time', slot)}
                          aria-pressed={isSelected}
                          aria-label={`Seating time ${slot}`}
                          className={timeCircleClassName(isSelected)}
                        >
                          <span className="flex flex-col items-center leading-none">
                            <span className="text-[12px] font-semibold sm:text-sm">{clock}</span>
                            <span className="mt-0.5 text-[9px] tracking-[0.1em] opacity-70 sm:text-[10px]">
                              {meridiem}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-center text-sm text-[#a8a194]">
                    {formData.time ? (
                      <>
                        Selected seating time:{' '}
                        <span className="font-medium text-[#d4af37]">{formData.time}</span>
                      </>
                    ) : (
                      <span className="text-[#8c8477]">No seating time selected yet</span>
                    )}
                  </p>

                  {errors.time && (
                    <p
                      id={`${formId}-time-err`}
                      role="alert"
                      className="flex items-center justify-center gap-1 text-center text-xs text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{errors.time}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Step 4 — Details: name, phone, optional requests */}
              {step === 4 && (
                <div className="flex flex-col gap-5">
                  <Field id={`${formId}-name`} label="Name *" error={errors.name}>
                    <input
                      id={`${formId}-name`}
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Lord Sterling Hayes"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={inputClassName}
                      aria-required="true"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? `${formId}-name-err` : undefined}
                    />
                  </Field>

                  <Field id={`${formId}-phone`} label="Phone Number *" error={errors.phone}>
                    <input
                      id={`${formId}-phone`}
                      type="tel"
                      autoComplete="tel"
                      placeholder="+44 20 7946 0912"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className={inputClassName}
                      aria-required="true"
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? `${formId}-phone-err` : undefined}
                    />
                  </Field>

                  <Field
                    id={`${formId}-notes`}
                    label="Special Requests or Dietary Requirements (Optional)"
                  >
                    <textarea
                      id={`${formId}-notes`}
                      rows={3}
                      placeholder="Anniversary celebration, window preference, allergies, or wine pairing requests..."
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      className={`${inputClassName} min-h-[5rem] resize-y`}
                    />
                  </Field>
                </div>
              )}

              {/* Step 5 — Submit: full booking summary */}
              {step === 5 && (
                <div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    <section aria-labelledby={`${formId}-party-heading`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3
                          id={`${formId}-party-heading`}
                          className="font-cinzel text-xs font-bold uppercase tracking-[0.18em] text-[#e0b84c]"
                        >
                          Your Party
                        </h3>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          aria-label="Edit party details"
                          className={editButtonClassName}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                      <dl className="rounded-lg border border-[#302c22] bg-[#18191d] px-4 py-1 text-xs">
                        <DetailRow label="Total Guests" value={String(formData.totalGuests)} />
                        <DetailRow label="Kids" value={String(formData.kids)} />
                        <DetailRow label="Male" value={String(formData.male)} />
                        <DetailRow label="Female" value={String(formData.female)} />
                      </dl>
                    </section>

                    <section aria-labelledby={`${formId}-res-heading`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3
                          id={`${formId}-res-heading`}
                          className="font-cinzel text-xs font-bold uppercase tracking-[0.18em] text-[#e0b84c]"
                        >
                          Reservation
                        </h3>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          aria-label="Edit date and time"
                          className={editButtonClassName}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                      <dl className="rounded-lg border border-[#302c22] bg-[#18191d] px-4 py-1 text-xs">
                        <DetailRow
                          label="Date"
                          value={formData.date ? formatReservationDate(formData.date) : ''}
                        />
                        <DetailRow label="Seating Time" value={formData.time} />
                      </dl>
                    </section>

                    <section aria-labelledby={`${formId}-guest-heading`} className="sm:col-span-2">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3
                          id={`${formId}-guest-heading`}
                          className="font-cinzel text-xs font-bold uppercase tracking-[0.18em] text-[#e0b84c]"
                        >
                          Guest Details
                        </h3>
                        <button
                          type="button"
                          onClick={() => setStep(4)}
                          aria-label="Edit guest details"
                          className={editButtonClassName}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                      <dl className="rounded-lg border border-[#302c22] bg-[#18191d] px-4 py-1 text-xs">
                        <DetailRow label="Name" value={formData.name.trim()} />
                        <DetailRow label="Phone Number" value={formData.phone.trim()} />
                      </dl>
                    </section>
                  </div>

                  {hasNotes && (
                    <section aria-labelledby={`${formId}-notes-heading`} className="mt-4">
                      <h3
                        id={`${formId}-notes-heading`}
                        className="mb-2 font-cinzel text-xs font-bold uppercase tracking-[0.18em] text-[#e0b84c]"
                      >
                        Special Requests
                      </h3>
                      <p className="whitespace-pre-line rounded-lg border border-[#302c22] bg-[#18191d] px-4 py-3 font-sans text-xs leading-relaxed text-[#cfc8bc]">
                        {formData.notes.trim()}
                      </p>
                    </section>
                  )}

                  <div className="mt-6 flex items-start gap-2.5 rounded border border-[#d4af37]/30 bg-[#1f1b13] p-3 text-xs text-[#d6b772]">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      Confirming sends a booking <strong className="font-semibold">request</strong>{' '}
                      through WhatsApp — your table is not confirmed until our reservations team
                      replies with availability.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step actions */}
            <div
              className={`mt-6 flex flex-col gap-3 border-t border-[#232019] pt-5 sm:flex-row ${
                step > 1 ? 'sm:justify-between' : 'sm:justify-end'
              }`}
            >
              {step > 1 && (
                <button type="button" onClick={handleBack} className={secondaryButtonClassName}>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              )}

              {step < STEPS.length ? (
                <button type="submit" className={primaryButtonClassName}>
                  Continue
                </button>
              ) : (
                <button
                  ref={confirmButtonRef}
                  type="submit"
                  disabled={isSubmitting}
                  className={primaryButtonClassName}
                >
                  <MessageCircle className="h-4 w-4 text-[#12110d]" aria-hidden="true" />
                  <span>{isSubmitting ? 'Opening WhatsApp…' : 'Confirm Table Request'}</span>
                </button>
              )}
            </div>

            {step === STEPS.length && (
              <p className="mt-4 text-center text-[11px] text-[#8c8477] sm:text-left">
                {CANCELLATION_POLICY_NOTE}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Guest Composition popup — bottom sheet on mobile, centered modal on desktop */}
      {compositionDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-composition-dialog-title`}
          data-lenis-prevent
          onClick={closeCompositionDialog}
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <div
            ref={compositionDialogPanelRef}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-md rounded-b-xl rounded-t-2xl border-t-2 border-[#d4af37]/60 bg-[#121316] p-5 shadow-2xl focus:outline-none sm:rounded-xl sm:border sm:border-[#d4af37]/60 sm:p-6"
          >
            {/* Bottom-sheet grab handle, mobile only */}
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#3a352a] sm:hidden"
            />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3
                  id={`${formId}-composition-dialog-title`}
                  className="font-cinzel text-base font-bold uppercase tracking-wider text-[#faedd4]"
                >
                  Guest Composition
                </h3>
                <p className="mt-1 font-sans text-xs leading-relaxed text-[#a39a8c]">
                  Split {compositionDialog.total} guest
                  {compositionDialog.total === 1 ? '' : 's'} into kids, male, and female — every
                  guest needs a place in the breakdown.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCompositionDialog}
                aria-label="Close guest composition"
                className={`-mr-2 -mt-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded p-2 text-neutral-400 transition-colors hover:text-white ${focusRing}`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-lg border border-[#302c22] bg-[#18191d] px-4 py-3">
                <span className="font-cinzel text-[11px] uppercase tracking-[0.14em] text-[#a8a194]">
                  Total Guests
                </span>
                <span
                  aria-live="polite"
                  className="font-serif-luxury text-2xl leading-none text-[#d4af37]"
                >
                  {compositionDialog.total}
                </span>
              </div>

              {COMPOSITION.map(({ key, label }) => {
                const assigned =
                  compositionDialog.kids + compositionDialog.male + compositionDialog.female;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#302c22] bg-[#18191d] px-4 py-2.5"
                  >
                    <span className="font-cinzel text-[11px] uppercase tracking-[0.14em] text-[#a8a194]">
                      {label}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => changeDialogCount(key, -1)}
                        disabled={compositionDialog[key] <= 0}
                        aria-label={`Decrease ${label.toLowerCase()}`}
                        className={counterButtonClassName}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span
                        aria-live="polite"
                        className="w-8 text-center text-xl font-semibold text-[#f5efe6]"
                      >
                        {compositionDialog[key]}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeDialogCount(key, 1)}
                        disabled={assigned >= compositionDialog.total}
                        aria-label={`Increase ${label.toLowerCase()}`}
                        className={counterButtonClassName}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                  dialogRemaining === 0
                    ? 'border-[#d4af37]/40 bg-[#1f1b13]'
                    : 'border-[#302c22] bg-[#18191d]'
                }`}
              >
                <span className="font-cinzel text-[11px] uppercase tracking-[0.14em] text-[#a8a194]">
                  Remaining Guests
                </span>
                <span
                  aria-live="polite"
                  className={`text-lg font-semibold ${
                    dialogRemaining === 0 ? 'text-[#d4af37]' : 'text-[#d6b772]'
                  }`}
                >
                  {dialogRemaining}
                </span>
              </div>

              <p
                role="status"
                className={`flex items-center justify-center gap-1.5 text-center text-xs ${
                  dialogRemaining === 0 ? 'text-[#d4af37]' : 'text-[#d6b772]'
                }`}
              >
                {dialogRemaining === 0 ? (
                  <>
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>All guests assigned</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      Assign {dialogRemaining} more guest{dialogRemaining === 1 ? '' : 's'} to
                      confirm
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={confirmCompositionDialog}
                disabled={dialogRemaining !== 0}
                className={dialogPrimaryButtonClassName}
              >
                Confirm Guest Composition
              </button>
              <button
                type="button"
                onClick={closeCompositionDialog}
                className={`inline-flex min-h-11 w-full items-center justify-center rounded border border-[#333] px-5 py-3 font-cinzel text-xs uppercase tracking-wider text-[#c2baa8] transition-colors hover:text-white sm:w-auto ${focusRing}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp action feedback dialog */}
      {submissionStatus && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-modal-title`}
          data-lenis-prevent
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-lg rounded-xl border border-[#d4af37]/60 bg-[#121316] p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={closeDialog}
              className={`absolute right-4 top-4 flex min-h-11 min-w-11 items-center justify-center rounded p-2 text-neutral-400 transition-colors hover:text-white ${focusRing}`}
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3
                  id={`${formId}-modal-title`}
                  className="font-cinzel text-base font-bold uppercase tracking-wider text-[#faedd4]"
                >
                  Request Ready for WhatsApp
                </h3>
                <span className="font-sans text-xs text-[#d4af37]">
                  Status: Pending Restaurant Confirmation
                </span>
              </div>
            </div>

            <dl className="mb-5 rounded border border-white/5 bg-[#181a1f] px-4 py-1 text-xs text-[#cfc8bc]">
              <DetailRow label="Guest Name" value={submissionStatus.details.name} />
              <DetailRow
                label="Total Guests"
                value={String(submissionStatus.details.totalGuests)}
              />
              <DetailRow
                label="Breakdown"
                value={`Kids ${submissionStatus.details.kids} · Male ${submissionStatus.details.male} · Female ${submissionStatus.details.female}`}
              />
              <DetailRow
                label="Date & Time"
                value={`${formatReservationDate(submissionStatus.details.date)} · ${submissionStatus.details.time}`}
              />
              <DetailRow label="Contact" value={submissionStatus.details.phone} />
              {submissionStatus.details.notes.trim() && (
                <DetailRow
                  label="Special Notes"
                  value={submissionStatus.details.notes.trim()}
                  className="border-t border-white/5"
                />
              )}
            </dl>

            <div className="mb-6 flex items-start gap-2.5 rounded border border-[#d4af37]/30 bg-[#1f1b13] p-3 text-xs text-[#d6b772]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                This is a booking <strong className="font-semibold">request</strong>, not an
                automatically confirmed reservation. Please press <strong>Send</strong> in WhatsApp —
                your table is confirmed only once our reservations team replies with availability.
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                ref={modalPrimaryRef}
                href={submissionStatus.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded bg-gradient-to-r from-[#d4af37] to-[#b8860b] px-4 py-3 font-cinzel text-xs font-bold uppercase tracking-[0.18em] text-[#0f1012] transition-all hover:shadow-lg ${focusRing}`}
              >
                <ExternalLink className="h-4 w-4" />
                <span>Launch WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={closeDialog}
                className={`inline-flex min-h-11 items-center justify-center rounded border border-[#333] px-5 py-3 font-cinzel text-xs uppercase tracking-wider text-[#c2baa8] transition-colors hover:text-white ${focusRing}`}
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

export default BookATablePage;
