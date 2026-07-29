"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="application-state">
      <div className="application-state__content">
        <h1 className="application-state__title">Terjadi kesalahan</h1>
        <p className="application-state__message">
          Halaman tidak dapat ditampilkan saat ini. Silakan coba kembali.
        </p>
        <button
          className="application-state__action"
          type="button"
          onClick={reset}
        >
          Coba lagi
        </button>
      </div>
    </main>
  );
}
