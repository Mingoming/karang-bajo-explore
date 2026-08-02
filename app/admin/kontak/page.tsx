import Link from "next/link";

import { getAdministratorOfficialContacts } from "@/features/official-contact/data";
import {
  getContactStatusLabel,
  getContactTypeLabel,
} from "@/features/official-contact/model";

export default async function OfficialContactsAdminPage() {
  const result = await getAdministratorOfficialContacts();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
            Informasi resmi
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Kontak
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Kelola kanal resmi tambahan. Nomor WhatsApp utama dikelola terpisah
            pada Pengaturan.
          </p>
        </div>
        <Link
          href="/admin/kontak/tambah"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Tambah kontak
        </Link>
      </div>
      {!result.success ? (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          Daftar kontak belum dapat dimuat. Muat ulang halaman untuk mencoba
          lagi.
        </div>
      ) : result.contacts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <h2 className="text-lg font-bold text-slate-950">
            Belum ada kontak tambahan
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Tambahkan hanya kanal resmi yang sudah disetujui untuk
            dipublikasikan.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-2xl border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-3 py-3">Label</th>
                <th className="px-3 py-3">Jenis</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Urutan</th>
                <th className="px-3 py-3">
                  <span className="sr-only">Tindakan</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-slate-100">
                  <td className="px-3 py-4 font-semibold text-slate-950">
                    {contact.label}
                  </td>
                  <td className="px-3 py-4 text-slate-700">
                    {getContactTypeLabel(contact.contact_type)}
                  </td>
                  <td className="px-3 py-4 text-slate-700">
                    {getContactStatusLabel(contact.status)}
                  </td>
                  <td className="px-3 py-4 text-slate-700">
                    {contact.display_order}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <Link
                      href={`/admin/kontak/${contact.id}/edit`}
                      className="font-semibold text-emerald-800 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
