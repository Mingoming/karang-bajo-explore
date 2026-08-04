import Link from "next/link";

import type { PublicDictionary } from "@/lib/i18n/dictionaries";

import { getPublicOfficialContacts } from "./data";

type Props = Readonly<{
  className?: string;
  compact?: boolean;
  fallbackOnError?: boolean;
}>;

export async function OfficialContactCta({
  className = "",
  compact = false,
  fallbackOnError = false,
}: Props) {
  const result = await getPublicOfficialContacts();
  if (result.kind === "error" && !fallbackOnError) {
    throw new Error("PUBLIC_OFFICIAL_CONTACT_UNAVAILABLE");
  }
  const classes = `inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 font-bold focus-visible:outline-3 focus-visible:outline-offset-3 ${className}`;
  if (result.kind === "error" || !result.primaryWhatsapp) {
    return (
      <Link href="/kontak" className={classes}>
        Lihat kontak resmi
      </Link>
    );
  }
  return (
    <a
      href={result.primaryWhatsapp.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        compact
          ? "Hubungi desa melalui WhatsApp"
          : `Hubungi desa melalui WhatsApp ${result.primaryWhatsapp.displayValue}`
      }
      className={classes}
    >
      Hubungi WhatsApp Desa
    </a>
  );
}

export function EnglishOfficialContactCta({
  whatsappHref,
  copy,
  className = "",
}: Readonly<{
  whatsappHref: string | null;
  copy: PublicDictionary["home"]["contact"];
  className?: string;
}>) {
  if (!whatsappHref) {
    return <p className="text-sm font-semibold">{copy.unavailable}</p>;
  }

  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.accessibleLabel}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 font-bold focus-visible:outline-3 focus-visible:outline-offset-3 ${className}`}
    >
      {copy.button}
    </a>
  );
}
