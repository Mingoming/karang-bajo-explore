import Link from "next/link";

import { getAdministratorUmkmList } from "@/features/umkm/data";
import { UmkmList } from "@/features/umkm/umkm-list";

export default async function UmkmAdminPage() {
  const result = await getAdministratorUmkmList();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Pengelolaan usaha lokal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            UMKM
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Kelola identitas usaha, kategori, lokasi, kontak berpersetujuan, dan
            status publikasi tanpa inventaris, pemesanan, atau pembayaran.
          </p>
        </div>
        <Link
          href="/admin/umkm/tambah"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Tambah UMKM
        </Link>
      </div>

      {!result.success ? (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          Daftar UMKM belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.
        </div>
      ) : result.umkms.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <h2 className="text-lg font-bold text-slate-950">Belum ada UMKM</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Buat UMKM pertama sebagai draf untuk mulai mengelola informasi usaha
            lokal.
          </p>
        </div>
      ) : (
        <UmkmList umkms={result.umkms} />
      )}
    </section>
  );
}
