import Link from "next/link";
import { notFound } from "next/navigation";

import { CulturalEventForm } from "@/features/cultural-events/cultural-event-form";
import { getCulturalEventEditorData } from "@/features/cultural-events/data";
import {
  createCulturalEventInitialState,
  getCulturalEventStatusLabel,
  isValidCulturalEventId,
} from "@/features/cultural-events/model";
import { getCulturalEventTranslationAdminData } from "@/features/cultural-event-translation/data";
import { CulturalEventTranslationForm } from "@/features/cultural-event-translation/cultural-event-translation-form";
import { createCulturalEventTranslationActionState } from "@/features/cultural-event-translation/model";
import { getCulturalEventImageTranslationAdminData } from "@/features/cultural-event-image-translation/data";
import { CulturalEventImageTranslationForm } from "@/features/cultural-event-image-translation/cultural-event-image-translation-form";
import { createCulturalEventImageTranslationActionState } from "@/features/cultural-event-image-translation/model";

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

  const [result, translationResult, imageTranslationResult, query] =
    await Promise.all([
      getCulturalEventEditorData(id),
      getCulturalEventTranslationAdminData(id),
      getCulturalEventImageTranslationAdminData(id),
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

      {translationResult.success ? (
        <CulturalEventTranslationForm
          key={`${translationResult.source.updated_at}:${translationResult.translation?.edit_revision ?? "none"}:${translationResult.translation?.lifecycle_state ?? "draft"}`}
          initialState={createCulturalEventTranslationActionState(
            translationResult.source,
            translationResult.translation,
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
            Cultural Event English Translation
          </h2>
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            Terjemahan acara budaya belum dapat dimuat. Tidak ada perubahan
            terjemahan yang dapat dilakukan sampai data admin tersedia.
          </div>
        </section>
      )}

      {imageTranslationResult.success ? (
        <>
          <section className="mt-10 border-t border-slate-200 pt-8">
            <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
              English image translations
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Cultural Event Image Translations
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Kelola alt text dan caption Inggris untuk setiap gambar sumber.
              Media Indonesia tetap read-only; lifecycle dan kelayakan publik
              berasal dari database.
            </p>
          </section>

          {imageTranslationResult.images.length > 0 ? (
            imageTranslationResult.images.map((image) => (
              <CulturalEventImageTranslationForm
                key={`${image.source.id}:${image.translation?.edit_revision ?? "none"}:${image.translation?.lifecycle_state ?? "draft"}`}
                culturalEventId={imageTranslationResult.culturalEventId}
                sourceContext={imageTranslationResult.sourceContext}
                initialState={createCulturalEventImageTranslationActionState(
                  image.source,
                  image.translation,
                  image.history,
                  { sourceStatus: image.sourceStatus },
                )}
                sourceReference={image.source}
              />
            ))
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
              <p className="font-semibold text-slate-900">
                Belum ada gambar acara budaya.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Tambahkan media sumber terlebih dahulu sebelum mengelola
                terjemahan gambar.
              </p>
            </div>
          )}
        </>
      ) : (
        <section className="mt-10 border-t border-slate-200 pt-8">
          <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
            English image translations
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Cultural Event Image Translations
          </h2>
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            Terjemahan gambar acara budaya belum dapat dimuat. Tidak ada
            perubahan terjemahan gambar yang dapat dilakukan sampai data admin
            tersedia.
          </div>
        </section>
      )}
    </section>
  );
}
