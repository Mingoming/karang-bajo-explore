"use client";

import { useActionState, useEffect, useRef } from "react";

import { getTourismPackageTypeLabel } from "../tourism-packages/model";
import { manageTourismPackageTranslation } from "./actions";
import {
  getTourismPackageTranslationLifecycleLabel,
  isTourismPackageTranslationEditable,
  type TourismPackageTranslationActionState,
  type TourismPackageTranslationField,
  type TourismPackageTranslationItineraryItem,
  type TourismPackageTranslationSource,
} from "./model";

type Props = {
  initialState: TourismPackageTranslationActionState;
  sourceReference: TourismPackageTranslationSource;
  itinerary: TourismPackageTranslationItineraryItem[];
  primaryImageStatus: "ready" | "not-ready" | "missing" | "unknown";
};

const FIELD_CONFIG: Array<{
  field: TourismPackageTranslationField;
  label: string;
  rows: number | null;
  required: boolean;
}> = [
  {
    field: "name",
    label: "Nama paket bahasa Inggris",
    rows: null,
    required: true,
  },
  {
    field: "duration_unit",
    label: "Satuan durasi bahasa Inggris",
    rows: null,
    required: true,
  },
  {
    field: "price_note",
    label: "Catatan harga bahasa Inggris",
    rows: 3,
    required: false,
  },
  {
    field: "included_facilities",
    label: "Fasilitas bahasa Inggris",
    rows: 5,
    required: false,
  },
  {
    field: "souvenir",
    label: "Cendera mata bahasa Inggris",
    rows: 3,
    required: false,
  },
  {
    field: "summary",
    label: "Ringkasan bahasa Inggris",
    rows: 4,
    required: false,
  },
  {
    field: "description",
    label: "Deskripsi bahasa Inggris",
    rows: 7,
    required: true,
  },
];

const SOURCE_FIELD_LABELS: Record<TourismPackageTranslationField, string> = {
  name: "Nama paket Indonesia",
  duration_unit: "Satuan durasi Indonesia",
  price_note: "Catatan harga Indonesia",
  included_facilities: "Fasilitas Indonesia",
  souvenir: "Cendera mata Indonesia",
  summary: "Ringkasan Indonesia",
  description: "Deskripsi Indonesia",
};

function statusClasses(
  state: TourismPackageTranslationActionState["lifecycleState"],
) {
  if (state === "published")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "stale" || state === "source-blocked")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (state === "archived")
    return "border-slate-300 bg-slate-100 text-slate-700";
  if (state === "reviewed")
    return "border-violet-200 bg-violet-50 text-violet-900";
  if (state === "rejected") return "border-red-200 bg-red-50 text-red-900";
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
  source: TourismPackageTranslationSource,
  field: TourismPackageTranslationField,
) {
  const value = source[field];
  if (Array.isArray(value))
    return value.length > 0 ? value.join("\n") : "Belum diisi";
  return typeof value === "string" && value.trim() !== ""
    ? value
    : "Belum diisi";
}

function primaryImageMessage(status: Props["primaryImageStatus"]) {
  if (status === "ready")
    return "Gambar utama memiliki terjemahan Inggris yang sedang eligible.";
  if (status === "missing")
    return "Paket belum memiliki gambar utama sumber; publikasi Inggris akan ditolak.";
  if (status === "not-ready")
    return "Gambar utama belum memiliki terjemahan Inggris published yang eligible; paket tidak dapat dipublikasikan Inggris.";
  return "Status gambar utama belum dapat dimuat. Muat ulang sebelum mengambil keputusan publikasi.";
}

export function TourismPackageTranslationForm({
  initialState,
  sourceReference,
  itinerary,
  primaryImageStatus,
}: Props) {
  const boundAction = manageTourismPackageTranslation.bind(
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

  const lifecycleLabel = getTourismPackageTranslationLifecycleLabel(
    state.lifecycleState,
  );
  const editable = isTourismPackageTranslationEditable(
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
  const buttonClasses =
    "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-wait disabled:text-slate-400";
  const primaryButtonClasses =
    "inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-wait disabled:bg-slate-400";
  const successButtonClasses =
    "inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-wait disabled:bg-slate-400";

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
            English translation
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Terjemahan Inggris Paket Wisata
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Semua konten Inggris ditulis eksplisit oleh administrator. Referensi
            Indonesia, nilai paket bersama, dan itinerary tidak dapat diedit di
            workspace ini.
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
        {state.sourceRevision ?? "Belum tersedia"} ·{" "}
        <span className="font-semibold text-slate-800">Revisi edit:</span>{" "}
        {state.editRevision ?? "Belum ada draf"}
      </p>

      <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-slate-800">Source slug</dt>
          <dd className="mt-1 font-mono text-xs">{sourceReference.slug}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">Package type</dt>
          <dd className="mt-1">
            {getTourismPackageTypeLabel(sourceReference.package_type)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">Status eligibility</dt>
          <dd className="mt-1">
            {state.publicationEligibility
              ? "Eligible untuk publikasi"
              : "Belum eligible"}
          </dd>
        </div>
      </dl>

      {state.lifecycleState === "stale" ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          <p className="font-semibold">Stale: checkpoint publikasi diblokir.</p>
          <p className="mt-1">
            Database mendeteksi perubahan pada sumber paket, susunan itinerary,
            gambar utama, atau fingerprint terjemahan. Review baru diperlukan.
          </p>
        </div>
      ) : null}
      {state.sourceBlocked ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          Sumber paket wisata belum berstatus published. Terjemahan tetap
          fail-closed sampai sumber memenuhi aturan database.
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

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <p className="font-semibold">Aturan gambar utama</p>
        <p className="mt-1">{primaryImageMessage(primaryImageStatus)}</p>
      </div>

      <section
        aria-labelledby="tourism-package-itinerary-heading"
        data-testid="tourism-package-itinerary-reference"
        className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
      >
        <h3
          id="tourism-package-itinerary-heading"
          className="text-lg font-bold text-slate-950"
        >
          Itinerary sumber (read-only)
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Susunan stop dan catatan Indonesia dikelola oleh workflow paket
          sumber. Tidak ada kolom catatan Inggris dan tidak ada perubahan relasi
          dari workspace terjemahan.
        </p>
        {itinerary.length > 0 ? (
          <ol className="mt-5 space-y-3">
            {itinerary.map((stop) => (
              <li
                key={stop.relationId}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {stop.displayOrder + 1}. {stop.destinationName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Status sumber:{" "}
                      {stop.destinationStatus ?? "tidak tersedia"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      stop.englishEligible
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {stop.englishEligible
                      ? "English ready"
                      : "English unavailable / not eligible"}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                  <span className="font-semibold">Catatan Indonesia:</span>{" "}
                  {stop.notes.trim() || "Belum diisi"}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
            Belum ada stop itinerary. Database akan menolak publikasi paket yang
            tidak memiliki relasi Destination.
          </p>
        )}
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <h3 className="text-lg font-bold text-slate-950">
            Referensi Indonesia dan nilai paket bersama
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Panel ini hanya referensi. Nilainya tidak pernah digunakan sebagai
            nilai awal kolom bahasa Inggris.
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
            <div>
              <dt className="text-sm font-semibold text-slate-700">
                Durasi bersama
              </dt>
              <dd className="mt-1 text-sm leading-6 text-slate-900">
                {sourceReference.duration_value} {sourceReference.duration_unit}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-slate-700">
                Harga bersama
              </dt>
              <dd className="mt-1 text-sm leading-6 text-slate-900">
                {sourceReference.price === null
                  ? "Belum diisi"
                  : `IDR ${sourceReference.price.toLocaleString("id-ID")}`}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-slate-700">
                Featured / display order
              </dt>
              <dd className="mt-1 text-sm leading-6 text-slate-900">
                {sourceReference.is_featured ? "Featured" : "Not featured"} ·{" "}
                {sourceReference.display_order}
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
              Draf boleh belum lengkap. Sebelum review, kolom sumber yang berisi
              harus diterjemahkan eksplisit dan kolom sumber kosong harus tetap
              kosong.
            </p>
            {FIELD_CONFIG.map(({ field, label, rows, required }) => {
              const messageId = `tourism-package-translation-${field}-message`;
              return (
                <div key={field}>
                  <label
                    htmlFor={`tourism-package-translation-${field}`}
                    className="block text-sm font-semibold text-slate-800"
                  >
                    {label}
                    {required ? (
                      <>
                        <span aria-hidden="true" className="text-red-700">
                          {" "}
                          *
                        </span>
                        <span className="sr-only"> (wajib)</span>
                      </>
                    ) : null}
                  </label>
                  {rows === null ? (
                    <input
                      id={`tourism-package-translation-${field}`}
                      name={field}
                      type="text"
                      defaultValue={state.values[field]}
                      aria-invalid={Boolean(state.fieldErrors[field])}
                      aria-describedby={messageId}
                      className={inputClasses}
                    />
                  ) : (
                    <textarea
                      id={`tourism-package-translation-${field}`}
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
                Saya telah melakukan review manusia atas terminologi dan konteks
                budaya paket ini serta memastikan tidak ada informasi yang
                dikarang.
              </span>
            </label>
          ) : null}

          {canReject ? (
            <div>
              <label
                htmlFor="tourism-package-translation-rejection-reason"
                className="block text-sm font-semibold text-slate-800"
              >
                Alasan penolakan{" "}
                <span aria-hidden="true" className="text-red-700">
                  *
                </span>
              </label>
              <textarea
                id="tourism-package-translation-rejection-reason"
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
                    <span className="ml-2 text-slate-500">
                      {event.previous_translation_status} →{" "}
                      {event.new_translation_status}
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
