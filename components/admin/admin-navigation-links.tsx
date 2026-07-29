"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ADMIN_NAVIGATION,
  isAdminNavigationItemActive,
} from "@/config/admin-navigation";

type AdminNavigationLinksProps = Readonly<{
  label: string;
  onNavigate?: () => void;
}>;

export function AdminNavigationLinks({
  label,
  onNavigate,
}: AdminNavigationLinksProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="space-y-1">
        {ADMIN_NAVIGATION.map((item) => {
          const isActive = isAdminNavigationItemActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={onNavigate}
                className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 motion-reduce:transition-none ${
                  isActive
                    ? "bg-emerald-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
