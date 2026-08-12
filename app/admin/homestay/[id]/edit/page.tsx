import Link from "next/link";
import { notFound } from "next/navigation";

import { getHomestayEditorData } from "@/features/homestays/data";
import { HomestayForm } from "@/features/homestays/homestay-form";
import { getHomestayTranslationAdminData } from "@/features/homestay-translation/data";
import { HomestayTranslationForm } from "@/features/homestay-translation/homestay-translation-form";
import { createHomestayTranslationActionState } from "@/features/homestay-translation/model";
import { getHomestayImageTranslationAdminData } from "@/features/homestay-image-translation/data";
import { HomestayImageTranslationForm } from "@/features/homestay-image-translation/homestay-image-translation-form";
import { createHomestayImageTranslationActionState } from "@/features/homestay-image-translation/model";
import {
  createHomestayInitialState,
  getHomestayStatusLabel,
  isValidHomestayId,
} from "@/features/homestays/model";

type EditHomestayPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string | string[] }>;
};

export default async function EditHomestayPage({
  params,
  searchParams,
}: EditHomestayPageProps) {
  const { id } = await params;

  if (!isValidHomestayId(id)) {
    notFound();
  }

  const [
    result,
    translationResult,
    imageTranslationResult,
    resolvedSearchParams,
  ] = await Promise.all([
    getHomestayEditorData(id),
    getHomestayTranslationAdminData(id),
    getHomestayImageTranslationAdminData(id),
    searchParams,
  ]);

  if (result.kind === "invalid-id" || result.kind === "not-found") {
    notFound();
  }

  if (result.kind !== "ready") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Edit Homestay
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          Homestay belum dapat dimuat. Kembali ke daftar lalu coba lagi.
        </div>
      </section>
    );
  }

  const successValue = resolvedSearchParams.success;
  const successMessage =
    successValue === "created"
      ? "Homestay berhasil dibuat sebagai draf."
      : successValue === "updated"
        ? "Perubahan homestay berhasil disimpan."
        : null;
  const hasThumbnail = Boolean(
    result.homestay.thumbnail_bucket && result.homestay.thumbnail_path,
  );

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
          <li aria-current="page">Edit</li>
        </ol>
      </nav>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Edit homestay
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {result.homestay.name}
          </h1>
        </div>
        <span className="inline-flex w-fit rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
          {getHomestayStatusLabel(result.homestay.status)}
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

      <HomestayForm
        currentStatus={result.homestay.status}
        hasThumbnail={hasThumbnail}
        homestayId={result.homestay.id}
        initialState={createHomestayInitialState(result.homestay)}
        mode="update"
      />

      {translationResult.success ? (
        <HomestayTranslationForm
          key={`${translationResult.source.updated_at}:${translationResult.translation?.edit_revision ?? "none"}:${translationResult.translation?.lifecycle_state ?? "draft"}`}
          initialState={createHomestayTranslationActionState(
            translationResult.source,
            translationResult.translation,
            translationResult.history,
          )}
          sourceReference={translationResult.source}
        />
      ) : (
        <section className="mt-10 border-t border-slate-200 pt-8">
          <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
            Terjemahan Inggris
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Terjemahan Inggris Homestay
          </h2>
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            Data terjemahan belum tersedia. Perubahan terjemahan tidak dapat
            dilakukan sampai pembacaan data administrator berhasil.
          </div>
        </section>
      )}

      {imageTranslationResult.success ? (
        <>
          <section className="mt-10 border-t border-slate-200 pt-8">
            <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
              Terjemahan gambar Inggris
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Terjemahan gambar Homestay
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Media sumber tetap hanya-baca. Alt text dan caption Inggris
              ditulis melalui alur RPC terjemahan; operasi Storage dan media
              umum tidak termasuk dalam formulir ini.
            </p>
          </section>
          {imageTranslationResult.images.length > 0 ? (
            imageTranslationResult.images.map((image) => (
              <HomestayImageTranslationForm
                key={`${image.source.id}:${image.translation?.edit_revision ?? "none"}:${image.translation?.lifecycle_state ?? "draft"}`}
                homestayId={imageTranslationResult.homestayId}
                initialState={createHomestayImageTranslationActionState(
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
                Belum ada gambar sumber.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Tambahkan media sumber sebelum mengelola terjemahan gambar
                Inggris.
              </p>
            </div>
          )}
        </>
      ) : (
        <section className="mt-10 border-t border-slate-200 pt-8">
          <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
            Terjemahan gambar Inggris
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Terjemahan gambar Homestay
          </h2>
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            Data terjemahan gambar belum tersedia. Perubahan terjemahan gambar
            tidak dapat dilakukan sampai pembacaan data administrator berhasil.
          </div>
        </section>
      )}
    </section>
  );
}
