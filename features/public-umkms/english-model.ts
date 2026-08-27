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

export type PublishedEnglishUmkmRow = {
  id: string;
  translation_id: string;
  slug: string;
  business_name: string;
  category: string;
  description: string;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  google_maps_url: string | null;
  owner_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  is_featured: boolean;
  display_order: number;
  published_at: string | null;
  translation_published_at: string | null;
};

export type PublishedEnglishUmkmImageRow = {
  id: string;
  umkm_id: string;
  translation_id: string;
  storage_bucket: string;
  storage_path: string;
  alt_text: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
};

export type PublicEnglishUmkm = {
  id: string;
  translationId: string;
  slug: string;
  businessName: string;
  category: string;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  ownerName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  isFeatured: boolean;
  displayOrder: number;
  publishedAt: string | null;
  translationPublishedAt: string | null;
  primaryImage: SignedPublicMedia | null;
  gallery: SignedPublicMedia[];
};

export type PublicEnglishUmkmListResult =
  { kind: "ready"; umkms: PublicEnglishUmkm[] } | { kind: "error" };
export type PublicEnglishUmkmDetailResult =
  { kind: "ready"; umkm: PublicEnglishUmkm } | { kind: "not-found" | "error" };

export const PUBLIC_UMKM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ENGLISH_UMKM_COPY = {
  list: {
    metadataTitle: "Local Businesses",
    metadataDescription:
      "Explore approved English information about local businesses in Karang Bajo Village.",
    eyebrow: "Local businesses",
    title: "Local businesses in Karang Bajo",
    description:
      "Discover local businesses with information reviewed and published in English.",
    sectionEyebrow: "Published businesses",
    sectionTitle: "Explore local businesses",
    emptyTitle: "No English local businesses are available",
    emptyDescription:
      "Approved English local-business information will appear here when it is published.",
    cardAction: "View business details",
  },
  detail: {
    metadataUnavailableTitle: "Local business not found",
    metadataUnavailableDescription:
      "The requested local business is not available in the approved English public information.",
    breadcrumb: "Local businesses",
    aboutHeading: "About this business",
    categoryLabel: "Category",
    locationHeading: "Location and contact",
    addressLabel: "Address",
    coordinatesLabel: "Coordinates",
    googleMapsLabel: "Open Google Maps",
    ownerLabel: "Owner or manager",
    contactNameLabel: "Contact",
    phoneLabel: "Phone",
    whatsappLabel: "WhatsApp",
    questionsHeading: "Questions about local businesses",
    questionsDescription:
      "Use the village's official channel for general questions about visiting Karang Bajo.",
    galleryHeading: "Gallery",
  },
} as const;

export function mapPublishedEnglishUmkm(
  row: PublishedEnglishUmkmRow,
  images: readonly SignedPublicMedia[],
): PublicEnglishUmkm | null {
  if (
    typeof row !== "object" ||
    row === null ||
    !Array.isArray(images) ||
    !isPublicUuid(row.id) ||
    !isPublicUuid(row.translation_id) ||
    !isNonBlankPublicText(row.business_name) ||
    !isNonBlankPublicText(row.category) ||
    !isNonBlankPublicText(row.description) ||
    !isNonBlankPublicText(row.slug) ||
    !PUBLIC_UMKM_SLUG_PATTERN.test(row.slug) ||
    !isOptionalPublicText(row.address) ||
    !isOptionalPublicText(row.owner_name) ||
    !isOptionalPublicText(row.contact_name) ||
    !isOptionalPublicText(row.contact_phone) ||
    !isOptionalPublicText(row.contact_whatsapp) ||
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
    slug: row.slug,
    businessName: row.business_name.trim(),
    category: row.category.trim(),
    description: row.description.trim(),
    address: normalizeOptionalPublicText(row.address),
    latitude: latitude.value,
    longitude: longitude.value,
    googleMapsUrl: normalizeOptionalPublicHttpUrl(row.google_maps_url),
    ownerName: normalizeOptionalPublicText(row.owner_name),
    contactName: normalizeOptionalPublicText(row.contact_name),
    contactPhone: normalizeOptionalPublicText(row.contact_phone),
    contactWhatsapp: normalizeOptionalPublicText(row.contact_whatsapp),
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    translationPublishedAt: row.translation_published_at,
    primaryImage: gallery.find((image) => image.isPrimary) ?? null,
    gallery,
  };
}

export function classifyPublishedEnglishUmkmDetail(
  umkms: readonly PublicEnglishUmkm[],
): PublicEnglishUmkmDetailResult {
  if (umkms.length === 0 || umkms.length > 1) return { kind: "not-found" };
  if (!umkms[0].primaryImage) return { kind: "not-found" };
  return { kind: "ready", umkm: umkms[0] };
}
