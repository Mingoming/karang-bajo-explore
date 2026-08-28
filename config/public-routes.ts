import type { PublicLocale } from "../lib/i18n/locale.ts";
import { PUBLIC_SLUG_PATTERN } from "../features/public-content/model.ts";

export const PUBLIC_ROUTE_KEYS = [
  "home",
  "profile",
  "destinations",
  "tourismPackages",
  "homestays",
  "umkm",
  "traditionalHouses",
  "culturalEvents",
  "tourismMap",
  "contact",
] as const;

export type PublicRouteKey = (typeof PUBLIC_ROUTE_KEYS)[number];
export type PublicRoutePath = `/${string}` | "/";

export const PUBLIC_ENGLISH_VILLAGE_PROFILE_PATH =
  "/en/village-profile" as const;
export const PUBLIC_ENGLISH_HOME_PATH = "/en" as const;
export const PUBLIC_DESTINATIONS_PATH = "/destinasi" as const;
export const PUBLIC_DESTINATION_DETAIL_PATH = "/destinasi/[slug]" as const;
export const PUBLIC_ENGLISH_DESTINATIONS_PATH = "/en/destinations" as const;
export const PUBLIC_ENGLISH_DESTINATION_DETAIL_PATH =
  "/en/destinations/[slug]" as const;

export const PUBLIC_TOURISM_PACKAGES_PATH = "/paket-wisata" as const;
export const PUBLIC_TOURISM_PACKAGE_DETAIL_PATH =
  "/paket-wisata/[slug]" as const;
export const PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH =
  "/en/tourism-packages" as const;
export const PUBLIC_ENGLISH_TOURISM_PACKAGE_DETAIL_PATH =
  "/en/tourism-packages/[slug]" as const;

export const PUBLIC_HOMESTAYS_PATH = "/homestay" as const;
export const PUBLIC_HOMESTAY_DETAIL_PATH = "/homestay/[slug]" as const;
export const PUBLIC_TRADITIONAL_HOUSES_PATH = "/rumah-adat" as const;
export const PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH =
  "/en/traditional-houses" as const;
export const PUBLIC_ENGLISH_TRADITIONAL_HOUSE_DETAIL_PATH =
  "/en/traditional-houses/[slug]" as const;

export const PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH =
  "/en/cultural-events" as const;
export const PUBLIC_ENGLISH_CULTURAL_EVENT_DETAIL_PATH =
  "/en/cultural-events/[slug]" as const;
export const PUBLIC_CULTURAL_EVENTS_PATH = "/acara-budaya" as const;
export const PUBLIC_CULTURAL_EVENT_DETAIL_PATH =
  "/acara-budaya/[slug]" as const;

export const PUBLIC_ENGLISH_HOMESTAYS_PATH = "/en/homestays" as const;
export const PUBLIC_ENGLISH_HOMESTAY_DETAIL_PATH =
  "/en/homestays/[slug]" as const;
export const PUBLIC_UMKMS_PATH = "/umkm" as const;
export const PUBLIC_UMKM_DETAIL_PATH = "/umkm/[slug]" as const;
export const PUBLIC_ENGLISH_UMKMS_PATH = "/en/local-businesses" as const;
export const PUBLIC_ENGLISH_UMKM_DETAIL_PATH =
  "/en/local-businesses/[slug]" as const;
export const PUBLIC_ENGLISH_TOURISM_MAP_PATH = "/en/tourism-map" as const;
export const PUBLIC_ENGLISH_CONTACT_PATH = "/en/contact" as const;

export function getPublicTraditionalHousePath(slug: string): PublicRoutePath {
  return `${PUBLIC_TRADITIONAL_HOUSES_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicHomestayPath(slug: string): PublicRoutePath {
  return `${PUBLIC_HOMESTAYS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicEnglishDestinationPath(slug: string): PublicRoutePath {
  return `${PUBLIC_ENGLISH_DESTINATIONS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicDestinationPath(slug: string): PublicRoutePath {
  return `${PUBLIC_DESTINATIONS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicTourismPackagePath(slug: string): PublicRoutePath {
  return `${PUBLIC_TOURISM_PACKAGES_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicEnglishTourismPackagePath(
  slug: string,
): PublicRoutePath {
  return `${PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicEnglishTraditionalHousePath(
  slug: string,
): PublicRoutePath {
  return `${PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicEnglishCulturalEventPath(
  slug: string,
): PublicRoutePath {
  return `${PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicCulturalEventPath(slug: string): PublicRoutePath {
  return `${PUBLIC_CULTURAL_EVENTS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicEnglishHomestayPath(slug: string): PublicRoutePath {
  return `${PUBLIC_ENGLISH_HOMESTAYS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicEnglishUmkmPath(slug: string): PublicRoutePath {
  return `${PUBLIC_ENGLISH_UMKMS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicUmkmPath(slug: string): PublicRoutePath {
  return `${PUBLIC_UMKMS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export const PUBLIC_ROUTE_MANIFEST: Readonly<
  Record<PublicRouteKey, Readonly<Record<PublicLocale, PublicRoutePath | null>>>
> = {
  home: { id: "/", en: "/en" },
  profile: { id: "/profil-desa", en: PUBLIC_ENGLISH_VILLAGE_PROFILE_PATH },
  destinations: { id: "/destinasi", en: PUBLIC_ENGLISH_DESTINATIONS_PATH },
  tourismPackages: {
    id: PUBLIC_TOURISM_PACKAGES_PATH,
    en: PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH,
  },
  homestays: { id: PUBLIC_HOMESTAYS_PATH, en: PUBLIC_ENGLISH_HOMESTAYS_PATH },
  umkm: { id: "/umkm", en: PUBLIC_ENGLISH_UMKMS_PATH },
  traditionalHouses: {
    id: PUBLIC_TRADITIONAL_HOUSES_PATH,
    en: PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH,
  },
  culturalEvents: {
    id: "/acara-budaya",
    en: PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH,
  },
  tourismMap: { id: "/peta-wisata", en: PUBLIC_ENGLISH_TOURISM_MAP_PATH },
  contact: { id: "/kontak", en: PUBLIC_ENGLISH_CONTACT_PATH },
};

export const PUBLIC_DETAIL_ROUTE_MANIFEST = {
  destinations: {
    id: PUBLIC_DESTINATION_DETAIL_PATH,
    en: PUBLIC_ENGLISH_DESTINATION_DETAIL_PATH,
  },
  tourismPackages: {
    id: PUBLIC_TOURISM_PACKAGE_DETAIL_PATH,
    en: PUBLIC_ENGLISH_TOURISM_PACKAGE_DETAIL_PATH,
  },
  homestays: {
    id: PUBLIC_HOMESTAY_DETAIL_PATH,
    en: PUBLIC_ENGLISH_HOMESTAY_DETAIL_PATH,
  },
  umkm: {
    id: PUBLIC_UMKM_DETAIL_PATH,
    en: PUBLIC_ENGLISH_UMKM_DETAIL_PATH,
  },
  traditionalHouses: {
    id: "/rumah-adat/[slug]",
    en: PUBLIC_ENGLISH_TRADITIONAL_HOUSE_DETAIL_PATH,
  },
  culturalEvents: {
    id: PUBLIC_CULTURAL_EVENT_DETAIL_PATH,
    en: PUBLIC_ENGLISH_CULTURAL_EVENT_DETAIL_PATH,
  },
} as const;

export const PUBLIC_BILINGUAL_DOMAIN_REVALIDATION = {
  destination: {
    publicCollectionPath: PUBLIC_DESTINATIONS_PATH,
    englishCollectionPath: PUBLIC_ENGLISH_DESTINATIONS_PATH,
    getPublicDetailPath: getPublicDestinationPath,
    getEnglishDetailPath: getPublicEnglishDestinationPath,
    includeEnglishTourismMap: true,
  },
  homestay: {
    publicCollectionPath: PUBLIC_HOMESTAYS_PATH,
    englishCollectionPath: PUBLIC_ENGLISH_HOMESTAYS_PATH,
    getPublicDetailPath: getPublicHomestayPath,
    getEnglishDetailPath: getPublicEnglishHomestayPath,
    includeEnglishTourismMap: true,
  },
  umkm: {
    publicCollectionPath: PUBLIC_UMKMS_PATH,
    englishCollectionPath: PUBLIC_ENGLISH_UMKMS_PATH,
    getPublicDetailPath: getPublicUmkmPath,
    getEnglishDetailPath: getPublicEnglishUmkmPath,
    includeEnglishTourismMap: false,
  },
  traditionalHouse: {
    publicCollectionPath: PUBLIC_TRADITIONAL_HOUSES_PATH,
    englishCollectionPath: PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH,
    getPublicDetailPath: getPublicTraditionalHousePath,
    getEnglishDetailPath: getPublicEnglishTraditionalHousePath,
    includeEnglishTourismMap: true,
  },
  culturalEvent: {
    publicCollectionPath: PUBLIC_CULTURAL_EVENTS_PATH,
    englishCollectionPath: PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH,
    getPublicDetailPath: getPublicCulturalEventPath,
    getEnglishDetailPath: getPublicEnglishCulturalEventPath,
    includeEnglishTourismMap: true,
  },
} as const;

export type PublicBilingualDomain =
  keyof typeof PUBLIC_BILINGUAL_DOMAIN_REVALIDATION;

function getPublicDetailRouteSlug(pathname: string, pattern: PublicRoutePath) {
  const marker = "[slug]";
  if (!pattern.endsWith(marker)) return null;

  const prefix = pattern.slice(0, -marker.length);
  const encodedSlug = pathname.slice(prefix.length);
  if (
    !pathname.startsWith(prefix) ||
    !encodedSlug ||
    encodedSlug.includes("/")
  ) {
    return null;
  }

  let slug: string;
  try {
    slug = decodeURIComponent(encodedSlug);
  } catch {
    return null;
  }

  return PUBLIC_SLUG_PATTERN.test(slug) ? slug : null;
}

function getEquivalentPublicDetailRoute(
  pathname: string,
  locale: PublicLocale,
  targetLocale: PublicLocale,
): PublicRoutePath | null {
  for (const detailRoutes of Object.values(PUBLIC_DETAIL_ROUTE_MANIFEST)) {
    const sourcePattern = detailRoutes[locale];
    const targetPattern = detailRoutes[targetLocale];
    const slug = getPublicDetailRouteSlug(pathname, sourcePattern);
    if (!slug) continue;

    return targetPattern.replace(
      "[slug]",
      encodeURIComponent(slug),
    ) as PublicRoutePath;
  }

  return null;
}

export function getPublicRoute(
  key: PublicRouteKey,
  locale: PublicLocale,
): PublicRoutePath | null {
  return PUBLIC_ROUTE_MANIFEST[key][locale];
}

export function getEquivalentPublicRoute(
  pathname: string,
  locale: PublicLocale,
): PublicRoutePath | null {
  const targetLocale: PublicLocale = locale === "id" ? "en" : "id";
  const routeKey = PUBLIC_ROUTE_KEYS.find(
    (key) => PUBLIC_ROUTE_MANIFEST[key][locale] === pathname,
  );

  return routeKey
    ? PUBLIC_ROUTE_MANIFEST[routeKey][targetLocale]
    : getEquivalentPublicDetailRoute(pathname, locale, targetLocale);
}
