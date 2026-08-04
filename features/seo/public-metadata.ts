import type { Metadata } from "next";

import { SITE_CONFIG } from "@/config/site";

type PublicMetadataInput = {
  title: string;
  description: string;
  noIndex?: boolean;
  openGraphLocale?: "id_ID" | "en_US";
};

export function buildPublicMetadata({
  title,
  description,
  noIndex = false,
  openGraphLocale = "id_ID",
}: PublicMetadataInput): Metadata {
  const safeTitle = title.trim() || SITE_CONFIG.name;
  const safeDescription = description.trim() || SITE_CONFIG.tagline;

  return {
    title: safeTitle,
    description: safeDescription,
    openGraph: {
      type: "website",
      locale: openGraphLocale,
      siteName: SITE_CONFIG.name,
      title: safeTitle,
      description: safeDescription,
    },
    twitter: {
      card: "summary",
      title: safeTitle,
      description: safeDescription,
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  };
}
