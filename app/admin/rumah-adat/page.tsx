import Link from "next/link";

import { getAdministratorTraditionalHouseList } from "@/features/traditional-houses/data";
import { TraditionalHouseList } from "@/features/traditional-houses/traditional-house-list";

export default async function TraditionalHousesAdminPage() {
  const result = await getAdministratorTraditionalHouseList();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Dokumentasi budaya
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Rumah Adat
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Kelola identitas, sejarah terverifikasi, makna budaya, informasi
            kunjungan, lokasi, dan status publikasi rumah adat.
          </p>
        </div>
        <Link
          href="/admin/rumah-adat/tambah"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Tambah rumah adat
        </Link>
      </div>

      {!result.success ? (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          Daftar rumah adat belum dapat dimuat. Muat ulang halaman untuk mencoba
          lagi.
        </div>
      ) : result.houses.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <h2 className="text-lg font-bold text-slate-950">
            Belum ada rumah adat
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Buat record pertama sebagai draf tanpa mengarang fakta budaya atau
            sejarah.
          </p>
        </div>
      ) : (
        <TraditionalHouseList houses={result.houses} />
      )}
    </section>
  );
}
