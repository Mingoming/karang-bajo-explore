export type PublishedEnglishVillageProfileRow = {
  id: string;
  name: string;
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

export type PublicEnglishVillageProfile = {
  id: string;
  name: string;
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

export type PublicEnglishVillageProfileResult =
  | { kind: "ready"; profile: PublicEnglishVillageProfile }
  | { kind: "not-found" }
  | { kind: "error" };

type EnglishVillageProfileSectionLabels = Readonly<{
  history: string;
  vision: string;
  mission: string;
}>;

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

export function mapPublishedEnglishVillageProfile(
  row: PublishedEnglishVillageProfileRow,
): PublicEnglishVillageProfile {
  const coordinates = normalizeCoordinatePair(row.latitude, row.longitude);

  return {
    id: row.id,
    name: row.name.trim(),
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

export function classifyPublishedEnglishVillageProfiles(
  rows: readonly PublishedEnglishVillageProfileRow[],
): PublicEnglishVillageProfileResult {
  if (rows.length === 0) return { kind: "not-found" };
  if (rows.length > 1) return { kind: "error" };

  const profile = mapPublishedEnglishVillageProfile(rows[0]);

  if (!profile.name || !profile.description) {
    return { kind: "error" };
  }

  return { kind: "ready", profile };
}

export function getPublicEnglishVillageProfileTextSections(
  profile: Pick<PublicEnglishVillageProfile, "history" | "vision" | "mission">,
  labels: EnglishVillageProfileSectionLabels,
) {
  return [
    { title: labels.history, content: profile.history },
    { title: labels.vision, content: profile.vision },
    { title: labels.mission, content: profile.mission },
  ].filter(
    (section): section is { title: string; content: string } =>
      section.content !== null,
  );
}
