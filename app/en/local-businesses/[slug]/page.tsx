import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicContainer } from "@/components/public/public-container";
import { PublicMediaImage } from "@/components/public/public-media-image";
import { PublicShell } from "@/components/public/public-shell";
import { PUBLIC_ENGLISH_UMKMS_PATH } from "@/config/public-routes";
import { EnglishOfficialContactCta } from "@/features/official-contact/official-contact-cta";
import { getEnglishPublicShellData } from "@/features/official-contact/public-shell-data";
import {
  getPublishedEnglishUmkmBySlug,
  getPublishedEnglishUmkmMetadata,
} from "@/features/public-umkms/english-data";
import {
  ENGLISH_UMKM_COPY,
  type PublicEnglishUmkm,
} from "@/features/public-umkms/english-model";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const umkm = await getPublishedEnglishUmkmMetadata(slug);
  if (!umkm) {
    return buildPublicMetadata({
      title: ENGLISH_UMKM_COPY.detail.metadataUnavailableTitle,
      description: ENGLISH_UMKM_COPY.detail.metadataUnavailableDescription,
      noIndex: true,
      openGraphLocale: "en_US",
    });
  }
  return buildPublicMetadata({
    title: umkm.name,
    description: umkm.description,
    openGraphLocale: "en_US",
  });
}

function UmkmGallery({ umkm }: Readonly<{ umkm: PublicEnglishUmkm }>) {
  const images = umkm.gallery.filter(
    (image) => image.id !== umkm.primaryImage?.id && image.signedUrl,
  );
  if (images.length === 0) return null;
  return (
    <section aria-labelledby="umkm-gallery">
      <h2 id="umkm-gallery" className="font-serif text-3xl font-bold">
        {ENGLISH_UMKM_COPY.detail.galleryHeading}
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

export default async function EnglishUmkmDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPublishedEnglishUmkmBySlug(slug);
  if (result.kind !== "ready") {
    if (result.kind === "not-found") notFound();
    throw new Error("PUBLIC_ENGLISH_UMKM_DETAIL_UNAVAILABLE");
  }
  const umkm = result.umkm;
  if (!umkm.primaryImage) notFound();
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
                href={PUBLIC_ENGLISH_UMKMS_PATH}
                className="rounded-sm hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
              >
                {ENGLISH_UMKM_COPY.detail.breadcrumb}
              </Link>
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span aria-current="page">{umkm.businessName}</span>
            </nav>
            <p className="mt-8 text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
              {umkm.category}
            </p>
            <h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-6xl">
              {umkm.businessName}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-emerald-50/80">
              {umkm.description}
            </p>
          </PublicContainer>
        </header>

        <PublicContainer className="py-10 sm:py-14">
          <PublicMediaImage
            src={umkm.primaryImage.signedUrl}
            alt={umkm.primaryImage.altText}
            sizes="(max-width: 1279px) 100vw, 1200px"
            priority
            className="aspect-[16/9] rounded-3xl"
          />
          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-12">
              <section aria-labelledby="umkm-about">
                <h2 id="umkm-about" className="font-serif text-3xl font-bold">
                  {ENGLISH_UMKM_COPY.detail.aboutHeading}
                </h2>
                <p className="mt-5 font-semibold text-emerald-800">
                  {ENGLISH_UMKM_COPY.detail.categoryLabel}: {umkm.category}
                </p>
                <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-700">
                  {umkm.description}
                </p>
              </section>

              {umkm.address ||
              umkm.latitude !== null ||
              umkm.googleMapsUrl ||
              umkm.ownerName ||
              umkm.contactName ||
              umkm.contactPhone ||
              umkm.contactWhatsapp ? (
                <section aria-labelledby="umkm-location">
                  <h2
                    id="umkm-location"
                    className="font-serif text-3xl font-bold"
                  >
                    {ENGLISH_UMKM_COPY.detail.locationHeading}
                  </h2>
                  {umkm.address ? (
                    <p className="mt-5 text-slate-700">{umkm.address}</p>
                  ) : null}
                  {umkm.latitude !== null && umkm.longitude !== null ? (
                    <p className="mt-2 text-slate-600">
                      {ENGLISH_UMKM_COPY.detail.coordinatesLabel}:{" "}
                      {umkm.latitude}, {umkm.longitude}
                    </p>
                  ) : null}
                  {umkm.googleMapsUrl ? (
                    <a
                      href={umkm.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block font-bold text-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
                    >
                      {ENGLISH_UMKM_COPY.detail.googleMapsLabel}
                    </a>
                  ) : null}
                  {umkm.ownerName ||
                  umkm.contactName ||
                  umkm.contactPhone ||
                  umkm.contactWhatsapp ? (
                    <dl className="mt-5 space-y-2 text-slate-700">
                      {umkm.ownerName ? (
                        <div>
                          <dt className="font-semibold">
                            {ENGLISH_UMKM_COPY.detail.ownerLabel}
                          </dt>
                          <dd>{umkm.ownerName}</dd>
                        </div>
                      ) : null}
                      {umkm.contactName ? (
                        <div>
                          <dt className="font-semibold">
                            {ENGLISH_UMKM_COPY.detail.contactNameLabel}
                          </dt>
                          <dd>{umkm.contactName}</dd>
                        </div>
                      ) : null}
                      {umkm.contactPhone ? (
                        <div>
                          <dt className="font-semibold">
                            {ENGLISH_UMKM_COPY.detail.phoneLabel}
                          </dt>
                          <dd>{umkm.contactPhone}</dd>
                        </div>
                      ) : null}
                      {umkm.contactWhatsapp ? (
                        <div>
                          <dt className="font-semibold">
                            {ENGLISH_UMKM_COPY.detail.whatsappLabel}
                          </dt>
                          <dd>{umkm.contactWhatsapp}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </section>
              ) : null}

              <UmkmGallery umkm={umkm} />
            </div>
            <aside className="h-fit rounded-2xl bg-emerald-50 p-6">
              <h2 className="font-serif text-2xl font-bold text-slate-950">
                {ENGLISH_UMKM_COPY.detail.questionsHeading}
              </h2>
              <p className="mt-2 text-slate-600">
                {ENGLISH_UMKM_COPY.detail.questionsDescription}
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
