import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DestinationGallery } from "@/components/public/destination-gallery";
import { DestinationImage } from "@/components/public/destination-image";
import { DestinationLocationSummary } from "@/components/public/destination-location-summary";
import { PublicContainer } from "@/components/public/public-container";
import { PublicShell } from "@/components/public/public-shell";
import { EnglishOfficialContactCta } from "@/features/official-contact/official-contact-cta";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import {
  ENGLISH_DESTINATION_COPY,
  formatEnglishDestinationPrice,
} from "@/features/public-destinations/english-model";
import {
  getPublishedEnglishDestinationBySlug,
  getPublishedEnglishDestinationMetadata,
} from "@/features/public-destinations/english-data";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

type EnglishDestinationDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EnglishDestinationDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getPublishedEnglishDestinationMetadata(slug);

  if (!destination) {
    return buildPublicMetadata({
      title: ENGLISH_DESTINATION_COPY.detail.metadataUnavailableTitle,
      description:
        ENGLISH_DESTINATION_COPY.detail.metadataUnavailableDescription,
      noIndex: true,
      openGraphLocale: "en_US",
    });
  }

  return buildPublicMetadata({
    title: destination.name,
    description: destination.summary,
    openGraphLocale: "en_US",
  });
}

export default async function EnglishDestinationDetailPage({
  params,
}: EnglishDestinationDetailPageProps) {
  const { slug } = await params;
  const result = await getPublishedEnglishDestinationBySlug(slug);

  if (result.kind !== "ready") {
    if (result.kind === "not-found") notFound();
    throw new Error("PUBLIC_ENGLISH_DESTINATION_DETAIL_UNAVAILABLE");
  }

  const contactResult = await getEnglishPublicShellData();
  const { destination } = result;
  const price = formatEnglishDestinationPrice(destination.entranceFee);
  const contactData =
    contactResult.kind === "ready"
      ? contactResult.data
      : { whatsappHref: null, externalLinks: [] };

  return (
    <PublicShell locale="en" englishContactData={contactResult}>
      <article>
        <header className="bg-emerald-950 py-10 text-white sm:py-14">
          <PublicContainer>
            <nav
              aria-label="Breadcrumb"
              className="text-sm text-emerald-100/75"
            >
              <Link
                href="/en/destinations"
                className="rounded-sm hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
              >
                {ENGLISH_DESTINATION_COPY.detail.breadcrumb}
              </Link>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span aria-current="page">{destination.name}</span>
            </nav>
            <p className="mt-8 text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
              {destination.categoryName}
            </p>
            <h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-6xl">
              {destination.name}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-emerald-50/80">
              {destination.summary}
            </p>
          </PublicContainer>
        </header>

        <PublicContainer className="py-10 sm:py-14">
          <DestinationImage
            src={destination.primaryImage?.signedUrl ?? null}
            alt={destination.primaryImage?.altText ?? destination.name}
            sizes="(max-width: 1279px) 100vw, 1200px"
            highPriority
            className="aspect-[16/9] rounded-3xl"
          />

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-12">
              <section aria-labelledby="destination-about">
                <h2
                  id="destination-about"
                  className="font-serif text-3xl font-bold"
                >
                  {ENGLISH_DESTINATION_COPY.detail.aboutHeading}
                </h2>
                <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-700">
                  {destination.description}
                </p>
              </section>

              {destination.history ? (
                <section aria-labelledby="destination-history">
                  <h2
                    id="destination-history"
                    className="font-serif text-3xl font-bold"
                  >
                    {ENGLISH_DESTINATION_COPY.detail.historyHeading}
                  </h2>
                  <p className="mt-5 whitespace-pre-line leading-8 text-slate-700">
                    {destination.history}
                  </p>
                </section>
              ) : null}

              {destination.facilities.length > 0 ? (
                <section aria-labelledby="destination-facilities">
                  <h2
                    id="destination-facilities"
                    className="font-serif text-3xl font-bold"
                  >
                    {ENGLISH_DESTINATION_COPY.detail.facilitiesHeading}
                  </h2>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {destination.facilities.map((facility) => (
                      <li
                        key={facility}
                        className="rounded-xl bg-emerald-50 px-4 py-3 text-slate-700"
                      >
                        {facility}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <DestinationLocationSummary
                destination={destination}
                copy={{
                  sectionId: "destination-location",
                  eyebrow: "Location",
                  heading: "Coordinates",
                  description: (currentDestination) => (
                    <>
                      Latitude {currentDestination.latitude}, longitude{" "}
                      {currentDestination.longitude}. Use Google Maps for the
                      saved directions when available.
                    </>
                  ),
                  mapHref: null,
                  mapLabel: "Open tourism map",
                  googleMapsLabel: "Open Google Maps",
                  googleMapsAccessibleLabel: "in a new tab",
                }}
              />
              <DestinationGallery
                images={destination.gallery}
                primaryImageId={destination.primaryImage?.id ?? null}
                copy={{
                  sectionId: "destination-gallery",
                  heading: "Gallery",
                  primaryImageLabel: "Primary image",
                }}
              />
            </div>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-serif text-2xl font-bold">
                {ENGLISH_DESTINATION_COPY.detail.visitHeading}
              </h2>
              <dl className="mt-5 space-y-5 text-sm">
                {destination.openingHours ? (
                  <div>
                    <dt className="font-bold text-slate-950">
                      {ENGLISH_DESTINATION_COPY.detail.hoursLabel}
                    </dt>
                    <dd className="mt-1 whitespace-pre-line leading-6 text-slate-600">
                      {destination.openingHours}
                    </dd>
                  </div>
                ) : null}
                {price || destination.priceNote ? (
                  <div>
                    <dt className="font-bold text-slate-950">
                      {ENGLISH_DESTINATION_COPY.detail.entranceFeeLabel}
                    </dt>
                    {price ? (
                      <dd className="mt-1 text-slate-600">{price}</dd>
                    ) : null}
                    {destination.priceNote ? (
                      <dd className="mt-1 leading-6 text-slate-600">
                        {destination.priceNote}
                      </dd>
                    ) : null}
                  </div>
                ) : null}
                {destination.contactName || destination.contactPhone ? (
                  <div>
                    <dt className="font-bold text-slate-950">
                      {ENGLISH_DESTINATION_COPY.detail.contactLabel}
                    </dt>
                    {destination.contactName ? (
                      <dd className="mt-1 text-slate-600">
                        {destination.contactName}
                      </dd>
                    ) : null}
                    {destination.contactPhone ? (
                      <dd className="mt-1 text-slate-600">
                        {destination.contactPhone}
                      </dd>
                    ) : null}
                  </div>
                ) : null}
              </dl>
            </aside>
          </div>

          <section className="mt-12 rounded-2xl bg-emerald-50 p-6">
            <h2 className="font-serif text-2xl font-bold text-slate-950">
              {ENGLISH_DESTINATION_COPY.detail.questionsHeading}
            </h2>
            <p className="mt-2 text-slate-600">
              {ENGLISH_DESTINATION_COPY.detail.questionsDescription}
            </p>
            <div className="mt-5">
              <EnglishOfficialContactCta
                whatsappHref={contactData.whatsappHref}
                copy={PUBLIC_DICTIONARIES.en.home.contact}
                className="bg-emerald-900 text-white focus-visible:outline-emerald-700"
              />
            </div>
          </section>
        </PublicContainer>
      </article>
    </PublicShell>
  );
}
