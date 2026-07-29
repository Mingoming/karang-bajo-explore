export type AdminNavigationItem = Readonly<{
  href: `/admin${string}`;
  label: string;
}>;

export const ADMIN_NAVIGATION = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/profil-desa", label: "Profil Desa" },
  { href: "/admin/destinasi", label: "Destinasi" },
  { href: "/admin/paket-wisata", label: "Paket Wisata" },
  { href: "/admin/homestay", label: "Homestay" },
  { href: "/admin/umkm", label: "UMKM" },
  { href: "/admin/rumah-adat", label: "Rumah Adat" },
  { href: "/admin/acara-budaya", label: "Acara Budaya" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/pengaturan", label: "Pengaturan" },
] as const satisfies readonly AdminNavigationItem[];

export function isAdminNavigationItemActive(
  pathname: string,
  href: AdminNavigationItem["href"],
) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getAdminPageTitle(pathname: string) {
  return (
    ADMIN_NAVIGATION.find(({ href }) =>
      isAdminNavigationItemActive(pathname, href),
    )?.label ?? "Administrator"
  );
}
