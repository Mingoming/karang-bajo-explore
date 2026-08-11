import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { PublicShell } from "@/components/public/public-shell";
import {
  ENGLISH_PUBLIC_MAP_COPY,
  ENGLISH_TOURISM_MAP_PAGE_COPY,
} from "@/features/public-map/copy";
import { getPublishedEnglishTourismMapData } from "@/features/public-map/english-data";
import { PublicMap } from "@/features/public-map/public-map";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";

export const metadata = buildPublicMetadata({
  title: ENGLISH_TOURISM_MAP_PAGE_COPY.metadataTitle,
  description: ENGLISH_TOURISM_MAP_PAGE_COPY.metadataDescription,
  openGraphLocale: "en_US",
});

export default async function EnglishTourismMapPage() {
  const [result, contactResult] = await Promise.all([
    getPublishedEnglishTourismMapData(),
    getEnglishPublicShellData(),
  ]);

  if (result.kind === "error") {
    throw new Error("PUBLIC_ENGLISH_TOURISM_MAP_UNAVAILABLE");
  }

  return (
    <PublicShell locale="en" englishContactData={contactResult}>
      <section className="border-b border-emerald-950/10 bg-emerald-950 py-16 text-white sm:py-20">
        <PublicContainer>
          <p className="text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
            {ENGLISH_TOURISM_MAP_PAGE_COPY.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            {ENGLISH_TOURISM_MAP_PAGE_COPY.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/80">
            {ENGLISH_TOURISM_MAP_PAGE_COPY.description}
          </p>
        </PublicContainer>
      </section>

      <section className="py-12 sm:py-16">
        <PublicContainer>
          {result.items.length > 0 ? (
            <PublicMap
              markers={result.markers}
              destinationCategories={result.destinationCategories}
              copy={ENGLISH_PUBLIC_MAP_COPY}
            />
          ) : (
            <EmptyContentState
              title={ENGLISH_TOURISM_MAP_PAGE_COPY.emptyTitle}
              description={ENGLISH_TOURISM_MAP_PAGE_COPY.emptyDescription}
            />
          )}
        </PublicContainer>
      </section>
    </PublicShell>
  );
}
