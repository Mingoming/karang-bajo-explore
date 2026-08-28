"use client";

import { createContext, useContext, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import type { PublicLocale } from "@/lib/i18n/locale";

import {
  ENGLISH_PUBLIC_MAP_COPY,
  PUBLIC_MAP_COPY_ID,
  type PublicMapCopy,
} from "./copy";
import type { PublicMapDestinationCategory } from "./data";
import {
  filterPublicMapMarkersByDestinationCategory,
  getPublicMapNavigationUrl,
  type PublicMapItem,
  type PublicMapMarker,
} from "./model";

const PublicMapCopyContext = createContext<PublicMapCopy>(PUBLIC_MAP_COPY_ID);

function PublicMapLoading() {
  const copy = useContext(PublicMapCopyContext);

  return (
    <div
      role="status"
      className="flex min-h-[28rem] items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 p-8 text-center text-slate-600 sm:min-h-[36rem]"
    >
      {copy.loading}
    </div>
  );
}

const PublicMapLeaflet = dynamic(() => import("./public-map-leaflet"), {
  ssr: false,
  loading: PublicMapLoading,
});

type PublicMapProps = {
  markers: PublicMapMarker[];
  destinationCategories: PublicMapDestinationCategory[];
  locale?: PublicLocale;
};

function getEntityLabel(item: PublicMapItem, copy: PublicMapCopy) {
  switch (item.entityType) {
    case "destination":
      return item.categoryName ?? copy.entityLabels.destination;
    case "traditional-house":
      return copy.entityLabels.traditionalHouse;
    case "homestay":
      return copy.entityLabels.homestay;
    case "umkm":
      return item.categoryName ?? copy.entityLabels.umkm;
    case "cultural-event":
      return copy.entityLabels.culturalEvent;
  }
}

export function PublicMap({
  markers,
  destinationCategories,
  locale = "id",
}: PublicMapProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const copy = locale === "en" ? ENGLISH_PUBLIC_MAP_COPY : PUBLIC_MAP_COPY_ID;

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
    <PublicMapCopyContext.Provider value={copy}>
      <div className="space-y-8">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[0.14em] text-emerald-800 uppercase">
              {copy.filterEyebrow}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-slate-950">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              {copy.description}
            </p>
          </div>

          {destinationCategories.length > 0 ? (
            <div
              role="group"
              aria-label={copy.categoryFilterLabel}
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
                {copy.allCategories}
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
          ) : null}
        </div>

        {visibleMarkers.length > 0 ? (
          <PublicMapLeaflet markers={visibleMarkers} copy={copy} />
        ) : (
          <div
            role="status"
            className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center"
          >
            <h3 className="font-serif text-2xl font-bold text-slate-950">
              {copy.emptyTitle}
            </h3>
            <p className="mt-3 text-slate-600">{copy.emptyDescription}</p>
          </div>
        )}

        <section aria-labelledby="daftar-lokasi-peta">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold tracking-[0.14em] text-emerald-800 uppercase">
                {copy.listEyebrow}
              </p>
              <h2
                id="daftar-lokasi-peta"
                className="mt-2 font-serif text-3xl font-bold text-slate-950"
              >
                {copy.listTitle}
              </h2>
            </div>

            <p className="text-sm font-semibold text-slate-600">
              {copy.countLabel(visibleItems.length)}
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
                    {getEntityLabel(item, copy)}
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
                      {copy.detailsAction}
                    </Link>

                    <a
                      href={getPublicMapNavigationUrl(item)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:border-emerald-700"
                    >
                      {copy.mapsAction}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-slate-600">
              {copy.noListItems}
            </p>
          )}
        </section>
      </div>
    </PublicMapCopyContext.Provider>
  );
}
