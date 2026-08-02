"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { createOfficialContact, updateOfficialContact } from "./actions";
import {
  getAllowedContactStatuses,
  getContactStatusLabel,
  getContactTypeLabel,
  OFFICIAL_CONTACT_TYPES,
  type ContactActionState,
  type OfficialContactStatus,
} from "./model";

type Props = Readonly<{
  initialState: ContactActionState;
  mode: "create" | "update";
  currentStatus: OfficialContactStatus | null;
  contactId?: string;
}>;

export function OfficialContactForm({
  initialState,
  mode,
  currentStatus,
  contactId,
}: Props) {
  const mutation =
    mode === "create"
      ? createOfficialContact
      : updateOfficialContact.bind(null, contactId ?? "");
  const [state, action, pending] = useActionState(mutation, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!state.revision) return;
    if (state.kind === "validation-error" || state.kind === "duplicate-error") {
      formRef.current
        ?.querySelector<HTMLElement>("[aria-invalid='true']")
        ?.focus();
    } else {
      feedbackRef.current?.focus();
    }
  }, [state.kind, state.revision]);
  const inputClass =
    "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:bg-slate-100";
  const allowedStatuses = getAllowedContactStatuses(currentStatus);
  const field = (name: keyof typeof state.fieldErrors) =>
    state.fieldErrors[name];

  return (
    <form
      key={state.revision}
      ref={formRef}
      action={action}
      noValidate
      className="mt-8 space-y-6"
    >
      {state.message ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 outline-none"
        >
          <p className="font-semibold">{state.message}</p>
          {[...state.formErrors, ...Object.values(state.fieldErrors)].length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {[...state.formErrors, ...Object.values(state.fieldErrors)].map(
                (error) => (
                  <li key={error}>{error}</li>
                ),
              )}
            </ul>
          ) : null}
        </div>
      ) : null}
      <fieldset
        disabled={pending}
        className="grid gap-6 disabled:opacity-75 sm:grid-cols-2"
      >
        <legend className="sr-only">Data kontak resmi</legend>
        <div className="sm:col-span-2">
          <label
            htmlFor="label"
            className="block text-sm font-semibold text-slate-800"
          >
            Label kontak{" "}
            <span aria-hidden="true" className="text-red-700">
              *
            </span>
          </label>
          <input
            id="label"
            name="label"
            required
            defaultValue={state.values.label}
            aria-invalid={Boolean(field("label"))}
            aria-describedby={field("label") ? "label-error" : undefined}
            className={inputClass}
          />
          {field("label") ? (
            <p
              id="label-error"
              className="mt-2 text-sm font-medium text-red-700"
            >
              {field("label")}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="contact_type"
            className="block text-sm font-semibold text-slate-800"
          >
            Jenis kontak{" "}
            <span aria-hidden="true" className="text-red-700">
              *
            </span>
          </label>
          <select
            id="contact_type"
            name="contact_type"
            defaultValue={state.values.contact_type}
            aria-invalid={Boolean(field("contact_type"))}
            className={inputClass}
          >
            {OFFICIAL_CONTACT_TYPES.map((type) => (
              <option key={type} value={type}>
                {getContactTypeLabel(type)}
              </option>
            ))}
          </select>
          {field("contact_type") ? (
            <p className="mt-2 text-sm font-medium text-red-700">
              {field("contact_type")}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="value"
            className="block text-sm font-semibold text-slate-800"
          >
            Nilai kontak{" "}
            <span aria-hidden="true" className="text-red-700">
              *
            </span>
          </label>
          <input
            id="value"
            name="value"
            required
            defaultValue={state.values.value}
            aria-invalid={Boolean(field("value"))}
            aria-describedby="value-help"
            className={inputClass}
          />
          <p
            id="value-help"
            className={`mt-2 text-sm ${field("value") ? "font-medium text-red-700" : "text-slate-600"}`}
          >
            {field("value") ??
              "WhatsApp harus memakai kode negara. Tautan harus diawali http:// atau https://."}
          </p>
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="description"
            className="block text-sm font-semibold text-slate-800"
          >
            Keterangan
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={state.values.description}
            aria-invalid={Boolean(field("description"))}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="display_order"
            className="block text-sm font-semibold text-slate-800"
          >
            Urutan tampil
          </label>
          <input
            id="display_order"
            name="display_order"
            type="number"
            min="0"
            step="1"
            defaultValue={state.values.display_order}
            aria-invalid={Boolean(field("display_order"))}
            className={inputClass}
          />
          {field("display_order") ? (
            <p className="mt-2 text-sm font-medium text-red-700">
              {field("display_order")}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-semibold text-slate-800"
          >
            Status publikasi
          </label>
          <select
            id="status"
            name="status"
            defaultValue={state.values.status}
            aria-invalid={Boolean(field("status"))}
            className={inputClass}
          >
            {allowedStatuses.map((status) => (
              <option key={status} value={status}>
                {getContactStatusLabel(status)}
              </option>
            ))}
          </select>
          {field("status") ? (
            <p className="mt-2 text-sm font-medium text-red-700">
              {field("status")}
            </p>
          ) : null}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:bg-slate-400"
        >
          {pending ? "Menyimpan…" : "Simpan kontak"}
        </button>
        <Link
          href="/admin/kontak"
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Kembali
        </Link>
      </div>
    </form>
  );
}
