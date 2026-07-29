import Link from "next/link";

import { TraditionalHouseForm } from "@/features/traditional-houses/traditional-house-form";
import { createTraditionalHouseInitialState } from "@/features/traditional-houses/model";
import { requireAdministrator } from "@/lib/auth/admin";

export default async function AddTraditionalHousePage() {
  await requireAdministrator();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/admin/rumah-adat"
              className="font-semibold text-emerald-800 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Rumah Adat
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Tambah</li>
        </ol>
      </nav>
      <p className="mt-6 text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Rumah adat baru
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Tambah Rumah Adat
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Record baru selalu disimpan sebagai draf. Media, galeri, peta
        interaktif, pemesanan, dan pembayaran tidak termasuk formulir ini.
      </p>
      <TraditionalHouseForm
        currentStatus={null}
        hasThumbnail={false}
        initialState={createTraditionalHouseInitialState(null)}
        mode="create"
      />
    </section>
  );
}
