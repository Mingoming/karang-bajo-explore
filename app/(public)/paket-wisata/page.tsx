import type { Metadata } from "next";
import { PublicListPage } from "@/components/public/public-list-page";
import { getPublishedPackages } from "@/features/public-domains/data";
import { formatRupiah } from "@/features/public-content/model";

export const metadata: Metadata = {
  title: "Paket Wisata",
  description: "Paket wisata terbit untuk menjelajahi Desa Karang Bajo.",
};
export default async function Page() {
  const result = await getPublishedPackages();
  if (result.kind === "error") throw new Error("PUBLIC_PACKAGES_UNAVAILABLE");
  return (
    <PublicListPage
      title="Paket Wisata"
      description="Pilihan perjalanan terbit tanpa layanan pemesanan."
      eyebrow="Rencana kunjungan"
      items={result.items}
      basePath="/paket-wisata"
      detail={(item) =>
        `${item.durationValue} ${item.durationUnit} · ${formatRupiah(item.price)}`
      }
    />
  );
}
