import { buildPublicMetadata } from "@/features/seo/public-metadata";
import Link from "next/link";

import { DestinationCard } from "@/components/public/destination-card";
import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { getPublishedDestinations } from "@/features/public-destinations/data";

export const metadata = buildPublicMetadata({
  title: "Destinasi",
  description:
    "Jelajahi destinasi wisata alam, budaya, dan religi yang telah diterbitkan di Desa Karang Bajo.",
});

type DestinationListPageProps = {
  searchParams: Promise<{ kategori?: string | string[] }>;
};

export default async function DestinationListPage({
  searchParams,
}: DestinationListPageProps) {
  const result = await getPublishedDestinations();
  if (result.kind === "error") {
    throw new Error("PUBLIC_DESTINATION_LIST_UNAVAILABLE");
  }

  const query = await searchParams;
  const selectedCategory = Array.isArray(query.kategori)
    ? query.kategori[0]
    : query.kategori;
  const destinations = selectedCategory
    ? result.destinations.filter(
        (destination) =>
          result.categories.find(
            (category) => category.id === destination.categoryId,
          )?.slug === selectedCategory,
      )
    : result.destinations;

  return (
    <>
      <section className="border-b border-emerald-950/10 bg-emerald-950 py-16 text-white sm:py-20">
        <PublicContainer>
          <p className="text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">
            Jelajahi Karang Bajo
          </p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            Destinasi wisata
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/80">
            Temukan informasi destinasi yang telah diterbitkan dalam kategori
            Alam, Budaya, dan Religi.
          </p>
        </PublicContainer>
      </section>

      <section className="py-12 sm:py-16" aria-labelledby="daftar-destinasi">
        <PublicContainer>
          <div className="flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold tracking-[0.14em] text-emerald-800 uppercase">
                Pilih kategori
              </p>
              <h2
                id="daftar-destinasi"
                className="mt-2 font-serif text-3xl font-bold"
              >
                Daftar destinasi
              </h2>
            </div>
            <nav aria-label="Filter kategori destinasi">
              <ul className="flex flex-wrap gap-2">
                <li>
                  <Link
                    href="/destinasi"
                    aria-current={!selectedCategory ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                      !selectedCategory
                        ? "border-emerald-900 bg-emerald-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-emerald-700"
                    }`}
                  >
                    Semua
                  </Link>
                </li>
                {result.categories.map((category) => {
                  const active = selectedCategory === category.slug;
                  return (
                    <li key={category.id}>
                      <Link
                        href={`/destinasi?kategori=${category.slug}`}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                          active
                            ? "border-emerald-900 bg-emerald-900 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:border-emerald-700"
                        }`}
                      >
                        {category.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {destinations.length === 0 ? (
            <div className="mt-8">
              <EmptyContentState
                title={
                  selectedCategory
                    ? "Tidak ada destinasi dalam kategori ini"
                    : "Belum ada destinasi yang dipublikasikan"
                }
                description="Silakan kembali lagi setelah informasi destinasi tersedia."
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {destinations.map((destination) => (
                <DestinationCard
                  key={destination.id}
                  destination={destination}
                />
              ))}
            </div>
          )}
        </PublicContainer>
      </section>
    </>
  );
}
