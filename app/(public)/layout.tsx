import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-950">
      <a
        href="#konten-utama"
        className="sr-only z-50 rounded-md bg-emerald-950 px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Lewati ke konten utama
      </a>
      <PublicHeader />
      <main id="konten-utama" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
