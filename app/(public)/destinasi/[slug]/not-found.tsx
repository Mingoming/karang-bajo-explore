import Link from "next/link";

import { PublicContainer } from "@/components/public/public-container";
import { PublicStatePanel } from "@/components/public/public-state-panel";

export default function DestinationNotFound() {
  return (
    <PublicContainer className="py-20">
      <PublicStatePanel
        state="empty"
        title="Destinasi tidak ditemukan"
        description="Destinasi ini tidak tersedia atau belum diterbitkan."
      />
      <div className="mt-5 text-center">
        <Link
          href="/destinasi"
          className="inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
        >
          Kembali ke daftar destinasi
        </Link>
      </div>
    </PublicContainer>
  );
}
