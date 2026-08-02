import Link from "next/link";

import { getPublicOfficialContacts } from "./data";

type Props = Readonly<{
  className?: string;
  compact?: boolean;
}>;

export async function OfficialContactCta({
  className = "",
  compact = false,
}: Props) {
  const result = await getPublicOfficialContacts();
  if (result.kind === "error") {
    throw new Error("PUBLIC_OFFICIAL_CONTACT_UNAVAILABLE");
  }
  const classes = `inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 font-bold focus-visible:outline-3 focus-visible:outline-offset-3 ${className}`;
  if (!result.primaryWhatsapp) {
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
