"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { AdminCoordinatePicker } from "@/features/admin-map/admin-coordinate-picker";
import { createCulturalEvent, updateCulturalEvent } from "./actions";
import {
  getAllowedCulturalEventStatuses,
  getCulturalEventStatusLabel,
  type CulturalEventActionState,
  type CulturalEventFormField,
  type CulturalEventMutationMode,
  type CulturalEventStatus,
} from "./model";

type Props = {
  mode: CulturalEventMutationMode;
  eventId?: string;
  currentStatus: CulturalEventStatus | null;
  hasThumbnail: boolean;
  initialState: CulturalEventActionState;
};

type FieldMessageProps = { id: string; error?: string; helper?: string };

function FieldMessage({ id, error, helper }: FieldMessageProps) {
  if (!error && !helper) return null;
  return (
    <p
      id={id}
      className={`mt-2 text-sm leading-6 ${error ? "font-medium text-red-700" : "text-slate-500"}`}
    >
      {error ?? helper}
    </p>
  );
}

export function CulturalEventForm({
  mode,
  eventId,
  currentStatus,
  hasThumbnail,
  initialState,
}: Props) {
  const action =
    mode === "create"
      ? createCulturalEvent
      : updateCulturalEvent.bind(null, eventId ?? "");
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.revision === 0) return;
    if (state.kind === "validation-error" || state.kind === "duplicate-error") {
      formRef.current
        ?.querySelector<HTMLElement>("[aria-invalid='true']")
        ?.focus();
      return;
    }
    feedbackRef.current?.focus();
  }, [state.kind, state.revision]);

  const statuses = getAllowedCulturalEventStatuses(currentStatus);
  const errorEntries = Object.entries(state.fieldErrors) as [
    CulturalEventFormField,
    string,
  ][];
  const describedBy = (field: CulturalEventFormField, helper = false) =>
    state.fieldErrors[field] || helper ? `${field}-message` : undefined;
  const inputClasses =
    "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100";
  const labelClasses = "block text-sm font-semibold text-slate-800";

  return (
    <form
      key={state.revision}
      ref={formRef}
      action={formAction}
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
          Informasi acara
        </legend>
        <p className="text-sm leading-6 text-slate-600">
          Kolom bertanda <span aria-hidden="true">*</span> wajib diisi. Slug
          dibuat otomatis dari judul saat record dibuat dan disembunyikan dari
          formulir.
        </p>
        <div>
          <label htmlFor="title" className={labelClasses}>
            Judul acara <span className="text-red-700">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={state.values.title}
            aria-invalid={Boolean(state.fieldErrors.title)}
            aria-describedby={describedBy("title")}
            className={inputClasses}
          />
          <FieldMessage id="title-message" error={state.fieldErrors.title} />
        </div>
        {(
          [
            ["summary", "Ringkasan", 3],
            ["description", "Deskripsi", 7],
            ["event_type", "Jenis acara", 1],
          ] as const
        ).map(([field, label, rows]) => (
          <div key={field}>
            <label htmlFor={field} className={labelClasses}>
              {label}
              {field === "description" ? (
                <span className="text-red-700"> *</span>
              ) : null}
            </label>
            {rows === 1 ? (
              <input
                id={field}
                name={field}
                defaultValue={state.values[field]}
                aria-invalid={Boolean(state.fieldErrors[field])}
                aria-describedby={describedBy(field)}
                className={inputClasses}
              />
            ) : (
              <textarea
                id={field}
                name={field}
                rows={rows}
                required={field === "description"}
                defaultValue={state.values[field]}
                aria-invalid={Boolean(state.fieldErrors[field])}
                aria-describedby={describedBy(field)}
                className={inputClasses}
              />
            )}
            <FieldMessage
              id={`${field}-message`}
              error={state.fieldErrors[field]}
            />
          </div>
        ))}
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">
          Waktu acara
        </legend>
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
          Semua waktu dimasukkan dan ditampilkan sebagai WITA (Asia/Makassar).
          Sistem mengonversinya secara eksplisit ke waktu database; zona waktu
          perangkat tidak digunakan sebagai dasar konversi.
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="start_at_local" className={labelClasses}>
              Mulai — WITA
            </label>
            <input
              id="start_at_local"
              name="start_at_local"
              type="datetime-local"
              step={60}
              defaultValue={state.values.start_at_local}
              aria-invalid={Boolean(state.fieldErrors.start_at_local)}
              aria-describedby={describedBy("start_at_local", true)}
              className={inputClasses}
            />
            <FieldMessage
              id="start_at_local-message"
              error={state.fieldErrors.start_at_local}
              helper="Kosongkan hanya bila tanggal belum dikonfirmasi; record tersebut wajib tetap draf."
            />
          </div>
          <div>
            <label htmlFor="end_at_local" className={labelClasses}>
              Selesai — WITA
            </label>
            <input
              id="end_at_local"
              name="end_at_local"
              type="datetime-local"
              step={60}
              defaultValue={state.values.end_at_local}
              aria-invalid={Boolean(state.fieldErrors.end_at_local)}
              aria-describedby={describedBy("end_at_local", true)}
              className={inputClasses}
            />
            <FieldMessage
              id="end_at_local-message"
              error={state.fieldErrors.end_at_local}
              helper="Opsional, tetapi tidak boleh lebih awal dari waktu mulai."
            />
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
          <input
            name="all_day"
            type="checkbox"
            defaultChecked={state.values.all_day}
            aria-invalid={Boolean(state.fieldErrors.all_day)}
            className="mt-1 size-4 rounded border-slate-400 text-emerald-700 focus:ring-3 focus:ring-emerald-200"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              Acara berlangsung sepanjang hari
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              Penanda ini tidak membuat tanggal otomatis dan tidak membuat pola
              pengulangan.
            </span>
          </span>
        </label>
        <div>
          <label htmlFor="date_note" className={labelClasses}>
            Catatan tanggal
          </label>
          <textarea
            id="date_note"
            name="date_note"
            rows={3}
            defaultValue={state.values.date_note}
            aria-invalid={Boolean(state.fieldErrors.date_note)}
            aria-describedby={describedBy("date_note", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="date_note-message"
            error={state.fieldErrors.date_note}
            helper="Gunakan untuk menjelaskan jadwal yang belum pasti. Catatan tanggal tidak menggantikan tanggal pasti untuk publikasi."
          />
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">Lokasi</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="location_name" className={labelClasses}>
              Nama lokasi
            </label>
            <input
              id="location_name"
              name="location_name"
              defaultValue={state.values.location_name}
              aria-invalid={Boolean(state.fieldErrors.location_name)}
              aria-describedby={describedBy("location_name")}
              className={inputClasses}
            />
            <FieldMessage
              id="location_name-message"
              error={state.fieldErrors.location_name}
            />
          </div>
          <div>
            <label htmlFor="address" className={labelClasses}>
              Alamat
            </label>
            <input
              id="address"
              name="address"
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
            helper="Gunakan tautan lengkap HTTP atau HTTPS."
          />
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">
          Penyelenggara dan kunjungan
        </legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="organizer" className={labelClasses}>
              Penyelenggara
            </label>
            <input
              id="organizer"
              name="organizer"
              defaultValue={state.values.organizer}
              aria-invalid={Boolean(state.fieldErrors.organizer)}
              aria-describedby={describedBy("organizer")}
              className={inputClasses}
            />
            <FieldMessage
              id="organizer-message"
              error={state.fieldErrors.organizer}
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
              aria-describedby={describedBy("contact_phone", true)}
              className={inputClasses}
            />
            <FieldMessage
              id="contact_phone-message"
              error={state.fieldErrors.contact_phone}
              helper="Nomor disimpan sebagai teks. Persetujuan wajib dicatat sebelum publikasi."
            />
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
          <input
            name="contact_consent_confirmed"
            type="checkbox"
            defaultChecked={state.values.contact_consent_confirmed}
            aria-invalid={Boolean(state.fieldErrors.contact_consent_confirmed)}
            aria-describedby={describedBy("contact_consent_confirmed", true)}
            className="mt-1 size-4 rounded border-slate-400 text-emerald-700 focus:ring-3 focus:ring-emerald-200"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              Persetujuan publikasi nomor kontak telah dicatat
            </span>
            <FieldMessage
              id="contact_consent_confirmed-message"
              error={state.fieldErrors.contact_consent_confirmed}
              helper="Jangan centang tanpa persetujuan yang benar-benar diperoleh."
            />
          </span>
        </label>
        <div>
          <label htmlFor="visitor_information" className={labelClasses}>
            Informasi pengunjung
          </label>
          <textarea
            id="visitor_information"
            name="visitor_information"
            rows={5}
            defaultValue={state.values.visitor_information}
            aria-invalid={Boolean(state.fieldErrors.visitor_information)}
            aria-describedby={describedBy("visitor_information", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="visitor_information-message"
            error={state.fieldErrors.visitor_information}
            helper="Cantumkan hanya panduan kunjungan yang telah diverifikasi."
          />
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">Publikasi</legend>
        <div>
          <label htmlFor="status" className={labelClasses}>
            Status publikasi <span className="text-red-700">*</span>
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
                {getCulturalEventStatusLabel(status)}
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
                ? "Acara baru selalu dimulai sebagai draf."
                : "Acara yang diarsipkan hanya dapat dipulihkan ke draf."
            }
          />
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
              Tandai sebagai acara unggulan
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              Penandaan tidak menerbitkan acara secara otomatis.
            </span>
          </span>
        </label>
        <div
          className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
            hasThumbnail
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {hasThumbnail
            ? "Gambar utama sudah tercatat. Publikasi tetap memerlukan tanggal pasti, informasi tanpa placeholder, dan persetujuan untuk nomor kontak."
            : "Gambar utama belum tersedia. Publikasi ditunda sampai modul media menambahkan gambar utama."}
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/acara-budaya"
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
              ? "Simpan acara budaya"
              : "Simpan perubahan"}
        </button>
      </div>
    </form>
  );
}
