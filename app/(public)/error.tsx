"use client";

import { PublicContainer } from "@/components/public/public-container";
import { PublicStatePanel } from "@/components/public/public-state-panel";

export default function PublicError() {
  return (
    <PublicContainer className="py-20">
      <PublicStatePanel
        state="error"
        title="Informasi belum dapat dimuat"
        description="Silakan coba kembali beberapa saat lagi."
      />
    </PublicContainer>
  );
}
