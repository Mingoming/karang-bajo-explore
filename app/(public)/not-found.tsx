import Link from "next/link";
import { PublicContainer } from "@/components/public/public-container";

export default function PublicNotFound() {
  return (
    <PublicContainer className="py-20 text-center">
      <h1 className="font-serif text-4xl font-bold">
        Informasi tidak ditemukan
      </h1>
      <p className="mt-4 text-slate-600">
        Konten mungkin belum diterbitkan atau alamatnya tidak tersedia.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
      >
        Kembali ke beranda
      </Link>
    </PublicContainer>
  );
}
