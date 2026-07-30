import Link from "next/link";

import { getAdministratorMediaOverview } from "@/features/media/data";
import { MediaList } from "@/features/media/media-list";

type Props = { searchParams: Promise<{ success?: string | string[] }> };

export default async function MediaAdminPage({ searchParams }: Props) {
  const [result, query] = await Promise.all([
    getAdministratorMediaOverview(),
    searchParams,
  ]);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Media federasi
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Media
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Kelola gambar yang dimiliki masing-masing konten. Bucket bersifat
            privat dan pratinjau administrator menggunakan tautan sementara.
          </p>
        </div>
        <Link
          href="/admin/media/tambah"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 font-semibold text-white"
        >
          Tambah Media
        </Link>
      </div>
      {query.success === "deleted" ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          Media berhasil dihapus dari metadata dan Storage.
        </div>
      ) : null}
      {!result.success ? (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900"
        >
          Daftar media belum dapat dimuat. Muat ulang halaman untuk mencoba
          lagi.
        </div>
      ) : result.parents.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <h2 className="text-lg font-bold">Belum ada konten induk</h2>
          <p className="mt-2 text-sm text-slate-600">
            Buat konten pada modul yang didukung sebelum menambahkan gambar.
          </p>
        </div>
      ) : (
        <MediaList parents={result.parents} />
      )}
    </section>
  );
}
