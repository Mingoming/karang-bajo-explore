"use client";

import Image from "next/image";
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
  const currentLabel = dictionary.languageSwitcher[locale];
  const targetLabel = dictionary.languageSwitcher[targetLocale];
  const currentFlagSrc =
    locale === "id"
      ? "/icons/flags/indonesia.svg"
      : "/icons/flags/united-kingdom.svg";
  const targetFlagSrc =
    targetLocale === "id"
      ? "/icons/flags/indonesia.svg"
      : "/icons/flags/united-kingdom.svg";

  return (
    <nav
      aria-label={dictionary.languageSwitcher.label}
      className="shrink-0"
    >
      <ul className="flex items-center gap-1 rounded-full border border-emerald-900/15 bg-white p-1 text-base text-emerald-950">
        <li>
          <span
            aria-current="page"
            aria-label={currentLabel}
            title={`${currentLabel} (${dictionary.languageSwitcher.current})`}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full bg-emerald-100 px-2"
          >
            <Image
              src={currentFlagSrc}
              alt=""
              aria-hidden="true"
              width={24}
              height={16}
              className="h-4 w-6 shrink-0"
            />
          </span>
        </li>
        <li>
          <a
            href={equivalent}
            hrefLang={targetLocale}
            lang={targetLocale}
            aria-label={targetLabel}
            title={targetLabel}
            onClick={onNavigate}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-2 hover:bg-emerald-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            <Image
              src={targetFlagSrc}
              alt=""
              aria-hidden="true"
              width={24}
              height={16}
              className="h-4 w-6 shrink-0"
            />
          </a>
        </li>
      </ul>
    </nav>
  );
}
