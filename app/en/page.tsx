import Link from "next/link";

import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { PublicContentCard } from "@/components/public/public-content-card";
import { PublicHero } from "@/components/public/public-hero";
import { PublicShell } from "@/components/public/public-shell";
import { SectionHeading } from "@/components/public/section-heading";
import {
  PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH,
  PUBLIC_ENGLISH_DESTINATIONS_PATH,
  PUBLIC_ENGLISH_HOMESTAYS_PATH,
  PUBLIC_ENGLISH_TOURISM_MAP_PATH,
  PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH,
  PUBLIC_ENGLISH_UMKMS_PATH,
  PUBLIC_ENGLISH_VILLAGE_PROFILE_PATH,
} from "@/config/public-routes";
import { ExternalTourismLinksSection } from "@/features/official-contact/external-tourism-links";
import { EnglishOfficialContactCta } from "@/features/official-contact/official-contact-cta";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import { getPublishedEnglishCulturalEvents } from "@/features/public-cultural-events/english-data";
import { ENGLISH_CULTURAL_EVENT_COPY } from "@/features/public-cultural-events/english-model";
import { getPublishedEnglishDestinations } from "@/features/public-destinations/english-data";
import { ENGLISH_DESTINATION_COPY } from "@/features/public-destinations/english-model";
import { getPublishedEnglishHomestays } from "@/features/public-homestays/english-data";
import { ENGLISH_HOMESTAY_COPY } from "@/features/public-homestays/english-model";
import { getPublishedEnglishTraditionalHouses } from "@/features/public-traditional-houses/english-data";
import { ENGLISH_TRADITIONAL_HOUSE_COPY } from "@/features/public-traditional-houses/english-model";
import { getPublishedEnglishUmkms } from "@/features/public-umkms/english-data";
import { ENGLISH_UMKM_COPY } from "@/features/public-umkms/english-model";
import { getPublishedEnglishVillageProfile } from "@/features/public-village-profile/english-data";
import type { PublicEnglishVillageProfileResult } from "@/features/public-village-profile/english-model";
import type { SignedPublicMedia } from "@/features/public-media/model";
import { ENGLISH_TOURISM_MAP_PAGE_COPY } from "@/features/public-map/copy";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

const dictionary = PUBLIC_DICTIONARIES.en;

export const metadata = buildPublicMetadata({
  title: dictionary.home.metadataTitle,
  description: dictionary.home.metadataDescription,
  openGraphLocale: "en_US",
});

type EnglishHomeCard = Readonly<{
  id: string;
  slug: string;
  title: string;
  summary: string;
  eyebrow: string;
  primaryImage: SignedPublicMedia | null;
}>;

type EnglishCollectionCopy = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  viewAllLabel: string;
}>;

const ENGLISH_CARD_COPY = {
  detailAction: "View details",
  detailAriaLabel: (title: string) => `View details for ${title}`,
} as const;

const PROFILE_COPY = {
  eyebrow: dictionary.villageProfile.eyebrow,
  action: "Read the Village Profile",
  unavailableTitle: "The English Village Profile is not available",
  unavailableDescription:
    "Approved English Village Profile information will appear here when it is published.",
} as const;

const MAP_ACTION = "Open the tourism map";

function createEnglishHomeCard({
  id,
  slug,
  title,
  summary,
  eyebrow,
  primaryImage,
}: Readonly<{
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  eyebrow: string;
  primaryImage: SignedPublicMedia | null;
}>): EnglishHomeCard {
  return {
    id,
    slug,
    title,
    summary: summary?.trim() ?? "",
    eyebrow,
    primaryImage,
  };
}

function EnglishHomeCollection({
  id,
  href,
  copy,
  items,
}: Readonly<{
  id: string;
  href: string;
  copy: EnglishCollectionCopy;
  items: readonly EnglishHomeCard[];
}>) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-emerald-950/10 py-16 sm:py-20"
    >
      <PublicContainer>
        <SectionHeading
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
        />

        <div className="mt-8">
          {items.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.slice(0, 3).map((item) => (
                <PublicContentCard
                  key={item.id}
                  item={item}
                  basePath={href}
                  copy={ENGLISH_CARD_COPY}
                />
              ))}
            </div>
          ) : (
            <EmptyContentState
              title={copy.emptyTitle}
              description={copy.emptyDescription}
            />
          )}
        </div>

        <Link
          href={href}
          className="mt-8 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
        >
          {copy.viewAllLabel}
        </Link>
      </PublicContainer>
    </section>
  );
}

function requireEnglishItems<T, K extends string>(
  result: { kind: "error" } | ({ kind: "ready" } & Record<K, T[]>),
  key: K,
  domain: string,
) {
  if (result.kind === "error") {
    throw new Error(`PUBLIC_ENGLISH_HOMEPAGE_${domain}_UNAVAILABLE`);
  }

  return result[key];
}

function EnglishVillageProfileSection({
  result,
}: Readonly<{ result: PublicEnglishVillageProfileResult }>) {
  if (result.kind === "error") {
    throw new Error("PUBLIC_ENGLISH_HOMEPAGE_VILLAGE_PROFILE_UNAVAILABLE");
  }

  return (
    <section
      id="english-village-profile"
      className="scroll-mt-24 border-b border-emerald-950/10 py-16 sm:py-20"
    >
      <PublicContainer>
        {result.kind === "ready" ? (
          <>
            <SectionHeading
              eyebrow={PROFILE_COPY.eyebrow}
              title={result.profile.name}
              description={result.profile.summary ?? result.profile.description}
            />
            <Link
              href={PUBLIC_ENGLISH_VILLAGE_PROFILE_PATH}
              className="mt-8 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
            >
              {PROFILE_COPY.action}
            </Link>
          </>
        ) : (
          <EmptyContentState
            title={PROFILE_COPY.unavailableTitle}
            description={PROFILE_COPY.unavailableDescription}
          />
        )}
      </PublicContainer>
    </section>
  );
}

export default async function EnglishHomePage() {
  const [
    profileResult,
    destinationsResult,
    traditionalHousesResult,
    culturalEventsResult,
    homestaysResult,
    umkmsResult,
    contactResult,
  ] = await Promise.all([
    getPublishedEnglishVillageProfile(),
    getPublishedEnglishDestinations(),
    getPublishedEnglishTraditionalHouses(),
    getPublishedEnglishCulturalEvents(),
    getPublishedEnglishHomestays(),
    getPublishedEnglishUmkms(),
    getEnglishPublicShellData(),
  ]);

  const destinations = requireEnglishItems(
    destinationsResult,
    "destinations",
    "DESTINATIONS",
  ).map((destination) =>
    createEnglishHomeCard({
      id: destination.id,
      slug: destination.slug,
      title: destination.name,
      summary: destination.summary,
      eyebrow: destination.categoryName,
      primaryImage: destination.primaryImage,
    }),
  );
  const traditionalHouses = requireEnglishItems(
    traditionalHousesResult,
    "houses",
    "TRADITIONAL_HOUSES",
  ).map((house) =>
    createEnglishHomeCard({
      id: house.id,
      slug: house.slug,
      title: house.name,
      summary: house.summary,
      eyebrow: ENGLISH_TRADITIONAL_HOUSE_COPY.list.eyebrow,
      primaryImage: house.primaryImage,
    }),
  );
  const culturalEvents = requireEnglishItems(
    culturalEventsResult,
    "events",
    "CULTURAL_EVENTS",
  ).map((event) =>
    createEnglishHomeCard({
      id: event.id,
      slug: event.slug,
      title: event.title,
      summary: event.summary,
      eyebrow: ENGLISH_CULTURAL_EVENT_COPY.list.eyebrow,
      primaryImage: event.primaryImage,
    }),
  );
  const homestays = requireEnglishItems(
    homestaysResult,
    "homestays",
    "HOMESTAYS",
  ).map((homestay) =>
    createEnglishHomeCard({
      id: homestay.id,
      slug: homestay.slug,
      title: homestay.name,
      summary: homestay.description,
      eyebrow: ENGLISH_HOMESTAY_COPY.list.eyebrow,
      primaryImage: homestay.primaryImage,
    }),
  );
  const localBusinesses = requireEnglishItems(
    umkmsResult,
    "umkms",
    "LOCAL_BUSINESSES",
  ).map((umkm) =>
    createEnglishHomeCard({
      id: umkm.id,
      slug: umkm.slug,
      title: umkm.businessName,
      summary: umkm.description,
      eyebrow: ENGLISH_UMKM_COPY.list.eyebrow,
      primaryImage: umkm.primaryImage,
    }),
  );

  return (
    <PublicShell locale="en" englishContactData={contactResult}>
      <PublicHero
        locale="en"
        dictionary={dictionary}
        primaryHref={PUBLIC_ENGLISH_DESTINATIONS_PATH}
        secondaryHref={PUBLIC_ENGLISH_VILLAGE_PROFILE_PATH}
      />

      <EnglishVillageProfileSection result={profileResult} />

      <EnglishHomeCollection
        id="english-destinations"
        href={PUBLIC_ENGLISH_DESTINATIONS_PATH}
        copy={{
          eyebrow: ENGLISH_DESTINATION_COPY.list.eyebrow,
          title: ENGLISH_DESTINATION_COPY.list.title,
          description: ENGLISH_DESTINATION_COPY.list.description,
          emptyTitle: ENGLISH_DESTINATION_COPY.list.emptyTitle,
          emptyDescription: ENGLISH_DESTINATION_COPY.list.emptyDescription,
          viewAllLabel: "View all destinations",
        }}
        items={destinations}
      />

      <EnglishHomeCollection
        id="english-traditional-houses"
        href={PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH}
        copy={{
          eyebrow: ENGLISH_TRADITIONAL_HOUSE_COPY.list.eyebrow,
          title: ENGLISH_TRADITIONAL_HOUSE_COPY.list.title,
          description: ENGLISH_TRADITIONAL_HOUSE_COPY.list.description,
          emptyTitle: ENGLISH_TRADITIONAL_HOUSE_COPY.list.emptyTitle,
          emptyDescription:
            ENGLISH_TRADITIONAL_HOUSE_COPY.list.emptyDescription,
          viewAllLabel: "View all traditional houses",
        }}
        items={traditionalHouses}
      />

      <EnglishHomeCollection
        id="english-cultural-events"
        href={PUBLIC_ENGLISH_CULTURAL_EVENTS_PATH}
        copy={{
          eyebrow: ENGLISH_CULTURAL_EVENT_COPY.list.eyebrow,
          title: ENGLISH_CULTURAL_EVENT_COPY.list.title,
          description: ENGLISH_CULTURAL_EVENT_COPY.list.description,
          emptyTitle: ENGLISH_CULTURAL_EVENT_COPY.list.emptyTitle,
          emptyDescription: ENGLISH_CULTURAL_EVENT_COPY.list.emptyDescription,
          viewAllLabel: "View all cultural events",
        }}
        items={culturalEvents}
      />

      <EnglishHomeCollection
        id="english-homestays"
        href={PUBLIC_ENGLISH_HOMESTAYS_PATH}
        copy={{
          eyebrow: ENGLISH_HOMESTAY_COPY.list.eyebrow,
          title: ENGLISH_HOMESTAY_COPY.list.title,
          description: ENGLISH_HOMESTAY_COPY.list.description,
          emptyTitle: ENGLISH_HOMESTAY_COPY.list.emptyTitle,
          emptyDescription: ENGLISH_HOMESTAY_COPY.list.emptyDescription,
          viewAllLabel: "View all homestays",
        }}
        items={homestays}
      />

      <EnglishHomeCollection
        id="english-local-businesses"
        href={PUBLIC_ENGLISH_UMKMS_PATH}
        copy={{
          eyebrow: ENGLISH_UMKM_COPY.list.eyebrow,
          title: ENGLISH_UMKM_COPY.list.title,
          description: ENGLISH_UMKM_COPY.list.description,
          emptyTitle: ENGLISH_UMKM_COPY.list.emptyTitle,
          emptyDescription: ENGLISH_UMKM_COPY.list.emptyDescription,
          viewAllLabel: "View all local businesses",
        }}
        items={localBusinesses}
      />

      <section
        id="english-tourism-map"
        className="scroll-mt-24 border-y border-amber-900/10 bg-amber-50 py-16 sm:py-20"
      >
        <PublicContainer>
          <SectionHeading
            eyebrow={ENGLISH_TOURISM_MAP_PAGE_COPY.eyebrow}
            title={ENGLISH_TOURISM_MAP_PAGE_COPY.title}
            description={ENGLISH_TOURISM_MAP_PAGE_COPY.description}
          />
          <Link
            href={PUBLIC_ENGLISH_TOURISM_MAP_PATH}
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
          >
            {MAP_ACTION}
          </Link>
        </PublicContainer>
      </section>

      <ExternalTourismLinksSection
        links={
          contactResult.kind === "ready" ? contactResult.data.externalLinks : []
        }
        copy={dictionary.home.externalTourism}
      />

      <section id="contact" className="py-16 sm:py-24">
        <PublicContainer>
          <div className="rounded-3xl bg-emerald-900 px-6 py-12 text-center text-white">
            <p className="text-sm font-bold tracking-[0.18em] text-emerald-200 uppercase">
              {dictionary.home.contact.eyebrow}
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl font-bold">
              {dictionary.home.contact.title}
            </h2>
            <div className="mt-8">
              <EnglishOfficialContactCta
                whatsappHref={
                  contactResult.kind === "ready"
                    ? contactResult.data.whatsappHref
                    : null
                }
                copy={dictionary.home.contact}
                className="bg-white text-emerald-950 focus-visible:outline-amber-300"
              />
            </div>
          </div>
        </PublicContainer>
      </section>
    </PublicShell>
  );
}
