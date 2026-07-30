import Link from "next/link";
import { notFound } from "next/navigation";

import { getMediaGalleryData } from "@/features/media/data";
import { MediaGallery } from "@/features/media/media-gallery";
import { MEDIA_ENTITY_LABELS } from "@/features/media/model";

type Props = {
  searchParams: Promise<{
    entityType?: string | string[];
    parentId?: string | string[];
    success?: string | string[];
  }>;
};

export default async function ManageMediaPage({ searchParams }: Props) {
  const query = await searchParams;

  const entityType =
    typeof query.entityType === "string" ? query.entityType : "";

  const parentId = typeof query.parentId === "string" ? query.parentId : "";

  const result = await getMediaGalleryData(entityType, parentId);

  if (result.kind === "invalid-id" || result.kind === "not-found") {
    notFound();
  }

  if (result.kind !== "ready") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold">Kelola Media</h1>

        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900"
        >
          Galeri media belum dapat dimuat. Silakan coba lagi.
        </div>
      </section>
    );
  }

  const createQuery = new URLSearchParams({
    entityType: result.parent.entityType,
    parentId: result.parent.id,
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <Link href="/admin/media" className="font-semibold text-emerald-800">
          Media
        </Link>{" "}
        / <span aria-current="page">Kelola</span>
      </nav>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            {MEDIA_ENTITY_LABELS[result.parent.entityType]}
          </p>

          <h1 className="mt-2 text-3xl font-bold">{result.parent.label}</h1>

          <p className="mt-3 text-slate-600">
            {result.images.length}/10 gambar
          </p>
        </div>

        {result.images.length < 10 ? (
          <Link
            href={`/admin/media/tambah?${createQuery.toString()}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 font-semibold text-white"
          >
            Tambah gambar
          </Link>
        ) : null}
      </div>

      {query.success === "created" ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          Gambar berhasil ditambahkan ke galeri.
        </div>
      ) : null}

      <MediaGallery parent={result.parent} images={result.images} />
    </section>
  );
}
