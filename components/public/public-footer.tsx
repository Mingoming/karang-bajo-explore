import Link from "next/link";

import { getPublicNavigation } from "@/config/public-navigation";
import { SITE_CONFIG } from "@/config/site";
import { getPublicOfficialContacts } from "@/features/official-contact/data";
import { selectPublicFooterContactAction } from "@/features/official-contact/model";
import type { EnglishPublicShellDataResult } from "@/features/official-contact/public-shell-data";
import type { PublicDictionary } from "@/lib/i18n/dictionaries";
import type { PublicLocale } from "@/lib/i18n/locale";

import { PublicContainer } from "./public-container";

export async function PublicFooter({
  locale,
  dictionary,
  englishContactData,
}: Readonly<{
  locale: PublicLocale;
  dictionary: PublicDictionary;
  englishContactData?: EnglishPublicShellDataResult;
}>) {
  const year = new Date().getFullYear();
  const navigation = getPublicNavigation(locale, dictionary);
  const contactAction =
    locale === "id"
      ? selectPublicFooterContactAction(await getPublicOfficialContacts())
      : englishContactData?.kind === "ready" &&
          englishContactData.data.whatsappHref
        ? {
            kind: "whatsapp" as const,
            href: englishContactData.data.whatsappHref,
          }
        : { kind: "unavailable" as const };

  return (
    <footer className="border-t border-white/10 bg-slate-950 py-12 text-slate-200">
      <PublicContainer className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-serif text-2xl font-bold text-white">
            {SITE_CONFIG.name}
          </p>
          <p className="mt-3 max-w-md leading-7 text-slate-400">
            {dictionary.footer.description}
          </p>
        </div>
        <nav aria-label={dictionary.navigation.label}>
          <p className="font-bold text-white">
            {dictionary.footer.navigationHeading}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-sm text-slate-400 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="font-bold text-white">
            {dictionary.footer.informationHeading}
          </p>
          {contactAction.kind === "whatsapp" ? (
            <a
              href={contactAction.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-200 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
            >
              {dictionary.footer.whatsapp}
            </a>
          ) : contactAction.kind === "contact-page" ? (
            <Link
              href="/kontak"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-slate-300 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
            >
              {dictionary.footer.contact}
            </Link>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-400">
              {dictionary.footer.unavailable}
            </p>
          )}
        </div>
      </PublicContainer>
      <PublicContainer className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
        <p>
          © {year} {SITE_CONFIG.name}. {dictionary.footer.copyright}
        </p>
      </PublicContainer>
    </footer>
  );
}
