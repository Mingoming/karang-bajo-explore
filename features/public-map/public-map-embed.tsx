"use client";

import dynamic from "next/dynamic";

import type { PublicLocale } from "@/lib/i18n/locale";

import { ENGLISH_PUBLIC_MAP_COPY, PUBLIC_MAP_COPY_ID } from "./copy";
import type { PublicMapMarker } from "./model";

const PublicMapLeaflet = dynamic(() => import("./public-map-leaflet"), {
  ssr: false,
});

type PublicMapEmbedProps = Readonly<{
  markers: PublicMapMarker[];
  locale?: PublicLocale;
}>;

export function PublicMapEmbed({
  markers,
  locale = "id",
}: PublicMapEmbedProps) {
  const copy = locale === "en" ? ENGLISH_PUBLIC_MAP_COPY : PUBLIC_MAP_COPY_ID;

  if (markers.length === 0) {
    return (
      <div
        role="status"
        className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center"
      >
        <p className="font-serif text-2xl font-bold text-slate-950">
          {copy.emptyTitle}
        </p>
        <p className="mt-3 text-slate-600">{copy.emptyDescription}</p>
      </div>
    );
  }

  return <PublicMapLeaflet markers={markers} copy={copy} />;
}
