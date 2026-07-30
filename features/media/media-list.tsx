import Link from "next/link";

import { MEDIA_ENTITY_LABELS, type MediaParentOption } from "./model";

function statusLabel(status: MediaParentOption["status"]) {
  return { draft: "Draf", published: "Diterbitkan", archived: "Diarsipkan" }[
    status
  ];
}

export function MediaList({ parents }: { parents: MediaParentOption[] }) {
  return (
    <div className="mt-8 grid gap-4">
      {parents.map((parent) => {
        const query = new URLSearchParams({
          entityType: parent.entityType,
          parentId: parent.id,
        });
        const href = parent.imageCount
          ? `/admin/media/kelola?${query.toString()}`
          : `/admin/media/tambah?${query.toString()}`;
        return (
          <article
            key={`${parent.entityType}:${parent.id}`}
            className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-[7rem_1fr_auto] sm:items-center"
          >
            <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xs text-slate-500">
              {parent.previewUrl ? (
                <>
                  {/* Private, short-lived administrator preview URL. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={parent.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </>
              ) : (
                "Belum ada gambar"
              )}
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-emerald-800 uppercase">
                {MEDIA_ENTITY_LABELS[parent.entityType]}
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">
                {parent.label}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {statusLabel(parent.status)} · {parent.imageCount}/10 gambar ·
                Diperbarui{" "}
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Makassar",
                }).format(new Date(parent.updatedAt))}{" "}
                WITA
              </p>
            </div>
            <Link
              href={href}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 px-4 font-semibold text-emerald-800"
            >
              {parent.imageCount ? "Kelola" : "Tambah gambar"}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
