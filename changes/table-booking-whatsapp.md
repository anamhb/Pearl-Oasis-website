# Table Booking Section with WhatsApp Integration

## Overview
Added an interactive, accessible **Table Booking** section to the Pearl Oasis website based on the provided reference design, complete with WhatsApp click-to-chat integration and a dedicated **BOOK A TABLE** navigation button that smoothly glides to the section.

---

## 1. Component & Section Implementation
- **Component File**: [`src/components/sections/TableBooking.jsx`](file:///d:/anam/4.%20Web_DevOp_Internship/Octobor%202026/code%20files/Pearl-Oasis-V1/src/components/sections/TableBooking.jsx)
- **Section Anchor**: `<section id="booking">` (with `#reservations` alias anchor to preserve compatibility with existing internal links).
- **Placement in [`src/App.jsx`](file:///d:/anam/4.%20Web_DevOp_Internship/Octobor%202026/code%20files/Pearl-Oasis-V1/src/App.jsx)**: Integrated into `<main>` directly after `Testimonials` and before `Footer`, aligning with the high-converting luxury dining user journey (Entrance -> Story -> Signature Dishes -> Menu -> Social Proof -> Table Booking).

### Visual Design & Layout (Matching Screenshot)
- **Palette & Typography**: Deep charcoal background (`#090a0c` / `#121316`), subtle dark borders (`#2b271f` / `#302c22`), golden labels (`text-[#e0b84c]` in uppercase Cinzel with wide tracking), and luxury serif heading.
- **Reservation Details (Row 1 — 4 Columns on Desktop)**:
  1. **Party Size**: Dropdown with options from 1 Guest to 12+ Guests (default: 2 Guests).
  2. **Date**: HTML5 date picker with `min` set to the current date (`YYYY-MM-DD`) preventing past date selection.
  3. **Seating Time**: Dropdown offering lunch, afternoon, dinner, and late-seating slots.
  4. **Dining Area**: Dropdown featuring *Grand Dining Hall*, *Family Dining Lounge*, *Chef's Robata Counter*, and *Private Wine Salon*.
- **Guest Details (Row 2 — 3 Columns on Desktop)**:
  1. **Full Name \***: Required text field (`e.g. Lord Sterling Hayes`).
  2. **Email Address \***: Required email field with regex format validation (`name@company.com`).
  3. **Telephone \***: Required phone field (`+44 20 7946 0912`).
- **Special Requests (Row 3)**:
  - Multi-line textarea for dietary requirements, anniversary celebrations, window seating, etc.
- **Footer Row**:
  - Cancellation notice: `* Cancellation policy: 24 hours complimentary notice.`
  - Prominent gold gradient submit button: **CONFIRM TABLE REQUEST** with message icon.

---

## 2. Navbar "BOOK A TABLE" Button
Updated [`src/components/ui/Navigation.jsx`](file:///d:/anam/4.%20Web_DevOp_Internship/Octobor%202026/code%20files/Pearl-Oasis-V1/src/components/ui/Navigation.jsx):
- **Desktop/Tablet Navbar**: Added **Book a Table** gold gradient CTA button in the right action container (`min-h-11 px-5 py-2.5 rounded bg-[#d4af37] ...`).
- **Desktop Nav Menu**: Added **Table Booking** (`#booking`) link to the navigation links.
- **Mobile Navigation Menu**: Added a full-width **Book a Table** gold button and nav link inside the mobile drawer panel.
- **Smooth Scroll**: Routed via Lenis programmatic smooth scroll; automatically respects `section[id]` scroll margin top (`6.5rem` desktop, `5.5rem` mobile) ensuring the header does not cover the section heading.

---

## 3. WhatsApp Integration Details
When the guest clicks **CONFIRM TABLE REQUEST**:
1. **Validation**: All fields are validated. If invalid, inline alerts (`role="alert"`) appear below erroneous fields and focus moves to the first invalid field.
2. **Payload Generation**: A readable, structured WhatsApp markdown message is generated:
   ```text
   🏛️ *PEARL OASIS — TABLE RESERVATION REQUEST*
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   *Guest Name:* Lord Sterling Hayes
   *Party Size:* 2 Guests
   *Reservation Date:* 2026-11-20
   *Seating Time:* 12:30 PM (Lunch)
   *Dining Area:* Grand Dining Hall
   *Contact Phone:* +92 332 7515538
   *Email Address:* sterling.hayes@pearl-oasis.com
   *Special Requests / Dietary:* Window table, anniversary celebration
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📌 *Notice:* This request is pending confirmation by the Pearl Oasis reservations host.
   ```
3. **Click-to-Chat URL**: Opens `https://wa.me/<number>?text=<encoded_payload>` in a new tab via `window.open`.
4. **Configuration**: Configurable through `VITE_WHATSAPP_NUMBER` in `.env` / environment variables. If unset, it gracefully falls back to the restaurant's line (`923327515538`). Documented in `.env.example`.
5. **Pending Confirmation Notice**: Displays an accessible dialog explaining that the request has been routed to WhatsApp and requires the guest to send the message and await host confirmation.

---

## 4. Validation Results

### 4.1. Code Quality & Build Checks
- `npm run lint` (`tsc --noEmit`): **Passed** with 0 errors.
- `npm run build` (`vite build`): **Built cleanly** in 14.6s with 0 errors.

### 4.2. End-to-End Headless Browser Tests
Automated validation executed against `http://127.0.0.1:5192` using headless Chrome via Chrome DevTools Protocol:
1. **Desktop Navbar Verification**:
   - Both "Table Booking" nav link and "Book a Table" gold button render visibly.
   - Clicking button triggers smooth programmatic scrolling to `#booking` (`scrollY` reached target).
2. **Form Layout & Constraints**:
   - Verified 4-column reservation row and 3-column guest row.
   - Date picker enforces `min="YYYY-MM-DD"` preventing past date selection.
3. **Validation Suite**:
   - Submitting empty form displays 3 inline alerts for Name, Email, and Phone.
   - Submitting invalid past date displays `"Date cannot be in the past"`.
4. **WhatsApp URL & Message Delivery**:
   - Filled valid guest credentials and special requests.
   - Verified generated click-to-chat URL: `https://wa.me/923327515538?text=...`.
   - Verified message payload contains all booking parameters with explicit pending-confirmation disclaimer.
   - Verified feedback dialog modal displays summary with direct fallback link.
5. **Mobile Responsiveness (390×844)**:
   - Verified `scrollWidth <= clientWidth` (0 horizontal overflow).
   - Verified mobile menu contains working Book a Table link and button.
