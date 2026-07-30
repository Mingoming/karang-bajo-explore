import Link from "next/link";
import { notFound } from "next/navigation";

import { createMedia } from "@/features/media/actions";
import { getMediaCreateData } from "@/features/media/data";
import { MediaForm } from "@/features/media/media-form";
import { createMediaInitialState } from "@/features/media/model";

type Props = {
  searchParams: Promise<{
    entityType?: string | string[];
    parentId?: string | string[];
  }>;
};

export default async function AddMediaPage({ searchParams }: Props) {
  const query = await searchParams;
  const entityType =
    typeof query.entityType === "string" ? query.entityType : undefined;
  const parentId =
    typeof query.parentId === "string" ? query.parentId : undefined;
  const result = await getMediaCreateData(entityType, parentId);
  if (result.kind === "invalid-id" || result.kind === "not-found") notFound();
  const createAction =
    result.kind === "ready"
      ? createMedia.bind(null, result.selected.entityType, result.selected.id)
      : null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <Link href="/admin/media" className="font-semibold text-emerald-800">
          Media
        </Link>{" "}
        / <span aria-current="page">Tambah</span>
      </nav>
      <p className="mt-6 text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Unggah gambar
      </p>
      <h1 className="mt-2 text-3xl font-bold">Tambah Media</h1>
      <p className="mt-3 text-slate-600">
        Pilih konten pemilik, lalu unggah satu gambar JPEG, PNG, atau WebP
        maksimal 5 MiB.
      </p>
      {result.kind === "ready" && createAction ? (
        <MediaForm
          action={createAction}
          initialState={createMediaInitialState(
            result.selected.entityType,
            result.selected.id,
          )}
          mode="create"
          parent={result.selected}
        />
      ) : (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900"
        >
          Daftar konten belum dapat dimuat. Muat ulang halaman sebelum
          mengunggah media.
        </div>
      )}
    </section>
  );
}
