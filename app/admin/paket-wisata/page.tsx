import Link from "next/link";
import { getAdministratorTourismPackageList } from "@/features/tourism-packages/data";
import { TourismPackageList } from "@/features/tourism-packages/tourism-package-list";

export default async function TourismPackagesPage() {
  const result = await getAdministratorTourismPackageList();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Pengelolaan paket
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Paket Wisata
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Kelola informasi paket serta urutan destinasi tanpa pemesanan,
            pembayaran, atau itinerary terstruktur.
          </p>
        </div>
        <Link
          href="/admin/paket-wisata/tambah"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 font-semibold text-white"
        >
          Tambah Paket Wisata
        </Link>
      </div>
      {!result.success ? (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          Daftar paket wisata belum dapat dimuat. Muat ulang halaman untuk
          mencoba lagi.
        </div>
      ) : result.packages.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <h2 className="text-lg font-bold">Belum ada paket wisata</h2>
          <p className="mt-2 text-sm text-slate-600">
            Buat paket pertama sebagai draf dan susun destinasi yang sudah
            tersedia.
          </p>
        </div>
      ) : (
        <TourismPackageList packages={result.packages} />
      )}
    </section>
  );
}
