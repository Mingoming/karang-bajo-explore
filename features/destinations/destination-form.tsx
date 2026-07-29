"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { createDestination, updateDestination } from "./actions";
import {
  getAllowedDestinationStatuses,
  getDestinationStatusLabel,
  type DestinationActionState,
  type DestinationCategoryOption,
  type DestinationFormField,
  type DestinationMutationMode,
  type DestinationStatus,
} from "./model";

type DestinationFormProps = {
  categories: DestinationCategoryOption[];
  currentStatus: DestinationStatus | null;
  destinationId?: string;
  hasThumbnail: boolean;
  initialState: DestinationActionState;
  mode: DestinationMutationMode;
};

type FieldMessageProps = {
  error?: string;
  helper?: string;
  id: string;
};

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

export function DestinationForm({
  categories,
  currentStatus,
  destinationId,
  hasThumbnail,
  initialState,
  mode,
}: DestinationFormProps) {
  const destinationAction =
    mode === "create"
      ? createDestination
      : updateDestination.bind(null, destinationId ?? "");
  const [state, formAction, isPending] = useActionState(
    destinationAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.revision === 0) {
      return;
    }

    if (
      state.kind === "validation-error" ||
      state.kind === "duplicate-error" ||
      state.kind === "category-error"
    ) {
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

  const errorEntries = Object.entries(state.fieldErrors) as [
    DestinationFormField,
    string,
  ][];
  const allowedStatuses = getAllowedDestinationStatuses(currentStatus);
  const inputClasses =
    "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100";
  const labelClasses = "block text-sm font-semibold text-slate-800";
  const describedBy = (field: DestinationFormField, hasHelper = false) =>
    state.fieldErrors[field] || hasHelper ? `${field}-message` : undefined;

  function confirmArchive(event: React.FormEvent<HTMLFormElement>) {
    if (currentStatus === "archived") {
      return;
    }

    const submittedData = new FormData(event.currentTarget);
    const selectedStatus = submittedData.get("status");
    const submittedName = submittedData.get("name");
    const destinationName =
      typeof submittedName === "string" && submittedName.trim()
        ? submittedName.trim()
        : "ini";
    if (
      selectedStatus === "archived" &&
      !window.confirm(
        `Arsipkan destinasi “${destinationName}”? Konten tidak akan tampil pada layanan publik.`,
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <form
      key={state.revision}
      ref={formRef}
      action={formAction}
      onSubmit={confirmArchive}
      noValidate
      className="mt-8 space-y-8"
    >
      {state.kind !== "idle" && state.message ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900 outline-none focus:ring-3 focus:ring-red-200"
        >
          <p className="font-semibold">{state.message}</p>
          {errorEntries.length > 0 || state.formErrors.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.formErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
              {errorEntries.map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <fieldset disabled={isPending} className="space-y-6 disabled:opacity-75">
        <legend className="text-xl font-bold text-slate-950">
          Informasi dasar
        </legend>
        <p className="text-sm leading-6 text-slate-600">
          Kolom bertanda <span aria-hidden="true">*</span> wajib diisi oleh
          skema saat ini. Slug dibuat otomatis ketika destinasi pertama kali
          disimpan dan tidak ditampilkan sebagai input.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClasses}>
              Nama destinasi{" "}
              <span aria-hidden="true" className="text-red-700">
                *
              </span>
              <span className="sr-only"> (wajib)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={state.values.name}
              aria-invalid={Boolean(state.fieldErrors.name)}
              aria-describedby={describedBy("name")}
              className={inputClasses}
            />
            <FieldMessage id="name-message" error={state.fieldErrors.name} />
          </div>

          <div>
            <label htmlFor="category_id" className={labelClasses}>
              Kategori{" "}
              <span aria-hidden="true" className="text-red-700">
                *
              </span>
              <span className="sr-only"> (wajib)</span>
            </label>
            <select
              id="category_id"
              name="category_id"
              required
              defaultValue={state.values.category_id}
              aria-invalid={Boolean(state.fieldErrors.category_id)}
              aria-describedby={describedBy("category_id", true)}
              className={inputClasses}
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldMessage
              id="category_id-message"
              error={state.fieldErrors.category_id}
              helper="Kategori berasal dari referensi tetap Alam, Budaya, dan Religi."
            />
          </div>
        </div>

        <div>
          <label htmlFor="summary" className={labelClasses}>
            Ringkasan{" "}
            <span aria-hidden="true" className="text-red-700">
              *
            </span>
            <span className="sr-only"> (wajib)</span>
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={3}
            required
            defaultValue={state.values.summary}
            aria-invalid={Boolean(state.fieldErrors.summary)}
            aria-describedby={describedBy("summary", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="summary-message"
            error={state.fieldErrors.summary}
            helper="Ringkasan singkat untuk daftar dan pratinjau destinasi."
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClasses}>
            Deskripsi{" "}
            <span aria-hidden="true" className="text-red-700">
              *
            </span>
            <span className="sr-only"> (wajib)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={7}
            required
            defaultValue={state.values.description}
            aria-invalid={Boolean(state.fieldErrors.description)}
            aria-describedby={describedBy("description")}
            className={inputClasses}
          />
          <FieldMessage
            id="description-message"
            error={state.fieldErrors.description}
          />
        </div>

        <div>
          <label htmlFor="history" className={labelClasses}>
            Sejarah atau latar belakang
          </label>
          <textarea
            id="history"
            name="history"
            rows={5}
            defaultValue={state.values.history}
            aria-invalid={Boolean(state.fieldErrors.history)}
            aria-describedby={describedBy("history", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="history-message"
            error={state.fieldErrors.history}
            helper="Isi hanya informasi destinasi yang sudah diverifikasi."
          />
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">
          Informasi pengunjung
        </legend>

        <div>
          <label htmlFor="opening_hours" className={labelClasses}>
            Jam kunjungan
          </label>
          <input
            id="opening_hours"
            name="opening_hours"
            type="text"
            defaultValue={state.values.opening_hours}
            aria-invalid={Boolean(state.fieldErrors.opening_hours)}
            aria-describedby={describedBy("opening_hours", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="opening_hours-message"
            error={state.fieldErrors.opening_hours}
            helper="Gunakan keterangan yang mudah dipahami, termasuk jika kunjungan perlu janji."
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="entrance_fee" className={labelClasses}>
              Biaya masuk
            </label>
            <input
              id="entrance_fee"
              name="entrance_fee"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              defaultValue={state.values.entrance_fee}
              aria-invalid={Boolean(state.fieldErrors.entrance_fee)}
              aria-describedby={describedBy("entrance_fee", true)}
              className={inputClasses}
            />
            <FieldMessage
              id="entrance_fee-message"
              error={state.fieldErrors.entrance_fee}
              helper="Kosong berarti belum tersedia, 0 berarti gratis, dan nilai positif menggunakan rupiah."
            />
          </div>

          <div>
            <label htmlFor="price_note" className={labelClasses}>
              Catatan harga
            </label>
            <input
              id="price_note"
              name="price_note"
              type="text"
              defaultValue={state.values.price_note}
              aria-invalid={Boolean(state.fieldErrors.price_note)}
              aria-describedby={describedBy("price_note", true)}
              className={inputClasses}
            />
            <FieldMessage
              id="price_note-message"
              error={state.fieldErrors.price_note}
              helper="Contoh: harga dapat berubah atau termasuk pemandu."
            />
          </div>
        </div>

        <div>
          <label htmlFor="facilities" className={labelClasses}>
            Fasilitas
          </label>
          <textarea
            id="facilities"
            name="facilities"
            rows={5}
            defaultValue={state.values.facilities}
            aria-invalid={Boolean(state.fieldErrors.facilities)}
            aria-describedby={describedBy("facilities", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="facilities-message"
            error={state.fieldErrors.facilities}
            helper="Tuliskan satu fasilitas per baris. Baris kosong akan diabaikan."
          />
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">
          Kontak opsional
        </legend>
        <p className="text-sm leading-6 text-slate-600">
          Kontak per destinasi bersifat opsional. Kontak hanya dapat diterbitkan
          jika persetujuan publikasi sudah dicatat.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="contact_name" className={labelClasses}>
              Nama kontak
            </label>
            <input
              id="contact_name"
              name="contact_name"
              type="text"
              defaultValue={state.values.contact_name}
              aria-invalid={Boolean(state.fieldErrors.contact_name)}
              aria-describedby={describedBy("contact_name")}
              className={inputClasses}
            />
            <FieldMessage
              id="contact_name-message"
              error={state.fieldErrors.contact_name}
            />
          </div>

          <div>
            <label htmlFor="contact_phone" className={labelClasses}>
              Nomor kontak
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              type="tel"
              defaultValue={state.values.contact_phone}
              aria-invalid={Boolean(state.fieldErrors.contact_phone)}
              aria-describedby={describedBy("contact_phone")}
              className={inputClasses}
            />
            <FieldMessage
              id="contact_phone-message"
              error={state.fieldErrors.contact_phone}
            />
          </div>
        </div>

        <div>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              name="contact_consent_confirmed"
              type="checkbox"
              defaultChecked={state.values.contact_consent_confirmed}
              aria-invalid={Boolean(
                state.fieldErrors.contact_consent_confirmed,
              )}
              aria-describedby={describedBy("contact_consent_confirmed")}
              className="mt-1 size-4 rounded border-slate-400 text-emerald-700 focus:ring-3 focus:ring-emerald-200"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Persetujuan publikasi kontak sudah dikonfirmasi
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                Centang hanya setelah pemilik kontak menyetujui publikasi.
              </span>
            </span>
          </label>
          <FieldMessage
            id="contact_consent_confirmed-message"
            error={state.fieldErrors.contact_consent_confirmed}
          />
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">Lokasi</legend>
        <p className="text-sm leading-6 text-slate-600">
          Koordinat wajib disimpan sebagai pasangan. Peta interaktif tidak
          termasuk dalam tahap ini.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="latitude" className={labelClasses}>
              Latitude{" "}
              <span aria-hidden="true" className="text-red-700">
                *
              </span>
              <span className="sr-only"> (wajib)</span>
            </label>
            <input
              id="latitude"
              name="latitude"
              type="number"
              inputMode="decimal"
              min={-90}
              max={90}
              step="any"
              required
              defaultValue={state.values.latitude}
              aria-invalid={Boolean(state.fieldErrors.latitude)}
              aria-describedby={describedBy("latitude", true)}
              className={inputClasses}
            />
            <FieldMessage
              id="latitude-message"
              error={state.fieldErrors.latitude}
              helper="Nilai antara -90 dan 90."
            />
          </div>

          <div>
            <label htmlFor="longitude" className={labelClasses}>
              Longitude{" "}
              <span aria-hidden="true" className="text-red-700">
                *
              </span>
              <span className="sr-only"> (wajib)</span>
            </label>
            <input
              id="longitude"
              name="longitude"
              type="number"
              inputMode="decimal"
              min={-180}
              max={180}
              step="any"
              required
              defaultValue={state.values.longitude}
              aria-invalid={Boolean(state.fieldErrors.longitude)}
              aria-describedby={describedBy("longitude", true)}
              className={inputClasses}
            />
            <FieldMessage
              id="longitude-message"
              error={state.fieldErrors.longitude}
              helper="Nilai antara -180 dan 180."
            />
          </div>
        </div>

        <div>
          <label htmlFor="google_maps_url" className={labelClasses}>
            Tautan Google Maps
          </label>
          <input
            id="google_maps_url"
            name="google_maps_url"
            type="url"
            inputMode="url"
            placeholder="https://maps.google.com/..."
            defaultValue={state.values.google_maps_url}
            aria-invalid={Boolean(state.fieldErrors.google_maps_url)}
            aria-describedby={describedBy("google_maps_url", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="google_maps_url-message"
            error={state.fieldErrors.google_maps_url}
            helper="Gunakan alamat lengkap yang diawali http:// atau https://."
          />
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">
          Pengurutan dan publikasi
        </legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="display_order" className={labelClasses}>
              Urutan tampilan{" "}
              <span aria-hidden="true" className="text-red-700">
                *
              </span>
              <span className="sr-only"> (wajib)</span>
            </label>
            <input
              id="display_order"
              name="display_order"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              required
              defaultValue={state.values.display_order}
              aria-invalid={Boolean(state.fieldErrors.display_order)}
              aria-describedby={describedBy("display_order", true)}
              className={inputClasses}
            />
            <FieldMessage
              id="display_order-message"
              error={state.fieldErrors.display_order}
              helper="Angka lebih kecil ditampilkan lebih dahulu."
            />
          </div>

          <div>
            <label htmlFor="status" className={labelClasses}>
              Status publikasi{" "}
              <span aria-hidden="true" className="text-red-700">
                *
              </span>
              <span className="sr-only"> (wajib)</span>
            </label>
            <select
              id="status"
              name="status"
              required
              defaultValue={state.values.status}
              aria-invalid={Boolean(state.fieldErrors.status)}
              aria-describedby={describedBy("status", true)}
              className={inputClasses}
            >
              {allowedStatuses.map((status) => (
                <option
                  key={status}
                  value={status}
                  disabled={status === "published" && !hasThumbnail}
                >
                  {getDestinationStatusLabel(status)}
                  {status === "published" && !hasThumbnail
                    ? " — memerlukan gambar utama"
                    : ""}
                </option>
              ))}
            </select>
            <FieldMessage
              id="status-message"
              error={state.fieldErrors.status}
              helper={
                mode === "create"
                  ? "Destinasi baru selalu dimulai sebagai draf."
                  : "Destinasi yang diarsipkan hanya dapat dipulihkan ke draf."
              }
            />
          </div>
        </div>

        <div>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              name="is_featured"
              type="checkbox"
              defaultChecked={state.values.is_featured}
              aria-invalid={Boolean(state.fieldErrors.is_featured)}
              aria-describedby={describedBy("is_featured")}
              className="mt-1 size-4 rounded border-slate-400 text-emerald-700 focus:ring-3 focus:ring-emerald-200"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Tandai sebagai destinasi unggulan
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                Penandaan tidak menerbitkan konten secara otomatis.
              </span>
            </span>
          </label>
          <FieldMessage
            id="is_featured-message"
            error={state.fieldErrors.is_featured}
          />
        </div>

        <div
          className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
            hasThumbnail
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {hasThumbnail
            ? "Gambar utama sudah tercatat. Destinasi dapat diterbitkan jika seluruh validasi lain terpenuhi."
            : "Gambar utama belum tersedia. Publikasi ditunda sampai modul media menambahkan gambar utama."}
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/destinasi"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Kembali ke daftar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:bg-slate-400"
        >
          {isPending
            ? "Menyimpan…"
            : mode === "create"
              ? "Buat destinasi"
              : "Simpan perubahan"}
        </button>
      </div>
    </form>
  );
}
