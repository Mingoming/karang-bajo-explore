import type { Metadata } from "next";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { notFound } from "next/navigation";
import { PublicDetailPage } from "@/components/public/public-detail-page";
import { formatRupiah } from "@/features/public-content/model";
import {
  getPublishedHomestay,
  getPublishedHomestayMetadata,
} from "@/features/public-domains/data";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedHomestayMetadata(slug);

  if (!item) {
    return buildPublicMetadata({
      title: "Homestay tidak ditemukan",
      description:
        "Homestay yang diminta tidak tersedia atau belum diterbitkan.",
      noIndex: true,
    });
  }

  return buildPublicMetadata({
    title: item.title,
    description: item.description,
  });
}
export default async function Page({ params }: Props) {
  const result = await getPublishedHomestay((await params).slug);
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") throw new Error("PUBLIC_HOMESTAY_UNAVAILABLE");
  const item = result.item;
  return (
    <PublicDetailPage
      item={item}
      backHref="/homestay"
      backLabel="Semua homestay"
    >
      <section>
        <h2 className="font-serif text-3xl font-bold">Tentang homestay</h2>
        <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">
          {item.description}
        </p>
        <p className="mt-5 font-bold">
          {formatRupiah(item.pricePerNight)} per malam
        </p>
        {item.priceNote ? (
          <p className="mt-2 text-slate-600">{item.priceNote}</p>
        ) : null}
      </section>
      {item.facilities.length ? (
        <section>
          <h2 className="font-serif text-3xl font-bold">Fasilitas</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            {item.facilities.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {item.address ||
      item.latitude !== null ||
      item.googleMapsUrl ||
      item.ownerName ||
      item.phone ? (
        <section>
          <h2 className="font-serif text-3xl font-bold">Lokasi dan kontak</h2>
          {item.address ? <p className="mt-4">{item.address}</p> : null}
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
              Buka lokasi homestay di Google Maps
            </a>
          ) : null}
          {item.ownerName || item.phone ? (
            <p className="mt-4">
              Kontak: {[item.ownerName, item.phone].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </section>
      ) : null}
    </PublicDetailPage>
  );
}
