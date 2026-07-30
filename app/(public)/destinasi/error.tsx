"use client";

import { PublicContainer } from "@/components/public/public-container";
import { PublicStatePanel } from "@/components/public/public-state-panel";

export default function DestinationError({ reset }: { reset: () => void }) {
  return (
    <PublicContainer className="py-20">
      <PublicStatePanel
        state="error"
        title="Daftar destinasi belum dapat dimuat"
        description="Silakan coba kembali. Bagian lain situs tetap dapat digunakan."
      />
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
        >
          Coba lagi
        </button>
      </div>
    </PublicContainer>
  );
}
