import type { Metadata } from "next";
import { PublicListPage } from "@/components/public/public-list-page";
import { formatRupiah } from "@/features/public-content/model";
import { getPublishedHomestays } from "@/features/public-domains/data";
export const metadata: Metadata = {
  title: "Homestay",
  description: "Informasi homestay terbit di Desa Karang Bajo.",
};
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
