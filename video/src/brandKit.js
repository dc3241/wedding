// First Look brand kit.
// Colors sampled directly from the logo + static post assets — confirm/correct
// against real brand files if exact values exist.
// Fonts confirmed by Dom via Cursor (matches the product's actual font system):
//   Figtree (400/500/600/800) — app chrome, Tier 1/2 (dashboards, forms, landing)
//   Cormorant Garamond (italic) — Tier 3 carve-out: public wedding sites + print.
//     Used here for the "Look." wordmark treatment and editorial accents only.
//   Great Vibes / Hanken Grotesk — website-only, not used in ad templates.

export const colors = {
  blushBg: '#F7E7E8',        // marketing post background (dusty pink)
  appNeutralBg: '#F3EEF0',   // in-app screenshot background (off-white)
  ink: '#241C20',            // primary text, near-black w/ warm tint
  rose: '#C0396B',           // primary accent — logo dot, CTA buttons (canonical app --accent, updated 2026-10-02; was #C13868 pixel sample)
  gold: '#B8860B',           // "Add inquiry" button gold, seen in app screenshots
  editorialMauve: '#7A4F4D', // secondary accent, editorial headline treatments (approximate)
  statusGreen: '#3E7660',
  statusAmber: '#E3A93F',
  statusRed: '#C95550',
  white: '#FFFFFF',
};

export const fonts = {
  sans: 'Figtree',
  serifItalic: 'Cormorant Garamond',
};

export const weights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  extrabold: '800',
};
