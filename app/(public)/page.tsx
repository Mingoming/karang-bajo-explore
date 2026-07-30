import type { Metadata } from "next";
import Link from "next/link";

import { EmptyContentState } from "@/components/public/empty-content-state";
import { PublicContainer } from "@/components/public/public-container";
import { PublicHero } from "@/components/public/public-hero";
import { SectionHeading } from "@/components/public/section-heading";
import { TourismCard } from "@/components/public/tourism-card";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Fondasi situs informasi pariwisata Desa Karang Bajo untuk menjelajahi alam, budaya, tradisi, dan layanan wisata.",
};

const integrationNote =
  "Konten terbit akan ditampilkan pada tahap integrasi data publik berikutnya.";

export default function HomePage() {
  return (
    <>
      <PublicHero />

      <section id="profil-desa" className="scroll-mt-24 py-16 sm:py-20">
        <PublicContainer className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionHeading
            eyebrow="Mengenal desa"
            title="Selamat datang di Desa Karang Bajo"
            description="Ruang pengenalan resmi desa akan mengambil ringkasan profil yang telah diterbitkan dan diverifikasi."
          />
          <EmptyContentState
            title="Profil publik belum terhubung"
            description={integrationNote}
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
            description="Destinasi terbit dari kategori Alam, Budaya, dan Religi akan hadir di bagian ini."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {(["Alam", "Budaya", "Religi"] as const).map((category) => (
              <TourismCard
                key={category}
                eyebrow={category}
                title={`Destinasi ${category}`}
                description="Belum ada destinasi terbit yang ditampilkan pada fondasi halaman ini."
                status="Integrasi data menyusul"
              />
            ))}
          </div>
          <Link
            href="/destinasi"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
          >
            Buka daftar destinasi terbit
          </Link>
        </PublicContainer>
      </section>

      <section id="paket-wisata" className="scroll-mt-24 py-16 sm:py-20">
        <PublicContainer>
          <SectionHeading
            eyebrow="Rencana kunjungan"
            title="Paket wisata"
            description="Paket yang telah diterbitkan nantinya menampilkan ringkasan perjalanan dan urutan destinasi tanpa layanan pemesanan."
          />
          <div className="mt-8">
            <EmptyContentState
              title="Belum ada paket yang ditampilkan"
              description={integrationNote}
            />
          </div>
        </PublicContainer>
      </section>

      <section
        id="homestay"
        className="scroll-mt-24 bg-emerald-950 py-16 text-white sm:py-20"
      >
        <PublicContainer>
          <SectionHeading
            eyebrow="Menginap dan mengenal usaha lokal"
            title="Homestay dan UMKM"
            description="Informasi terbit akan membantu pengunjung mengenali pilihan menginap dan usaha lokal tanpa menghadirkan pemesanan atau transaksi."
            tone="dark"
          />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <EmptyContentState
              title="Informasi homestay sedang disiapkan"
              description={integrationNote}
              tone="dark"
            />
            <div id="umkm" className="scroll-mt-24">
              <EmptyContentState
                title="Informasi UMKM sedang disiapkan"
                description={integrationNote}
                tone="dark"
              />
            </div>
          </div>
        </PublicContainer>
      </section>

      <section id="budaya" className="scroll-mt-24 py-16 sm:py-20">
        <PublicContainer>
          <SectionHeading
            eyebrow="Warisan yang dijaga"
            title="Budaya dan kehidupan desa"
            description="Bagian budaya hanya akan memuat informasi yang telah diverifikasi oleh pihak desa atau sumber adat yang berwenang."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <TourismCard
              eyebrow="Budaya"
              title="Rumah adat dan tradisi"
              description="Konten budaya terbit akan diperkenalkan tanpa membuat atau menebak fakta sejarah."
              status="Menunggu konten terverifikasi"
            />
            <TourismCard
              eyebrow="Kegiatan desa"
              title="Acara budaya"
              description="Informasi waktu hanya akan ditampilkan ketika jadwal telah dikonfirmasi."
              status="Integrasi data menyusul"
            />
          </div>
        </PublicContainer>
      </section>

      <section
        id="peta-wisata"
        className="scroll-mt-24 border-y border-amber-900/10 bg-amber-50 py-16 sm:py-20"
      >
        <PublicContainer className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <SectionHeading
            eyebrow="Lihat lokasi"
            title="Jelajahi melalui peta wisata"
            description="Peta interaktif akan menghubungkan lokasi terbit yang memiliki koordinat valid. Integrasi peta termasuk dalam milestone berikutnya."
          />
          <span className="inline-flex min-h-11 items-center rounded-full border border-amber-900/20 bg-white px-5 py-3 text-sm font-bold text-amber-950">
            Peta belum tersedia
          </span>
        </PublicContainer>
      </section>

      <section className="py-16 sm:py-24">
        <PublicContainer>
          <div className="overflow-hidden rounded-3xl bg-emerald-900 px-6 py-12 text-center text-white shadow-xl shadow-emerald-950/10 sm:px-12 sm:py-16">
            <p className="text-sm font-bold tracking-[0.18em] text-emerald-200 uppercase">
              {SITE_CONFIG.name}
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Mulai mengenal Karang Bajo dari informasi yang terverifikasi
            </h2>
            <p className="mx-auto mt-5 max-w-2xl leading-7 text-emerald-50/85">
              Gunakan fondasi halaman ini untuk melihat ruang jelajah yang akan
              terisi seiring integrasi konten publik.
            </p>
            <Link
              href="/destinasi"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-amber-300 px-6 py-3 font-bold text-emerald-950 transition-colors hover:bg-amber-200 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-amber-200 motion-reduce:transition-none"
            >
              Lihat ruang destinasi
            </Link>
          </div>
        </PublicContainer>
      </section>
    </>
  );
}
