import { getAdministratorPrimaryWhatsapp } from "@/features/official-contact/data";
import { WhatsappSettingForm } from "@/features/official-contact/whatsapp-setting-form";

export default async function SettingsAdminPage() {
  const result = await getAdministratorPrimaryWhatsapp();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Pengaturan publik
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Pengaturan
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Kelola hanya pengaturan publik yang telah disetujui. Saat ini daftar
        tersebut terbatas pada satu nomor WhatsApp utama.
      </p>
      {!result.success ? (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          Pengaturan belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.
        </div>
      ) : result.setting && !result.setting.is_editable ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          <p className="font-semibold">Nomor WhatsApp utama hanya-baca.</p>
          <p className="mt-1">
            Pengaturan ini tidak dapat diubah melalui dashboard.
          </p>
        </div>
      ) : (
        <WhatsappSettingForm initialValue={result.setting?.value ?? ""} />
      )}
    </section>
  );
}
