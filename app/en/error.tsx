"use client";

import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

export default function EnglishError({ reset }: { reset: () => void }) {
  const copy = PUBLIC_DICTIONARIES.en.states;

  return (
    <main className="application-state">
      <div className="application-state__content">
        <h1 className="application-state__title">{copy.errorTitle}</h1>
        <p className="application-state__message">{copy.errorDescription}</p>
        <button
          className="application-state__action"
          type="button"
          onClick={reset}
        >
          {copy.retry}
        </button>
      </div>
    </main>
  );
}
