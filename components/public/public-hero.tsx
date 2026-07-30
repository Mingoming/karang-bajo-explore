import Link from "next/link";

import { PublicContainer } from "./public-container";

export function PublicHero() {
  return (
    <section className="relative isolate overflow-hidden bg-emerald-950 py-20 text-white sm:py-28 lg:py-32">
      <div
        className="absolute inset-0 -z-10 opacity-40"
        aria-hidden="true"
      >
        <div className="absolute -top-32 right-[-8rem] h-96 w-96 rounded-full bg-emerald-600 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-[-6rem] h-96 w-96 rounded-full bg-amber-400/40 blur-3xl" />
      </div>
      <PublicContainer>
        <div className="max-w-4xl">
          <p className="text-sm font-bold tracking-[0.2em] text-amber-300 uppercase">
            Desa Karang Bajo
          </p>
          <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Jelajahi Alam, Budaya, dan Tradisi
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/85 sm:text-xl">
            Fondasi informasi pariwisata yang menghimpun konten terbit dan
            terverifikasi tentang Desa Karang Bajo.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#destinasi"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber-300 px-6 py-3 font-bold text-emerald-950 transition-colors hover:bg-amber-200 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-amber-200 motion-reduce:transition-none"
            >
              Jelajahi destinasi
            </Link>
            <Link
              href="/#profil-desa"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-6 py-3 font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Mengenal desa
            </Link>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
