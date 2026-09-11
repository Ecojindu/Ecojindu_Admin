import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "./providers";
import { config } from "@/lib/config";

import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Ecojindu Operations", template: "%s · Ecojindu Operations" },
  description: "Operations dashboard and driver portal for Ecojindu Shuttle.",
  // Internal tool — keep it out of search results entirely.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#16281A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={sans.variable}>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
