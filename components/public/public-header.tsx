import Image from "next/image";
import Link from "next/link";

import { SITE_CONFIG } from "@/config/site";
import { PUBLIC_NAVIGATION } from "@/config/public-navigation";

import { PublicContainer } from "./public-container";
import { PublicMobileNavigation } from "./public-mobile-navigation";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-stone-50/95 backdrop-blur">
      <PublicContainer className="relative flex min-h-20 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
          aria-label={`${SITE_CONFIG.name}, beranda`}
        >
          <Image
            src={SITE_CONFIG.temporaryLogoPath}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
          <span>
            <span className="block font-serif text-lg font-bold leading-tight text-emerald-950">
              {SITE_CONFIG.name}
            </span>
            <span className="mt-0.5 hidden text-xs font-semibold tracking-wide text-slate-500 sm:block">
              Desa Karang Bajo
            </span>
          </span>
        </Link>

        <nav aria-label="Navigasi publik utama" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PUBLIC_NAVIGATION.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.href === "/" ? "page" : undefined}
                  className="inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-bold text-slate-700 transition-colors hover:bg-emerald-100 hover:text-emerald-950 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <PublicMobileNavigation />
      </PublicContainer>
    </header>
  );
}
