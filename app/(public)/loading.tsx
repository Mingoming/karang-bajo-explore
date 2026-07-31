import { PublicContainer } from "@/components/public/public-container";
import { PublicStatePanel } from "@/components/public/public-state-panel";

export default function PublicLoading() {
  return (
    <PublicContainer className="py-20">
      <PublicStatePanel
        state="loading"
        title="Memuat informasi"
        description="Informasi publik sedang disiapkan."
      />
    </PublicContainer>
  );
}
