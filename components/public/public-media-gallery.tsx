import type { PublicContentMedia } from "@/features/public-content/model";

import { PublicMediaImage } from "./public-media-image";

export function PublicMediaGallery({ images, labelledBy }: Readonly<{ images: PublicContentMedia[]; labelledBy: string }>) {
  const visible = images.filter((image) => image.signedUrl);
  if (visible.length === 0) return null;
  return (
    <section aria-labelledby={labelledBy}>
      <h2 id={labelledBy} className="font-serif text-3xl font-bold">Galeri</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((image) => (
          <figure key={image.id}>
            <PublicMediaImage src={image.signedUrl} alt={image.altText} sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className="aspect-[4/3] rounded-2xl" />
            {image.caption ? <figcaption className="mt-2 text-sm text-slate-600">{image.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
