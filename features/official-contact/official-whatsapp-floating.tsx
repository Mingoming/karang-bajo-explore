import type { EnglishPublicShellDataResult } from "./public-shell-data";
import { getPublicOfficialContacts } from "./data";
import type { PublicLocale } from "@/lib/i18n/locale";

export async function OfficialWhatsappFloating({
  locale,
  englishContactData,
}: Readonly<{
  locale: PublicLocale;
  englishContactData?: EnglishPublicShellDataResult;
}>) {
  let href: string | null = null;

  if (locale === "id") {
    const result = await getPublicOfficialContacts();
    href =
      result.kind === "ready" ? (result.primaryWhatsapp?.href ?? null) : null;
  } else if (englishContactData?.kind === "ready") {
    href = englishContactData.data.whatsappHref;
  }

  if (!href) return null;

  const label =
    locale === "id"
      ? "Hubungi Desa Karang Bajo melalui WhatsApp"
      : "Contact Karang Bajo Village via WhatsApp";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed right-4 bottom-4 z-30 inline-flex min-h-12 min-w-12 items-center justify-center rounded-full bg-[#25D366] p-3 text-white shadow-lg shadow-emerald-950/25 transition-transform hover:scale-105 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-300 motion-reduce:transition-none sm:right-6 sm:bottom-6"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
      >
        <path
          fill="currentColor"
          d="M20.52 3.48A11.84 11.84 0 0 0 12.09 0C5.54 0 .21 5.33.21 11.88c0 2.09.55 4.13 1.59 5.93L.11 24l6.33-1.66a11.86 11.86 0 0 0 5.65 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.18-1.24-6.16-3.46-8.42Zm-8.43 18.3h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.76.99 1-3.66-.23-.38a9.87 9.87 0 1 1 8.39 4.64Z"
        />
        <path
          fill="currentColor"
          d="M17.53 14.37c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.67-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.5 1.7.64.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"
        />
      </svg>
    </a>
  );
}
