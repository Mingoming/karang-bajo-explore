"use client";

import { usePathname } from "next/navigation";

import { getEquivalentPublicRoute } from "@/config/public-routes";
import type { PublicDictionary } from "@/lib/i18n/dictionaries";
import type { PublicLocale } from "@/lib/i18n/locale";

export function LanguageSwitcher({
  locale,
  dictionary,
  onNavigate,
}: Readonly<{
  locale: PublicLocale;
  dictionary: PublicDictionary;
  onNavigate?: () => void;
}>) {
  const pathname = usePathname();
  const equivalent = getEquivalentPublicRoute(pathname, locale);

  if (!equivalent) return null;

  const targetLocale: PublicLocale = locale === "id" ? "en" : "id";

  return (
    <nav aria-label={dictionary.languageSwitcher.label}>
      <ul className="flex items-center gap-1 rounded-full border border-emerald-900/15 bg-white p-1 text-xs font-bold text-emerald-950">
        <li>
          <span
            aria-current="page"
            className="inline-flex min-h-9 items-center rounded-full bg-emerald-100 px-3"
          >
            <span className="sr-only">
              {dictionary.languageSwitcher.current}: {" "}
            </span>
            {dictionary.languageSwitcher[locale]}
          </span>
        </li>
        <li>
          <a
            href={equivalent}
            hrefLang={targetLocale}
            lang={targetLocale}
            onClick={onNavigate}
            className="inline-flex min-h-9 items-center rounded-full px-3 hover:bg-emerald-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            {dictionary.languageSwitcher[targetLocale]}
          </a>
        </li>
      </ul>
    </nav>
  );
}
