"use client";

import { useActionState, useEffect, useRef } from "react";

import { manageDestinationImageTranslation } from "./actions";
import {
  getDestinationImageTranslationLifecycleLabel,
  getDestinationImageTranslationLifecycleStatus,
  isDestinationImageTranslationEditable,
  type DestinationImageTranslationActionState,
  type DestinationImageTranslationField,
  type DestinationImageTranslationLifecycleStatus,
  type DestinationImageTranslationSource,
} from "./model";

type DestinationImageTranslationFormProps = {
  destinationId: string;
  initialState: DestinationImageTranslationActionState;
  sourceReference: DestinationImageTranslationSource;
};

const FIELD_CONFIG = [
  { field: "alt_text", label: "Alt text", rows: null },
  { field: "caption", label: "Caption", rows: 4 },
] as const satisfies readonly {
  field: DestinationImageTranslationField;
  label: string;
  rows: number | null;
}[];

function statusClasses(
  lifecycleStatus: DestinationImageTranslationLifecycleStatus,
) {
  if (lifecycleStatus === "published") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (lifecycleStatus === "stale") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (lifecycleStatus === "archived") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  if (lifecycleStatus === "reviewed") {
    return "border-violet-200 bg-violet-50 text-violet-900";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function historyEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    draft_saved: "Draf disimpan",
    reviewed: "Review disetujui",
    rejected: "Review ditolak",
    published: "Diterbitkan",
    republished: "Diterbitkan kembali",
    unpublished: "Publikasi dibatalkan",
    archived: "Diarsipkan",
    restored: "Dipulihkan",
    media_changed: "Media berubah",
  };

  return labels[eventType] ?? "Perubahan lifecycle";
}

export function DestinationImageTranslationForm({
  destinationId,
  initialState,
  sourceReference,
}: DestinationImageTranslationFormProps) {
  const boundAction = manageDestinationImageTranslation.bind(
    null,
    destinationId,
    sourceReference.id,
  );
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.revision === 0) return;

    if (state.kind === "validation-error") {
      const firstInvalidField = formRef.current?.querySelector<HTMLElement>(
        "[aria-invalid='true']",
      );

      if (firstInvalidField) {
        firstInvalidField.focus();
        return;
      }
    }

    feedbackRef.current?.focus();
  }, [state.kind, state.revision]);

  const editable = isDestinationImageTranslationEditable(
    state.status,
    state.reviewState,
  );
  const lifecycleStatus = getDestinationImageTranslationLifecycleStatus(
    state.status,
    state.reviewState,
    state.publicEligibility,
  );
  const lifecycleLabel =
    getDestinationImageTranslationLifecycleLabel(lifecycleStatus);
  const lifecycleDescription =
    lifecycleStatus === "stale"
      ? "Kelayakan publik diblokir oleh database dan memerlukan review baru sebelum publikasi kembali."
      : lifecycleStatus === "published"
        ? state.publicEligibility === "unknown"
          ? "Status publik belum dapat diverifikasi dari database."
          : "Database melaporkan terjemahan gambar ini memenuhi kelayakan publik Inggris."
        : lifecycleStatus === "reviewed"
          ? "Review selesai; publikasi tetap merupakan tindakan terpisah."
          : lifecycleStatus === "awaiting-review"
            ? "Draf gambar Inggris menunggu pemeriksaan reviewer."
            : lifecycleStatus === "archived"
              ? "Terjemahan gambar diarsipkan dan tidak memenuhi kelayakan publik."
              : "Draf gambar Inggris dapat diedit dan belum memiliki checkpoint review yang selesai.";
  const canReview =
    editable &&
    (state.status === null ||
      (state.status === "draft" &&
        (state.reviewState === "pending" || state.reviewState === "rejected")));
  const canReject =
    state.translationId !== null &&
    state.status === "draft" &&
    (state.reviewState === "pending" || state.reviewState === "reviewed");
  const canPublish =
    state.status === "draft" &&
    state.reviewState === "reviewed" &&
    state.publishedAt === null;
  const canRepublish =
    (state.status === "draft" || state.status === "published") &&
    state.reviewState === "reviewed" &&
    state.publishedAt !== null;
  const inputClasses =
    "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600";

  return (
    <section className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
            English image translation
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            Gambar {sourceReference.displayOrder}
            {sourceReference.isPrimary ? " — gambar utama" : ""}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Referensi Indonesia bersifat read-only. Teks bahasa Inggris harus
            ditulis secara eksplisit dan tidak pernah diisi otomatis dari
            sumber.
          </p>
        </div>

        <span
          aria-label={`Image translation lifecycle: ${lifecycleLabel}`}
          data-lifecycle-status={lifecycleStatus}
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses(
            lifecycleStatus,
          )}`}
        >
          {lifecycleLabel}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        <span className="font-semibold text-slate-800">Lifecycle:</span>{" "}
        {lifecycleDescription}
      </p>

      {lifecycleStatus === "stale" ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          <p className="font-semibold">Stale: kelayakan publik diblokir.</p>
          <p className="mt-1">
            Perubahan pada media sumber, binary revision, atau fingerprint
            terjemahan gambar dapat membatalkan checkpoint sebelumnya. Batalkan
            publikasi, kirim untuk review baru, lalu terbitkan kembali. Database
            tetap menjadi satu-satunya penentu kelayakan dan fingerprint;
            antarmuka ini tidak dapat melewati aturan tersebut.
          </p>
        </div>
      ) : null}

      {state.status === "published" && state.publicEligibility === "unknown" ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950"
        >
          Status publik terjemahan gambar belum dapat diverifikasi. Muat ulang
          halaman sebelum menjalankan tindakan publikasi.
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <h4 className="text-lg font-bold text-slate-950">
            Referensi Indonesia
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Nilai berikut hanya berasal dari media sumber dan tidak pernah
            digunakan sebagai nilai awal kolom bahasa Inggris.
          </p>

          {sourceReference.previewUrl ? (
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
              {/* Signed administrator preview URLs are intentionally rendered without Next image optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sourceReference.previewUrl}
                alt={sourceReference.altText}
                className="max-h-64 w-full rounded-lg object-contain"
              />
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600">
              Pratinjau gambar tidak tersedia.
            </div>
          )}

          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-sm font-semibold text-slate-700">
                Alt text Indonesia
              </dt>
              <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-900">
                {sourceReference.altText.trim() || "Belum diisi"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-slate-700">
                Keterangan Indonesia
              </dt>
              <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-900">
                {sourceReference.caption?.trim() || "Belum diisi"}
              </dd>
            </div>
          </dl>
        </aside>

        <form
          key={state.revision}
          ref={formRef}
          action={formAction}
          noValidate
          className="space-y-6"
        >
          <input
            type="hidden"
            name="translation_id"
            value={state.translationId ?? ""}
            readOnly
          />
          <input
            type="hidden"
            name="edit_revision"
            value={state.editRevision ?? ""}
            readOnly
          />

          {state.kind !== "idle" && state.message ? (
            <div
              ref={feedbackRef}
              tabIndex={-1}
              role={state.kind === "success" ? "status" : "alert"}
              className={`rounded-xl border px-4 py-3 text-sm leading-6 outline-none focus:ring-3 ${
                state.kind === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 focus:ring-emerald-200"
                  : "border-red-200 bg-red-50 text-red-900 focus:ring-red-200"
              }`}
            >
              <p className="font-semibold">{state.message}</p>
              {state.formErrors.length > 0 ||
              Object.keys(state.fieldErrors).length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {state.formErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                  {Object.entries(state.fieldErrors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <fieldset
            disabled={isPending || !editable}
            className="space-y-6 disabled:opacity-75"
          >
            <legend className="text-lg font-bold text-slate-950">
              Konten bahasa Inggris
            </legend>

            <p className="text-sm leading-6 text-slate-600">
              Alt text wajib diisi. Caption boleh kosong dan tidak akan diisi
              dari caption Indonesia secara otomatis.
            </p>

            {FIELD_CONFIG.map(({ field, label, rows }) => {
              const messageId = `destination-image-translation-${field}-message`;
              const required = field === "alt_text";

              return (
                <div key={field}>
                  <label
                    htmlFor={`destination-image-translation-${field}`}
                    className="block text-sm font-semibold text-slate-800"
                  >
                    {label}
                    {required ? (
                      <>
                        {" "}
                        <span aria-hidden="true" className="text-red-700">
                          *
                        </span>
                        <span className="sr-only"> (wajib)</span>
                      </>
                    ) : null}
                  </label>

                  {rows === null ? (
                    <input
                      id={`destination-image-translation-${field}`}
                      name={field}
                      type="text"
                      defaultValue={state.values[field]}
                      required={required}
                      aria-invalid={Boolean(state.fieldErrors[field])}
                      aria-describedby={messageId}
                      className={inputClasses}
                    />
                  ) : (
                    <textarea
                      id={`destination-image-translation-${field}`}
                      name={field}
                      rows={rows}
                      defaultValue={state.values[field]}
                      aria-invalid={Boolean(state.fieldErrors[field])}
                      aria-describedby={messageId}
                      className={inputClasses}
                    />
                  )}

                  <p
                    id={messageId}
                    className="mt-2 text-sm leading-6 text-slate-500"
                  >
                    {state.fieldErrors[field] ??
                      (required
                        ? "Wajib diisi untuk review dan publikasi."
                        : "Opsional; tetap kosong bila tidak ada caption Inggris yang disetujui.")}
                  </p>
                </div>
              );
            })}
          </fieldset>

          {canReject ? (
            <div>
              <label
                htmlFor="destination-image-translation-rejection-reason"
                className="block text-sm font-semibold text-slate-800"
              >
                Alasan penolakan
                <span aria-hidden="true" className="text-red-700">
                  {" "}
                  *
                </span>
              </label>
              <textarea
                id="destination-image-translation-rejection-reason"
                name="rejection_reason"
                rows={3}
                defaultValue={state.rejectionReason}
                className={inputClasses}
                placeholder="Jelaskan perubahan yang harus dilakukan."
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
            {editable ? (
              <button
                type="submit"
                name="intent"
                value="save-draft"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:text-slate-400"
              >
                {isPending ? "Memproses..." : "Simpan draf"}
              </button>
            ) : null}

            {canReview ? (
              <button
                type="submit"
                name="intent"
                value="review"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:bg-slate-400"
              >
                {isPending ? "Memproses..." : "Kirim untuk review"}
              </button>
            ) : null}

            {canPublish ? (
              <button
                type="submit"
                name="intent"
                value="publish"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:bg-slate-400"
              >
                {isPending ? "Memproses..." : "Terbitkan"}
              </button>
            ) : null}

            {canRepublish ? (
              <button
                type="submit"
                name="intent"
                value="republish"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:bg-slate-400"
              >
                {isPending ? "Memproses..." : "Terbitkan kembali"}
              </button>
            ) : null}

            {canReject ? (
              <button
                type="submit"
                name="intent"
                value="reject"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-red-300 bg-red-50 px-5 py-2.5 font-semibold text-red-900 shadow-sm transition-colors hover:bg-red-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isPending ? "Memproses..." : "Tolak review"}
              </button>
            ) : null}

            {state.status === "published" ? (
              <>
                <button
                  type="submit"
                  name="intent"
                  value="unpublish"
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:text-slate-400"
                >
                  {isPending ? "Memproses..." : "Batalkan publikasi"}
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="archive"
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 font-semibold text-amber-950 shadow-sm transition-colors hover:bg-amber-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {isPending ? "Memproses..." : "Arsipkan terjemahan"}
                </button>
              </>
            ) : null}

            {state.status === "archived" ? (
              <button
                type="submit"
                name="intent"
                value="restore"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:bg-slate-400"
              >
                {isPending ? "Memproses..." : "Pulihkan menjadi draf"}
              </button>
            ) : null}
          </div>

          {state.history.length > 0 ? (
            <details className="border-t border-slate-200 pt-6">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                Riwayat review dan publikasi ({state.history.length})
              </summary>
              <ol className="mt-4 space-y-3 text-sm text-slate-700">
                {state.history.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="font-semibold">
                      {historyEventLabel(event.event_type)}
                    </span>
                    <span className="ml-2 text-slate-500">
                      {event.occurred_at}
                    </span>
                    {event.reason ? (
                      <p className="mt-1 whitespace-pre-line leading-6">
                        {event.reason}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
        </form>
      </div>
    </section>
  );
}
