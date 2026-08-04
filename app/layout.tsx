import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { SITE_CONFIG } from "@/config/site";
import { readTrustedLocale } from "@/lib/i18n/locale";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = readTrustedLocale(await headers());

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
