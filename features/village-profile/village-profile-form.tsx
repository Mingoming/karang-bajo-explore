"use client";

import { useActionState, useEffect, useRef } from "react";
import { AdminCoordinatePicker } from "@/features/admin-map/admin-coordinate-picker";
import { saveVillageProfile } from "./actions";
import type {
  VillageProfileActionState,
  VillageProfileEditableField,
} from "./model";

type VillageProfileFormProps = {
  initialState: VillageProfileActionState;
  profileExists: boolean;
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

export function VillageProfileForm({
  initialState,
  profileExists,
}: VillageProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveVillageProfile,
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
      firstInvalidField?.focus();
      return;
    }

    feedbackRef.current?.focus();
  }, [state.kind, state.revision]);

  const errorEntries = Object.entries(state.fieldErrors) as [
    VillageProfileEditableField,
    string,
  ][];
  const describedBy = (
    field: VillageProfileEditableField,
    hasHelper = false,
  ) => (state.fieldErrors[field] || hasHelper ? `${field}-message` : undefined);

  const inputClasses =
    "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100";
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
          role={state.kind === "success" ? "status" : "alert"}
          className={`rounded-xl border px-4 py-3 text-sm leading-6 outline-none focus:ring-3 ${
            state.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 focus:ring-emerald-200"
              : "border-red-200 bg-red-50 text-red-900 focus:ring-red-200"
          }`}
        >
          <p className="font-semibold">{state.message}</p>
          {state.kind === "validation-error" &&
          (errorEntries.length > 0 || state.formErrors.length > 0) ? (
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
          Informasi utama
        </legend>
        <p className="text-sm leading-6 text-slate-600">
          Kolom bertanda <span aria-hidden="true">*</span> wajib diisi. Slug
          dikelola otomatis dan tidak ditampilkan dalam formulir.
        </p>

        <div>
          <label htmlFor="name" className={labelClasses}>
            Nama desa{" "}
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
          <label htmlFor="summary" className={labelClasses}>
            Ringkasan
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={3}
            defaultValue={state.values.summary}
            aria-invalid={Boolean(state.fieldErrors.summary)}
            aria-describedby={describedBy("summary", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="summary-message"
            error={state.fieldErrors.summary}
            helper="Ringkasan singkat yang dapat digunakan pada tampilan publik setelah konten diterbitkan."
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClasses}>
            Deskripsi
          </label>
          <textarea
            id="description"
            name="description"
            rows={7}
            defaultValue={state.values.description}
            aria-invalid={Boolean(state.fieldErrors.description)}
            aria-describedby={describedBy("description", true)}
            className={inputClasses}
          />
          <FieldMessage
            id="description-message"
            error={state.fieldErrors.description}
            helper="Deskripsi wajib tersedia sebelum profil dapat diterbitkan melalui alur publikasi yang terpisah."
          />
        </div>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-8 disabled:opacity-75"
      >
        <legend className="text-xl font-bold text-slate-950">
          Identitas desa
        </legend>

        {(
          [
            ["history", "Sejarah", 6],
            ["vision", "Visi", 4],
            ["mission", "Misi", 5],
          ] as const
        ).map(([field, label, rows]) => (
          <div key={field}>
            <label htmlFor={field} className={labelClasses}>
              {label}
            </label>
            <textarea
              id={field}
              name={field}
              rows={rows}
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

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-600">
          {profileExists
            ? "Menyimpan akan memperbarui profil desa yang ada."
            : "Belum ada profil desa. Penyimpanan pertama akan membuat satu profil."}
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:bg-slate-400"
        >
          {isPending ? "Menyimpan…" : "Simpan profil desa"}
        </button>
      </div>
    </form>
  );
}
