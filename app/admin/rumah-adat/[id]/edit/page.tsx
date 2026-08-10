import Link from "next/link";
import { notFound } from "next/navigation";

import { getTraditionalHouseEditorData } from "@/features/traditional-houses/data";
import { TraditionalHouseForm } from "@/features/traditional-houses/traditional-house-form";
import { getTraditionalHouseTranslationAdminData } from "@/features/traditional-house-translation/data";
import { TraditionalHouseTranslationForm } from "@/features/traditional-house-translation/traditional-house-translation-form";
import { createTraditionalHouseTranslationActionState } from "@/features/traditional-house-translation/model";
import { getTraditionalHouseImageTranslationAdminData } from "@/features/traditional-house-image-translation/data";
import { TraditionalHouseImageTranslationForm } from "@/features/traditional-house-image-translation/traditional-house-image-translation-form";
import { createTraditionalHouseImageTranslationActionState } from "@/features/traditional-house-image-translation/model";
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

  const [result, translationResult, imageTranslationResult, query] =
    await Promise.all([
      getTraditionalHouseEditorData(id),
      getTraditionalHouseTranslationAdminData(id),
      getTraditionalHouseImageTranslationAdminData(id),
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

      {translationResult.success ? (
        <TraditionalHouseTranslationForm
          key={`${translationResult.source.updated_at}:${translationResult.translation?.edit_revision ?? "none"}:${translationResult.translation?.lifecycle_state ?? "draft"}`}
          initialState={createTraditionalHouseTranslationActionState(
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
            Terjemahan Rumah Adat
          </h2>
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            Terjemahan rumah adat belum dapat dimuat. Tidak ada perubahan
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
              Terjemahan Gambar Rumah Adat
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Kelola alt text dan caption Inggris untuk setiap gambar sumber.
              Media Indonesia tetap read-only; lifecycle dan kelayakan publik
              berasal dari database.
            </p>
          </section>

          {imageTranslationResult.images.length > 0 ? (
            imageTranslationResult.images.map((image) => (
              <TraditionalHouseImageTranslationForm
                key={`${image.source.id}:${image.translation?.edit_revision ?? "none"}:${image.translation?.lifecycle_state ?? "draft"}`}
                traditionalHouseId={imageTranslationResult.traditionalHouseId}
                initialState={createTraditionalHouseImageTranslationActionState(
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
                Belum ada gambar rumah adat.
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
            Terjemahan Gambar Rumah Adat
          </h2>
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            Terjemahan gambar rumah adat belum dapat dimuat. Tidak ada perubahan
            terjemahan gambar yang dapat dilakukan sampai data admin tersedia.
          </div>
        </section>
      )}
    </section>
  );
}
