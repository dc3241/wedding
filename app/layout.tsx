import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Figtree,
  Great_Vibes,
  Hanken_Grotesk,
} from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "First Look — Wedding Planning, Simplified",
    template: "%s — First Look",
  },
  description:
    "A shared workspace for couples and planners — timeline, budget, and vendors, all in one place.",
  openGraph: {
    title: "First Look — Wedding Planning, Simplified",
    description:
      "A shared workspace for couples and planners — timeline, budget, and vendors, all in one place.",
    url: "https://usefirstlook.app",
    siteName: "First Look",
    type: "website",
    images: [
      {
        url: "https://usefirstlook.app/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
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
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
