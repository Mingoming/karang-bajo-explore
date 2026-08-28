import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicContainer } from "@/components/public/public-container";
import { PublicMediaImage } from "@/components/public/public-media-image";
import { PublicShell } from "@/components/public/public-shell";
import {
  getPublicEnglishDestinationPath,
  PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH,
} from "@/config/public-routes";
import { EnglishOfficialContactCta } from "@/features/official-contact/official-contact-cta";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import {
  getPublishedEnglishTourismPackageBySlug,
  getPublishedEnglishTourismPackageMetadata,
} from "@/features/public-tourism-packages/english-data";
import {
  ENGLISH_TOURISM_PACKAGE_COPY,
  formatEnglishTourismPackagePrice,
  getEnglishTourismPackageTypeLabel,
  type PublicEnglishTourismPackage,
} from "@/features/public-tourism-packages/english-model";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tourismPackage = await getPublishedEnglishTourismPackageMetadata(slug);

  if (!tourismPackage) {
    return buildPublicMetadata({
      title: ENGLISH_TOURISM_PACKAGE_COPY.detail.metadataUnavailableTitle,
      description:
        ENGLISH_TOURISM_PACKAGE_COPY.detail.metadataUnavailableDescription,
      noIndex: true,
      openGraphLocale: "en_US",
    });
  }

  return buildPublicMetadata({
    title: tourismPackage.title,
    description: tourismPackage.description,
    openGraphLocale: "en_US",
  });
}

function EnglishTourismPackageGallery({
  tourismPackage,
}: Readonly<{
  tourismPackage: PublicEnglishTourismPackage;
}>) {
  const images = tourismPackage.gallery.filter(
    (image) => image.id !== tourismPackage.primaryImage?.id,
  );
  if (images.length === 0) return null;

  return (
    <section aria-labelledby="tourism-package-gallery">
      <h2
        id="tourism-package-gallery"
        className="font-serif text-3xl font-bold"
      >
        {ENGLISH_TOURISM_PACKAGE_COPY.detail.galleryHeading}
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <figure key={image.id}>
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

export default async function EnglishTourismPackageDetailPage({
  params,
}: Props) {
  const { slug } = await params;
  const result = await getPublishedEnglishTourismPackageBySlug(slug);

  if (result.kind !== "ready") {
    if (result.kind === "not-found") notFound();
    throw new Error("PUBLIC_ENGLISH_TOURISM_PACKAGE_DETAIL_UNAVAILABLE");
  }

  const tourismPackage = result.tourismPackage;
  if (!tourismPackage.primaryImage) notFound();
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
                href={PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH}
                className="rounded-sm hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
              >
                {ENGLISH_TOURISM_PACKAGE_COPY.detail.breadcrumb}
              </Link>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span aria-current="page">{tourismPackage.name}</span>
            </nav>
            <p className="mt-8 text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
              {getEnglishTourismPackageTypeLabel(tourismPackage.packageType)}
            </p>
            <h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-6xl">
              {tourismPackage.name}
            </h1>
            {tourismPackage.summary ? (
              <p className="mt-5 max-w-3xl text-lg leading-8 text-emerald-50/80">
                {tourismPackage.summary}
              </p>
            ) : null}
          </PublicContainer>
        </header>

        <PublicContainer className="py-10 sm:py-14">
          <PublicMediaImage
            src={tourismPackage.primaryImage.signedUrl}
            alt={tourismPackage.primaryImage.altText}
            sizes="(max-width: 1279px) 100vw, 1200px"
            priority
            className="aspect-[16/9] rounded-3xl"
          />

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-12">
              <section aria-labelledby="tourism-package-about">
                <h2
                  id="tourism-package-about"
                  className="font-serif text-3xl font-bold"
                >
                  {ENGLISH_TOURISM_PACKAGE_COPY.detail.aboutHeading}
                </h2>
                <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-700">
                  {tourismPackage.description}
                </p>
                <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="font-bold text-slate-950">
                      {ENGLISH_TOURISM_PACKAGE_COPY.detail.packageTypeLabel}
                    </dt>
                    <dd className="mt-1 text-slate-600">
                      {getEnglishTourismPackageTypeLabel(
                        tourismPackage.packageType,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-950">
                      {ENGLISH_TOURISM_PACKAGE_COPY.detail.durationLabel}
                    </dt>
                    <dd className="mt-1 text-slate-600">
                      {tourismPackage.durationValue}{" "}
                      {tourismPackage.durationUnit}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-slate-950">
                      {ENGLISH_TOURISM_PACKAGE_COPY.detail.priceLabel}
                    </dt>
                    <dd className="mt-1 text-slate-600">
                      {formatEnglishTourismPackagePrice(tourismPackage.price)}
                    </dd>
                  </div>
                </dl>
                {tourismPackage.priceNote ? (
                  <p className="mt-4 whitespace-pre-line text-slate-600">
                    {tourismPackage.priceNote}
                  </p>
                ) : null}
              </section>

              {tourismPackage.includedFacilities.length > 0 ? (
                <section aria-labelledby="tourism-package-facilities">
                  <h2
                    id="tourism-package-facilities"
                    className="font-serif text-3xl font-bold"
                  >
                    {ENGLISH_TOURISM_PACKAGE_COPY.detail.facilitiesHeading}
                  </h2>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {tourismPackage.includedFacilities.map((facility) => (
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

              {tourismPackage.souvenir ? (
                <section aria-labelledby="tourism-package-souvenir">
                  <h2
                    id="tourism-package-souvenir"
                    className="font-serif text-3xl font-bold"
                  >
                    {ENGLISH_TOURISM_PACKAGE_COPY.detail.souvenirHeading}
                  </h2>
                  <p className="mt-5 whitespace-pre-line leading-7 text-slate-700">
                    {tourismPackage.souvenir}
                  </p>
                </section>
              ) : null}

              <section aria-labelledby="tourism-package-itinerary">
                <h2
                  id="tourism-package-itinerary"
                  className="font-serif text-3xl font-bold"
                >
                  {ENGLISH_TOURISM_PACKAGE_COPY.detail.itineraryHeading}
                </h2>
                <ol className="mt-5 space-y-4">
                  {tourismPackage.itinerary.map((destination) => (
                    <li
                      key={destination.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <Link
                        href={getPublicEnglishDestinationPath(
                          destination.destinationSlug,
                        )}
                        className="font-bold text-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                      >
                        {destination.displayOrder + 1}.{" "}
                        {destination.destinationName}
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>

              <EnglishTourismPackageGallery tourismPackage={tourismPackage} />
            </div>

            <aside className="h-fit rounded-2xl bg-emerald-50 p-6">
              <h2 className="font-serif text-2xl font-bold text-slate-950">
                {ENGLISH_TOURISM_PACKAGE_COPY.detail.questionsHeading}
              </h2>
              <p className="mt-2 text-slate-600">
                {ENGLISH_TOURISM_PACKAGE_COPY.detail.questionsDescription}
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
