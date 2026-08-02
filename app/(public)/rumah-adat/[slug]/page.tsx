import type { Metadata } from "next";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { notFound } from "next/navigation";
import { PublicDetailPage } from "@/components/public/public-detail-page";
import {
  getPublishedTraditionalHouse,
  getPublishedTraditionalHouseMetadata,
} from "@/features/public-domains/data";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedTraditionalHouseMetadata(slug);

  if (!item) {
    return buildPublicMetadata({
      title: "Rumah adat tidak ditemukan",
      description:
        "Rumah adat yang diminta tidak tersedia atau belum diterbitkan.",
      noIndex: true,
    });
  }

  return buildPublicMetadata({
    title: item.title,
    description: item.description,
  });
}
export default async function Page({ params }: Props) {
  const result = await getPublishedTraditionalHouse((await params).slug);
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") throw new Error("PUBLIC_HOUSE_UNAVAILABLE");
  const item = result.item;
  return (
    <PublicDetailPage
      item={item}
      backHref="/rumah-adat"
      backLabel="Semua rumah adat"
    >
      <section>
        <h2 className="font-serif text-3xl font-bold">Deskripsi</h2>
        <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">
          {item.description}
        </p>
      </section>
      {item.history ? (
        <section>
          <h2 className="font-serif text-3xl font-bold">Sejarah</h2>
          <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">
            {item.history}
          </p>
        </section>
      ) : null}
      {item.culturalSignificance ? (
        <section>
          <h2 className="font-serif text-3xl font-bold">Makna budaya</h2>
          <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">
            {item.culturalSignificance}
          </p>
        </section>
      ) : null}
      {item.visitorInformation ||
      item.locationName ||
      item.latitude !== null ||
      item.googleMapsUrl ? (
        <section>
          <h2 className="font-serif text-3xl font-bold">Informasi kunjungan</h2>

          {item.visitorInformation ? (
            <p className="mt-4 whitespace-pre-line text-slate-700">
              {item.visitorInformation}
            </p>
          ) : null}

          {item.locationName ? (
            <p className="mt-4">{item.locationName}</p>
          ) : null}

          {item.latitude !== null ? (
            <p className="mt-2 text-slate-600">
              Latitude {item.latitude}, longitude {item.longitude}
            </p>
          ) : null}

          {item.googleMapsUrl ? (
            <a
              href={item.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block font-bold text-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
            >
              Buka lokasi rumah adat di Google Maps
            </a>
          ) : null}
        </section>
      ) : null}
    </PublicDetailPage>
  );
}
