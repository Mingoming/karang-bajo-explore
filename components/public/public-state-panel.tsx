type PublicStatePanelProps = Readonly<{
  title: string;
  description: string;
  state: "loading" | "empty" | "error";
}>;

export function PublicStatePanel({
  title,
  description,
  state,
}: PublicStatePanelProps) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
      role={state === "error" ? "alert" : "status"}
      aria-live="polite"
      aria-busy={state === "loading"}
    >
      <p className="font-serif text-xl font-bold text-slate-950">{title}</p>
      <p className="mt-2 leading-7 text-slate-600">{description}</p>
    </div>
  );
}
