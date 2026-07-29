"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { createTourismPackage, updateTourismPackage } from "./actions";
import {
  getAllowedTourismPackageStatuses,
  getTourismPackageStatusLabel,
  getTourismPackageTypeLabel,
  TOURISM_PACKAGE_TYPES,
  type DestinationOption,
  type PackageDestinationValue,
  type TourismPackageActionState,
  type TourismPackageFormField,
  type TourismPackageMutationMode,
  type TourismPackageStatus,
} from "./model";

type Props = {
  currentStatus: TourismPackageStatus | null;
  hasThumbnail: boolean;
  initialState: TourismPackageActionState;
  mode: TourismPackageMutationMode;
  options: DestinationOption[];
  packageId?: string;
};

function FieldMessage({
  id,
  error,
  helper,
}: {
  id: string;
  error?: string;
  helper?: string;
}) {
  const text = error ?? helper;
  return text ? (
    <p
      id={id}
      className={`mt-2 text-sm leading-6 ${error ? "font-medium text-red-700" : "text-slate-500"}`}
    >
      {text}
    </p>
  ) : null;
}

function DestinationEditor({
  initial,
  options,
  disabled,
}: {
  initial: PackageDestinationValue[];
  options: DestinationOption[];
  disabled: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState("");
  const available = options.filter(
    (option) => !items.some((item) => item.destinationId === option.id),
  );
  const nameFor = (id: string) =>
    options.find((option) => option.id === id)?.name ??
    "Destinasi tidak tersedia";
  function move(index: number, offset: number) {
    setItems((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy.map((item, order) => ({ ...item, displayOrder: order }));
    });
  }
  return (
    <div className="space-y-4">
      {!disabled ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="destination-picker">
            Pilih destinasi
          </label>
          <select
            id="destination-picker"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100"
          >
            <option value="">Pilih destinasi…</option>
            {available.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({getTourismPackageStatusLabel(option.status)})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selected}
            onClick={() => {
              setItems((current) => [
                ...current,
                {
                  destinationId: selected,
                  displayOrder: current.length,
                  notes: "",
                },
              ]);
              setSelected("");
            }}
            className="min-h-11 rounded-lg border border-emerald-700 px-4 font-semibold text-emerald-800 disabled:opacity-50"
          >
            Tambahkan
          </button>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Susunan destinasi hanya dapat diubah saat paket berstatus draf.
          Arsipkan lalu pulihkan ke draf untuk menyuntingnya.
        </p>
      )}
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-600">
          Belum ada destinasi dalam paket.
        </p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.destinationId}
              className="rounded-xl border border-slate-200 p-4"
            >
              <input
                type="hidden"
                name="destination_id"
                value={item.destinationId}
              />
              <input type="hidden" name="destination_order" value={index} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">
                  {index + 1}. {nameFor(item.destinationId)}
                </span>
                {!disabled ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Naikkan ${nameFor(item.destinationId)}`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="rounded border px-3 py-1 disabled:opacity-40"
                    >
                      Naik
                    </button>
                    <button
                      type="button"
                      aria-label={`Turunkan ${nameFor(item.destinationId)}`}
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                      className="rounded border px-3 py-1 disabled:opacity-40"
                    >
                      Turun
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setItems((current) =>
                          current
                            .filter((_, position) => position !== index)
                            .map((entry, order) => ({
                              ...entry,
                              displayOrder: order,
                            })),
                        )
                      }
                      className="rounded border border-red-300 px-3 py-1 text-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                ) : null}
              </div>
              <label
                className="mt-3 block text-sm font-semibold"
                htmlFor={`destination-note-${index}`}
              >
                Catatan destinasi (opsional)
              </label>
              <textarea
                id={`destination-note-${index}`}
                name="destination_note"
                rows={2}
                value={item.notes}
                readOnly={disabled}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((entry, position) =>
                      position === index
                        ? { ...entry, notes: event.target.value }
                        : entry,
                    ),
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 read-only:bg-slate-100"
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function TourismPackageForm({
  currentStatus,
  hasThumbnail,
  initialState,
  mode,
  options,
  packageId,
}: Props) {
  const action =
    mode === "create"
      ? createTourismPackage
      : updateTourismPackage.bind(null, packageId ?? "");
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!state.revision) return;
    const invalid = formRef.current?.querySelector<HTMLElement>(
      "[aria-invalid='true']",
    );
    if (invalid) invalid.focus();
    else feedbackRef.current?.focus();
  }, [state.revision]);
  const input =
    "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:bg-slate-100";
  const label = "block text-sm font-semibold text-slate-800";
  const errors = Object.entries(state.fieldErrors) as [
    TourismPackageFormField,
    string,
  ][];
  const described = (field: TourismPackageFormField, helper = false) =>
    state.fieldErrors[field] || helper ? `${field}-message` : undefined;
  const statuses = getAllowedTourismPackageStatuses(currentStatus);
  const relationshipsDisabled = mode === "update" && currentStatus !== "draft";
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
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <p className="font-semibold">{state.message}</p>
          {errors.length || state.formErrors.length ? (
            <ul className="mt-2 list-disc pl-5">
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
        <legend className="text-xl font-bold">Informasi paket</legend>
        <p className="text-sm text-slate-600">
          Kolom bertanda * wajib diisi. Slug dibuat otomatis saat pembuatan dan
          disembunyikan dari formulir.
        </p>
        <div>
          <label className={label} htmlFor="name">
            Nama paket *
          </label>
          <input
            className={input}
            id="name"
            name="name"
            required
            defaultValue={state.values.name}
            aria-invalid={Boolean(state.fieldErrors.name)}
            aria-describedby={described("name")}
          />
          <FieldMessage id="name-message" error={state.fieldErrors.name} />
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="package_type">
              Jenis *
            </label>
            <select
              className={input}
              id="package_type"
              name="package_type"
              defaultValue={state.values.package_type}
              aria-invalid={Boolean(state.fieldErrors.package_type)}
              aria-describedby={described("package_type")}
            >
              {TOURISM_PACKAGE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getTourismPackageTypeLabel(type)}
                </option>
              ))}
            </select>
            <FieldMessage
              id="package_type-message"
              error={state.fieldErrors.package_type}
            />
          </div>
          <div>
            <label className={label} htmlFor="duration_value">
              Durasi *
            </label>
            <input
              className={input}
              id="duration_value"
              name="duration_value"
              type="number"
              min="1"
              step="1"
              defaultValue={state.values.duration_value}
              aria-invalid={Boolean(state.fieldErrors.duration_value)}
              aria-describedby={described("duration_value")}
            />
            <FieldMessage
              id="duration_value-message"
              error={state.fieldErrors.duration_value}
            />
          </div>
          <div>
            <label className={label} htmlFor="duration_unit">
              Satuan durasi *
            </label>
            <input
              className={input}
              id="duration_unit"
              name="duration_unit"
              defaultValue={state.values.duration_unit}
              aria-invalid={Boolean(state.fieldErrors.duration_unit)}
              aria-describedby={described("duration_unit")}
            />
            <FieldMessage
              id="duration_unit-message"
              error={state.fieldErrors.duration_unit}
            />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="summary">
            Ringkasan
          </label>
          <textarea
            className={input}
            id="summary"
            name="summary"
            rows={3}
            defaultValue={state.values.summary}
          />
        </div>
        <div>
          <label className={label} htmlFor="description">
            Deskripsi *
          </label>
          <textarea
            className={input}
            id="description"
            name="description"
            rows={7}
            required
            defaultValue={state.values.description}
            aria-invalid={Boolean(state.fieldErrors.description)}
            aria-describedby={described("description")}
          />
          <FieldMessage
            id="description-message"
            error={state.fieldErrors.description}
          />
        </div>
      </fieldset>
      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold">Harga dan fasilitas</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="price">
              Harga (rupiah)
            </label>
            <input
              className={input}
              id="price"
              name="price"
              type="number"
              min="0"
              step="any"
              defaultValue={state.values.price}
              aria-invalid={Boolean(state.fieldErrors.price)}
            />
            <FieldMessage
              id="price-message"
              error={state.fieldErrors.price}
              helper="0 berarti gratis; kosong berarti belum tersedia."
            />
          </div>
          <div>
            <label className={label} htmlFor="price_note">
              Catatan harga
            </label>
            <input
              className={input}
              id="price_note"
              name="price_note"
              defaultValue={state.values.price_note}
            />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="included_facilities">
            Fasilitas yang termasuk
          </label>
          <textarea
            className={input}
            id="included_facilities"
            name="included_facilities"
            rows={5}
            defaultValue={state.values.included_facilities}
          />
          <FieldMessage
            id="included_facilities-message"
            helper="Satu fasilitas per baris; baris kosong diabaikan."
          />
        </div>
        <div>
          <label className={label} htmlFor="souvenir">
            Suvenir
          </label>
          <input
            className={input}
            id="souvenir"
            name="souvenir"
            defaultValue={state.values.souvenir}
          />
        </div>
      </fieldset>
      <fieldset
        disabled={isPending}
        className="space-y-5 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold">Susunan destinasi</legend>
        <p className="text-sm text-slate-600">
          Paket boleh disimpan sebagai draf tanpa destinasi. Untuk diterbitkan,
          paket memerlukan minimal satu destinasi dan seluruh destinasi terpilih
          harus sudah diterbitkan.
        </p>
        <DestinationEditor
          initial={state.values.destinations}
          options={options}
          disabled={relationshipsDisabled}
        />
        <FieldMessage
          id="destinations-message"
          error={state.fieldErrors.destinations}
        />
      </fieldset>
      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold">Pengurutan dan publikasi</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="display_order">
              Urutan tampilan *
            </label>
            <input
              className={input}
              id="display_order"
              name="display_order"
              type="number"
              min="0"
              step="1"
              defaultValue={state.values.display_order}
              aria-invalid={Boolean(state.fieldErrors.display_order)}
              aria-describedby={described("display_order")}
            />
            <FieldMessage
              id="display_order-message"
              error={state.fieldErrors.display_order}
            />
          </div>
          <div>
            <label className={label} htmlFor="status">
              Status *
            </label>
            <select
              className={input}
              id="status"
              name="status"
              defaultValue={state.values.status}
              aria-invalid={Boolean(state.fieldErrors.status)}
              aria-describedby={described("status", true)}
            >
              {statuses.map((status) => (
                <option
                  key={status}
                  value={status}
                  disabled={status === "published" && !hasThumbnail}
                >
                  {getTourismPackageStatusLabel(status)}
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
                  ? "Paket baru selalu dimulai sebagai draf."
                  : "Paket yang diarsipkan hanya dapat dipulihkan ke draf."
              }
            />
          </div>
        </div>
        <label className="flex gap-3 rounded-xl border border-slate-200 p-4">
          <input
            name="is_featured"
            type="checkbox"
            defaultChecked={state.values.is_featured}
            className="mt-1 size-4"
          />
          <span>
            <strong className="block">Tandai sebagai paket unggulan</strong>
            <span className="text-sm text-slate-600">
              Penandaan tidak menerbitkan paket secara otomatis.
            </span>
          </span>
        </label>
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${hasThumbnail ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
        >
          {hasThumbnail
            ? "Gambar utama sudah tercatat. Persyaratan destinasi tetap diperiksa saat publikasi."
            : "Gambar utama belum tersedia karena media belum dikelola pada tahap ini. Paket tidak dapat diterbitkan sebelum metadata gambar utama ditambahkan."}
        </div>
      </fieldset>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
        <Link
          href="/admin/paket-wisata"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 font-semibold"
        >
          Kembali ke daftar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 font-semibold text-white disabled:bg-slate-400"
        >
          {isPending
            ? "Menyimpan…"
            : mode === "create"
              ? "Simpan paket wisata"
              : "Simpan perubahan"}
        </button>
      </div>
    </form>
  );
}
