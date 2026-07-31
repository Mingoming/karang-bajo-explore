import type { Metadata } from "next";

import { SITE_CONFIG } from "@/config/site";

type PublicMetadataInput = {
  title: string;
  description: string;
  noIndex?: boolean;
};

export function buildPublicMetadata({
  title,
  description,
  noIndex = false,
}: PublicMetadataInput): Metadata {
  const safeTitle = title.trim() || SITE_CONFIG.name;
  const safeDescription = description.trim() || SITE_CONFIG.tagline;

  return {
    title: safeTitle,
    description: safeDescription,
    openGraph: {
      type: "website",
      locale: "id_ID",
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
