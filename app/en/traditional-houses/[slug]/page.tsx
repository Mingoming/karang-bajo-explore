import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicContainer } from "@/components/public/public-container";
import { PublicMediaImage } from "@/components/public/public-media-image";
import { PublicShell } from "@/components/public/public-shell";
import { PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH } from "@/config/public-routes";
import { EnglishOfficialContactCta } from "@/features/official-contact/official-contact-cta";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import {
  getPublishedEnglishTraditionalHouseBySlug,
  getPublishedEnglishTraditionalHouseMetadata,
} from "@/features/public-traditional-houses/english-data";
import {
  ENGLISH_TRADITIONAL_HOUSE_COPY,
  type PublicEnglishTraditionalHouse,
} from "@/features/public-traditional-houses/english-model";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

type TraditionalHouseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: TraditionalHouseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const house = await getPublishedEnglishTraditionalHouseMetadata(slug);

  if (!house) {
    return buildPublicMetadata({
      title: ENGLISH_TRADITIONAL_HOUSE_COPY.detail.metadataUnavailableTitle,
      description:
        ENGLISH_TRADITIONAL_HOUSE_COPY.detail.metadataUnavailableDescription,
      noIndex: true,
      openGraphLocale: "en_US",
    });
  }

  return buildPublicMetadata({
    title: house.name,
    description: house.summary,
    openGraphLocale: "en_US",
  });
}

function TraditionalHouseSections({
  house,
}: Readonly<{ house: PublicEnglishTraditionalHouse }>) {
  return (
    <div className="space-y-12">
      <section aria-labelledby="traditional-house-description">
        <h2
          id="traditional-house-description"
          className="font-serif text-3xl font-bold"
        >
          {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.aboutHeading}
        </h2>
        <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-700">
          {house.description}
        </p>
      </section>

      {house.history ? (
        <section aria-labelledby="traditional-house-history">
          <h2
            id="traditional-house-history"
            className="font-serif text-3xl font-bold"
          >
            {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.historyHeading}
          </h2>
          <p className="mt-5 whitespace-pre-line leading-8 text-slate-700">
            {house.history}
          </p>
        </section>
      ) : null}

      {house.culturalSignificance ? (
        <section aria-labelledby="traditional-house-cultural-significance">
          <h2
            id="traditional-house-cultural-significance"
            className="font-serif text-3xl font-bold"
          >
            {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.culturalSignificanceHeading}
          </h2>
          <p className="mt-5 whitespace-pre-line leading-8 text-slate-700">
            {house.culturalSignificance}
          </p>
        </section>
      ) : null}

      {house.visitorInformation ? (
        <section aria-labelledby="traditional-house-visitors">
          <h2
            id="traditional-house-visitors"
            className="font-serif text-3xl font-bold"
          >
            {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.visitorHeading}
          </h2>
          <p className="mt-5 whitespace-pre-line leading-8 text-slate-700">
            {house.visitorInformation}
          </p>
        </section>
      ) : null}

      {house.locationName ||
      house.latitude !== null ||
      house.longitude !== null ||
      house.googleMapsUrl ? (
        <section
          aria-labelledby="traditional-house-location"
          className="rounded-2xl bg-amber-50 p-6 sm:p-8"
        >
          <p className="text-sm font-bold tracking-[0.16em] text-amber-900 uppercase">
            {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.locationEyebrow}
          </p>
          <h2
            id="traditional-house-location"
            className="mt-2 font-serif text-2xl font-bold text-slate-950"
          >
            {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.locationHeading}
          </h2>
          <p className="mt-3 leading-7 text-slate-700">
            {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.locationDescription}
          </p>
          {house.locationName ? (
            <p className="mt-4 font-semibold text-slate-800">
              {house.locationName}
            </p>
          ) : null}
          {house.latitude !== null && house.longitude !== null ? (
            <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <dt className="font-bold">
                  {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.latitudeLabel}
                </dt>
                <dd className="mt-1">{house.latitude}</dd>
              </div>
              <div>
                <dt className="font-bold">
                  {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.longitudeLabel}
                </dt>
                <dd className="mt-1">{house.longitude}</dd>
              </div>
            </dl>
          ) : null}
          {house.googleMapsUrl ? (
            <a
              href={house.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex min-h-11 items-center rounded-full bg-amber-300 px-5 py-2.5 font-bold text-amber-950 hover:bg-amber-200 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-700"
            >
              {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.googleMapsLabel}
              <span className="sr-only">
                {" "}
                {
                  ENGLISH_TRADITIONAL_HOUSE_COPY.detail
                    .googleMapsAccessibleLabel
                }
              </span>
            </a>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function TraditionalHouseGallery({
  house,
}: Readonly<{ house: PublicEnglishTraditionalHouse }>) {
  const primaryImageId = house.primaryImage?.id;
  const images = house.gallery.filter(
    (image) => image.id !== primaryImageId && image.signedUrl !== null,
  );

  if (images.length === 0) return null;

  return (
    <section aria-labelledby="traditional-house-gallery">
      <h2
        id="traditional-house-gallery"
        className="font-serif text-3xl font-bold"
      >
        {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.galleryHeading}
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <figure key={image.id} className="min-w-0">
            <PublicMediaImage
              src={image.signedUrl}
              alt={image.altText}
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              className="aspect-[4/3] rounded-2xl"
            />
            {image.caption ? (
              <figcaption className="mt-2 text-sm leading-6 text-slate-600">
                {image.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}

export default async function EnglishTraditionalHouseDetailPage({
  params,
}: TraditionalHouseDetailPageProps) {
  const { slug } = await params;
  const result = await getPublishedEnglishTraditionalHouseBySlug(slug);

  if (result.kind !== "ready") {
    if (result.kind === "not-found") notFound();
    throw new Error("PUBLIC_ENGLISH_TRADITIONAL_HOUSE_DETAIL_UNAVAILABLE");
  }

  const house = result.house;
  if (!house.primaryImage) notFound();

  const contactResult = await getEnglishPublicShellData();
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
                href={PUBLIC_ENGLISH_TRADITIONAL_HOUSES_PATH}
                className="rounded-sm hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
              >
                {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.breadcrumb}
              </Link>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span aria-current="page">{house.name}</span>
            </nav>
            <p className="mt-8 text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
              {ENGLISH_TRADITIONAL_HOUSE_COPY.list.eyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-6xl">
              {house.name}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-emerald-50/80">
              {house.summary}
            </p>
          </PublicContainer>
        </header>

        <PublicContainer className="py-10 sm:py-14">
          <PublicMediaImage
            src={house.primaryImage.signedUrl}
            alt={house.primaryImage.altText}
            sizes="(max-width: 1279px) 100vw, 1200px"
            priority
            className="aspect-[16/9] rounded-3xl"
          />

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-12">
              <TraditionalHouseSections house={house} />
              <TraditionalHouseGallery house={house} />
            </div>

            <aside className="h-fit rounded-2xl bg-emerald-50 p-6">
              <h2 className="font-serif text-2xl font-bold text-slate-950">
                {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.questionsHeading}
              </h2>
              <p className="mt-2 text-slate-600">
                {ENGLISH_TRADITIONAL_HOUSE_COPY.detail.questionsDescription}
              </p>
              <div className="mt-5">
                <EnglishOfficialContactCta
                  whatsappHref={contactData.whatsappHref}
                  copy={PUBLIC_DICTIONARIES.en.home.contact}
                  className="bg-emerald-900 text-white focus-visible:outline-emerald-700"
                />
              </div>
            </aside>
          </div>
        </PublicContainer>
      </article>
    </PublicShell>
  );
}
