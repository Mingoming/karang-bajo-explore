import type { PublicDestination } from "@/features/public-destinations/model";

export function DestinationLocationSummary({
  destination,
}: Readonly<{ destination: PublicDestination }>) {
  return (
    <section
      aria-labelledby="lokasi-destinasi"
      className="rounded-2xl bg-amber-50 p-6 sm:p-8"
    >
      <p className="text-sm font-bold tracking-[0.16em] text-amber-900 uppercase">
        Lokasi
      </p>
      <h2
        id="lokasi-destinasi"
        className="mt-2 font-serif text-2xl font-bold text-slate-950"
      >
        Informasi koordinat
      </h2>
      <p className="mt-3 leading-7 text-slate-700">
        Latitude {destination.latitude}, longitude {destination.longitude}.
        Peta interaktif akan tersedia pada milestone berikutnya.
      </p>
      {destination.googleMapsUrl ? (
        <a
          href={destination.googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-amber-300 px-5 py-2.5 font-bold text-amber-950 hover:bg-amber-200 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-700"
        >
          Buka lokasi tersimpan
          <span className="sr-only"> di tab baru</span>
        </a>
      ) : null}
    </section>
  );
}
