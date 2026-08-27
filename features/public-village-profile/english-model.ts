import {
  isNonBlankPublicText,
  isOptionalPublicText,
  isPublicUuid,
  isValidPublicTimestamp,
  normalizeOptionalPublicHttpUrl,
  normalizeOptionalPublicText,
  parsePublicNumber,
} from "../public-content/validation.ts";

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

function normalizeCoordinatePair(
  latitudeValue: unknown,
  longitudeValue: unknown,
) {
  if (!isCoordinateValue(latitudeValue) || !isCoordinateValue(longitudeValue)) {
    return null;
  }

  const latitude = parsePublicNumber(latitudeValue, -90, 90, true);
  const longitude = parsePublicNumber(longitudeValue, -180, 180, true);

  if (!latitude.valid || !longitude.valid) {
    return { latitude: null, longitude: null };
  }
  if (latitude.value === null || longitude.value === null) {
    return { latitude: null, longitude: null };
  }

  return { latitude: latitude.value, longitude: longitude.value };
}

function isCoordinateValue(value: unknown): value is number | string | null {
  return (
    value === null || typeof value === "number" || typeof value === "string"
  );
}

export function mapPublishedEnglishVillageProfile(
  row: PublishedEnglishVillageProfileRow,
): PublicEnglishVillageProfile | null {
  if (
    typeof row !== "object" ||
    row === null ||
    !isPublicUuid(row.id) ||
    !isNonBlankPublicText(row.name) ||
    !isNonBlankPublicText(row.description) ||
    !isOptionalPublicText(row.summary) ||
    !isOptionalPublicText(row.history) ||
    !isOptionalPublicText(row.vision) ||
    !isOptionalPublicText(row.mission) ||
    !isOptionalPublicText(row.address) ||
    !isOptionalPublicText(row.google_maps_url) ||
    typeof row.published_at !== "string" ||
    !isValidPublicTimestamp(row.published_at)
  ) {
    return null;
  }

  const coordinates = normalizeCoordinatePair(row.latitude, row.longitude);
  if (!coordinates) return null;

  return {
    id: row.id,
    name: row.name.trim(),
    summary: normalizeOptionalPublicText(row.summary),
    description: row.description.trim(),
    history: normalizeOptionalPublicText(row.history),
    vision: normalizeOptionalPublicText(row.vision),
    mission: normalizeOptionalPublicText(row.mission),
    address: normalizeOptionalPublicText(row.address),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    googleMapsUrl: normalizeOptionalPublicHttpUrl(row.google_maps_url),
    publishedAt: row.published_at,
  };
}

export function classifyPublishedEnglishVillageProfiles(
  rows: readonly PublishedEnglishVillageProfileRow[],
): PublicEnglishVillageProfileResult {
  if (!Array.isArray(rows)) return { kind: "error" };
  if (rows.length === 0) return { kind: "not-found" };
  if (rows.length > 1) return { kind: "error" };

  const profile = mapPublishedEnglishVillageProfile(rows[0]);

  if (!profile || !profile.name || !profile.description) {
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
