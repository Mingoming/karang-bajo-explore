import Link from "next/link";
import { notFound } from "next/navigation";

import { getTraditionalHouseEditorData } from "@/features/traditional-houses/data";
import { TraditionalHouseForm } from "@/features/traditional-houses/traditional-house-form";
import {
  createTraditionalHouseInitialState,
  getTraditionalHouseStatusLabel,
  isValidTraditionalHouseId,
} from "@/features/traditional-houses/model";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string | string[] }>;
};

export default async function EditTraditionalHousePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  if (!isValidTraditionalHouseId(id)) notFound();

  const [result, query] = await Promise.all([
    getTraditionalHouseEditorData(id),
    searchParams,
  ]);
  if (result.kind === "invalid-id" || result.kind === "not-found") notFound();
  if (result.kind !== "ready") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Edit Rumah Adat
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          Rumah adat belum dapat dimuat. Kembali ke daftar lalu coba lagi.
        </div>
      </section>
    );
  }

  const success =
    query.success === "created"
      ? "Rumah adat berhasil dibuat sebagai draf."
      : query.success === "updated"
        ? "Perubahan rumah adat berhasil disimpan."
        : null;
  const hasThumbnail = Boolean(
    result.house.thumbnail_bucket && result.house.thumbnail_path,
  );

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
          <li aria-current="page">Edit</li>
        </ol>
      </nav>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Edit rumah adat
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {result.house.name}
          </h1>
        </div>
        <span className="inline-flex w-fit rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
          {getTraditionalHouseStatusLabel(result.house.status)}
        </span>
      </div>
      {success ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          {success}
        </div>
      ) : null}
      <TraditionalHouseForm
        currentStatus={result.house.status}
        hasThumbnail={hasThumbnail}
        houseId={result.house.id}
        initialState={createTraditionalHouseInitialState(result.house)}
        mode="update"
      />
    </section>
  );
}
