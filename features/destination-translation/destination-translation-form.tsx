"use client";

import { useActionState, useEffect, useRef } from "react";

import { manageDestinationTranslation } from "./actions";
import {
  getDestinationTranslationStatusLabel,
  isDestinationTranslationEditable,
  isDestinationTranslationFieldRequiredForPublication,
  type DestinationTranslationActionState,
  type DestinationTranslationField,
  type DestinationTranslationSource,
} from "./model";

type DestinationTranslationFormProps = {
  initialState: DestinationTranslationActionState;
  sourceReference: DestinationTranslationSource | null;
};

type FieldMessageProps = {
  error?: string;
  helper?: string;
  id: string;
};

const SOURCE_STATUS_LABELS = {
  draft: "Draf",
  published: "Diterbitkan",
  archived: "Diarsipkan",
} as const;

const FIELD_CONFIG = [
  { field: "name", label: "Destination name", rows: null },
  { field: "summary", label: "Summary", rows: 3 },
  { field: "description", label: "Description", rows: 7 },
  { field: "history", label: "History", rows: 6 },
  { field: "opening_hours", label: "Opening hours", rows: 3 },
  { field: "price_note", label: "Price note", rows: 3 },
  { field: "facilities", label: "Facilities", rows: 5 },
  { field: "thumbnail_alt_text", label: "Thumbnail alt text", rows: 3 },
] as const satisfies readonly {
  field: DestinationTranslationField;
  label: string;
  rows: number | null;
}[];

const SOURCE_FIELD_CONFIG = [
  ["name", "Nama destinasi"],
  ["summary", "Ringkasan"],
  ["description", "Deskripsi"],
  ["history", "Sejarah"],
  ["opening_hours", "Jam kunjungan"],
  ["price_note", "Catatan harga"],
  ["facilities", "Fasilitas"],
] as const;

function FieldMessage({ error, helper, id }: FieldMessageProps) {
  if (error) {
    return (
      <p id={id} className="mt-2 text-sm font-medium text-red-700">
        {error}
      </p>
    );
  }

  if (helper) {
    return (
      <p id={id} className="mt-2 text-sm leading-6 text-slate-500">
        {helper}
      </p>
    );
  }

  return null;
}

function statusClasses(state: DestinationTranslationActionState) {
  if (state.status === "published" && state.publicEligibility === "eligible") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (state.status === "published" && state.publicEligibility !== "eligible") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (state.status === "archived") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function sourceFieldValue(
  source: DestinationTranslationSource,
  field: (typeof SOURCE_FIELD_CONFIG)[number][0],
) {
  if (field === "facilities") {
    return source.facilities.join("\n");
  }

  return source[field];
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
    source_changed: "Sumber berubah",
    source_blocked: "Sumber diblokir",
  };

  return labels[eventType] ?? "Perubahan lifecycle";
}

export function DestinationTranslationForm({
  initialState,
  sourceReference,
}: DestinationTranslationFormProps) {
  const boundAction = sourceReference
    ? manageDestinationTranslation.bind(null, sourceReference.id)
    : null;
  const [state, formAction, isPending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.revision === 0) {
      return;
    }

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

  if (!sourceReference) {
    return (
      <section className="mt-10 border-t border-slate-200 pt-8">
        <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
          English translation
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Terjemahan Destinasi
        </h2>
        <div
          role="status"
          className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900"
        >
          Buat dan simpan destinasi Indonesia terlebih dahulu sebelum mengelola
          terjemahan Inggris.
        </div>
      </section>
    );
  }

  const editable = isDestinationTranslationEditable(
    state.status,
    state.reviewState,
  );
  const sourceStatusLabel = SOURCE_STATUS_LABELS[sourceReference.status];
  const statusLabel = getDestinationTranslationStatusLabel(
    state.status,
    state.reviewState,
    state.publicEligibility,
  );
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
  const labelClasses = "block text-sm font-semibold text-slate-800";

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
            English translation
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Terjemahan Destinasi
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Gunakan konten Indonesia sebagai referensi editorial. Sistem tidak
            menerjemahkan, menyalin, atau menerbitkan konten secara otomatis.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses(
            state,
          )}`}
        >
          {statusLabel}
        </span>
      </div>

      {state.status === "published" && state.publicEligibility === "blocked" ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          Terjemahan ini tidak memenuhi kelayakan publik terbaru. Batalkan
          publikasi, simpan perubahan bila diperlukan, kirim untuk review baru,
          lalu terbitkan kembali. Kelayakan dan fingerprint ditentukan oleh
          database.
        </div>
      ) : null}

      {state.status === "published" && state.publicEligibility === "unknown" ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950"
        >
          Status publik terjemahan belum dapat diverifikasi. Muat ulang halaman
          sebelum menjalankan tindakan publikasi.
        </div>
      ) : null}

      {sourceReference.status !== "published" ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950"
        >
          Status sumber Indonesia saat ini: <strong>{sourceStatusLabel}</strong>
          . Draf dapat disimpan, tetapi review dan publikasi akan ditolak sampai
          sumber berstatus diterbitkan.
        </div>
      ) : null}

      {!sourceReference.hasThumbnail ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950"
        >
          Gambar utama Indonesia belum tersedia. Database akan menolak review
          atau publikasi sampai media sumber memenuhi kontrak.
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <h3 className="text-lg font-bold text-slate-950">
            Referensi Indonesia
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Konten ini hanya ditampilkan sebagai referensi dan tidak pernah
            digunakan sebagai nilai awal kolom bahasa Inggris.
          </p>

          <dl className="mt-6 space-y-5">
            {SOURCE_FIELD_CONFIG.map(([field, label]) => {
              const value = sourceFieldValue(sourceReference, field);

              return (
                <div key={field}>
                  <dt className="text-sm font-semibold text-slate-700">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-900">
                    {typeof value === "string" && value.trim() !== ""
                      ? value
                      : "Belum diisi"}
                  </dd>
                </div>
              );
            })}
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
              Semua kolom inti wajib diisi untuk disimpan. Bagian yang memiliki
              konten Indonesia harus memiliki terjemahan eksplisit; bagian yang
              kosong di sumber harus tetap kosong.
            </p>

            {FIELD_CONFIG.map(({ field, label, rows }) => {
              const requiredForPublication =
                isDestinationTranslationFieldRequiredForPublication(
                  sourceReference,
                  field,
                );
              const requiredForSave = [
                "name",
                "summary",
                "description",
                "thumbnail_alt_text",
              ].includes(field);
              const messageId = `destination-translation-${field}-message`;

              return (
                <div key={field}>
                  <label
                    htmlFor={`destination-translation-${field}`}
                    className={labelClasses}
                  >
                    {label}
                    {requiredForSave || requiredForPublication ? (
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
                      id={`destination-translation-${field}`}
                      name={field}
                      type="text"
                      defaultValue={state.values[field]}
                      required={requiredForSave}
                      aria-invalid={Boolean(state.fieldErrors[field])}
                      aria-describedby={messageId}
                      className={inputClasses}
                    />
                  ) : (
                    <textarea
                      id={`destination-translation-${field}`}
                      name={field}
                      rows={rows}
                      defaultValue={state.values[field]}
                      required={requiredForSave}
                      aria-invalid={Boolean(state.fieldErrors[field])}
                      aria-describedby={messageId}
                      className={inputClasses}
                    />
                  )}

                  <FieldMessage
                    id={messageId}
                    error={state.fieldErrors[field]}
                    helper={
                      field === "facilities"
                        ? "Gunakan satu fasilitas bahasa Inggris per baris; jumlah baris harus sama dengan sumber."
                        : requiredForSave || requiredForPublication
                          ? "Wajib diisi sesuai kontrak terjemahan."
                          : "Harus tetap kosong bila bagian sumber Indonesia kosong."
                    }
                  />
                </div>
              );
            })}
          </fieldset>

          {canReject ? (
            <div>
              <label
                htmlFor="destination-translation-rejection-reason"
                className={labelClasses}
              >
                Alasan penolakan
                <span aria-hidden="true" className="text-red-700">
                  {" "}
                  *
                </span>
              </label>
              <textarea
                id="destination-translation-rejection-reason"
                name="rejection_reason"
                rows={3}
                defaultValue={state.rejectionReason}
                aria-invalid={Boolean(
                  state.formErrors.includes("Alasan penolakan wajib diisi."),
                )}
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
