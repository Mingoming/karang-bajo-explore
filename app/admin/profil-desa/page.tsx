import { getAdministratorEnglishVillageProfileTranslation } from "@/features/village-profile-translation/data";
import {
  createEnglishVillageProfileTranslationActionState,
  toEnglishVillageProfileTranslationSource,
} from "@/features/village-profile-translation/model";
import { EnglishVillageProfileTranslationForm } from "@/features/village-profile-translation/village-profile-translation-form";
import { createVillageProfileInitialState } from "@/features/village-profile/model";
import { VillageProfileForm } from "@/features/village-profile/village-profile-form";

export default async function VillageProfileAdminPage() {
  const result = await getAdministratorEnglishVillageProfileTranslation();
  const sourceReference = result.source
    ? toEnglishVillageProfileTranslationSource(result.source)
    : null;

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
        teks, lokasi, status publikasi, dan terjemahan Inggris; media tidak
        dikelola pada modul ini.
      </p>

      {!result.sourceAvailable ? (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
        >
          Profil desa belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.
        </div>
      ) : (
        <>
          <VillageProfileForm
            initialState={createVillageProfileInitialState(result.source)}
            profileExists={result.source !== null}
            currentStatus={result.source?.status ?? null}
          />

          {result.success ? (
            <EnglishVillageProfileTranslationForm
              key={sourceReference?.updated_at ?? "no-source"}
              initialState={createEnglishVillageProfileTranslationActionState(
                sourceReference,
                result.translation,
              )}
              sourceReference={sourceReference}
            />
          ) : (
            <section className="mt-10 border-t border-slate-200 pt-8">
              <p className="text-sm font-semibold tracking-wide text-blue-800 uppercase">
                English translation
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Terjemahan Profil Desa
              </h2>
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900"
              >
                Terjemahan Inggris belum dapat dimuat. Formulir profil Indonesia
                tetap dapat digunakan.
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
