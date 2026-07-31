import type { Metadata } from "next";
import { PublicListPage } from "@/components/public/public-list-page";
import { getPublishedUmkms } from "@/features/public-domains/data";
export const metadata: Metadata = {
  title: "UMKM",
  description: "Usaha lokal terbit di Desa Karang Bajo.",
};
export default async function Page() {
  const result = await getPublishedUmkms();
  if (result.kind === "error") throw new Error("PUBLIC_UMKMS_UNAVAILABLE");
  return (
    <PublicListPage
      title="UMKM"
      description="Kenali usaha lokal yang informasinya telah diterbitkan."
      eyebrow="Usaha lokal"
      items={result.items}
      basePath="/umkm"
    />
  );
}
