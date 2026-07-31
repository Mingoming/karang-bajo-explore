"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { AdminCoordinatePicker } from "@/features/admin-map/admin-coordinate-picker";
import { createHomestay, updateHomestay } from "./actions";
import {
  getAllowedHomestayStatuses,
  getHomestayStatusLabel,
  type HomestayActionState,
  type HomestayFormField,
  type HomestayMutationMode,
  type HomestayStatus,
} from "./model";

type HomestayFormProps = {
  currentStatus: HomestayStatus | null;
  hasThumbnail: boolean;
  homestayId?: string;
  initialState: HomestayActionState;
  mode: HomestayMutationMode;
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

export function HomestayForm({
  currentStatus,
  hasThumbnail,
  homestayId,
  initialState,
  mode,
}: HomestayFormProps) {
  const homestayAction =
    mode === "create"
      ? createHomestay
      : updateHomestay.bind(null, homestayId ?? "");
  const [state, formAction, isPending] = useActionState(
    homestayAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.revision === 0) return;

    if (state.kind === "validation-error" || state.kind === "duplicate-error") {
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
    HomestayFormField,
    string,
  ][];
  const allowedStatuses = getAllowedHomestayStatuses(currentStatus);
  const inputClasses =
    "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100";
  const labelClasses = "block text-sm font-semibold text-slate-800";
  const describedBy = (field: HomestayFormField, hasHelper = false) =>
    state.fieldErrors[field] || hasHelper ? `${field}-message` : undefined;

  function confirmArchive(event: React.FormEvent<HTMLFormElement>) {
    if (currentStatus === "archived") return;

    const submittedData = new FormData(event.currentTarget);
    const selectedStatus = submittedData.get("status");
    const submittedName = submittedData.get("name");
    const homestayName =
      typeof submittedName === "string" && submittedName.trim()
        ? submittedName.trim()
        : "ini";

    if (
      selectedStatus === "archived" &&
      !window.confirm(
        `Arsipkan homestay “${homestayName}”? Konten tidak akan tampil pada layanan publik.`,
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
          Kolom bertanda <span aria-hidden="true">*</span> wajib diisi. Slug
          dibuat otomatis saat penyimpanan pertama dan tidak ditampilkan sebagai
          input.
        </p>

        <div>
          <label htmlFor="name" className={labelClasses}>
            Nama homestay{" "}
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
            aria-describedby={describedBy("description", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="description-message"
            error={state.fieldErrors.description}
            helper="Jelaskan informasi homestay yang sudah diverifikasi untuk calon pengunjung."
          />
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">
          Pemilik dan kontak opsional
        </legend>
        <p className="text-sm leading-6 text-slate-600">
          Data pemilik atau telepon hanya boleh diterbitkan setelah persetujuan
          publikasi dicatat.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="owner_name" className={labelClasses}>
              Nama pemilik atau pengelola
            </label>
            <input
              id="owner_name"
              name="owner_name"
              type="text"
              defaultValue={state.values.owner_name}
              aria-invalid={Boolean(state.fieldErrors.owner_name)}
              aria-describedby={describedBy("owner_name")}
              className={inputClasses}
            />
            <FieldMessage
              id="owner_name-message"
              error={state.fieldErrors.owner_name}
            />
          </div>

          <div>
            <label htmlFor="phone" className={labelClasses}>
              Nomor telepon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={state.values.phone}
              aria-invalid={Boolean(state.fieldErrors.phone)}
              aria-describedby={describedBy("phone")}
              className={inputClasses}
            />
            <FieldMessage id="phone-message" error={state.fieldErrors.phone} />
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
                Centang hanya setelah pemilik data menyetujui publikasi.
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
        <legend className="text-xl font-bold text-slate-950">
          Harga dan fasilitas
        </legend>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="price_per_night" className={labelClasses}>
              Harga per malam
            </label>
            <input
              id="price_per_night"
              name="price_per_night"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              defaultValue={state.values.price_per_night}
              aria-invalid={Boolean(state.fieldErrors.price_per_night)}
              aria-describedby={describedBy("price_per_night", true)}
              className={inputClasses}
            />
            <FieldMessage
              id="price_per_night-message"
              error={state.fieldErrors.price_per_night}
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
              helper="Gunakan untuk menjelaskan ketentuan atau fasilitas yang termasuk."
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
            rows={6}
            defaultValue={state.values.facilities}
            aria-invalid={Boolean(state.fieldErrors.facilities)}
            aria-describedby={describedBy("facilities", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="facilities-message"
            error={state.fieldErrors.facilities}
            helper="Tuliskan satu fasilitas per baris. Baris kosong akan diabaikan dan urutan dipertahankan."
          />
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">Lokasi</legend>

        <div>
          <label htmlFor="address" className={labelClasses}>
            Alamat
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            defaultValue={state.values.address}
            aria-invalid={Boolean(state.fieldErrors.address)}
            aria-describedby={describedBy("address")}
            className={inputClasses}
          />
          <FieldMessage
            id="address-message"
            error={state.fieldErrors.address}
          />
        </div>

        <AdminCoordinatePicker
          disabled={isPending}
          latitudeValue={state.values.latitude}
          longitudeValue={state.values.longitude}
          latitudeError={state.fieldErrors.latitude}
          longitudeError={state.fieldErrors.longitude}
        />

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
                  {getHomestayStatusLabel(status)}
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
                  ? "Homestay baru selalu dimulai sebagai draf."
                  : "Homestay yang diarsipkan hanya dapat dipulihkan ke draf."
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
                Tandai sebagai homestay unggulan
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
            ? "Gambar utama sudah tercatat. Homestay dapat diterbitkan jika seluruh validasi lain terpenuhi."
            : "Gambar utama belum tersedia. Publikasi ditunda sampai modul media menambahkan gambar utama."}
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/homestay"
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
              ? "Buat homestay"
              : "Simpan perubahan"}
        </button>
      </div>
    </form>
  );
}
