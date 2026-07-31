import Link from "next/link";

import type { PublicContentBase } from "@/features/public-content/model";

import { PublicMediaImage } from "./public-media-image";

export function PublicContentCard({ item, basePath, detail }: Readonly<{
  item: PublicContentBase;
  basePath: string;
  detail?: string;
}>) {
  return (
    <Link href={`${basePath}/${encodeURIComponent(item.slug)}`} aria-label={`Lihat detail ${item.title}`} className="group block h-full rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow group-hover:shadow-lg group-focus-visible:shadow-lg motion-reduce:transition-none">
        <PublicMediaImage src={item.primaryImage?.signedUrl ?? null} alt={item.primaryImage?.altText ?? item.title} sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" className="aspect-[4/3]" />
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <p className="text-xs font-bold tracking-[0.16em] text-emerald-800 uppercase">{item.eyebrow}</p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-slate-950">{item.title}</h2>
          <p className="mt-3 line-clamp-3 flex-1 leading-7 text-slate-600">{item.summary}</p>
          {detail ? <p className="mt-4 text-sm font-semibold text-slate-700">{detail}</p> : null}
          <p className="mt-5 text-sm font-bold text-emerald-800 group-hover:text-emerald-950">Lihat detail <span aria-hidden="true">→</span></p>
        </div>
      </article>
    </Link>
  );
}
