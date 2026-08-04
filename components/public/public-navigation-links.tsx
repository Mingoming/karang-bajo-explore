"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getPublicNavigation,
  isPublicNavigationItemActive,
} from "@/config/public-navigation";
import type { PublicDictionary } from "@/lib/i18n/dictionaries";
import type { PublicLocale } from "@/lib/i18n/locale";

export function PublicNavigationLinks({
  locale,
  dictionary,
}: Readonly<{ locale: PublicLocale; dictionary: PublicDictionary }>) {
  const pathname = usePathname();
  const navigation = getPublicNavigation(locale, dictionary);

  return (
    <nav aria-label={dictionary.navigation.label}>
      <ul className="flex items-center gap-1">
        {navigation.map((item) => {
          const active = isPublicNavigationItemActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none ${
                  active
                    ? "bg-emerald-100 text-emerald-950"
                    : "text-slate-700 hover:bg-emerald-100 hover:text-emerald-950"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
