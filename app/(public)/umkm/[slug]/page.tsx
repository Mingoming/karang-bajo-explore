import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicDetailPage } from "@/components/public/public-detail-page";
import {
  getPublishedUmkm,
  getPublishedUmkmMetadata,
} from "@/features/public-domains/data";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getPublishedUmkmMetadata((await params).slug);
  return item ?? { title: "UMKM tidak ditemukan" };
}
export default async function Page({ params }: Props) {
  const result = await getPublishedUmkm((await params).slug);
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") throw new Error("PUBLIC_UMKM_UNAVAILABLE");
  const item = result.item;
  return (
    <PublicDetailPage item={item} backHref="/umkm" backLabel="Semua UMKM">
      <section>
        <h2 className="font-serif text-3xl font-bold">Tentang usaha</h2>
        <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">
          {item.description}
        </p>
      </section>
      {item.address ||
      item.latitude !== null ||
      item.googleMapsUrl ||
      item.contactName ||
      item.contactPhone ||
      item.contactWhatsapp ? (
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
              Buka lokasi UMKM di Google Maps
            </a>
          ) : null}

          {item.contactName || item.contactPhone || item.contactWhatsapp ? (
            <p className="mt-4">
              Kontak:{" "}
              {[item.contactName, item.contactPhone, item.contactWhatsapp]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </section>
      ) : null}
    </PublicDetailPage>
  );
}
