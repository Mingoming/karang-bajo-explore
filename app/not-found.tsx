import Link from "next/link";

export default function NotFound() {
  return (
    <main className="application-state">
      <div className="application-state__content">
        <h1 className="application-state__title">Halaman tidak ditemukan</h1>
        <p className="application-state__message">
          Halaman yang Anda cari tidak tersedia atau alamatnya tidak tepat.
        </p>
        <Link className="application-state__action" href="/">
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
