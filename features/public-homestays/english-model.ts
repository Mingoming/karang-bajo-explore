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

export type PublishedEnglishHomestayRow = {
  id: string;
  translation_id: string;
  slug: string;
  name: string;
  description: string;
  address: string | null;
  price_note: string | null;
  facilities: string[];
  price_per_night: number | string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  google_maps_url: string | null;
  owner_name: string | null;
  phone: string | null;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  is_featured: boolean;
  display_order: number;
  published_at: string | null;
  translation_published_at: string | null;
};

export type PublishedEnglishHomestayImageRow = {
  id: string;
  homestay_id: string;
  translation_id: string;
  storage_bucket: string;
  storage_path: string;
  alt_text: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
};

export type PublicEnglishHomestay = {
  id: string;
  translationId: string;
  slug: string;
  name: string;
  description: string;
  address: string | null;
  priceNote: string | null;
  facilities: string[];
  pricePerNight: number | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  ownerName: string | null;
  phone: string | null;
  isFeatured: boolean;
  displayOrder: number;
  publishedAt: string | null;
  translationPublishedAt: string | null;
  primaryImage: SignedPublicMedia | null;
  gallery: SignedPublicMedia[];
};

export type PublicEnglishHomestayListResult =
  { kind: "ready"; homestays: PublicEnglishHomestay[] } | { kind: "error" };
export type PublicEnglishHomestayDetailResult =
  | { kind: "ready"; homestay: PublicEnglishHomestay }
  | { kind: "not-found" | "error" };

export const PUBLIC_HOMESTAY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ENGLISH_HOMESTAY_COPY = {
  list: {
    metadataTitle: "Homestays",
    metadataDescription:
      "Explore approved English homestay information in Karang Bajo Village.",
    eyebrow: "Places to stay",
    title: "Homestays",
    description:
      "Discover homestay information reviewed and published in English.",
    sectionEyebrow: "Published homestays",
    sectionTitle: "Places to stay",
    emptyTitle: "No English homestays are available",
    emptyDescription:
      "Approved English homestay information will appear here when it is published.",
    cardAction: "View homestay details",
  },
  detail: {
    metadataUnavailableTitle: "Homestay not found",
    metadataUnavailableDescription:
      "The requested homestay is not available in the approved English public information.",
    breadcrumb: "Homestays",
    aboutHeading: "About this homestay",
    facilitiesHeading: "Facilities",
    locationHeading: "Location and contact",
    addressLabel: "Address",
    coordinatesLabel: "Coordinates",
    googleMapsLabel: "Open Google Maps",
    ownerLabel: "Host or manager",
    phoneLabel: "Phone",
    priceLabel: "Price",
    priceUnavailable: "Price available on request",
    questionsHeading: "Questions about staying here",
    questionsDescription:
      "Use the village's official channel for general questions about visiting Karang Bajo.",
    galleryHeading: "Gallery",
  },
} as const;

export function isNonBlankEnglishHomestayText(value: unknown): value is string {
  return isNonBlankPublicText(value);
}

export function mapPublishedEnglishHomestay(
  row: PublishedEnglishHomestayRow,
  images: readonly SignedPublicMedia[],
): PublicEnglishHomestay | null {
  if (
    typeof row !== "object" ||
    row === null ||
    !Array.isArray(images) ||
    !isPublicUuid(row.id) ||
    !isPublicUuid(row.translation_id) ||
    !isNonBlankEnglishHomestayText(row.id) ||
    !isNonBlankEnglishHomestayText(row.translation_id) ||
    !isNonBlankEnglishHomestayText(row.name) ||
    !isNonBlankEnglishHomestayText(row.description) ||
    !isNonBlankEnglishHomestayText(row.slug) ||
    !PUBLIC_HOMESTAY_SLUG_PATTERN.test(row.slug) ||
    !Array.isArray(row.facilities) ||
    row.facilities.some((value) => !isNonBlankEnglishHomestayText(value)) ||
    typeof row.is_featured !== "boolean" ||
    !isValidPublicDisplayOrder(row.display_order) ||
    !isOptionalPublicText(row.address) ||
    !isOptionalPublicText(row.price_note) ||
    !isOptionalPublicText(row.google_maps_url) ||
    !isOptionalPublicText(row.owner_name) ||
    !isOptionalPublicText(row.phone) ||
    !isValidPublicTimestamp(row.published_at) ||
    !isValidPublicTimestamp(row.translation_published_at)
  ) {
    return null;
  }

  const pricePerNight = parsePublicNumber(
    row.price_per_night,
    0,
    Number.MAX_VALUE,
    true,
  );
  const latitude = parsePublicNumber(row.latitude, -90, 90, true);
  const longitude = parsePublicNumber(row.longitude, -180, 180, true);
  if (
    !pricePerNight.valid ||
    !latitude.valid ||
    !longitude.valid ||
    (latitude.value === null) !== (longitude.value === null) ||
    !isValidPublicTimestamp(row.published_at) ||
    !isValidPublicTimestamp(row.translation_published_at)
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
  const primaryImages = gallery.filter((image) => image.isPrimary);
  if (primaryImages.length > 1) return null;

  return {
    id: row.id,
    translationId: row.translation_id,
    slug: row.slug,
    name: row.name.trim(),
    description: row.description.trim(),
    address: normalizeOptionalPublicText(row.address),
    priceNote: normalizeOptionalPublicText(row.price_note),
    facilities: row.facilities.map((value) => value.trim()),
    pricePerNight: pricePerNight.value,
    latitude: latitude.value,
    longitude: longitude.value,
    googleMapsUrl: normalizeOptionalPublicHttpUrl(row.google_maps_url),
    ownerName: normalizeOptionalPublicText(row.owner_name),
    phone: normalizeOptionalPublicText(row.phone),
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    translationPublishedAt: row.translation_published_at,
    primaryImage: gallery.find((image) => image.isPrimary) ?? null,
    gallery,
  };
}

export function classifyPublishedEnglishHomestayDetail(
  homestays: readonly PublicEnglishHomestay[],
): PublicEnglishHomestayDetailResult {
  if (homestays.length === 0 || homestays.length > 1)
    return { kind: "not-found" };
  if (!homestays[0].primaryImage) return { kind: "not-found" };
  return { kind: "ready", homestay: homestays[0] };
}

export function formatEnglishHomestayPrice(value: number | null) {
  if (value === null) return ENGLISH_HOMESTAY_COPY.detail.priceUnavailable;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
