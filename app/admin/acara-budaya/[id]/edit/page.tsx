import Link from "next/link";
import { notFound } from "next/navigation";

import { CulturalEventForm } from "@/features/cultural-events/cultural-event-form";
import { getCulturalEventEditorData } from "@/features/cultural-events/data";
import {
  createCulturalEventInitialState,
  getCulturalEventStatusLabel,
  isValidCulturalEventId,
} from "@/features/cultural-events/model";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string | string[] }>;
};

export default async function EditCulturalEventPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  if (!isValidCulturalEventId(id)) notFound();

  const [result, query] = await Promise.all([
    getCulturalEventEditorData(id),
    searchParams,
  ]);
  if (result.kind === "invalid-id" || result.kind === "not-found") notFound();
  if (result.kind !== "ready") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Edit Acara Budaya
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          Acara budaya belum dapat dimuat. Kembali ke daftar lalu coba lagi.
        </div>
      </section>
    );
  }

  const success =
    query.success === "created"
      ? "Acara budaya berhasil dibuat sebagai draf."
      : query.success === "updated"
        ? "Perubahan acara budaya berhasil disimpan."
        : null;
  const hasThumbnail = Boolean(
    result.event.thumbnail_bucket && result.event.thumbnail_path,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/admin/acara-budaya"
              className="font-semibold text-emerald-800 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Acara Budaya
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Edit</li>
        </ol>
      </nav>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Edit acara
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {result.event.title}
          </h1>
        </div>
        <span className="inline-flex w-fit rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
          {getCulturalEventStatusLabel(result.event.status)}
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
      <CulturalEventForm
        currentStatus={result.event.status}
        eventId={result.event.id}
        hasThumbnail={hasThumbnail}
        initialState={createCulturalEventInitialState(result.event)}
        mode="update"
      />
    </section>
  );
}
