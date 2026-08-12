import Link from "next/link";

import type { PublicDictionary } from "@/lib/i18n/dictionaries";
import type { PublicLocale } from "@/lib/i18n/locale";
import {
  PUBLIC_ENGLISH_DESTINATIONS_PATH,
  PUBLIC_ENGLISH_VILLAGE_PROFILE_PATH,
} from "@/config/public-routes";

import { PublicContainer } from "./public-container";

export function PublicHero({
  locale,
  dictionary,
  primaryHref: primaryHrefOverride,
  secondaryHref: secondaryHrefOverride,
}: Readonly<{
  locale: PublicLocale;
  dictionary: PublicDictionary;
  primaryHref?: string;
  secondaryHref?: string;
}>) {
  const primaryHref =
    primaryHrefOverride ??
    (locale === "id" ? "/#destinasi" : PUBLIC_ENGLISH_DESTINATIONS_PATH);
  const secondaryHref =
    secondaryHrefOverride ??
    (locale === "id" ? "/#profil-desa" : PUBLIC_ENGLISH_VILLAGE_PROFILE_PATH);

  return (
    <section className="relative isolate overflow-hidden bg-emerald-950 py-20 text-white sm:py-28 lg:py-32">
      <div
        className="absolute inset-0 -z-10 opacity-40"
        aria-hidden="true"
      >
        <div className="absolute -top-32 right-[-8rem] h-96 w-96 rounded-full bg-emerald-600 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-[-6rem] h-96 w-96 rounded-full bg-amber-400/40 blur-3xl" />
      </div>
      <PublicContainer>
        <div className="max-w-4xl">
          <p className="text-sm font-bold tracking-[0.2em] text-amber-300 uppercase">
            {dictionary.home.hero.eyebrow}
          </p>
          <h1 className="mt-5 break-words font-serif text-4xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {dictionary.home.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/85 sm:text-xl">
            {dictionary.home.hero.description}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber-300 px-6 py-3 font-bold text-emerald-950 transition-colors hover:bg-amber-200 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-amber-200 motion-reduce:transition-none"
            >
              {dictionary.home.hero.primaryAction}
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-6 py-3 font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              {dictionary.home.hero.secondaryAction}
            </Link>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
