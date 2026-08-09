import Link from "next/link";
import { notFound } from "next/navigation";

import { getDestinationTranslationAdminData } from "@/features/destination-translation/data";
import { DestinationTranslationForm } from "@/features/destination-translation/destination-translation-form";
import { createDestinationTranslationActionState } from "@/features/destination-translation/model";
import { getDestinationEditorData } from "@/features/destinations/data";
import { DestinationForm } from "@/features/destinations/destination-form";
import {
  createDestinationInitialState,
  getDestinationStatusLabel,
  isValidDestinationId,
} from "@/features/destinations/model";

type EditDestinationPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string | string[] }>;
};

export default async function EditDestinationPage({
  params,
  searchParams,
}: EditDestinationPageProps) {
  const { id } = await params;

  if (!isValidDestinationId(id)) {
    notFound();
  }

  const [result, translationResult, resolvedSearchParams] = await Promise.all([
    getDestinationEditorData(id),
    getDestinationTranslationAdminData(id),
    searchParams,
  ]);

  if (result.kind === "invalid-id" || result.kind === "not-found") {
    notFound();
  }

  if (result.kind !== "ready") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Edit Destinasi
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          {result.kind === "category-error"
            ? "Kategori destinasi belum dapat dimuat. Formulir dinonaktifkan agar perubahan tidak menggunakan kategori yang keliru."
            : "Destinasi belum dapat dimuat. Kembali ke daftar lalu coba lagi."}
        </div>
      </section>
    );
  }

  const successValue = resolvedSearchParams.success;
  const successMessage =
    successValue === "created"
      ? "Destinasi berhasil dibuat sebagai draf."
      : successValue === "updated"
        ? "Perubahan destinasi berhasil disimpan."
        : null;
  const hasThumbnail = Boolean(
    result.destination.thumbnail_bucket && result.destination.thumbnail_path,
  );

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
          <li aria-current="page">Edit</li>
        </ol>
      </nav>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Edit destinasi
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {result.destination.name}
          </h1>
        </div>
        <span className="inline-flex w-fit rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
          {getDestinationStatusLabel(result.destination.status)}
        </span>
      </div>

      {successMessage ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          {successMessage}
        </div>
      ) : null}

      <DestinationForm
        categories={result.categories}
        currentStatus={result.destination.status}
        destinationId={result.destination.id}
        hasThumbnail={hasThumbnail}
        initialState={createDestinationInitialState(result.destination)}
        mode="update"
      />

      {translationResult.success ? (
        <DestinationTranslationForm
          key={`${translationResult.source.updated_at}:${translationResult.translation?.edit_revision ?? "none"}:${translationResult.publicEligibility}`}
          initialState={createDestinationTranslationActionState(
            translationResult.source,
            translationResult.translation,
            translationResult.publicEligibility,
            translationResult.history,
          )}
          sourceReference={translationResult.source}
        />
      ) : (
        <section className="mt-10 border-t border-slate-200 pt-8">
          <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
            English translation
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Terjemahan Destinasi
          </h2>
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            Terjemahan destinasi belum dapat dimuat. Tidak ada perubahan
            terjemahan yang dapat dilakukan sampai data admin tersedia.
          </div>
        </section>
      )}
    </section>
  );
}
