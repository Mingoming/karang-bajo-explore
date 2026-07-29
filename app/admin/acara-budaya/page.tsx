import Link from "next/link";

import { CulturalEventList } from "@/features/cultural-events/cultural-event-list";
import { getAdministratorCulturalEventList } from "@/features/cultural-events/data";

export default async function CulturalEventsAdminPage() {
  const result = await getAdministratorCulturalEventList();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Kalender budaya
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Acara Budaya
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Kelola setiap kejadian acara secara terpisah, termasuk jadwal WITA,
            catatan tanggal yang belum pasti, lokasi, dan status publikasi.
          </p>
        </div>
        <Link
          href="/admin/acara-budaya/tambah"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Tambah acara budaya
        </Link>
      </div>
      {!result.success ? (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          Daftar acara budaya belum dapat dimuat. Muat ulang halaman untuk
          mencoba lagi.
        </div>
      ) : result.events.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <h2 className="text-lg font-bold text-slate-950">
            Belum ada acara budaya
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Buat kejadian acara pertama sebagai draf. Jangan mengarang tanggal
            atau informasi budaya.
          </p>
        </div>
      ) : (
        <CulturalEventList events={result.events} />
      )}
    </section>
  );
}
