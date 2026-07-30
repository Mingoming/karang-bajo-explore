"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  isPublicNavigationItemActive,
  PUBLIC_NAVIGATION,
} from "@/config/public-navigation";

export function PublicNavigationLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi publik utama" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {PUBLIC_NAVIGATION.map((item) => {
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
