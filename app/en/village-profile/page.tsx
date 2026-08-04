import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicContainer } from "@/components/public/public-container";
import { PublicShell } from "@/components/public/public-shell";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import {
  getPublishedEnglishVillageProfile,
  getPublishedEnglishVillageProfileMetadata,
} from "@/features/public-village-profile/english-data";
import { getPublicEnglishVillageProfileTextSections } from "@/features/public-village-profile/english-model";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

const dictionary = PUBLIC_DICTIONARIES.en;
const copy = dictionary.villageProfile;

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getPublishedEnglishVillageProfileMetadata();

  if (!profile) {
    return buildPublicMetadata({
      title: copy.metadataUnavailableTitle,
      description: copy.metadataUnavailableDescription,
      noIndex: true,
      openGraphLocale: "en_US",
    });
  }

  return buildPublicMetadata({
    title: `${copy.metadataTitlePrefix}: ${profile.title}`,
    description: profile.description,
    openGraphLocale: "en_US",
  });
}

function TextSection({
  title,
  content,
}: Readonly<{
  title: string;
  content: string;
}>) {
  return (
    <section className="border-t border-emerald-950/10 pt-10">
      <h2 className="font-serif text-3xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>

      <div className="mt-5 whitespace-pre-line text-base leading-8 text-slate-700">
        {content}
      </div>
    </section>
  );
}

export default async function EnglishVillageProfilePage() {
  const result = await getPublishedEnglishVillageProfile();

  if (result.kind === "not-found") notFound();

  if (result.kind === "error") {
    throw new Error("PUBLIC_ENGLISH_VILLAGE_PROFILE_UNAVAILABLE");
  }

  const contactResult = await getEnglishPublicShellData();
  const { profile } = result;

  const hasCoordinates =
    profile.latitude !== null && profile.longitude !== null;

  const mapHref =
    profile.googleMapsUrl ??
    (hasCoordinates
      ? `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`
      : null);

  const textSections = getPublicEnglishVillageProfileTextSections(profile, {
    history: copy.historyHeading,
    vision: copy.visionHeading,
    mission: copy.missionHeading,
  });

  return (
    <PublicShell locale="en" englishContactData={contactResult}>
      <div className="py-14 sm:py-20">
        <PublicContainer>
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-bold tracking-[0.16em] text-emerald-800 uppercase">
              {copy.eyebrow}
            </p>

            <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {profile.name}
            </h1>

            {profile.summary ? (
              <p className="mt-6 text-xl leading-8 text-slate-600">
                {profile.summary}
              </p>
            ) : null}

            <div className="mt-10 whitespace-pre-line text-lg leading-9 text-slate-700">
              {profile.description}
            </div>

            <div className="mt-14 space-y-12">
              {textSections.map((section) => (
                <TextSection key={section.title} {...section} />
              ))}

              {profile.address || mapHref ? (
                <section className="border-t border-emerald-950/10 pt-10">
                  <h2 className="font-serif text-3xl font-bold tracking-tight text-slate-950">
                    {copy.locationHeading}
                  </h2>

                  {profile.address ? (
                    <p className="mt-5 whitespace-pre-line leading-8 text-slate-700">
                      {profile.address}
                    </p>
                  ) : null}

                  {mapHref ? (
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    >
                      {copy.openMap}
                    </a>
                  ) : null}
                </section>
              ) : null}
            </div>
          </div>
        </PublicContainer>
      </div>
    </PublicShell>
  );
}
