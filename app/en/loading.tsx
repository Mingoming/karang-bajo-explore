import { PublicContainer } from "@/components/public/public-container";
import { PublicStatePanel } from "@/components/public/public-state-panel";
import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

export default function EnglishLoading() {
  const copy = PUBLIC_DICTIONARIES.en.states;

  return (
    <PublicContainer className="py-20">
      <PublicStatePanel
        state="loading"
        title={copy.loadingTitle}
        description={copy.loadingDescription}
      />
    </PublicContainer>
  );
}
