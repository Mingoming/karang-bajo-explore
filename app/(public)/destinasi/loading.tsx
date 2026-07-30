import { PublicContainer } from "@/components/public/public-container";
import { PublicStatePanel } from "@/components/public/public-state-panel";

export default function DestinationLoading() {
  return (
    <PublicContainer className="py-20">
      <PublicStatePanel
        state="loading"
        title="Memuat destinasi"
        description="Daftar destinasi yang telah diterbitkan sedang disiapkan."
      />
    </PublicContainer>
  );
}
