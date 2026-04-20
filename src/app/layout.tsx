import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { DemoBanner } from "@/components/DemoBanner";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "copula — ebril's world",
  description:
    "a small room for the people who live inside the songs. free — come inside.",
  manifest: "/manifest.webmanifest",
  applicationName: "copula",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "copula",
  },
};

export const viewport: Viewport = {
  themeColor: "#15100E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <div className="grain" aria-hidden />
        {/* @ts-expect-error async server component */}
        <DemoBanner />
        <div className="page">{children}</div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
