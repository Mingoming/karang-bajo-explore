import type { Metadata } from "next";

import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { getPublishedPublicMapData } from "@/features/public-map/data";
import { PublicMap } from "@/features/public-map/public-map";

export const metadata: Metadata = {
  title: "Peta Wisata",
  description:
    "Lihat lokasi destinasi, rumah adat, homestay, dan UMKM yang telah diterbitkan di Desa Karang Bajo.",
};

export default async function TourismMapPage() {
  const result = await getPublishedPublicMapData();

  if (result.kind === "error") {
    throw new Error("PUBLIC_TOURISM_MAP_UNAVAILABLE");
  }

  return (
    <>
      <section className="border-b border-emerald-950/10 bg-emerald-950 py-16 text-white sm:py-20">
        <PublicContainer>
          <p className="text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
            Jelajahi lokasi
          </p>

          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            Peta wisata Karang Bajo
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/80">
            Temukan persebaran destinasi, rumah adat, homestay, dan UMKM yang
            telah diterbitkan untuk membantu merencanakan kunjungan.
          </p>
        </PublicContainer>
      </section>

      <section className="py-12 sm:py-16">
        <PublicContainer>
          {result.items.length > 0 ? (
            <PublicMap
              markers={result.markers}
              destinationCategories={result.destinationCategories}
            />
          ) : (
            <EmptyContentState
              title="Belum ada lokasi yang dapat ditampilkan"
              description="Lokasi akan muncul setelah informasi terverifikasi dan dipublikasikan."
            />
          )}
        </PublicContainer>
      </section>
    </>
  );
}
