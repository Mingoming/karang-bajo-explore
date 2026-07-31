import type { Metadata } from "next";
import { PublicListPage } from "@/components/public/public-list-page";
import {
  formatPublicEventSchedule,
  getPublishedCulturalEvents,
} from "@/features/public-domains/data";
export const metadata: Metadata = {
  title: "Acara Budaya",
  description: "Jadwal acara budaya terkonfirmasi di Desa Karang Bajo.",
};
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
