import Link from "next/link";

import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { PublicMediaImage } from "@/components/public/public-media-image";
import { PublicShell } from "@/components/public/public-shell";
import { getPublicEnglishTraditionalHousePath } from "@/config/public-routes";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import { getPublishedEnglishTraditionalHouses } from "@/features/public-traditional-houses/english-data";
import {
  ENGLISH_TRADITIONAL_HOUSE_COPY,
  type PublicEnglishTraditionalHouse,
} from "@/features/public-traditional-houses/english-model";
import { buildPublicMetadata } from "@/features/seo/public-metadata";

export const metadata = buildPublicMetadata({
  title: ENGLISH_TRADITIONAL_HOUSE_COPY.list.metadataTitle,
  description: ENGLISH_TRADITIONAL_HOUSE_COPY.list.metadataDescription,
  openGraphLocale: "en_US",
});

function EnglishTraditionalHouseCard({
  house,
  highPriority,
}: Readonly<{
  house: PublicEnglishTraditionalHouse;
  highPriority: boolean;
}>) {
  return (
    <Link
      href={getPublicEnglishTraditionalHousePath(house.slug)}
      aria-label={
        ENGLISH_TRADITIONAL_HOUSE_COPY.list.cardAction + ": " + house.name
      }
      className="group block h-full rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow group-hover:shadow-lg group-focus-visible:shadow-lg motion-reduce:transition-none">
        {house.primaryImage ? (
          <PublicMediaImage
            src={house.primaryImage.signedUrl}
            alt={house.primaryImage.altText}
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
            priority={highPriority}
            className="aspect-[4/3]"
          />
        ) : null}

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <p className="text-xs font-bold tracking-[0.16em] text-emerald-800 uppercase">
            {ENGLISH_TRADITIONAL_HOUSE_COPY.list.eyebrow}
          </p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-slate-950">
            {house.name}
          </h2>
          <p className="mt-3 line-clamp-3 flex-1 leading-7 text-slate-600">
            {house.summary}
          </p>
          <p className="mt-5 text-sm font-bold text-emerald-800 group-hover:text-emerald-950">
            {ENGLISH_TRADITIONAL_HOUSE_COPY.list.cardAction}{" "}
            <span aria-hidden="true">→</span>
          </p>
        </div>
      </article>
    </Link>
  );
}

export default async function EnglishTraditionalHouseListPage() {
  const [result, contactResult] = await Promise.all([
    getPublishedEnglishTraditionalHouses(),
    getEnglishPublicShellData(),
  ]);

  if (result.kind === "error") {
    throw new Error("PUBLIC_ENGLISH_TRADITIONAL_HOUSE_LIST_UNAVAILABLE");
  }

  return (
    <PublicShell locale="en" englishContactData={contactResult}>
      <section className="border-b border-emerald-950/10 bg-emerald-950 py-16 text-white sm:py-20">
        <PublicContainer>
          <p className="text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
            {ENGLISH_TRADITIONAL_HOUSE_COPY.list.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            {ENGLISH_TRADITIONAL_HOUSE_COPY.list.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/80">
            {ENGLISH_TRADITIONAL_HOUSE_COPY.list.description}
          </p>
        </PublicContainer>
      </section>

      <section
        className="py-12 sm:py-16"
        aria-labelledby="english-traditional-houses"
      >
        <PublicContainer>
          <div className="border-b border-slate-200 pb-8">
            <p className="text-sm font-bold tracking-[0.14em] text-emerald-800 uppercase">
              {ENGLISH_TRADITIONAL_HOUSE_COPY.list.sectionEyebrow}
            </p>
            <h2
              id="english-traditional-houses"
              className="mt-2 font-serif text-3xl font-bold"
            >
              {ENGLISH_TRADITIONAL_HOUSE_COPY.list.sectionTitle}
            </h2>
          </div>

          <div className="mt-8">
            {result.houses.length === 0 ? (
              <EmptyContentState
                title={ENGLISH_TRADITIONAL_HOUSE_COPY.list.emptyTitle}
                description={
                  ENGLISH_TRADITIONAL_HOUSE_COPY.list.emptyDescription
                }
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {result.houses.map((house, index) => (
                  <EnglishTraditionalHouseCard
                    key={house.id}
                    house={house}
                    highPriority={index === 0}
                  />
                ))}
              </div>
            )}
          </div>
        </PublicContainer>
      </section>
    </PublicShell>
  );
}
