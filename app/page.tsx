import Image from "next/image";

import { SITE_CONFIG } from "@/config/site";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <Image
          className="mb-8 h-32 w-32 object-contain sm:h-36 sm:w-36"
          src={SITE_CONFIG.temporaryLogoPath}
          alt="Logo sementara KKN Desa Karang Bajo"
          width={144}
          height={144}
          priority
        />
        <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-emerald-800 uppercase">
          Fondasi Aplikasi
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          {SITE_CONFIG.name}
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          {SITE_CONFIG.tagline}
        </p>
        <p className="mt-8 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-500">
          Situs sedang berada pada tahap penyiapan fondasi.
        </p>
      </div>
    </main>
  );
}
