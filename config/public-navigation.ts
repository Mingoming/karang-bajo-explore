export type PublicNavigationItem = Readonly<{
  label: string;
  href: `/${string}`;
}>;

export const PUBLIC_NAVIGATION: readonly PublicNavigationItem[] = [
  { label: "Beranda", href: "/" },
  { label: "Destinasi", href: "/destinasi" },
  { label: "Paket Wisata", href: "/#paket-wisata" },
  { label: "Homestay", href: "/#homestay" },
  { label: "UMKM", href: "/#umkm" },
  { label: "Budaya", href: "/#budaya" },
  { label: "Peta Wisata", href: "/#peta-wisata" },
] as const;

export function isPublicNavigationItemActive(pathname: string, href: string) {
  const route = href.split("#", 1)[0];
  if (route === "/") return pathname === "/" && href === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}
