import type { PublicDestinationImage } from "@/features/public-destinations/model";

import { DestinationImage } from "./destination-image";

type DestinationGalleryCopy = Readonly<{
  sectionId: string;
  heading: string;
  primaryImageLabel: string;
}>;

const INDONESIAN_DESTINATION_GALLERY_COPY: DestinationGalleryCopy = {
  sectionId: "galeri-destinasi",
  heading: "Galeri",
  primaryImageLabel: "Gambar utama",
};

export function DestinationGallery({
  images,
  primaryImageId,
  copy = INDONESIAN_DESTINATION_GALLERY_COPY,
}: Readonly<{
  images: PublicDestinationImage[];
  primaryImageId?: string | null;
  copy?: DestinationGalleryCopy;
}>) {
  const visibleImages = images.filter(
    (image) => image.signedUrl !== null && image.id !== primaryImageId,
  );

  if (visibleImages.length === 0) return null;

  return (
    <section aria-labelledby={copy.sectionId}>
      <h2
        id={copy.sectionId}
        className="font-serif text-3xl font-bold text-slate-950"
      >
        {copy.heading}
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleImages.map((image) => (
          <figure key={image.id} className="min-w-0">
            <DestinationImage
              src={image.signedUrl}
              alt={image.altText}
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              className="aspect-[4/3] rounded-2xl"
            />
            {image.caption || image.isPrimary ? (
              <figcaption className="mt-2 text-sm leading-6 text-slate-600">
                {image.caption}
                {image.isPrimary ? (
                  <span className="ml-2 font-bold text-emerald-800">
                    {copy.primaryImageLabel}
                  </span>
                ) : null}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
