import { buildPublicMetadata } from "@/features/seo/public-metadata";
import Link from "next/link";

import { DestinationCard } from "@/components/public/destination-card";
import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { PublicContentCard } from "@/components/public/public-content-card";
import { PublicHero } from "@/components/public/public-hero";
import { SectionHeading } from "@/components/public/section-heading";
import { SITE_CONFIG } from "@/config/site";
import { getPublishedDestinations } from "@/features/public-destinations/data";
import {
  getPublishedCulturalEvents,
  getPublishedHomestays,
  getPublishedPackages,
  getPublishedTraditionalHouses,
  getPublishedUmkms,
} from "@/features/public-domains/data";
import type { PublicContentBase } from "@/features/public-content/model";

export const metadata = buildPublicMetadata({
  title: "Beranda",
  description:
    "Jelajahi destinasi, budaya, homestay, UMKM, paket wisata, dan acara di Desa Karang Bajo.",
});

function HomeCollection({
  id,
  eyebrow,
  title,
  description,
  href,
  items,
}: Readonly<{
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  items: PublicContentBase[];
}>) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-emerald-950/10 py-16 sm:py-20"
    >
      <PublicContainer>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
        {items.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 3).map((item) => (
              <PublicContentCard key={item.id} item={item} basePath={href} />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyContentState
              title={`Belum ada ${title.toLowerCase()} yang diterbitkan`}
              description="Silakan kembali lagi setelah informasi tersedia."
            />
          </div>
        )}
        <Link
          href={href}
          className="mt-8 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
        >
          Lihat semua {title.toLowerCase()}
        </Link>
      </PublicContainer>
    </section>
  );
}

type PublicCollectionResult<T extends PublicContentBase> =
  { kind: "ready"; items: T[] } | { kind: "error" };

function requirePublicItems<T extends PublicContentBase>(
  result: PublicCollectionResult<T>,
  domain: string,
) {
  if (result.kind === "error") {
    throw new Error(`PUBLIC_HOMEPAGE_${domain}_UNAVAILABLE`);
  }

  return result.items;
}

export default async function HomePage() {
  const [destinations, packages, homestays, umkms, houses, events] =
    await Promise.all([
      getPublishedDestinations(3),
      getPublishedPackages(3),
      getPublishedHomestays(3),
      getPublishedUmkms(3),
      getPublishedTraditionalHouses(3),
      getPublishedCulturalEvents(3),
    ]);
  if (destinations.kind === "error") {
    throw new Error("PUBLIC_HOMEPAGE_DESTINATIONS_UNAVAILABLE");
  }

  const packageItems = requirePublicItems(packages, "PACKAGES");
  const homestayItems = requirePublicItems(homestays, "HOMESTAYS");
  const umkmItems = requirePublicItems(umkms, "UMKMS");
  const houseItems = requirePublicItems(houses, "TRADITIONAL_HOUSES");
  const eventItems = requirePublicItems(events, "CULTURAL_EVENTS");

  return (
    <>
      <PublicHero />
      <section id="profil-desa" className="scroll-mt-24 py-16 sm:py-20">
        <PublicContainer>
          <SectionHeading
            eyebrow="Mengenal desa"
            title="Selamat datang di Desa Karang Bajo"
            description="Informasi publik hanya menampilkan konten yang telah diterbitkan dan diverifikasi."
          />
        </PublicContainer>
      </section>
      <section
        id="destinasi"
        className="scroll-mt-24 border-y border-emerald-950/10 bg-white py-16 sm:py-20"
      >
        <PublicContainer>
          <SectionHeading
            eyebrow="Pilihan perjalanan"
            title="Destinasi unggulan"
            description="Destinasi terbit dalam kategori Alam, Budaya, dan Religi."
          />
          {destinations.destinations.length ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {destinations.destinations.slice(0, 3).map((item, index) => (
                <DestinationCard
                  key={item.id}
                  destination={item}
                  highPriority={index === 0}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyContentState
                title="Belum ada destinasi yang diterbitkan"
                description="Silakan kembali lagi setelah informasi tersedia."
              />
            </div>
          )}
          <Link
            href="/destinasi"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
          >
            Lihat semua destinasi
          </Link>
        </PublicContainer>
      </section>
      <HomeCollection
        id="paket-wisata"
        eyebrow="Rencana kunjungan"
        title="Paket Wisata"
        description="Paket terbit dan susunan perjalanan tanpa layanan pemesanan."
        href="/paket-wisata"
        items={packageItems}
      />
      <HomeCollection
        id="homestay"
        eyebrow="Tempat menginap"
        title="Homestay"
        description="Pilihan menginap yang informasinya telah diterbitkan."
        href="/homestay"
        items={homestayItems}
      />
      <HomeCollection
        id="umkm"
        eyebrow="Usaha lokal"
        title="UMKM"
        description="Kenali usaha lokal Desa Karang Bajo."
        href="/umkm"
        items={umkmItems}
      />
      <div id="budaya" className="scroll-mt-24">
        <HomeCollection
          id="rumah-adat"
          eyebrow="Warisan budaya"
          title="Rumah Adat"
          description="Informasi budaya yang telah diverifikasi."
          href="/rumah-adat"
          items={houseItems}
        />
      </div>
      <HomeCollection
        id="acara-budaya"
        eyebrow="Agenda budaya"
        title="Acara Budaya"
        description="Agenda terbit dengan jadwal yang telah dikonfirmasi."
        href="/acara-budaya"
        items={eventItems}
      />
      <section
        id="peta-wisata"
        className="scroll-mt-24 border-y border-amber-900/10 bg-amber-50 py-16 sm:py-20"
      >
        <PublicContainer>
          <SectionHeading
            eyebrow="Lihat lokasi"
            title="Jelajahi peta wisata Karang Bajo"
            description="Temukan lokasi destinasi, rumah adat, homestay, dan UMKM yang telah diterbitkan."
          />

          <Link
            href="/peta-wisata"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
          >
            Buka peta wisata
          </Link>
        </PublicContainer>
      </section>
      <section className="py-16 sm:py-24">
        <PublicContainer>
          <div className="rounded-3xl bg-emerald-900 px-6 py-12 text-center text-white">
            <p className="text-sm font-bold tracking-[0.18em] text-emerald-200 uppercase">
              {SITE_CONFIG.name}
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl font-bold">
              Mulai mengenal Karang Bajo dari informasi yang terverifikasi
            </h2>
          </div>
        </PublicContainer>
      </section>
    </>
  );
}
