import Link from "next/link";

import type { MediaImageRecord, MediaParentOption } from "./model";

type Props = {
  parent: MediaParentOption;
  images: MediaImageRecord[];
};

export function MediaGallery({ parent, images }: Props) {
  if (images.length === 0) {
    const query = new URLSearchParams({
      entityType: parent.entityType,
      parentId: parent.id,
    });

    return (
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <h2 className="text-lg font-bold">Belum ada gambar</h2>

        <p className="mt-2 text-sm text-slate-600">
          Tambahkan gambar pertama untuk konten ini.
        </p>

        <Link
          href={`/admin/media/tambah?${query.toString()}`}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 font-semibold text-white"
        >
          Tambah gambar
        </Link>
      </div>
    );
  }

  const query = new URLSearchParams({
    entityType: parent.entityType,
    parentId: parent.id,
  });

  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image) => (
        <article
          key={image.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100">
            {image.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.previewUrl}
                alt={image.altText}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm text-slate-500">
                Pratinjau tidak tersedia
              </span>
            )}

            {image.isPrimary ? (
              <span className="absolute top-3 left-3 rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white">
                Gambar utama
              </span>
            ) : null}
          </div>

          <div className="p-4">
            <p className="font-semibold text-slate-950">
              Urutan {image.displayOrder}
            </p>

            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
              {image.altText}
            </p>

            {image.caption ? (
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                {image.caption}
              </p>
            ) : null}

            <Link
              href={`/admin/media/${image.id}/edit?${query.toString()}`}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-700 px-4 font-semibold text-emerald-800"
            >
              Edit gambar
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
