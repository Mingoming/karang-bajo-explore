import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPublicMetadata } from "@/features/seo/public-metadata";

import { DestinationGallery } from "@/components/public/destination-gallery";
import { DestinationImage } from "@/components/public/destination-image";
import { DestinationLocationSummary } from "@/components/public/destination-location-summary";
import { PublicContainer } from "@/components/public/public-container";
import {
  getPublishedDestinationBySlug,
  getPublishedDestinationMetadata,
} from "@/features/public-destinations/data";
import { formatDestinationPrice } from "@/features/public-destinations/model";

type DestinationDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: DestinationDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const destination = await getPublishedDestinationMetadata(slug);

  if (!destination) {
    return buildPublicMetadata({
      title: "Destinasi tidak ditemukan",
      description:
        "Destinasi yang diminta tidak tersedia atau belum diterbitkan.",
      noIndex: true,
    });
  }

  return buildPublicMetadata({
    title: destination.name,
    description: destination.summary,
  });
}

export default async function DestinationDetailPage({
  params,
}: DestinationDetailPageProps) {
  const { slug } = await params;
  const result = await getPublishedDestinationBySlug(slug);
  if (result.kind === "not-found") notFound();
  if (result.kind !== "ready") {
    throw new Error("PUBLIC_DESTINATION_DETAIL_UNAVAILABLE");
  }

  const { destination } = result;
  const price = formatDestinationPrice(destination.entranceFee);

  return (
    <article>
      <header className="bg-emerald-950 py-10 text-white sm:py-14">
        <PublicContainer>
          <nav aria-label="Breadcrumb" className="text-sm text-emerald-100/75">
            <Link
              href="/destinasi"
              className="rounded-sm hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-300"
            >
              Destinasi
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
          alt={destination.primaryImage?.altText ?? ""}
          sizes="(max-width: 1279px) 100vw, 1200px"
          priority
          className="aspect-[16/9] rounded-3xl"
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-12">
            <section aria-labelledby="tentang-destinasi">
              <h2
                id="tentang-destinasi"
                className="font-serif text-3xl font-bold"
              >
                Tentang destinasi
              </h2>
              <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-700">
                {destination.description}
              </p>
            </section>

            {destination.history ? (
              <section aria-labelledby="sejarah-destinasi">
                <h2
                  id="sejarah-destinasi"
                  className="font-serif text-3xl font-bold"
                >
                  Sejarah
                </h2>
                <p className="mt-5 whitespace-pre-line leading-8 text-slate-700">
                  {destination.history}
                </p>
              </section>
            ) : null}

            {destination.facilities.length > 0 ? (
              <section aria-labelledby="fasilitas-destinasi">
                <h2
                  id="fasilitas-destinasi"
                  className="font-serif text-3xl font-bold"
                >
                  Fasilitas
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

            <DestinationLocationSummary destination={destination} />
            <DestinationGallery images={destination.gallery} />
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold">
              Informasi kunjungan
            </h2>
            <dl className="mt-5 space-y-5 text-sm">
              {destination.openingHours ? (
                <div>
                  <dt className="font-bold text-slate-950">Jam kunjungan</dt>
                  <dd className="mt-1 whitespace-pre-line leading-6 text-slate-600">
                    {destination.openingHours}
                  </dd>
                </div>
              ) : null}
              {price || destination.priceNote ? (
                <div>
                  <dt className="font-bold text-slate-950">Biaya masuk</dt>
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
                    Kontak terpublikasi
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
      </PublicContainer>
    </article>
  );
}
