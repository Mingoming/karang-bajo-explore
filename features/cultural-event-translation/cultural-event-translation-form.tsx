"use client";

import { useActionState, useEffect, useRef } from "react";

import { manageCulturalEventTranslation } from "./actions";
import {
  getCulturalEventTranslationLifecycleLabel,
  isCulturalEventTranslationEditable,
  type CulturalEventTranslationActionState,
  type CulturalEventTranslationField,
  type CulturalEventTranslationSource,
} from "./model";

type Props = {
  initialState: CulturalEventTranslationActionState;
  sourceReference: CulturalEventTranslationSource;
};

const FIELD_CONFIG: Array<{
  field: CulturalEventTranslationField;
  label: string;
  rows: number | null;
}> = [
  { field: "title", label: "Event title", rows: null },
  { field: "summary", label: "Summary", rows: 3 },
  { field: "description", label: "Description", rows: 7 },
  { field: "event_type", label: "Event type", rows: null },
  { field: "date_note", label: "Date note", rows: 3 },
  { field: "location_name", label: "Location name", rows: null },
  { field: "address", label: "Address", rows: 3 },
  { field: "organizer", label: "Organizer", rows: null },
  { field: "visitor_information", label: "Visitor information", rows: 4 },
];

const SOURCE_FIELD_CONFIG: Array<{
  field: CulturalEventTranslationField;
  label: string;
}> = [
  { field: "title", label: "Judul Indonesia" },
  { field: "summary", label: "Ringkasan" },
  { field: "description", label: "Deskripsi" },
  { field: "event_type", label: "Jenis acara" },
  { field: "date_note", label: "Catatan tanggal" },
  { field: "location_name", label: "Nama lokasi" },
  { field: "address", label: "Alamat" },
  { field: "organizer", label: "Penyelenggara" },
  { field: "visitor_information", label: "Informasi pengunjung" },
];

const SOURCE_STATUS_LABELS = {
  draft: "Draf",
  published: "Diterbitkan",
  archived: "Diarsipkan",
} as const;

function sourceHasText(value: string | null) {
  return value !== null && value.trim() !== "";
}

function formatSourceInstant(value: string | null) {
  if (!value) return "Belum ditentukan";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Nilai waktu tidak valid";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClasses(state: CulturalEventTranslationActionState) {
  if (state.sourceBlocked || state.lifecycleState === "stale") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (state.lifecycleState === "published") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (state.lifecycleState === "archived") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  if (state.lifecycleState === "reviewed") {
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
    source_changed: "Sumber berubah",
    source_blocked: "Sumber diblokir",
  };
  return labels[eventType] ?? "Perubahan lifecycle";
}

export function CulturalEventTranslationForm({
  initialState,
  sourceReference,
}: Props) {
  const boundAction = manageCulturalEventTranslation.bind(
    null,
    sourceReference.id,
  );
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const editable = isCulturalEventTranslationEditable(
    state.status,
    state.reviewState,
  );
  const lifecycleLabel = getCulturalEventTranslationLifecycleLabel(
    state.lifecycleState,
    state.reviewState,
    state.sourceBlocked,
    state.translationId !== null,
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
  const buttonClasses =
    "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-wait disabled:text-slate-400";
  const primaryButtonClasses =
    "inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-wait disabled:bg-slate-400";
  const successButtonClasses =
    "inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-wait disabled:bg-slate-400";

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

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
            English translation
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Cultural Event English Translation
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Indonesian content is read-only reference. English values must be
            authored explicitly; this workflow never copies or falls back to
            Indonesian text.
          </p>
        </div>
        <span
          aria-label={`Translation lifecycle: ${lifecycleLabel}`}
          data-lifecycle-status={state.lifecycleState}
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses(
            state,
          )}`}
        >
          {lifecycleLabel}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        <span className="font-semibold text-slate-800">Database status:</span>{" "}
        {state.eligibilityReason ??
          "No publication eligibility reason is available."}
      </p>

      {state.lifecycleState === "stale" ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          <p className="font-semibold">Stale: public eligibility is blocked.</p>
          <p className="mt-1">
            A source, thumbnail, schedule, or translation change invalidated the
            previous checkpoint. Fresh review and explicit publication are
            required; the database remains the authority.
          </p>
        </div>
      ) : null}
      {state.sourceBlocked ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          The Indonesian source is not currently eligible for English
          publication. Restoring the source does not publish this translation.
          {state.sourceBlockedReason ? ` ${state.sourceBlockedReason}.` : ""}
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <h3 className="text-lg font-bold text-slate-950">
            Referensi Indonesia
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Reference only. These values are never inserted into the English
            fields.
          </p>
          <dl className="mt-6 space-y-5">
            {SOURCE_FIELD_CONFIG.map(({ field, label }) => (
              <div key={field}>
                <dt className="text-sm font-semibold text-slate-700">
                  {label}
                </dt>
                <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-900">
                  {sourceHasText(sourceReference[field])
                    ? sourceReference[field]
                    : "Belum diisi"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h4 className="text-sm font-semibold text-slate-700">
              Jadwal sumber (Asia/Makassar)
            </h4>
            <dl className="mt-3 space-y-2 text-sm leading-6 text-slate-900">
              <div className="flex justify-between gap-4">
                <dt>Mulai</dt>
                <dd>{formatSourceInstant(sourceReference.start_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Selesai</dt>
                <dd>{formatSourceInstant(sourceReference.end_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Seharian</dt>
                <dd>{sourceReference.all_day ? "Ya" : "Tidak"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Schedule is shared source data. This translation form has no
              separate English schedule authority.
            </p>
          </div>
          <p className="mt-5 text-sm text-slate-600">
            Status sumber: {SOURCE_STATUS_LABELS[sourceReference.status]}
          </p>
          <dl className="mt-5 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-900">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt className="font-semibold text-slate-700">Source slug</dt>
              <dd className="break-all">{sourceReference.slug}</dd>
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1">
              <dt className="font-semibold text-slate-700">
                Source updated (WITA)
              </dt>
              <dd>{formatSourceInstant(sourceReference.updated_at)}</dd>
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
              className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
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
              English fields
            </legend>
            <p className="text-sm leading-6 text-slate-600">
              Drafts may be incomplete. Required and source-conditional fields
              must be complete before review or publication.
            </p>
            {FIELD_CONFIG.map(({ field, label, rows }) => {
              const required = field === "title" || field === "description";
              const sourceValue = sourceReference[field];
              const sourceConditional = !required && sourceHasText(sourceValue);
              const messageId = `cultural-event-translation-${field}-message`;
              return (
                <div key={field}>
                  <label
                    htmlFor={`cultural-event-translation-${field}`}
                    className="block text-sm font-semibold text-slate-800"
                  >
                    {label}
                    {required || sourceConditional ? (
                      <>
                        <span aria-hidden="true" className="text-red-700">
                          {" "}
                          *
                        </span>
                        <span className="sr-only">
                          {" "}
                          (required before review)
                        </span>
                      </>
                    ) : null}
                  </label>
                  {rows === null ? (
                    <input
                      id={`cultural-event-translation-${field}`}
                      name={field}
                      type="text"
                      defaultValue={state.values[field]}
                      aria-invalid={Boolean(state.fieldErrors[field])}
                      aria-describedby={messageId}
                      className={inputClasses}
                    />
                  ) : (
                    <textarea
                      id={`cultural-event-translation-${field}`}
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
                        ? "Required before review or publication."
                        : sourceConditional
                          ? "Required because the Indonesian source contains content."
                          : "Must remain empty when the Indonesian source is empty.")}
                  </p>
                </div>
              );
            })}
          </fieldset>

          {canReject ? (
            <div>
              <label
                htmlFor="cultural-event-translation-rejection-reason"
                className="block text-sm font-semibold text-slate-800"
              >
                Alasan penolakan <span className="text-red-700">*</span>
              </label>
              <textarea
                id="cultural-event-translation-rejection-reason"
                name="rejection_reason"
                rows={3}
                defaultValue={state.rejectionReason}
                className={inputClasses}
                placeholder="Jelaskan perubahan yang harus dilakukan."
              />
            </div>
          ) : null}

          {canReview ? (
            <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              <input
                type="checkbox"
                name="terminology_review_confirmed"
                className="mt-1 size-4 accent-blue-700"
              />
              <span>
                Saya telah melakukan review manusia atas nama, istilah budaya,
                dan konteks acara ini.
              </span>
            </label>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
            {editable ? (
              <button
                type="submit"
                name="intent"
                value="save-draft"
                disabled={isPending}
                className={buttonClasses}
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
                className={primaryButtonClasses}
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
                className={successButtonClasses}
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
                className={successButtonClasses}
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
                className={`${buttonClasses} border-red-300 bg-red-50 text-red-900`}
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
                  className={buttonClasses}
                >
                  {isPending ? "Memproses..." : "Batalkan publikasi"}
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="archive"
                  disabled={isPending}
                  className={`${buttonClasses} border-amber-300 bg-amber-50 text-amber-950`}
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
                className={primaryButtonClasses}
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
