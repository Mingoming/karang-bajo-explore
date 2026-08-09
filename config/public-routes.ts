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

export function getPublicEnglishDestinationPath(slug: string): PublicRoutePath {
  return `${PUBLIC_ENGLISH_DESTINATIONS_PATH}/${encodeURIComponent(slug)}` as PublicRoutePath;
}

export const PUBLIC_ROUTE_MANIFEST: Readonly<
  Record<PublicRouteKey, Readonly<Record<PublicLocale, PublicRoutePath | null>>>
> = {
  home: { id: "/", en: "/en" },
  profile: { id: "/profil-desa", en: "/en/village-profile" },
  destinations: { id: "/destinasi", en: PUBLIC_ENGLISH_DESTINATIONS_PATH },
  tourismPackages: { id: "/paket-wisata", en: null },
  homestays: { id: "/homestay", en: null },
  umkm: { id: "/umkm", en: null },
  traditionalHouses: { id: "/rumah-adat", en: null },
  culturalEvents: { id: "/acara-budaya", en: null },
  tourismMap: { id: "/peta-wisata", en: null },
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
