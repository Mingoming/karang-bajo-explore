import Link from "next/link";
import type { ReactNode } from "react";

import type { PublicDestination } from "@/features/public-destinations/model";

export type DestinationLocationSummaryCopy = Readonly<{
  sectionId: string;
  eyebrow: string;
  heading: string;
  description: (destination: PublicDestination) => ReactNode;
  mapHref: string | null;
  mapLabel: string;
  googleMapsLabel: string;
  googleMapsAccessibleLabel: string;
}>;

export function DestinationLocationSummary({
  destination,
  copy,
}: Readonly<{
  destination: PublicDestination;
  copy?: DestinationLocationSummaryCopy;
}>) {
  const sectionId = copy?.sectionId ?? "lokasi-destinasi";

  return (
    <section
      aria-labelledby={sectionId}
      className="rounded-2xl bg-amber-50 p-6 sm:p-8"
    >
      <p className="text-sm font-bold tracking-[0.16em] text-amber-900 uppercase">
        {copy?.eyebrow ?? "Lokasi"}
      </p>

      <h2
        id={sectionId}
        className="mt-2 font-serif text-2xl font-bold text-slate-950"
      >
        {copy?.heading ?? "Informasi koordinat"}
      </h2>

      {copy ? (
        <p className="mt-3 leading-7 text-slate-700">
          {copy.description(destination)}
        </p>
      ) : (
        <p className="mt-3 leading-7 text-slate-700">
          Latitude {destination.latitude}, longitude {destination.longitude}.
          Lihat persebaran lokasi melalui peta wisata atau buka petunjuk arah
          yang tersimpan.
        </p>
      )}

      {copy ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {copy.mapHref ? (
            <Link
              href={copy.mapHref}
              className="inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
            >
              {copy.mapLabel}
            </Link>
          ) : null}

          {destination.googleMapsUrl ? (
            <a
              href={destination.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-full bg-amber-300 px-5 py-2.5 font-bold text-amber-950 hover:bg-amber-200 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-700"
            >
              {copy.googleMapsLabel}
              <span className="sr-only"> {copy.googleMapsAccessibleLabel}</span>
            </a>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/peta-wisata"
            className="inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
          >
            Lihat peta wisata
          </Link>

          {destination.googleMapsUrl ? (
            <a
              href={destination.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-full bg-amber-300 px-5 py-2.5 font-bold text-amber-950 hover:bg-amber-200 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-700"
            >
              Buka Google Maps
              <span className="sr-only"> di tab baru</span>
            </a>
          ) : null}
        </div>
      )}
    </section>
  );
}
