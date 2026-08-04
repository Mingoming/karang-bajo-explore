import {
  EXTERNAL_TOURISM_PLATFORM_LABELS,
  mapPrimaryWhatsapp,
  normalizeHttpUrl,
  PRIMARY_WHATSAPP_KEY,
  type ExternalTourismLink,
  type ExternalTourismPlatform,
  type PublicWhatsappSettingRow,
} from "./model.ts";

export type EnglishPublicShellData = Readonly<{
  whatsappHref: string | null;
  externalLinks: readonly ExternalTourismLink[];
}>;

export type EnglishPublicShellDataResult =
  { kind: "ready"; data: EnglishPublicShellData } | { kind: "error" };

export type EnglishPublicShellContactRow = Readonly<{
  label: string;
  contact_type: string;
  value: string;
  display_order: number;
}>;

function identifyExternalPlatform(
  label: string,
): ExternalTourismPlatform | null {
  const normalized = label.trim().toLowerCase();

  for (const platform of ["google-maps", "tripadvisor"] as const) {
    if (
      EXTERNAL_TOURISM_PLATFORM_LABELS[platform].some(
        (candidate) => candidate.toLowerCase() === normalized,
      )
    ) {
      return platform;
    }
  }

  return null;
}

export function classifyEnglishPublicShellData(
  setting: PublicWhatsappSettingRow | null,
  contacts: readonly EnglishPublicShellContactRow[],
): EnglishPublicShellDataResult {
  if (setting && setting.key !== PRIMARY_WHATSAPP_KEY) return { kind: "error" };

  const primaryWhatsapp = mapPrimaryWhatsapp(setting?.value ?? null);
  if (
    setting?.value !== null &&
    setting?.value !== undefined &&
    !primaryWhatsapp
  ) {
    return { kind: "error" };
  }

  const externalLinks: ExternalTourismLink[] = [];
  const usedPlatforms = new Set<ExternalTourismPlatform>();

  for (const contact of contacts) {
    if (contact.contact_type !== "url") continue;
    const platform = identifyExternalPlatform(contact.label);
    if (!platform || usedPlatforms.has(platform)) continue;
    const href = normalizeHttpUrl(contact.value);
    if (!href) continue;
    externalLinks.push({ platform, href });
    usedPlatforms.add(platform);
  }

  return {
    kind: "ready",
    data: {
      whatsappHref: primaryWhatsapp?.href ?? null,
      externalLinks,
    },
  };
}
