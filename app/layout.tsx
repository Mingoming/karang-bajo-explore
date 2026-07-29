import type { Metadata, Viewport } from "next";

import { SITE_CONFIG } from "@/config/site";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: SITE_CONFIG.name,
  title: {
    default: SITE_CONFIG.name,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={SITE_CONFIG.locale}>
      <body>{children}</body>
    </html>
  );
}
