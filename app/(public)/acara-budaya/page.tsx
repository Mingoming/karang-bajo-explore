import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PublicListPage } from "@/components/public/public-list-page";
import {
  formatPublicEventSchedule,
  getPublishedCulturalEvents,
} from "@/features/public-domains/data";
export const metadata = buildPublicMetadata({
  title: "Acara Budaya",
  description:
    "Lihat acara budaya dengan jadwal yang telah dikonfirmasi dan diterbitkan di Desa Karang Bajo.",
});
export default async function Page() {
  const result = await getPublishedCulturalEvents();
  if (result.kind === "error") throw new Error("PUBLIC_EVENTS_UNAVAILABLE");
  return (
    <PublicListPage
      title="Acara Budaya"
      description="Acara terbit dengan jadwal yang telah dikonfirmasi."
      eyebrow="Agenda budaya"
      items={result.items}
      basePath="/acara-budaya"
      detail={(item) => formatPublicEventSchedule(item.startAt, item.allDay)}
    />
  );
}
