import { OfficialContactForm } from "@/features/official-contact/contact-form";
import { createContactInitialState } from "@/features/official-contact/model";
import { requireAdministrator } from "@/lib/auth/admin";

export default async function AddOfficialContactPage() {
  await requireAdministrator();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Kontak baru
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Tambah Kontak Resmi
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Kontak baru selalu dimulai sebagai draf. Jangan memasukkan kredensial
        teknis atau kontak yang belum disetujui.
      </p>
      <OfficialContactForm
        initialState={createContactInitialState(null)}
        mode="create"
        currentStatus={null}
      />
    </section>
  );
}
