"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import type { PublicMapDestinationCategory } from "./data";
import {
  filterPublicMapMarkersByDestinationCategory,
  getPublicMapNavigationUrl,
  type PublicMapItem,
  type PublicMapMarker,
} from "./model";

const PublicMapLeaflet = dynamic(() => import("./public-map-leaflet"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="flex min-h-[28rem] items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 p-8 text-center text-slate-600 sm:min-h-[36rem]"
    >
      Memuat peta wisata…
    </div>
  ),
});

type PublicMapProps = {
  markers: PublicMapMarker[];
  destinationCategories: PublicMapDestinationCategory[];
};

function getEntityLabel(item: PublicMapItem) {
  switch (item.entityType) {
    case "destination":
      return item.categoryName ?? "Destinasi";
    case "traditional-house":
      return "Rumah Adat";
    case "homestay":
      return "Homestay";
    case "umkm":
      return item.categoryName ?? "UMKM";
  }
}

export function PublicMap({ markers, destinationCategories }: PublicMapProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const visibleMarkers = useMemo(
    () =>
      filterPublicMapMarkersByDestinationCategory(markers, selectedCategory),
    [markers, selectedCategory],
  );

  const visibleItems = useMemo(
    () => visibleMarkers.flatMap((marker) => marker.items),
    [visibleMarkers],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.14em] text-emerald-800 uppercase">
            Filter lokasi
          </p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-slate-950">
            Peta wisata Karang Bajo
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Pilih kategori untuk menampilkan destinasi Alam, Budaya, atau
            Religi. Pilih Semua untuk melihat seluruh jenis lokasi.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter kategori pada peta wisata"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            aria-pressed={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
              selectedCategory === null
                ? "border-emerald-900 bg-emerald-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-emerald-700"
            }`}
          >
            Semua
          </button>

          {destinationCategories.map((category) => {
            const active = selectedCategory === category.slug;

            return (
              <button
                key={category.slug}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedCategory(category.slug)}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                  active
                    ? "border-emerald-900 bg-emerald-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-700"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {visibleMarkers.length > 0 ? (
        <PublicMapLeaflet markers={visibleMarkers} />
      ) : (
        <div
          role="status"
          className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center"
        >
          <h3 className="font-serif text-2xl font-bold text-slate-950">
            Tidak ada lokasi pada kategori ini
          </h3>
          <p className="mt-3 text-slate-600">
            Pilih kategori lain atau tampilkan seluruh lokasi.
          </p>
        </div>
      )}

      <section aria-labelledby="daftar-lokasi-peta">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-[0.14em] text-emerald-800 uppercase">
              Alternatif peta
            </p>
            <h2
              id="daftar-lokasi-peta"
              className="mt-2 font-serif text-3xl font-bold text-slate-950"
            >
              Daftar lokasi
            </h2>
          </div>

          <p className="text-sm font-semibold text-slate-600">
            {visibleItems.length} lokasi ditampilkan
          </p>
        </div>

        {visibleItems.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {visibleItems.map((item) => (
              <article
                key={`${item.entityType}:${item.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-bold tracking-[0.12em] text-emerald-800 uppercase">
                  {getEntityLabel(item)}
                </p>

                <h3 className="mt-2 font-serif text-xl font-bold text-slate-950">
                  {item.title}
                </h3>

                {item.summary ? (
                  <p className="mt-3 line-clamp-3 leading-7 text-slate-600">
                    {item.summary}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white"
                  >
                    Lihat detail
                  </Link>

                  <a
                    href={getPublicMapNavigationUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:border-emerald-700"
                  >
                    Buka Google Maps
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-slate-600">
            Belum ada lokasi untuk ditampilkan pada daftar ini.
          </p>
        )}
      </section>
    </div>
  );
}
