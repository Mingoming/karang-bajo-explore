type EmptyContentStateProps = Readonly<{
  title: string;
  description: string;
  tone?: "light" | "dark";
}>;

export function EmptyContentState({
  title,
  description,
  tone = "light",
}: EmptyContentStateProps) {
  const dark = tone === "dark";

  return (
    <div
      className={`rounded-2xl border border-dashed p-6 sm:p-8 ${
        dark
          ? "border-emerald-200/35 bg-white/5"
          : "border-emerald-900/20 bg-emerald-50/60"
      }`}
      role="status"
    >
      <p className="font-serif text-xl font-bold">{title}</p>
      <p
        className={`mt-2 leading-7 ${dark ? "text-emerald-50/75" : "text-slate-600"}`}
      >
        {description}
      </p>
    </div>
  );
}
