import type { Metadata } from "next";
import { PublicListPage } from "@/components/public/public-list-page";
import { getPublishedTraditionalHouses } from "@/features/public-domains/data";
export const metadata: Metadata = {
  title: "Rumah Adat",
  description:
    "Rumah adat dan warisan budaya terverifikasi di Desa Karang Bajo.",
};
export default async function Page() {
  const result = await getPublishedTraditionalHouses();
  if (result.kind === "error") throw new Error("PUBLIC_HOUSES_UNAVAILABLE");
  return (
    <PublicListPage
      title="Rumah Adat"
      description="Informasi budaya yang telah diterbitkan dan diverifikasi."
      eyebrow="Warisan budaya"
      items={result.items}
      basePath="/rumah-adat"
      detail={(item) => item.locationName ?? undefined}
    />
  );
}
