import Link from "next/link";

import type { PublicContentBase } from "@/features/public-content/model";

import { PublicContainer } from "./public-container";
import { PublicMediaGallery } from "./public-media-gallery";
import { PublicMediaImage } from "./public-media-image";

export function PublicDetailPage({ item, backHref, backLabel, children }: Readonly<{ item: PublicContentBase; backHref: string; backLabel: string; children: React.ReactNode }>) {
  return <>
    <section className="bg-emerald-950 py-12 text-white sm:py-16"><PublicContainer><Link href={backHref} className="font-bold text-amber-300 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-amber-200">← {backLabel}</Link><p className="mt-8 text-sm font-bold tracking-[0.16em] text-emerald-200 uppercase">{item.eyebrow}</p><h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold sm:text-5xl">{item.title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-emerald-50/85">{item.summary}</p></PublicContainer></section>
    <PublicContainer className="py-10 sm:py-14"><PublicMediaImage src={item.primaryImage?.signedUrl ?? null} alt={item.primaryImage?.altText ?? item.title} sizes="100vw" priority className="aspect-[16/8] rounded-3xl" /><div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="space-y-10">{children}<PublicMediaGallery images={item.gallery} labelledBy="galeri-konten" /></div></div></PublicContainer>
  </>;
}
