import Link from "next/link";

import { getDestinationCreateData } from "@/features/destinations/data";
import { DestinationForm } from "@/features/destinations/destination-form";
import { createDestinationInitialState } from "@/features/destinations/model";

export default async function AddDestinationPage() {
  const categoryResult = await getDestinationCreateData();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/admin/destinasi"
              className="font-semibold text-emerald-800 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Destinasi
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Tambah</li>
        </ol>
      </nav>

      <p className="mt-6 text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Destinasi baru
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Tambah Destinasi
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Destinasi baru selalu disimpan sebagai draf. Semua kolom wajib skema
        harus lengkap sebelum penyimpanan pertama.
      </p>

      {!categoryResult.success || categoryResult.categories.length === 0 ? (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          Kategori destinasi belum dapat dimuat. Formulir tidak tersedia agar
          data tidak tersimpan dengan kategori yang keliru.
        </div>
      ) : (
        <DestinationForm
          categories={categoryResult.categories}
          currentStatus={null}
          hasThumbnail={false}
          initialState={createDestinationInitialState(null)}
          mode="create"
        />
      )}
    </section>
  );
}
