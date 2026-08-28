import Link from "next/link";
import { notFound } from "next/navigation";
import { getTourismPackageEditorData } from "@/features/tourism-packages/data";
import { TourismPackageForm } from "@/features/tourism-packages/tourism-package-form";
import {
  createTourismPackageInitialState,
  getTourismPackageStatusLabel,
  isValidTourismPackageId,
} from "@/features/tourism-packages/model";
import { getTourismPackageTranslationAdminData } from "@/features/tourism-package-translation/data";
import { TourismPackageTranslationForm } from "@/features/tourism-package-translation/tourism-package-translation-form";
import { createTourismPackageTranslationActionState } from "@/features/tourism-package-translation/model";
import { getTourismPackageImageTranslationAdminData } from "@/features/tourism-package-image-translation/data";
import { TourismPackageImageTranslationForm } from "@/features/tourism-package-image-translation/tourism-package-image-translation-form";
import { createTourismPackageImageTranslationActionState } from "@/features/tourism-package-image-translation/model";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string | string[] }>;
};
export default async function EditTourismPackagePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  if (!isValidTourismPackageId(id)) notFound();
  const [result, translationResult, imageTranslationResult, query] =
    await Promise.all([
      getTourismPackageEditorData(id),
      getTourismPackageTranslationAdminData(id),
      getTourismPackageImageTranslationAdminData(id),
      searchParams,
    ]);
  if (result.kind === "invalid-id" || result.kind === "not-found") notFound();
  if (result.kind !== "ready")
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold">Edit Paket Wisata</h1>
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900"
        >
          Paket wisata belum dapat dimuat. Kembali ke daftar lalu coba lagi.
        </div>
      </section>
    );
  const success =
    query.success === "created"
      ? "Paket wisata berhasil dibuat sebagai draf."
      : query.success === "updated"
        ? "Perubahan paket wisata berhasil disimpan."
        : null;
  const hasThumbnail = Boolean(
    result.tourismPackage.thumbnail_bucket &&
    result.tourismPackage.thumbnail_path,
  );
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <Link
          href="/admin/paket-wisata"
          className="font-semibold text-emerald-800"
        >
          Paket Wisata
        </Link>{" "}
        / <span aria-current="page">Edit</span>
      </nav>
      <div className="mt-6 flex justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Edit paket
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {result.tourismPackage.name}
          </h1>
        </div>
        <span className="h-fit rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold">
          {getTourismPackageStatusLabel(result.tourismPackage.status)}
        </span>
      </div>
      {success ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-900"
        >
          {success}
        </div>
      ) : null}
      <TourismPackageForm
        currentStatus={result.tourismPackage.status}
        hasThumbnail={hasThumbnail}
        initialState={createTourismPackageInitialState(
          result.tourismPackage,
          result.destinations,
        )}
        mode="update"
        options={result.options}
        packageId={result.tourismPackage.id}
      />

      {translationResult.success ? (
        <TourismPackageTranslationForm
          key={`${translationResult.source.updated_at}:${translationResult.translation?.edit_revision ?? "none"}:${translationResult.translation?.lifecycle_state ?? "draft"}`}
          initialState={createTourismPackageTranslationActionState(
            translationResult.source,
            translationResult.translation,
            translationResult.history,
          )}
          sourceReference={translationResult.source}
          itinerary={translationResult.itinerary}
          primaryImageStatus={
            imageTranslationResult.success
              ? imageTranslationResult.images.some(
                  (image) => image.source.isPrimary,
                )
                ? imageTranslationResult.images.find(
                    (image) => image.source.isPrimary,
                  )?.translation?.public_eligibility
                  ? "ready"
                  : "not-ready"
                : "missing"
              : "unknown"
          }
        />
      ) : (
        <section className="mt-10 border-t border-slate-200 pt-8">
          <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
            English translation
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Terjemahan Inggris Paket Wisata
          </h2>
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            Workspace terjemahan belum dapat dimuat. Tidak ada perubahan
            terjemahan yang dapat dilakukan sampai data administrator tersedia.
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
              Terjemahan Gambar Paket Wisata
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Media sumber tetap read-only. Hanya alt text dan caption Inggris
              yang dikelola di sini; upload, penggantian, primary, reorder, dan
              delete tetap berada di workflow media sumber.
            </p>
          </section>
          {imageTranslationResult.images.length > 0 ? (
            imageTranslationResult.images.map((image) => (
              <TourismPackageImageTranslationForm
                key={`${image.source.id}:${image.translation?.edit_revision ?? "none"}:${image.translation?.lifecycle_state ?? "draft"}`}
                tourismPackageId={imageTranslationResult.tourismPackageId}
                initialState={createTourismPackageImageTranslationActionState(
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
            English image translations
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Terjemahan Gambar Paket Wisata
          </h2>
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
          >
            Data terjemahan gambar belum dapat dimuat. Tidak ada perubahan media
            atau terjemahan gambar yang dapat dilakukan.
          </div>
        </section>
      )}
    </section>
  );
}
