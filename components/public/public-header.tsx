import Image from "next/image";
import Link from "next/link";

import { SITE_CONFIG } from "@/config/site";

import { PublicContainer } from "./public-container";
import { PublicMobileNavigation } from "./public-mobile-navigation";
import { PublicNavigationLinks } from "./public-navigation-links";

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

        <PublicNavigationLinks />

        <PublicMobileNavigation />
      </PublicContainer>
    </header>
  );
}
