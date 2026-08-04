import Link from "next/link";

import { PUBLIC_DICTIONARIES } from "@/lib/i18n/dictionaries";

export default function EnglishNotFound() {
  const copy = PUBLIC_DICTIONARIES.en.states;

  return (
    <main className="application-state">
      <div className="application-state__content">
        <h1 className="application-state__title">{copy.notFoundTitle}</h1>
        <p className="application-state__message">{copy.notFoundDescription}</p>
        <Link className="application-state__action" href="/en">
          {copy.notFoundAction}
        </Link>
      </div>
    </main>
  );
}
