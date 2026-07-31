import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicDetailPage } from "@/components/public/public-detail-page";
import {
  formatPublicEventSchedule,
  getPublishedCulturalEvent,
  getPublishedCulturalEventMetadata,
} from "@/features/public-domains/data";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getPublishedCulturalEventMetadata((await params).slug);
  return item ?? { title: "Acara tidak ditemukan" };
}
export default async function Page({ params }: Props) {
  const result = await getPublishedCulturalEvent((await params).slug);
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") throw new Error("PUBLIC_EVENT_UNAVAILABLE");
  const item = result.item;
  return (
    <PublicDetailPage
      item={item}
      backHref="/acara-budaya"
      backLabel="Semua acara"
    >
      <section>
        <h2 className="font-serif text-3xl font-bold">Tentang acara</h2>
        <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">
          {item.description}
        </p>
      </section>
      <section>
        <h2 className="font-serif text-3xl font-bold">Jadwal dan lokasi</h2>
        <p className="mt-4 font-bold">
          Mulai: {formatPublicEventSchedule(item.startAt, item.allDay)}
        </p>
        {item.endAt ? (
          <p className="mt-2">
            Selesai: {formatPublicEventSchedule(item.endAt, item.allDay)}
          </p>
        ) : null}
        {item.locationName ? <p className="mt-4">{item.locationName}</p> : null}
        {item.address ? (
          <p className="mt-1 text-slate-600">{item.address}</p>
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
            Buka lokasi acara di Google Maps
          </a>
        ) : null}
      </section>
      {item.visitorInformation || item.organizer || item.contactPhone ? (
        <section>
          <h2 className="font-serif text-3xl font-bold">
            Informasi pengunjung
          </h2>
          {item.visitorInformation ? (
            <p className="mt-4 whitespace-pre-line">
              {item.visitorInformation}
            </p>
          ) : null}
          {item.organizer ? (
            <p className="mt-4">Penyelenggara: {item.organizer}</p>
          ) : null}
          {item.contactPhone ? (
            <p className="mt-2">Kontak: {item.contactPhone}</p>
          ) : null}
        </section>
      ) : null}
    </PublicDetailPage>
  );
}
