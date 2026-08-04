import Image from "next/image";
import Link from "next/link";

import { SITE_CONFIG } from "@/config/site";
import { getPublicRoute } from "@/config/public-routes";
import type { PublicDictionary } from "@/lib/i18n/dictionaries";
import type { PublicLocale } from "@/lib/i18n/locale";

import { LanguageSwitcher } from "./language-switcher";
import { PublicContainer } from "./public-container";
import { PublicMobileNavigation } from "./public-mobile-navigation";
import { PublicNavigationLinks } from "./public-navigation-links";

export function PublicHeader({
  locale,
  dictionary,
}: Readonly<{ locale: PublicLocale; dictionary: PublicDictionary }>) {
  const homeHref = getPublicRoute("home", locale) ?? "/";

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-stone-50/95 backdrop-blur">
      <PublicContainer className="relative flex min-h-20 items-center justify-between gap-3 sm:gap-6">
        <Link
          href={homeHref}
          className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700 sm:gap-3"
          aria-label={dictionary.shell.homeAriaLabel}
        >
          <Image
            src={SITE_CONFIG.temporaryLogoPath}
            alt=""
            width={48}
            height={48}
            className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
            priority
          />
          <span className="min-w-0">
            <span className="block truncate font-serif text-base font-bold leading-tight text-emerald-950 sm:text-lg">
              {SITE_CONFIG.name}
            </span>
            <span className="mt-0.5 hidden text-xs font-semibold tracking-wide text-slate-500 sm:block">
              {dictionary.shell.villageLabel}
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 xl:flex">
          <PublicNavigationLinks locale={locale} dictionary={dictionary} />
          <LanguageSwitcher locale={locale} dictionary={dictionary} />
        </div>

        <PublicMobileNavigation locale={locale} dictionary={dictionary} />
      </PublicContainer>
    </header>
  );
}
