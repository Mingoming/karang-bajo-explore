"use client";

import { useActionState, useEffect, useRef } from "react";

import { manageTraditionalHouseTranslation } from "./actions";
import {
  getTraditionalHouseTranslationLifecycleLabel,
  isTraditionalHouseTranslationEditable,
  type TraditionalHouseTranslationActionState,
  type TraditionalHouseTranslationField,
  type TraditionalHouseTranslationSource,
} from "./model";

type Props = {
  initialState: TraditionalHouseTranslationActionState;
  sourceReference: TraditionalHouseTranslationSource;
};

const FIELD_CONFIG: Array<{
  field: TraditionalHouseTranslationField;
  label: string;
  rows: number | null;
}> = [
  { field: "name", label: "Nama rumah adat bahasa Inggris", rows: null },
  { field: "summary", label: "Ringkasan bahasa Inggris", rows: 3 },
  { field: "description", label: "Deskripsi bahasa Inggris", rows: 6 },
  { field: "history", label: "Sejarah bahasa Inggris", rows: 5 },
  {
    field: "cultural_significance",
    label: "Makna budaya bahasa Inggris",
    rows: 5,
  },
  { field: "location_name", label: "Nama lokasi bahasa Inggris", rows: null },
  {
    field: "visitor_information",
    label: "Informasi kunjungan bahasa Inggris",
    rows: 4,
  },
];

const SOURCE_FIELD_LABELS: Record<TraditionalHouseTranslationField, string> = {
  name: "Nama rumah adat Indonesia",
  summary: "Ringkasan Indonesia",
  description: "Deskripsi Indonesia",
  history: "Sejarah Indonesia",
  cultural_significance: "Makna budaya Indonesia",
  location_name: "Nama lokasi Indonesia",
  visitor_information: "Informasi kunjungan Indonesia",
};

function statusClasses(
  state: TraditionalHouseTranslationActionState["lifecycleState"],
) {
  if (state === "published")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "stale" || state === "source-blocked") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (state === "archived")
    return "border-slate-300 bg-slate-100 text-slate-700";
  if (state === "reviewed")
    return "border-violet-200 bg-violet-50 text-violet-900";
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
    source_changed: "Sumber berubah",
    source_blocked: "Sumber diblokir",
  };
  return labels[eventType] ?? "Perubahan lifecycle";
}

function referenceValue(
  source: TraditionalHouseTranslationSource,
  field: TraditionalHouseTranslationField,
) {
  const value = source[field];
  return typeof value === "string" && value.trim() !== ""
    ? value
    : "Belum diisi";
}

export function TraditionalHouseTranslationForm({
  initialState,
  sourceReference,
}: Props) {
  const boundAction = manageTraditionalHouseTranslation.bind(
    null,
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

  const lifecycleLabel = getTraditionalHouseTranslationLifecycleLabel(
    state.lifecycleState,
  );
  const editable = isTraditionalHouseTranslationEditable(
    state.status,
    state.reviewState,
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
            Terjemahan Rumah Adat
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Konten Indonesia adalah referensi read-only. Semua teks Inggris
            harus ditulis dan ditinjau oleh manusia; sistem tidak menyalin atau
            mengisi fallback dari sumber.
          </p>
        </div>
        <span
          aria-label={`Translation lifecycle: ${lifecycleLabel}`}
          data-lifecycle-status={state.lifecycleState}
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses(
            state.lifecycleState,
          )}`}
        >
          {lifecycleLabel}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        <span className="font-semibold text-slate-800">Status sumber:</span>{" "}
        {state.sourceStatus ?? "Belum tersedia"} ·{" "}
        <span className="font-semibold text-slate-800">Revisi sumber:</span>{" "}
        {state.sourceRevision ?? "Belum tersedia"} · terakhir diperbarui{" "}
        {sourceReference.updated_at}
      </p>

      {state.lifecycleState === "stale" ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          <p className="font-semibold">Stale: kelayakan publik diblokir.</p>
          <p className="mt-1">
            Database melaporkan fingerprint sumber, thumbnail, atau terjemahan
            berubah. Review baru dan republish eksplisit diperlukan; UI tidak
            dapat melewati aturan freshness.
          </p>
        </div>
      ) : null}
      {state.lifecycleState === "source-blocked" ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          Sumber Indonesia belum memenuhi kelayakan publik. Terjemahan tetap
          fail-closed sampai sumber dipulihkan dan direview kembali.
        </div>
      ) : null}
      {state.eligibilityReason ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          <span className="font-semibold text-slate-800">
            Keterangan database:
          </span>{" "}
          {state.eligibilityReason}
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <h3 className="text-lg font-bold text-slate-950">
            Referensi Indonesia
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Nilai ini tidak pernah digunakan sebagai nilai awal kolom bahasa
            Inggris.
          </p>
          <dl className="mt-6 space-y-5">
            {FIELD_CONFIG.map(({ field }) => (
              <div key={field}>
                <dt className="text-sm font-semibold text-slate-700">
                  {SOURCE_FIELD_LABELS[field]}
                </dt>
                <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-900">
                  {referenceValue(sourceReference, field)}
                </dd>
              </div>
            ))}
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
              className={`rounded-xl border px-4 py-3 text-sm leading-6 outline-none ${
                state.kind === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900"
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
              Draf boleh belum lengkap. Kolom yang memiliki sumber Indonesia
              wajib memiliki terjemahan eksplisit sebelum review; kolom sumber
              kosong harus tetap kosong.
            </p>
            {FIELD_CONFIG.map(({ field, label, rows }) => {
              const messageId = `traditional-house-translation-${field}-message`;
              return (
                <div key={field}>
                  <label
                    htmlFor={`traditional-house-translation-${field}`}
                    className={labelClasses}
                  >
                    {label}
                  </label>
                  {rows === null ? (
                    <input
                      id={`traditional-house-translation-${field}`}
                      name={field}
                      type="text"
                      defaultValue={state.values[field]}
                      aria-invalid={Boolean(state.fieldErrors[field])}
                      aria-describedby={messageId}
                      className={inputClasses}
                    />
                  ) : (
                    <textarea
                      id={`traditional-house-translation-${field}`}
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
                      (field === "name" || field === "description"
                        ? "Wajib diisi sebelum review atau publikasi."
                        : "Tetap kosong bila sumber Indonesia tidak memiliki isi.")}
                  </p>
                </div>
              );
            })}
          </fieldset>

          {canReview ? (
            <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              <input
                type="checkbox"
                name="terminology_review_confirmed"
                className="mt-1 size-4 accent-blue-700"
              />
              <span>
                Saya telah melakukan review manusia atas terminologi budaya dan
                menyetujui bahwa konten Inggris ini tidak mengarang informasi.
              </span>
            </label>
          ) : null}

          {canReject ? (
            <div>
              <label
                htmlFor="traditional-house-translation-rejection-reason"
                className={labelClasses}
              >
                Alasan penolakan{" "}
                <span aria-hidden="true" className="text-red-700">
                  *
                </span>
              </label>
              <textarea
                id="traditional-house-translation-rejection-reason"
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
                className="action-button"
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
                className="action-button action-button-primary"
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
                className="action-button action-button-success"
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
                className="action-button action-button-success"
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
                className="action-button action-button-danger"
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
                  className="action-button"
                >
                  {isPending ? "Memproses..." : "Batalkan publikasi"}
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="archive"
                  disabled={isPending}
                  className="action-button action-button-warning"
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
                className="action-button action-button-primary"
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
