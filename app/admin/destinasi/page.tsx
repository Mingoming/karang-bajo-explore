import Link from "next/link";

import { getAdministratorDestinationList } from "@/features/destinations/data";
import { DestinationList } from "@/features/destinations/destination-list";

type DestinationsAdminPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function DestinationsAdminPage({
  searchParams,
}: DestinationsAdminPageProps) {
  const rawSearchTerm = (await searchParams).q;
  const searchTerm =
    typeof rawSearchTerm === "string" ? rawSearchTerm.trim() : "";
  const result = await getAdministratorDestinationList(searchTerm);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Pengelolaan konten
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Destinasi
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Kelola informasi, kategori tetap, urutan, dan status publikasi
            destinasi wisata.
          </p>
        </div>
        <Link
          href="/admin/destinasi/tambah"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Tambah destinasi
        </Link>
      </div>

      <form method="get" className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
          <label htmlFor="destination-search" className="sr-only">
            Cari destinasi berdasarkan nama
          </label>
          <input
            id="destination-search"
            name="q"
            type="search"
            defaultValue={searchTerm}
            placeholder="Cari nama destinasi"
            className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 bg-white px-5 py-2.5 font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Cari
        </button>
        {searchTerm ? (
          <Link
            href="/admin/destinasi"
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Hapus pencarian
          </Link>
        ) : null}
      </form>

      {!result.success ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          Daftar destinasi belum dapat dimuat. Muat ulang halaman untuk mencoba
          lagi.
        </div>
      ) : result.destinations.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <h2 className="text-lg font-bold text-slate-950">
            {searchTerm ? "Destinasi tidak ditemukan" : "Belum ada destinasi"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            {searchTerm
              ? `Tidak ada destinasi dengan nama yang memuat “${searchTerm}”.`
              : "Buat destinasi pertama untuk mulai mengelola informasi wisata."}
          </p>
        </div>
      ) : (
        <DestinationList destinations={result.destinations} />
      )}
    </section>
  );
}
