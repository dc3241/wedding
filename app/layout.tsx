import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Figtree,
  Great_Vibes,
  Hanken_Grotesk,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { B2B_MARKETING_ENABLED } from "@/lib/marketing-flags";
import { OG_IMAGES, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--ws-font-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const greatVibes = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
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
