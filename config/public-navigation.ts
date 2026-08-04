import {
  PUBLIC_DICTIONARIES,
  type PublicDictionary,
} from "../lib/i18n/dictionaries.ts";
import type { PublicLocale } from "../lib/i18n/locale.ts";
import {
  PUBLIC_ROUTE_KEYS,
  PUBLIC_ROUTE_MANIFEST,
  type PublicRouteKey,
} from "./public-routes.ts";

export type PublicNavigationItem = Readonly<{
  key: PublicRouteKey;
  label: string;
  href: `/${string}`;
}>;

export function getPublicNavigation(
  locale: PublicLocale,
  dictionary: PublicDictionary,
): readonly PublicNavigationItem[] {
  return PUBLIC_ROUTE_KEYS.flatMap((key) => {
    const href = PUBLIC_ROUTE_MANIFEST[key][locale];
    return href ? [{ key, href, label: dictionary.navigation[key] }] : [];
  });
}

export const PUBLIC_NAVIGATION = getPublicNavigation(
  "id",
  PUBLIC_DICTIONARIES.id,
);

export function isPublicNavigationItemActive(pathname: string, href: string) {
  const route = href.split("#", 1)[0];
  if (route === "/") return pathname === "/" && href === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}
