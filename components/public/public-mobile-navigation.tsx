"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  getPublicNavigation,
  isPublicNavigationItemActive,
} from "@/config/public-navigation";
import type { PublicDictionary } from "@/lib/i18n/dictionaries";
import type { PublicLocale } from "@/lib/i18n/locale";

import { LanguageSwitcher } from "./language-switcher";

export function PublicMobileNavigation({
  locale,
  dictionary,
}: Readonly<{ locale: PublicLocale; dictionary: PublicDictionary }>) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const navigation = getPublicNavigation(locale, dictionary);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <div className="shrink-0 xl:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label={
          isOpen ? dictionary.navigation.close : dictionary.navigation.open
        }
        aria-expanded={isOpen}
        aria-controls="navigasi-publik-mobile"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-emerald-950/15 text-emerald-950 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          {isOpen ? "×" : "☰"}
        </span>
      </button>
      {isOpen ? (
        <div
          id="navigasi-publik-mobile"
          className="absolute top-full right-0 left-0 border-t border-emerald-950/10 bg-stone-50 px-5 py-5 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="font-serif text-lg font-bold">
              {dictionary.navigation.mobileTitle}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              className="min-h-11 rounded-full px-4 text-sm font-bold text-emerald-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {dictionary.navigation.closeButton}
            </button>
          </div>
          <nav aria-label={dictionary.navigation.mobileLabel}>
            <ul className="grid gap-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={
                      isPublicNavigationItemActive(pathname, item.href)
                        ? "page"
                        : undefined
                    }
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-12 items-center rounded-lg px-3 py-2 font-semibold text-slate-800 hover:bg-emerald-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-4 border-t border-emerald-950/10 pt-4">
            <LanguageSwitcher
              locale={locale}
              dictionary={dictionary}
              onNavigate={() => setIsOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
