import { EmptyContentState } from "./empty-content-state";
import { PublicContainer } from "./public-container";
import { PublicContentCard } from "./public-content-card";
import type { PublicContentBase } from "@/features/public-content/model";

export function PublicListPage<T extends PublicContentBase>({ title, description, eyebrow, items, basePath, detail }: Readonly<{
  title: string; description: string; eyebrow: string; items: T[]; basePath: string; detail?: (item: T) => string | undefined;
}>) {
  return <>
    <section className="border-b border-emerald-950/10 bg-emerald-950 py-16 text-white sm:py-20"><PublicContainer><p className="text-sm font-bold tracking-[0.18em] text-amber-300 uppercase">{eyebrow}</p><h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">{title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/80">{description}</p></PublicContainer></section>
    <section className="py-12 sm:py-16"><PublicContainer>{items.length === 0 ? <EmptyContentState title={`Belum ada ${title.toLowerCase()} yang dipublikasikan`} description="Silakan kembali lagi setelah informasi tersedia." /> : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{items.map((item) => <PublicContentCard key={item.id} item={item} basePath={basePath} detail={detail?.(item)} />)}</div>}</PublicContainer></section>
  </>;
}
