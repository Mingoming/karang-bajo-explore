import type { SignedPublicMedia } from "@/features/public-media/model";

import type { PublicDestination } from "./model";

export type PublishedEnglishDestinationRow = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  history: string | null;
  latitude: number | string;
  longitude: number | string;
  google_maps_url: string | null;
  opening_hours: string | null;
  entrance_fee: number | string | null;
  price_note: string | null;
  facilities: string[];
  contact_name: string | null;
  contact_phone: string | null;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  is_featured: boolean;
  display_order: number;
  source_published_at: string | null;
  english_published_at: string | null;
};

export type PublishedEnglishDestinationImageRow = {
  id: string;
  destination_id: string;
  storage_bucket: string;
  storage_path: string;
  caption: string | null;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
};

export type EnglishDestinationCategoryRow = {
  id: string;
  slug: string;
  display_order: number;
};

export type PublicEnglishDestinationListResult =
  { kind: "ready"; destinations: PublicDestination[] } | { kind: "error" };

export type PublicEnglishDestinationDetailResult =
  | { kind: "ready"; destination: PublicDestination }
  | { kind: "not-found" | "error" };

export const ENGLISH_DESTINATION_CATEGORY_NAMES: Readonly<
  Record<string, string>
> = {
  alam: "Nature",
  budaya: "Culture",
  religi: "Religion",
};

export const ENGLISH_DESTINATION_COPY = {
  list: {
    metadataTitle: "Destinations",
    metadataDescription:
      "Explore approved English information about nature, culture, and religious destinations in Karang Bajo Village.",
    eyebrow: "Explore Karang Bajo",
    title: "Tourist destinations",
    description:
      "Discover destination information that has been reviewed and published in English.",
    sectionEyebrow: "Published destinations",
    sectionTitle: "Destinations",
    emptyTitle: "No English destinations are available",
    emptyDescription:
      "Approved English destination information will appear here when it is published.",
    cardAction: "View destination details",
  },
  detail: {
    metadataUnavailableTitle: "Destination not found",
    metadataUnavailableDescription:
      "The requested destination is not available in the approved English public information.",
    breadcrumb: "Destinations",
    aboutHeading: "About this destination",
    historyHeading: "History",
    facilitiesHeading: "Facilities",
    locationEyebrow: "Location",
    locationHeading: "Coordinates",
    locationLatitudeLabel: "Latitude",
    locationLongitudeLabel: "longitude",
    locationDescription:
      "Use Google Maps for the saved directions when available.",
    mapLabel: "Open tourism map",
    googleMapsLabel: "Open Google Maps",
    googleMapsAccessibleLabel: "in a new tab",
    galleryHeading: "Gallery",
    primaryImageLabel: "Primary image",
    visitHeading: "Visitor information",
    hoursLabel: "Visiting hours",
    entranceFeeLabel: "Entrance fee",
    contactLabel: "Published contact",
    questionsHeading: "Questions about visiting",
    questionsDescription:
      "Use the village's official channel for general questions about visiting Karang Bajo.",
  },
} as const;

function normalizeOptionalText(value: string | null) {
  return value?.trim() || null;
}

export function getEnglishDestinationCategoryName(slug: string | null) {
  return slug
    ? (ENGLISH_DESTINATION_CATEGORY_NAMES[slug] ?? "Destination")
    : "Destination";
}

export function formatEnglishDestinationPrice(price: number | null) {
  if (price === null) return null;
  if (price === 0) return "Free";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function mapPublishedEnglishDestination(
  row: PublishedEnglishDestinationRow,
  categorySlug: string | null,
  images: readonly SignedPublicMedia[],
): PublicDestination {
  const gallery = [...images].sort(
    (left, right) =>
      left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
  );

  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: getEnglishDestinationCategoryName(categorySlug),
    name: row.name.trim(),
    slug: row.slug,
    summary: row.summary.trim(),
    description: row.description.trim(),
    history: normalizeOptionalText(row.history),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    googleMapsUrl: normalizeOptionalText(row.google_maps_url),
    openingHours: normalizeOptionalText(row.opening_hours),
    entranceFee: row.entrance_fee === null ? null : Number(row.entrance_fee),
    priceNote: normalizeOptionalText(row.price_note),
    facilities: (row.facilities ?? [])
      .map((facility) => facility.trim())
      .filter(Boolean),
    contactName: normalizeOptionalText(row.contact_name),
    contactPhone: normalizeOptionalText(row.contact_phone),
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.english_published_at,
    primaryImage: gallery.find((image) => image.isPrimary) ?? null,
    gallery,
  };
}

export function classifyPublishedEnglishDestinationDetail(
  destinations: readonly PublicDestination[],
): PublicEnglishDestinationDetailResult {
  if (destinations.length === 0) return { kind: "not-found" };
  if (destinations.length > 1) return { kind: "error" };

  const destination = destinations[0];
  if (!destination.primaryImage) return { kind: "not-found" };

  return { kind: "ready", destination };
}
