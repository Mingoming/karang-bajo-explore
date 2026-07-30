type TourismCardProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  status: string;
}>;

export function TourismCard({
  eyebrow,
  title,
  description,
  status,
}: TourismCardProps) {
  return (
    <article className="flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-stone-50 p-6 shadow-sm">
      <p className="text-xs font-bold tracking-[0.16em] text-emerald-800 uppercase">
        {eyebrow}
      </p>
      <h3 className="mt-3 font-serif text-2xl font-bold text-slate-950">
        {title}
      </h3>
      <p className="mt-3 flex-1 leading-7 text-slate-600">{description}</p>
      <p className="mt-6 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-500">
        {status}
      </p>
    </article>
  );
}
