export default function Loading() {
  return (
    <main className="application-state" aria-live="polite" aria-busy="true">
      <div className="application-state__content">
        <p className="application-state__message">Memuat halaman…</p>
      </div>
    </main>
  );
}
