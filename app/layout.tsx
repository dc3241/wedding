import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { B2B_MARKETING_ENABLED } from "@/lib/marketing-flags";
import { OG_IMAGES, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

/*
 * Fonts are self-hosted from app/fonts (latin subset, same weights as the
 * old next/font/google setup) so builds never depend on fetching Google
 * Fonts — that fetch intermittently failed Vercel builds. Files come from
 * Fontsource; all four families are SIL Open Font License (see LICENSE-*).
 */
const figtree = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "./fonts/figtree-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/figtree-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/figtree-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/figtree-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
});

const hankenGrotesk = localFont({
  variable: "--ws-font-sans",
  display: "swap",
  src: [
    { path: "./fonts/hanken-grotesk-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/hanken-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
});

const cormorantGaramond = localFont({
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "serif"],
  src: [
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

const greatVibes = localFont({
  variable: "--font-script",
  display: "swap",
  fallback: ["cursive"],
  src: [{ path: "./fonts/great-vibes-latin-400-normal.woff2", weight: "400", style: "normal" }],
});

const defaultTitle = B2B_MARKETING_ENABLED
  ? "Wedding Planning CRM"
  : "Free Wedding Planning App";
const defaultDescription = B2B_MARKETING_ENABLED
  ? "First Look is a wedding planning CRM for planners and venues: lead, payment, and the wedding workbook in one platform. Couples can plan here too."
  : "First Look is a free wedding planning app: a wedding checklist, budget tracker, guest list with online RSVP, seating chart, and wedding website in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${defaultTitle} — ${SITE_NAME}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: defaultDescription,
  openGraph: {
    title: `${defaultTitle} — ${SITE_NAME}`,
    description: defaultDescription,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    images: OG_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: `${defaultTitle} — ${SITE_NAME}`,
    description: defaultDescription,
    images: OG_IMAGES.map((image) => image.url),
  },
  other: {
    "p:domain_verify": "f9a920c89421ac33d1e95bb6074c7b07",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${hankenGrotesk.variable} ${cormorantGaramond.variable} ${greatVibes.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
