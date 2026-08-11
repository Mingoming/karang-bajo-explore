import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicContainer } from "@/components/public/public-container";
import { PublicMediaImage } from "@/components/public/public-media-image";
import { PublicShell } from "@/components/public/public-shell";
import { PUBLIC_ENGLISH_HOMESTAYS_PATH } from "@/config/public-routes";
import { EnglishOfficialContactCta } from "@/features/official-contact/official-contact-cta";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import {
  getPublishedEnglishHomestayBySlug,
  getPublishedEnglishHomestayMetadata,
} from "@/features/public-homestays/english-data";
import {
  ENGLISH_HOMESTAY_COPY,
  formatEnglishHomestayPrice,
  type PublicEnglishHomestay,
} from "@/features/public-homestays/english-model";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const homestay = await getPublishedEnglishHomestayMetadata(slug);
  if (!homestay) {
    return buildPublicMetadata({
      title: ENGLISH_HOMESTAY_COPY.detail.metadataUnavailableTitle,
      description: ENGLISH_HOMESTAY_COPY.detail.metadataUnavailableDescription,
      noIndex: true,
      openGraphLocale: "en_US",
    });
  }
  return buildPublicMetadata({
    title: homestay.name,
    description: homestay.description,
    openGraphLocale: "en_US",
  });
}

function HomestayGallery({
  homestay,
}: Readonly<{ homestay: PublicEnglishHomestay }>) {
  const images = homestay.gallery.filter(
    (image) => image.id !== homestay.primaryImage?.id && image.signedUrl,
  );
  if (images.length === 0) return null;
  return (
    <section aria-labelledby="homestay-gallery">
      <h2 id="homestay-gallery" className="font-serif text-3xl font-bold">
        {ENGLISH_HOMESTAY_COPY.detail.galleryHeading}
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

export default async function EnglishHomestayDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPublishedEnglishHomestayBySlug(slug);
  if (result.kind !== "ready") {
    if (result.kind === "not-found") notFound();
    throw new Error("PUBLIC_ENGLISH_HOMESTAY_DETAIL_UNAVAILABLE");
  }
  const homestay = result.homestay;
  if (!homestay.primaryImage) notFound();
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
                href={PUBLIC_ENGLISH_HOMESTAYS_PATH}
                className="rounded-sm hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
              >
                {ENGLISH_HOMESTAY_COPY.detail.breadcrumb}
              </Link>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span aria-current="page">{homestay.name}</span>
            </nav>
            <p className="mt-8 text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
              {ENGLISH_HOMESTAY_COPY.list.eyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-6xl">
              {homestay.name}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-emerald-50/80">
              {homestay.description}
            </p>
          </PublicContainer>
        </header>

        <PublicContainer className="py-10 sm:py-14">
          <PublicMediaImage
            src={homestay.primaryImage.signedUrl}
            alt={homestay.primaryImage.altText}
            sizes="(max-width: 1279px) 100vw, 1200px"
            priority
            className="aspect-[16/9] rounded-3xl"
          />
          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-12">
              <section aria-labelledby="homestay-about">
                <h2
                  id="homestay-about"
                  className="font-serif text-3xl font-bold"
                >
                  {ENGLISH_HOMESTAY_COPY.detail.aboutHeading}
                </h2>
                <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-700">
                  {homestay.description}
                </p>
                <p className="mt-5 font-bold text-slate-900">
                  {formatEnglishHomestayPrice(homestay.pricePerNight)}
                </p>
                {homestay.priceNote ? (
                  <p className="mt-2 text-slate-600">{homestay.priceNote}</p>
                ) : null}
              </section>

              {homestay.facilities.length > 0 ? (
                <section aria-labelledby="homestay-facilities">
                  <h2
                    id="homestay-facilities"
                    className="font-serif text-3xl font-bold"
                  >
                    {ENGLISH_HOMESTAY_COPY.detail.facilitiesHeading}
                  </h2>
                  <ul className="mt-5 list-disc space-y-2 pl-5 leading-7 text-slate-700">
                    {homestay.facilities.map((facility, index) => (
                      <li key={`${facility}-${index}`}>{facility}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {homestay.address ||
              homestay.latitude !== null ||
              homestay.googleMapsUrl ||
              homestay.ownerName ||
              homestay.phone ? (
                <section aria-labelledby="homestay-location">
                  <h2
                    id="homestay-location"
                    className="font-serif text-3xl font-bold"
                  >
                    {ENGLISH_HOMESTAY_COPY.detail.locationHeading}
                  </h2>
                  {homestay.address ? (
                    <p className="mt-5 text-slate-700">{homestay.address}</p>
                  ) : null}
                  {homestay.latitude !== null && homestay.longitude !== null ? (
                    <p className="mt-2 text-slate-600">
                      {ENGLISH_HOMESTAY_COPY.detail.coordinatesLabel}:{" "}
                      {homestay.latitude}, {homestay.longitude}
                    </p>
                  ) : null}
                  {homestay.googleMapsUrl ? (
                    <a
                      href={homestay.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block font-bold text-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    >
                      {ENGLISH_HOMESTAY_COPY.detail.googleMapsLabel}
                    </a>
                  ) : null}
                  {homestay.ownerName || homestay.phone ? (
                    <dl className="mt-5 space-y-2 text-slate-700">
                      {homestay.ownerName ? (
                        <div>
                          <dt className="font-semibold">
                            {ENGLISH_HOMESTAY_COPY.detail.ownerLabel}
                          </dt>
                          <dd>{homestay.ownerName}</dd>
                        </div>
                      ) : null}
                      {homestay.phone ? (
                        <div>
                          <dt className="font-semibold">
                            {ENGLISH_HOMESTAY_COPY.detail.phoneLabel}
                          </dt>
                          <dd>{homestay.phone}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </section>
              ) : null}

              <HomestayGallery homestay={homestay} />
            </div>
            <aside className="h-fit rounded-2xl bg-emerald-50 p-6">
              <h2 className="font-serif text-2xl font-bold text-slate-950">
                {ENGLISH_HOMESTAY_COPY.detail.questionsHeading}
              </h2>
              <p className="mt-2 text-slate-600">
                {ENGLISH_HOMESTAY_COPY.detail.questionsDescription}
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
