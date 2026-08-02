import type { Metadata } from "next";
import { buildPublicMetadata } from "@/features/seo/public-metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicDetailPage } from "@/components/public/public-detail-page";
import { OfficialContactCta } from "@/features/official-contact/official-contact-cta";
import { formatRupiah } from "@/features/public-content/model";
import {
  getPublishedPackage,
  getPublishedPackageMetadata,
} from "@/features/public-domains/data";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedPackageMetadata(slug);

  if (!item) {
    return buildPublicMetadata({
      title: "Paket wisata tidak ditemukan",
      description:
        "Paket wisata yang diminta tidak tersedia atau belum diterbitkan.",
      noIndex: true,
    });
  }

  return buildPublicMetadata({
    title: item.title,
    description: item.description,
  });
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const result = await getPublishedPackage(slug);
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") throw new Error("PUBLIC_PACKAGE_UNAVAILABLE");
  const item = result.item;
  return (
    <PublicDetailPage
      item={item}
      backHref="/paket-wisata"
      backLabel="Semua paket"
    >
      <section>
        <h2 className="font-serif text-3xl font-bold">Tentang paket</h2>
        <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">
          {item.description}
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="font-bold">Jenis</dt>
            <dd>{item.packageType}</dd>
          </div>
          <div>
            <dt className="font-bold">Durasi</dt>
            <dd>
              {item.durationValue} {item.durationUnit}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Harga</dt>
            <dd>{formatRupiah(item.price)}</dd>
          </div>
        </dl>
        {item.priceNote ? (
          <p className="mt-4 text-slate-600">{item.priceNote}</p>
        ) : null}
      </section>
      {item.facilities.length ? (
        <section>
          <h2 className="font-serif text-3xl font-bold">Fasilitas</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            {item.facilities.map((facility) => (
              <li key={facility}>{facility}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {item.souvenir ? (
        <section>
          <h2 className="font-serif text-3xl font-bold">Suvenir</h2>
          <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">
            {item.souvenir}
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="font-serif text-3xl font-bold">Urutan destinasi</h2>
        {item.itinerary.length ? (
          <ol className="mt-5 space-y-4">
            {item.itinerary.map((destination, index) => (
              <li
                key={destination.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <Link
                  href={`/destinasi/${destination.slug}`}
                  className="font-bold text-emerald-800"
                >
                  {index + 1}. {destination.name}
                </Link>
                {destination.notes ? (
                  <p className="mt-2 text-slate-600">{destination.notes}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-slate-600">
            Belum ada destinasi terbit yang dapat ditampilkan.
          </p>
        )}
      </section>
      <section className="rounded-2xl bg-emerald-50 p-6">
        <h2 className="font-serif text-2xl font-bold">
          Pertanyaan paket wisata
        </h2>
        <div className="mt-5">
          <OfficialContactCta
            className="bg-emerald-900 text-white focus-visible:outline-emerald-700"
            compact
          />
        </div>
      </section>
    </PublicDetailPage>
  );
}
