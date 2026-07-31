import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PublicListPage } from "@/components/public/public-list-page";
import { getPublishedTraditionalHouses } from "@/features/public-domains/data";
export const metadata = buildPublicMetadata({
  title: "Rumah Adat",
  description:
    "Pelajari rumah adat dan warisan budaya yang telah diterbitkan di Desa Karang Bajo.",
});
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
