import Link from "next/link";

import { HomestayForm } from "@/features/homestays/homestay-form";
import { createHomestayInitialState } from "@/features/homestays/model";
import { requireAdministrator } from "@/lib/auth/admin";

export default async function AddHomestayPage() {
  await requireAdministrator();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/admin/homestay"
              className="font-semibold text-emerald-800 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Homestay
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Tambah</li>
        </ol>
      </nav>

      <p className="mt-6 text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Homestay baru
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Tambah Homestay
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Homestay baru selalu disimpan sebagai draf. Media, ketersediaan kamar,
        dan pemesanan tidak termasuk formulir ini.
      </p>

      <HomestayForm
        currentStatus={null}
        hasThumbnail={false}
        initialState={createHomestayInitialState(null)}
        mode="create"
      />
    </section>
  );
}
