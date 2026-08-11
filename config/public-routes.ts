import type { PublicLocale } from "../lib/i18n/locale.ts";

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

export const PUBLIC_ENGLISH_DESTINATIONS_PATH = "/en/destinations" as const;
export const PUBLIC_ENGLISH_DESTINATION_DETAIL_PATH =
  "/en/destinations/[slug]" as const;

export const PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH =
  "/en/traditional-houses" as const;
export const PUBLIC_ENGLISH_TRADITIONAL_HOUSE_DETAIL_PATH =
  "/en/traditional-houses/[slug]" as const;

export const PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH =
  "/en/cultural-events" as const;
export const PUBLIC_ENGLISH_CULTURAL_EVENT_DETAIL_PATH =
  "/en/cultural-events/[slug]" as const;

export const PUBLIC_ENGLISH_HOMESTAYS_PATH = "/en/homestays" as const;
export const PUBLIC_ENGLISH_HOMESTAY_DETAIL_PATH =
  "/en/homestays/[slug]" as const;
export const PUBLIC_ENGLISH_UMKMS_PATH = "/en/local-businesses" as const;
export const PUBLIC_ENGLISH_UMKM_DETAIL_PATH =
  "/en/local-businesses/[slug]" as const;
export const PUBLIC_ENGLISH_TOURISM_MAP_PATH = "/en/tourism-map" as const;

export function getPublicEnglishDestinationPath(slug: string): PublicRoutePath {
  return `${PUBLIC_ENGLISH_DESTINATIONS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
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

export function getPublicEnglishHomestayPath(slug: string): PublicRoutePath {
  return `${PUBLIC_ENGLISH_HOMESTAYS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export function getPublicEnglishUmkmPath(slug: string): PublicRoutePath {
  return `${PUBLIC_ENGLISH_UMKMS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export const PUBLIC_ROUTE_MANIFEST: Readonly<
  Record<PublicRouteKey, Readonly<Record<PublicLocale, PublicRoutePath | null>>>
> = {
  home: { id: "/", en: "/en" },
  profile: { id: "/profil-desa", en: "/en/village-profile" },
  destinations: { id: "/destinasi", en: PUBLIC_ENGLISH_DESTINATIONS_PATH },
  tourismPackages: { id: "/paket-wisata", en: null },
  homestays: { id: "/homestay", en: PUBLIC_ENGLISH_HOMESTAYS_PATH },
  umkm: { id: "/umkm", en: PUBLIC_ENGLISH_UMKMS_PATH },
  traditionalHouses: {
    id: "/rumah-adat",
    en: PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH,
  },
  culturalEvents: {
    id: "/acara-budaya",
    en: PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH,
  },
  tourismMap: { id: "/peta-wisata", en: PUBLIC_ENGLISH_TOURISM_MAP_PATH },
  contact: { id: "/kontak", en: null },
};

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

  return routeKey ? PUBLIC_ROUTE_MANIFEST[routeKey][targetLocale] : null;
}
