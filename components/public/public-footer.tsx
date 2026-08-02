import Link from "next/link";

import { SITE_CONFIG } from "@/config/site";
import { PUBLIC_NAVIGATION } from "@/config/public-navigation";
import { getPublicOfficialContacts } from "@/features/official-contact/data";

import { PublicContainer } from "./public-container";

export async function PublicFooter() {
  const year = new Date().getFullYear();
  const contact = await getPublicOfficialContacts();
  if (contact.kind === "error") {
    throw new Error("PUBLIC_OFFICIAL_CONTACT_UNAVAILABLE");
  }

  return (
    <footer className="border-t border-white/10 bg-slate-950 py-12 text-slate-200">
      <PublicContainer className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-serif text-2xl font-bold text-white">
            {SITE_CONFIG.name}
          </p>
          <p className="mt-3 max-w-md leading-7 text-slate-400">
            Fondasi informasi pariwisata Desa Karang Bajo dalam bahasa
            Indonesia.
          </p>
        </div>
        <nav aria-label="Ringkasan navigasi publik">
          <p className="font-bold text-white">Jelajahi</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {PUBLIC_NAVIGATION.map((item) => (
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
          <p className="font-bold text-white">Informasi resmi</p>
          {contact.primaryWhatsapp ? (
            <a
              href={contact.primaryWhatsapp.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-200 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
            >
              WhatsApp Desa
            </a>
          ) : (
            <Link
              href="/kontak"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-slate-300 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
            >
              Lihat kontak resmi
            </Link>
          )}
        </div>
      </PublicContainer>
      <PublicContainer className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
        <p>© {year} {SITE_CONFIG.name}. Informasi Desa Karang Bajo.</p>
      </PublicContainer>
    </footer>
  );
}
