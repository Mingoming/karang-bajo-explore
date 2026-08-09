import { buildPublicMetadata } from "@/features/seo/public-metadata";

import { DestinationCard } from "@/components/public/destination-card";
import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { PublicShell } from "@/components/public/public-shell";
import { PUBLIC_ENGLISH_DESTINATIONS_PATH } from "@/config/public-routes";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import {
  ENGLISH_DESTINATION_COPY,
  type PublicEnglishDestinationListResult,
} from "@/features/public-destinations/english-model";
import { getPublishedEnglishDestinations } from "@/features/public-destinations/english-data";

export const metadata = buildPublicMetadata({
  title: ENGLISH_DESTINATION_COPY.list.metadataTitle,
  description: ENGLISH_DESTINATION_COPY.list.metadataDescription,
  openGraphLocale: "en_US",
});

function EnglishDestinationList({
  result,
}: Readonly<{ result: PublicEnglishDestinationListResult }>) {
  if (result.kind === "error") {
    throw new Error("PUBLIC_ENGLISH_DESTINATION_LIST_UNAVAILABLE");
  }

  if (result.destinations.length === 0) {
    return (
      <EmptyContentState
        title={ENGLISH_DESTINATION_COPY.list.emptyTitle}
        description={ENGLISH_DESTINATION_COPY.list.emptyDescription}
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {result.destinations.map((destination, index) => (
        <DestinationCard
          key={destination.id}
          destination={destination}
          highPriority={index === 0}
          href={`${PUBLIC_ENGLISH_DESTINATIONS_PATH}/${encodeURIComponent(destination.slug)}`}
        />
      ))}
    </div>
  );
}

export default async function EnglishDestinationListPage() {
  const [result, contactResult] = await Promise.all([
    getPublishedEnglishDestinations(),
    getEnglishPublicShellData(),
  ]);

  return (
    <PublicShell locale="en" englishContactData={contactResult}>
      <section className="border-b border-emerald-950/10 bg-emerald-950 py-16 text-white sm:py-20">
        <PublicContainer>
          <p className="text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
            {ENGLISH_DESTINATION_COPY.list.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            {ENGLISH_DESTINATION_COPY.list.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/80">
            {ENGLISH_DESTINATION_COPY.list.description}
          </p>
        </PublicContainer>
      </section>

      <section
        className="py-12 sm:py-16"
        aria-labelledby="english-destinations"
      >
        <PublicContainer>
          <div className="border-b border-slate-200 pb-8">
            <p className="text-sm font-bold tracking-[0.14em] text-emerald-800 uppercase">
              {ENGLISH_DESTINATION_COPY.list.sectionEyebrow}
            </p>
            <h2
              id="english-destinations"
              className="mt-2 font-serif text-3xl font-bold"
            >
              {ENGLISH_DESTINATION_COPY.list.sectionTitle}
            </h2>
          </div>

          <div className="mt-8">
            <EnglishDestinationList result={result} />
          </div>
        </PublicContainer>
      </section>
    </PublicShell>
  );
}
