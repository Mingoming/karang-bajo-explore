"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import type {
  MediaActionState,
  MediaImageRecord,
  MediaParentOption,
} from "./model";
import { MEDIA_ENTITY_LABELS } from "./model";

type Props = {
  action: (
    state: MediaActionState,
    formData: FormData,
  ) => Promise<MediaActionState>;
  initialState: MediaActionState;
  mode: "create" | "update";
  parent: MediaParentOption;
  record?: MediaImageRecord;
};

const inputClasses =
  "mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

export function MediaForm({
  action,
  initialState,
  mode,
  parent,
  record,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    record?.previewUrl ?? null,
  );

  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreviewUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : (record?.previewUrl ?? null);
    });
  }

  const describedBy = (field: keyof MediaActionState["values"] | "file") =>
    state.fieldErrors[field] ? `${field}-error` : undefined;

  return (
    <form key={state.revision} action={formAction} className="mt-8 space-y-7">
      {state.message ? (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm ${state.kind === "idle" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}
        >
          {state.message}
        </div>
      ) : null}
      {state.formErrors.length ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <p className="font-semibold">Periksa formulir berikut:</p>
          <ul className="mt-2 list-disc pl-5">
            {state.formErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset disabled={isPending} className="space-y-6 disabled:opacity-70">
        <legend className="text-xl font-bold">Kepemilikan media</legend>
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Media ini dimiliki oleh {MEDIA_ENTITY_LABELS[parent.entityType]}:{" "}
          <span className="font-semibold">{parent.label}</span>. Kepemilikan
          ditetapkan oleh server dan tidak dapat dipindahkan dari formulir.
        </p>
      </fieldset>

      <fieldset
        disabled={isPending}
        className="space-y-6 border-t border-slate-200 pt-7 disabled:opacity-70"
      >
        <legend className="text-xl font-bold">Berkas dan metadata</legend>
        <div>
          <label htmlFor="file" className="font-semibold text-slate-800">
            {mode === "create" ? "Berkas gambar" : "Ganti berkas gambar"}
            {mode === "create" ? (
              <span className="text-red-700"> *</span>
            ) : null}
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required={mode === "create"}
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            aria-describedby={describedBy("file") ?? "file-help"}
            className={`${inputClasses} file:mr-4 file:rounded-md file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-semibold file:text-emerald-900`}
          />
          <p id="file-help" className="mt-2 text-sm text-slate-600">
            JPEG, PNG, atau WebP; maksimal 5 MiB. Isi berkas diperiksa, bukan
            hanya nama berkas.
          </p>
          {state.fieldErrors.file ? (
            <p id="file-error" className="mt-2 text-sm text-red-700">
              {state.fieldErrors.file}
            </p>
          ) : null}
          {previewUrl ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
              {/* Signed and local object URLs are intentionally rendered without Next image optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Pratinjau gambar yang dipilih"
                className="max-h-64 w-full rounded-lg object-contain"
              />
            </div>
          ) : null}
        </div>
        <div>
          <label htmlFor="alt_text" className="font-semibold text-slate-800">
            Teks alternatif <span className="text-red-700">*</span>
          </label>
          <input
            id="alt_text"
            name="alt_text"
            required
            defaultValue={state.values.alt_text}
            className={inputClasses}
            aria-invalid={Boolean(state.fieldErrors.alt_text)}
            aria-describedby={describedBy("alt_text") ?? "alt-help"}
          />
          <p id="alt-help" className="mt-2 text-sm text-slate-600">
            Jelaskan isi gambar secara singkat untuk pengguna pembaca layar.
          </p>
          {state.fieldErrors.alt_text ? (
            <p id="alt_text-error" className="mt-2 text-sm text-red-700">
              {state.fieldErrors.alt_text}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="caption" className="font-semibold text-slate-800">
            Keterangan
          </label>
          <textarea
            id="caption"
            name="caption"
            rows={3}
            defaultValue={state.values.caption}
            className={inputClasses}
            aria-invalid={Boolean(state.fieldErrors.caption)}
            aria-describedby={describedBy("caption")}
          />
          {state.fieldErrors.caption ? (
            <p id="caption-error" className="mt-2 text-sm text-red-700">
              {state.fieldErrors.caption}
            </p>
          ) : null}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="display_order"
              className="font-semibold text-slate-800"
            >
              Urutan tampilan <span className="text-red-700">*</span>
            </label>
            <input
              id="display_order"
              name="display_order"
              type="number"
              min={0}
              max={9}
              step={1}
              required
              defaultValue={state.values.display_order}
              className={inputClasses}
              aria-invalid={Boolean(state.fieldErrors.display_order)}
              aria-describedby={describedBy("display_order")}
            />
            {state.fieldErrors.display_order ? (
              <p id="display_order-error" className="mt-2 text-sm text-red-700">
                {state.fieldErrors.display_order}
              </p>
            ) : null}
          </div>
          <label className="mt-8 flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-4 py-3">
            <input
              type="checkbox"
              name="is_primary"
              defaultChecked={state.values.is_primary}
              className="size-4 rounded border-slate-400 text-emerald-700 focus:ring-3 focus:ring-emerald-200"
            />
            <span>
              <span className="block font-semibold">Jadikan gambar utama</span>
              <span className="block text-sm text-slate-600">
                Gambar pertama selalu menjadi gambar utama.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
        <Link
          href="/admin/media"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 font-semibold text-slate-800"
        >
          Kembali
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 font-semibold text-white disabled:cursor-wait disabled:bg-slate-400"
        >
          {isPending
            ? "Menyimpan…"
            : mode === "create"
              ? "Unggah media"
              : "Simpan perubahan"}
        </button>
      </div>
    </form>
  );
}
