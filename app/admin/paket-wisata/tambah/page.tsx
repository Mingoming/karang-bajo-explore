import Link from "next/link";
import { getTourismPackageCreateData } from "@/features/tourism-packages/data";
import { TourismPackageForm } from "@/features/tourism-packages/tourism-package-form";
import { createTourismPackageInitialState } from "@/features/tourism-packages/model";

export default async function AddTourismPackagePage() {
  const result = await getTourismPackageCreateData();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <Link
          href="/admin/paket-wisata"
          className="font-semibold text-emerald-800"
        >
          Paket Wisata
        </Link>{" "}
        / <span aria-current="page">Tambah</span>
      </nav>
      <p className="mt-6 text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Paket baru
      </p>
      <h1 className="mt-2 text-3xl font-bold">Tambah Paket Wisata</h1>
      <p className="mt-3 text-slate-600">
        Paket baru selalu disimpan sebagai draf. Media, peta, pemesanan, dan
        pembayaran tidak termasuk formulir ini.
      </p>
      {result.success ? (
        <TourismPackageForm
          currentStatus={null}
          hasThumbnail={false}
          initialState={createTourismPackageInitialState(null)}
          mode="create"
          options={result.options}
        />
      ) : (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900"
        >
          Pilihan destinasi belum dapat dimuat. Muat ulang halaman sebelum
          membuat paket.
        </div>
      )}
    </section>
  );
}
