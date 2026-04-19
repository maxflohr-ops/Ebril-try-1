import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Ebril Rewards",
  description: "Earn points, unlock tiers, and redeem perks as an Ebril supporter.",
  manifest: "/manifest.webmanifest",
  applicationName: "Ebril Rewards",
};

export const viewport: Viewport = {
  themeColor: "#ff4d8d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
