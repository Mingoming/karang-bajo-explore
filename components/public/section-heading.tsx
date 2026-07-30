type SectionHeadingProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  tone?: "light" | "dark";
}>;

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "light",
}: SectionHeadingProps) {
  const dark = tone === "dark";

  return (
    <div className="max-w-3xl">
      <p
        className={`text-sm font-bold tracking-[0.18em] uppercase ${dark ? "text-emerald-200" : "text-emerald-800"}`}
      >
        {eyebrow}
      </p>
      <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p
        className={`mt-4 text-base leading-7 sm:text-lg ${dark ? "text-emerald-50/80" : "text-slate-600"}`}
      >
        {description}
      </p>
    </div>
  );
}
