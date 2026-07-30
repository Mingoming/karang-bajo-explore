import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteMedia, updateMedia } from "@/features/media/actions";
import { getMediaEditorData } from "@/features/media/data";
import { MediaDeleteButton } from "@/features/media/media-delete-button";
import { MediaForm } from "@/features/media/media-form";
import {
  createMediaInitialState,
  isValidMediaUuid,
  MEDIA_ENTITY_LABELS,
} from "@/features/media/model";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    entityType?: string | string[];
    parentId?: string | string[];
    success?: string | string[];
  }>;
};

export default async function EditMediaPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const entityType =
    typeof query.entityType === "string" ? query.entityType : "";
  const parentId = typeof query.parentId === "string" ? query.parentId : "";
  if (!isValidMediaUuid(id)) notFound();
  const result = await getMediaEditorData(entityType, parentId, id);
  if (result.kind === "invalid-id" || result.kind === "not-found") notFound();
  if (result.kind !== "ready") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold">Edit Media</h1>
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900"
        >
          Media belum dapat dimuat. Kembali ke daftar lalu coba lagi.
        </div>
      </section>
    );
  }
  const updateAction = updateMedia.bind(
    null,
    result.parent.entityType,
    result.parent.id,
    result.image.id,
  );
  const deleteAction = deleteMedia.bind(
    null,
    result.parent.entityType,
    result.parent.id,
    result.image.id,
  );
  const success =
    query.success === "created"
      ? "Media berhasil diunggah."
      : query.success === "updated"
        ? "Perubahan media berhasil disimpan."
        : null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <Link href="/admin/media" className="font-semibold text-emerald-800">
          Media
        </Link>{" "}
        / <span aria-current="page">Edit</span>
      </nav>
      <p className="mt-6 text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        {MEDIA_ENTITY_LABELS[result.parent.entityType]}
      </p>
      <h1 className="mt-2 text-3xl font-bold">{result.parent.label}</h1>
      <p className="mt-3 text-slate-600">
        Edit metadata, urutan, gambar utama, atau ganti berkas tanpa mengubah
        pemilik media.
      </p>
      {success ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          {success}
        </div>
      ) : null}
      <MediaForm
        action={updateAction}
        initialState={createMediaInitialState(
          result.parent.entityType,
          result.parent.id,
          result.image,
        )}
        mode="update"
        parents={[result.parent]}
        record={result.image}
      />
      {result.images.length > 1 ? (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold">Gambar lain untuk konten ini</h2>
          <ul className="mt-3 grid gap-2">
            {result.images
              .filter((image) => image.id !== result.image.id)
              .map((image) => {
                const params = new URLSearchParams({
                  entityType: result.parent.entityType,
                  parentId: result.parent.id,
                });
                return (
                  <li key={image.id}>
                    <Link
                      href={`/admin/media/${image.id}/edit?${params.toString()}`}
                      className="text-sm font-semibold text-emerald-800 underline"
                    >
                      Urutan {image.displayOrder}: {image.altText}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : null}
      <MediaDeleteButton
        action={deleteAction}
        initialState={createMediaInitialState(
          result.parent.entityType,
          result.parent.id,
          result.image,
        )}
      />
    </section>
  );
}
