import { getAdministratorVillageProfile } from "@/features/village-profile/data";
import { createVillageProfileInitialState } from "@/features/village-profile/model";
import { VillageProfileForm } from "@/features/village-profile/village-profile-form";

export default async function VillageProfileAdminPage() {
  const result = await getAdministratorVillageProfile();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Konten utama
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        Profil Desa
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Kelola satu profil resmi Desa Karang Bajo. Modul ini menyimpan informasi
        teks dan lokasi saja; publikasi serta media dikelola pada tahap
        terpisah.
      </p>

      {result.success ? (
        <VillageProfileForm
          initialState={createVillageProfileInitialState(result.profile)}
          profileExists={result.profile !== null}
        />
      ) : (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          Profil desa belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.
        </div>
      )}
    </section>
  );
}
