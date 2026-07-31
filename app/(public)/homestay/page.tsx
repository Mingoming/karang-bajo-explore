import { buildPublicMetadata } from "@/features/seo/public-metadata";
import { PublicListPage } from "@/components/public/public-list-page";
import { formatRupiah } from "@/features/public-content/model";
import { getPublishedHomestays } from "@/features/public-domains/data";
export const metadata = buildPublicMetadata({
  title: "Homestay",
  description:
    "Temukan pilihan homestay yang telah diterbitkan untuk menginap di Desa Karang Bajo.",
});
export default async function Page() {
  const result = await getPublishedHomestays();
  if (result.kind === "error") throw new Error("PUBLIC_HOMESTAYS_UNAVAILABLE");
  return (
    <PublicListPage
      title="Homestay"
      description="Pilihan menginap yang telah diterbitkan pengelola desa."
      eyebrow="Tempat menginap"
      items={result.items}
      basePath="/homestay"
      detail={(item) => `${formatRupiah(item.pricePerNight)} per malam`}
    />
  );
}
