"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { PUBLIC_NAVIGATION } from "@/config/public-navigation";

export function PublicMobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label={isOpen ? "Tutup navigasi" : "Buka navigasi"}
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
            <p className="font-serif text-lg font-bold">Menu jelajah</p>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              className="min-h-11 rounded-full px-4 text-sm font-bold text-emerald-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Tutup
            </button>
          </div>
          <nav aria-label="Navigasi publik mobile">
            <ul className="grid gap-1">
              {PUBLIC_NAVIGATION.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-12 items-center rounded-lg px-3 py-2 font-semibold text-slate-800 hover:bg-emerald-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
