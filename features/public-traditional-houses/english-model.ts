import {
  isUsableSignedPublicMedia,
  type SignedPublicMedia,
} from "../public-media/model.ts";
import {
  isNonBlankPublicText,
  isOptionalPublicText,
  isPublicUuid,
  isValidPublicDisplayOrder,
  isValidPublicTimestamp,
  normalizeOptionalPublicHttpUrl,
  normalizeOptionalPublicText,
  parsePublicNumber,
} from "../public-content/validation.ts";

export type PublishedEnglishTraditionalHouseRow = {
  id: string;
  translation_id: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string;
  history: string | null;
  cultural_significance: string | null;
  location_name: string | null;
  visitor_information: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  google_maps_url: string | null;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  is_featured: boolean;
  display_order: number;
  published_at: string | null;
  translation_published_at: string | null;
};

export type PublishedEnglishTraditionalHouseImageRow = {
  id: string;
  traditional_house_id: string;
  translation_id: string;
  storage_bucket: string;
  storage_path: string;
  alt_text: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
};

export type PublicEnglishTraditionalHouse = {
  id: string;
  translationId: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string;
  history: string | null;
  culturalSignificance: string | null;
  locationName: string | null;
  visitorInformation: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  isFeatured: boolean;
  displayOrder: number;
  sourcePublishedAt: string | null;
  translationPublishedAt: string | null;
  primaryImage: SignedPublicMedia | null;
  gallery: SignedPublicMedia[];
};

export type PublicEnglishTraditionalHouseListResult =
  | { kind: "ready"; houses: PublicEnglishTraditionalHouse[] }
  | { kind: "error" };

export type PublicEnglishTraditionalHouseDetailResult =
  | { kind: "ready"; house: PublicEnglishTraditionalHouse }
  | { kind: "not-found" | "error" };

export const PUBLIC_TRADITIONAL_HOUSE_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ENGLISH_TRADITIONAL_HOUSE_COPY = {
  list: {
    metadataTitle: "Traditional Houses",
    metadataDescription:
      "Explore approved English information about traditional houses and cultural heritage in Karang Bajo Village.",
    eyebrow: "Cultural heritage",
    title: "Traditional Houses",
    description:
      "Discover traditional house information that has been reviewed and published in English.",
    sectionEyebrow: "Published traditional houses",
    sectionTitle: "Traditional Houses",
    emptyTitle: "No English traditional houses are available",
    emptyDescription:
      "Approved English traditional house information will appear here when it is published.",
    cardAction: "View traditional house details",
  },
  detail: {
    metadataUnavailableTitle: "Traditional house not found",
    metadataUnavailableDescription:
      "The requested traditional house is not available in the approved English public information.",
    breadcrumb: "Traditional Houses",
    aboutHeading: "Description",
    historyHeading: "History",
    culturalSignificanceHeading: "Cultural significance",
    locationEyebrow: "Location",
    locationHeading: "Coordinates",
    locationDescription:
      "Use Google Maps for the saved directions when available.",
    latitudeLabel: "Latitude",
    longitudeLabel: "Longitude",
    googleMapsLabel: "Open Google Maps",
    googleMapsAccessibleLabel: "in a new tab",
    visitorHeading: "Visitor information",
    galleryHeading: "Gallery",
    questionsHeading: "Questions about visiting",
    questionsDescription:
      "Use the village's official channel for general questions about visiting Karang Bajo.",
  },
} as const;

export function isNonBlankEnglishTraditionalHouseText(
  value: unknown,
): value is string {
  return isNonBlankPublicText(value);
}

export function mapPublishedEnglishTraditionalHouse(
  row: PublishedEnglishTraditionalHouseRow,
  images: readonly SignedPublicMedia[],
): PublicEnglishTraditionalHouse | null {
  if (
    typeof row !== "object" ||
    row === null ||
    !Array.isArray(images) ||
    !isPublicUuid(row.id) ||
    !isPublicUuid(row.translation_id) ||
    !isNonBlankEnglishTraditionalHouseText(row.name) ||
    !isNonBlankEnglishTraditionalHouseText(row.description) ||
    !isNonBlankEnglishTraditionalHouseText(row.slug) ||
    !PUBLIC_TRADITIONAL_HOUSE_SLUG_PATTERN.test(row.slug) ||
    !isOptionalPublicText(row.summary) ||
    !isOptionalPublicText(row.history) ||
    !isOptionalPublicText(row.cultural_significance) ||
    !isOptionalPublicText(row.location_name) ||
    !isOptionalPublicText(row.visitor_information) ||
    !isOptionalPublicText(row.google_maps_url) ||
    typeof row.is_featured !== "boolean" ||
    !isValidPublicDisplayOrder(row.display_order) ||
    !isValidPublicTimestamp(row.published_at) ||
    !isValidPublicTimestamp(row.translation_published_at)
  ) {
    return null;
  }

  const latitude = parsePublicNumber(row.latitude, -90, 90, true);
  const longitude = parsePublicNumber(row.longitude, -180, 180, true);
  if (
    !latitude.valid ||
    !longitude.valid ||
    (latitude.value === null) !== (longitude.value === null)
  ) {
    return null;
  }

  const gallery = images
    .filter(isUsableSignedPublicMedia)
    .sort(
      (left, right) =>
        left.displayOrder - right.displayOrder ||
        left.id.localeCompare(right.id),
    );
  if (gallery.filter((image) => image.isPrimary).length > 1) return null;

  return {
    id: row.id,
    translationId: row.translation_id,
    name: row.name.trim(),
    slug: row.slug,
    summary: normalizeOptionalPublicText(row.summary),
    description: row.description.trim(),
    history: normalizeOptionalPublicText(row.history),
    culturalSignificance: normalizeOptionalPublicText(
      row.cultural_significance,
    ),
    locationName: normalizeOptionalPublicText(row.location_name),
    visitorInformation: normalizeOptionalPublicText(row.visitor_information),
    latitude: latitude.value,
    longitude: longitude.value,
    googleMapsUrl: normalizeOptionalPublicHttpUrl(row.google_maps_url),
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    sourcePublishedAt: row.published_at,
    translationPublishedAt: row.translation_published_at,
    primaryImage: gallery.find((image) => image.isPrimary) ?? null,
    gallery,
  };
}

export function classifyPublishedEnglishTraditionalHouseDetail(
  houses: readonly PublicEnglishTraditionalHouse[],
): PublicEnglishTraditionalHouseDetailResult {
  if (houses.length === 0) return { kind: "not-found" };
  if (houses.length > 1) return { kind: "error" };

  const house = houses[0];
  if (!house.primaryImage) return { kind: "not-found" };

  return { kind: "ready", house };
}
