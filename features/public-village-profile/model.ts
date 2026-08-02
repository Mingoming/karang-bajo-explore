export type PublishedVillageProfileRow = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string;
  history: string | null;
  vision: string | null;
  mission: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  google_maps_url: string | null;
  published_at: string;
};

export type PublicVillageProfile = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string;
  history: string | null;
  vision: string | null;
  mission: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  publishedAt: string;
};

export type PublicVillageProfileResult =
  | { kind: "ready"; profile: PublicVillageProfile }
  | { kind: "not-found" }
  | { kind: "error" };

export function classifyPublishedVillageProfiles(
  rows: readonly PublishedVillageProfileRow[],
): PublicVillageProfileResult {
  if (rows.length === 0) return { kind: "not-found" };
  if (rows.length > 1) return { kind: "error" };
  const profile = mapPublishedVillageProfile(rows[0]);
  if (!profile.name || !profile.description) return { kind: "error" };
  return { kind: "ready", profile };
}

function normalizeOptionalText(value: string | null) {
  return value?.trim() || null;
}

function normalizePublicMapUrl(value: string | null) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeCoordinatePair(
  latitudeValue: number | string | null,
  longitudeValue: number | string | null,
) {
  if (latitudeValue === null || longitudeValue === null) {
    return { latitude: null, longitude: null };
  }

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { latitude: null, longitude: null };
  }

  return { latitude, longitude };
}

export function mapPublishedVillageProfile(
  row: PublishedVillageProfileRow,
): PublicVillageProfile {
  const coordinates = normalizeCoordinatePair(row.latitude, row.longitude);

  return {
    id: row.id,
    name: row.name.trim(),
    slug: row.slug,
    summary: normalizeOptionalText(row.summary),
    description: row.description.trim(),
    history: normalizeOptionalText(row.history),
    vision: normalizeOptionalText(row.vision),
    mission: normalizeOptionalText(row.mission),
    address: normalizeOptionalText(row.address),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    googleMapsUrl: normalizePublicMapUrl(row.google_maps_url),
    publishedAt: row.published_at,
  };
}

export function getPublicVillageProfileExcerpt(
  profile: Pick<PublicVillageProfile, "summary" | "description">,
) {
  if (profile.summary) return profile.summary;
  if (profile.description.length <= 180) return profile.description;

  const shortened = profile.description.slice(0, 180);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 0 ? lastSpace : 180).trim()}…`;
}

export function getPublicVillageProfileTextSections(
  profile: Pick<PublicVillageProfile, "history" | "vision" | "mission">,
) {
  return [
    { title: "Sejarah", content: profile.history },
    { title: "Visi", content: profile.vision },
    { title: "Misi", content: profile.mission },
  ].filter(
    (section): section is { title: string; content: string } =>
      section.content !== null,
  );
}
