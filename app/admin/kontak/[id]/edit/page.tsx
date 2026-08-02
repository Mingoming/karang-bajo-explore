import { notFound } from "next/navigation";

import { OfficialContactForm } from "@/features/official-contact/contact-form";
import { getOfficialContactEditor } from "@/features/official-contact/data";
import {
  createContactInitialState,
  getContactStatusLabel,
  isValidOfficialContactId,
} from "@/features/official-contact/model";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string | string[] }>;
};

export default async function EditOfficialContactPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  if (!isValidOfficialContactId(id)) notFound();
  const [result, query] = await Promise.all([
    getOfficialContactEditor(id),
    searchParams,
  ]);
  if (result.kind === "invalid-id" || result.kind === "not-found") notFound();
  if (result.kind !== "ready") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold">Edit Kontak Resmi</h1>
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          Kontak resmi belum dapat dimuat.
        </div>
      </section>
    );
  }
  const success =
    query.success === "created"
      ? "Kontak resmi berhasil dibuat sebagai draf."
      : query.success === "updated"
        ? "Perubahan kontak resmi berhasil disimpan."
        : null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Edit kontak
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {result.contact.label}
          </h1>
        </div>
        <span className="inline-flex w-fit rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
          {getContactStatusLabel(result.contact.status)}
        </span>
      </div>
      {success ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
        >
          {success}
        </div>
      ) : null}
      <OfficialContactForm
        initialState={createContactInitialState(result.contact)}
        mode="update"
        currentStatus={result.contact.status}
        contactId={result.contact.id}
      />
    </section>
  );
}
