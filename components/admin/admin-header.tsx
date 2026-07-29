"use client";

import { useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AdminNavigationLinks } from "@/components/admin/admin-navigation-links";
import { getAdminPageTitle } from "@/config/admin-navigation";

type AdminHeaderProps = Readonly<{
  administratorEmail: string;
  mobileLogoutControl: ReactNode;
}>;

export function AdminHeader({
  administratorEmail,
  mobileLogoutControl,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pageTitle = getAdminPageTitle(pathname);

  function openMenu() {
    dialogRef.current?.showModal();
    setIsMenuOpen(true);
  }

  function closeMenu() {
    dialogRef.current?.close();
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          aria-label="Buka navigasi administrator"
          aria-controls="admin-mobile-navigation"
          aria-expanded={isMenuOpen}
          onClick={openMenu}
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white text-xl text-slate-800 hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 lg:hidden"
        >
          <span aria-hidden="true">☰</span>
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-emerald-800 uppercase">
            Administrator
          </p>
          <p className="truncate text-lg font-bold text-slate-950">
            {pageTitle}
          </p>
        </div>

        <div className="min-w-0 text-right">
          <p className="text-xs text-slate-500">Masuk sebagai</p>
          <p className="max-w-40 truncate text-sm font-semibold text-slate-800 sm:max-w-72">
            {administratorEmail}
          </p>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        id="admin-mobile-navigation"
        aria-labelledby="admin-mobile-navigation-title"
        onClose={() => setIsMenuOpen(false)}
        className="m-0 h-dvh max-h-none w-[min(20rem,calc(100vw-3rem))] max-w-none bg-slate-950 p-0 text-white backdrop:bg-slate-950/60 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-5">
            <div>
              <p
                id="admin-mobile-navigation-title"
                className="font-bold tracking-tight"
              >
                Karang Bajo Explore
              </p>
              <p className="mt-1 text-sm text-slate-400">Administrator</p>
            </div>
            <button
              type="button"
              aria-label="Tutup navigasi administrator"
              onClick={closeMenu}
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-xl hover:bg-slate-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <p className="border-b border-slate-800 px-5 py-4 text-sm break-all text-slate-300">
            {administratorEmail}
          </p>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <AdminNavigationLinks
              label="Navigasi administrator seluler"
              onNavigate={closeMenu}
            />
          </div>

          <div className="border-t border-slate-800 p-4">
            {mobileLogoutControl}
          </div>
        </div>
      </dialog>
    </header>
  );
}
