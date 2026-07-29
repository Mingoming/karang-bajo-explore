import Link from "next/link";
import { notFound } from "next/navigation";
import { getTourismPackageEditorData } from "@/features/tourism-packages/data";
import { TourismPackageForm } from "@/features/tourism-packages/tourism-package-form";
import {
  createTourismPackageInitialState,
  getTourismPackageStatusLabel,
  isValidTourismPackageId,
} from "@/features/tourism-packages/model";

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
  const [result, query] = await Promise.all([
    getTourismPackageEditorData(id),
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
    </section>
  );
}
