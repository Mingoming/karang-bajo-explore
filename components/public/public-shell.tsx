import type { ReactNode } from "react";

import type { EnglishPublicShellDataResult } from "@/features/official-contact/public-shell-data";
import { getPublicDictionary } from "@/lib/i18n/dictionaries";
import type { PublicLocale } from "@/lib/i18n/locale";

import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";

export function PublicShell({
  locale,
  children,
  englishContactData,
}: Readonly<{
  locale: PublicLocale;
  children: ReactNode;
  englishContactData?: EnglishPublicShellDataResult;
}>) {
  const dictionary = getPublicDictionary(locale);
  const mainContentId = locale === "id" ? "konten-utama" : "main-content";

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-stone-50 text-slate-950">
      <a
        href={`#${mainContentId}`}
        className="sr-only z-50 rounded-md bg-emerald-950 px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {dictionary.shell.skipLink}
      </a>
      <PublicHeader locale={locale} dictionary={dictionary} />
      <main
        id={mainContentId}
        tabIndex={-1}
        className="min-h-screen min-w-0 flex-1"
      >
        {children}
      </main>
      <PublicFooter
        locale={locale}
        dictionary={dictionary}
        englishContactData={englishContactData}
      />
    </div>
  );
}
