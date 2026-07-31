"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { AdminCoordinatePicker } from "@/features/admin-map/admin-coordinate-picker";
import { createUmkm, updateUmkm } from "./actions";
import {
  getAllowedUmkmStatuses,
  getUmkmStatusLabel,
  type UmkmActionState,
  type UmkmFormField,
  type UmkmMutationMode,
  type UmkmStatus,
} from "./model";

type Props = {
  currentStatus: UmkmStatus | null;
  hasThumbnail: boolean;
  initialState: UmkmActionState;
  mode: UmkmMutationMode;
  umkmId?: string;
};

function FieldMessage({
  error,
  helper,
  id,
}: {
  error?: string;
  helper?: string;
  id: string;
}) {
  if (error)
    return (
      <p id={id} className="mt-2 text-sm font-medium text-red-700">
        {error}
      </p>
    );
  if (helper)
    return (
      <p id={id} className="mt-2 text-sm leading-6 text-slate-500">
        {helper}
      </p>
    );
  return null;
}

export function UmkmForm({
  currentStatus,
  hasThumbnail,
  initialState,
  mode,
  umkmId,
}: Props) {
  const action =
    mode === "create" ? createUmkm : updateUmkm.bind(null, umkmId ?? "");
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.revision === 0) return;
    const invalid = formRef.current?.querySelector<HTMLElement>(
      "[aria-invalid='true']",
    );
    if (invalid) invalid.focus();
    else feedbackRef.current?.focus();
  }, [state.revision]);

  const inputClasses =
    "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100";
  const labelClasses = "block text-sm font-semibold text-slate-800";
  const errors = Object.entries(state.fieldErrors) as [UmkmFormField, string][];
  const describedBy = (field: UmkmFormField, helper = false) =>
    state.fieldErrors[field] || helper ? `${field}-message` : undefined;
  const statuses = getAllowedUmkmStatuses(currentStatus);

  function confirmArchive(event: React.FormEvent<HTMLFormElement>) {
    if (currentStatus === "archived") return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("business_name") ?? "").trim() || "ini";
    if (
      data.get("status") === "archived" &&
      !window.confirm(
        `Arsipkan UMKM “${name}”? Konten tidak akan tampil pada layanan publik.`,
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
          {errors.length || state.formErrors.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.formErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
              {errors.map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <fieldset disabled={isPending} className="space-y-6 disabled:opacity-75">
        <legend className="text-xl font-bold text-slate-950">
          Informasi usaha
        </legend>
        <p className="text-sm leading-6 text-slate-600">
          Kolom bertanda * wajib diisi. Slug dibuat otomatis saat penyimpanan
          pertama dan tidak tersedia sebagai input.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="business_name" className={labelClasses}>
              Nama usaha{" "}
              <span aria-hidden="true" className="text-red-700">
                *
              </span>
              <span className="sr-only"> (wajib)</span>
            </label>
            <input
              id="business_name"
              name="business_name"
              required
              defaultValue={state.values.business_name}
              aria-invalid={Boolean(state.fieldErrors.business_name)}
              aria-describedby={describedBy("business_name")}
              className={inputClasses}
            />
            <FieldMessage
              id="business_name-message"
              error={state.fieldErrors.business_name}
            />
          </div>
          <div>
            <label htmlFor="category" className={labelClasses}>
              Kategori{" "}
              <span aria-hidden="true" className="text-red-700">
                *
              </span>
              <span className="sr-only"> (wajib)</span>
            </label>
            <input
              id="category"
              name="category"
              required
              defaultValue={state.values.category}
              aria-invalid={Boolean(state.fieldErrors.category)}
              aria-describedby={describedBy("category", true)}
              className={inputClasses}
            />
            <FieldMessage
              id="category-message"
              error={state.fieldErrors.category}
              helper="Gunakan kategori usaha yang sudah disepakati secara operasional; kategori tidak dikelola oleh modul ini."
            />
          </div>
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
            helper="Tuliskan informasi usaha yang sudah diverifikasi tanpa data inventaris atau transaksi."
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
          Data berikut hanya dapat diterbitkan setelah persetujuan pemilik data
          dicatat.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {(
            [
              ["owner_name", "Nama pemilik atau pengelola", "text"],
              ["contact_name", "Nama kontak", "text"],
              ["contact_phone", "Nomor telepon", "tel"],
              ["contact_whatsapp", "Nomor WhatsApp", "tel"],
            ] as const
          ).map(([field, label, type]) => (
            <div key={field}>
              <label htmlFor={field} className={labelClasses}>
                {label}
              </label>
              <input
                id={field}
                name={field}
                type={type}
                defaultValue={state.values[field]}
                aria-invalid={Boolean(state.fieldErrors[field])}
                aria-describedby={describedBy(field)}
                className={inputClasses}
              />
              <FieldMessage
                id={`${field}-message`}
                error={state.fieldErrors[field]}
              />
            </div>
          ))}
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
                Persetujuan publikasi pemilik dan kontak sudah dikonfirmasi
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                Jangan mencentang tanpa persetujuan yang benar-benar tercatat.
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
              {statuses.map((status) => (
                <option
                  key={status}
                  value={status}
                  disabled={status === "published" && !hasThumbnail}
                >
                  {getUmkmStatusLabel(status)}
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
                  ? "UMKM baru selalu dimulai sebagai draf."
                  : "UMKM yang diarsipkan hanya dapat dipulihkan ke draf."
              }
            />
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
          <input
            name="is_featured"
            type="checkbox"
            defaultChecked={state.values.is_featured}
            aria-invalid={Boolean(state.fieldErrors.is_featured)}
            className="mt-1 size-4 rounded border-slate-400 text-emerald-700 focus:ring-3 focus:ring-emerald-200"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              Tandai sebagai UMKM unggulan
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              Penandaan tidak menerbitkan konten secara otomatis.
            </span>
          </span>
        </label>
        <div
          className={`rounded-xl border px-4 py-3 text-sm leading-6 ${hasThumbnail ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
        >
          {hasThumbnail
            ? "Gambar utama sudah tercatat. Publikasi tetap memerlukan koordinat, telepon, atau WhatsApp serta persetujuan untuk data pemilik/kontak."
            : "Gambar utama belum tersedia. Publikasi ditunda sampai modul media menambahkan gambar utama."}
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/umkm"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Kembali ke daftar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending
            ? "Menyimpan…"
            : mode === "create"
              ? "Simpan UMKM"
              : "Simpan perubahan"}
        </button>
      </div>
    </form>
  );
}
