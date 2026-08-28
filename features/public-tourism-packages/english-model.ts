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
  normalizeOptionalPublicText,
  parsePublicNumber,
} from "../public-content/validation.ts";
import {
  TOURISM_PACKAGE_TYPES,
  type TourismPackageType,
} from "../tourism-packages/model.ts";

export type PublishedEnglishTourismPackageRow = {
  id: string;
  translation_id: string;
  slug: string;
  name: string;
  package_type: TourismPackageType;
  duration_value: number;
  duration_unit: string;
  price: number | string | null;
  price_note: string | null;
  included_facilities: string[];
  souvenir: string | null;
  summary: string | null;
  description: string;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  is_featured: boolean;
  display_order: number;
  published_at: string | null;
  translation_published_at: string | null;
};

export type PublishedEnglishTourismPackageImageRow = {
  id: string;
  package_id: string;
  translation_id: string;
  storage_bucket: string;
  storage_path: string;
  alt_text: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
};

export type PublishedEnglishTourismPackageDestinationRow = {
  id: string;
  package_id: string;
  destination_id: string;
  display_order: number;
  destination_name: string;
  destination_slug: string;
};

export type PublicEnglishTourismPackageItineraryItem = {
  id: string;
  destinationId: string;
  destinationName: string;
  destinationSlug: string;
  displayOrder: number;
};

export type PublicEnglishTourismPackage = {
  id: string;
  translationId: string;
  slug: string;
  name: string;
  packageType: TourismPackageType;
  durationValue: number;
  durationUnit: string;
  price: number | null;
  priceNote: string | null;
  includedFacilities: string[];
  souvenir: string | null;
  summary: string | null;
  description: string;
  isFeatured: boolean;
  displayOrder: number;
  publishedAt: string | null;
  translationPublishedAt: string | null;
  primaryImage: SignedPublicMedia | null;
  gallery: SignedPublicMedia[];
  itinerary: PublicEnglishTourismPackageItineraryItem[];
};

export type PublicEnglishTourismPackageListResult =
  | { kind: "ready"; packages: PublicEnglishTourismPackage[] }
  | { kind: "error" };

export type PublicEnglishTourismPackageDetailResult =
  | { kind: "ready"; tourismPackage: PublicEnglishTourismPackage }
  | { kind: "not-found" | "error" };

export const PUBLIC_TOURISM_PACKAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ENGLISH_TOURISM_PACKAGE_COPY = {
  list: {
    metadataTitle: "Tourism Packages",
    metadataDescription:
      "Explore approved English tourism package information in Karang Bajo Village.",
    eyebrow: "Plan your visit",
    title: "Tourism Packages",
    description:
      "Discover tourism packages built from reviewed English information about Karang Bajo.",
    sectionEyebrow: "Published tourism packages",
    sectionTitle: "Tourism Packages",
    emptyTitle: "No English tourism packages are available",
    emptyDescription:
      "Approved English tourism package information will appear here when it is published.",
    cardAction: "View tourism package details",
  },
  detail: {
    metadataUnavailableTitle: "Tourism package not found",
    metadataUnavailableDescription:
      "The requested tourism package is not available in the approved English public information.",
    breadcrumb: "Tourism Packages",
    aboutHeading: "About this package",
    packageTypeLabel: "Package type",
    durationLabel: "Duration",
    priceLabel: "Price",
    priceUnavailable: "Price available on request",
    facilitiesHeading: "Included facilities",
    souvenirHeading: "Souvenir",
    itineraryHeading: "Itinerary",
    itineraryEmpty: "The approved itinerary is not available.",
    galleryHeading: "Gallery",
    questionsHeading: "Questions about this package",
    questionsDescription:
      "Use the village's official channel for general questions about visiting Karang Bajo.",
  },
} as const;

export function formatEnglishTourismPackagePrice(value: number | null) {
  if (value === null)
    return ENGLISH_TOURISM_PACKAGE_COPY.detail.priceUnavailable;
  if (value === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getEnglishTourismPackageTypeLabel(type: TourismPackageType) {
  return {
    budget: "Budget",
    standard: "Standard",
    premium: "Premium",
  }[type];
}

function isTourismPackageType(value: unknown): value is TourismPackageType {
  return (
    typeof value === "string" &&
    TOURISM_PACKAGE_TYPES.some((packageType) => packageType === value)
  );
}

function isNonBlankEnglishTourismPackageText(value: unknown): value is string {
  return isNonBlankPublicText(value);
}

function isValidPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isValidPublicTextArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

export function mapPublishedEnglishTourismPackage(
  row: PublishedEnglishTourismPackageRow,
  images: readonly SignedPublicMedia[],
  itinerary: readonly PublicEnglishTourismPackageItineraryItem[] = [],
): PublicEnglishTourismPackage | null {
  if (
    typeof row !== "object" ||
    row === null ||
    !Array.isArray(images) ||
    !isPublicUuid(row.id) ||
    !isPublicUuid(row.translation_id) ||
    !isNonBlankEnglishTourismPackageText(row.name) ||
    !isNonBlankEnglishTourismPackageText(row.description) ||
    !isNonBlankEnglishTourismPackageText(row.slug) ||
    !PUBLIC_TOURISM_PACKAGE_SLUG_PATTERN.test(row.slug) ||
    !isTourismPackageType(row.package_type) ||
    !isValidPositiveInteger(row.duration_value) ||
    !isNonBlankEnglishTourismPackageText(row.duration_unit) ||
    !isValidPublicTextArray(row.included_facilities) ||
    typeof row.is_featured !== "boolean" ||
    !isValidPublicDisplayOrder(row.display_order) ||
    !isOptionalPublicText(row.price_note) ||
    !isOptionalPublicText(row.souvenir) ||
    !isOptionalPublicText(row.summary) ||
    !isOptionalPublicText(row.thumbnail_bucket) ||
    !isOptionalPublicText(row.thumbnail_path) ||
    !isValidPublicTimestamp(row.published_at) ||
    !isValidPublicTimestamp(row.translation_published_at) ||
    row.published_at === null ||
    row.translation_published_at === null ||
    !Array.isArray(itinerary)
  ) {
    return null;
  }

  const price = parsePublicNumber(row.price, 0, Number.MAX_VALUE, true);
  if (!price.valid) return null;

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
    name: row.name.trim(),
    packageType: row.package_type,
    durationValue: row.duration_value,
    durationUnit: row.duration_unit.trim(),
    price: price.value,
    priceNote: normalizeOptionalPublicText(row.price_note),
    includedFacilities: row.included_facilities.map((item) => item.trim()),
    souvenir: normalizeOptionalPublicText(row.souvenir),
    summary: normalizeOptionalPublicText(row.summary),
    description: row.description.trim(),
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    translationPublishedAt: row.translation_published_at,
    primaryImage: gallery.find((image) => image.isPrimary) ?? null,
    gallery,
    itinerary: [...itinerary],
  };
}

export function mapPublishedEnglishTourismPackageItinerary(
  rows: readonly PublishedEnglishTourismPackageDestinationRow[],
  packageId: string,
): PublicEnglishTourismPackageItineraryItem[] | null {
  if (!Array.isArray(rows) || !isPublicUuid(packageId) || rows.length === 0) {
    return null;
  }

  const seenRelationIds = new Set<string>();
  const seenDestinationIds = new Set<string>();
  const seenDisplayOrders = new Set<number>();
  const itinerary = rows.map((row) => {
    if (
      typeof row !== "object" ||
      row === null ||
      !isPublicUuid(row.id) ||
      !isPublicUuid(row.package_id) ||
      row.package_id !== packageId ||
      !isPublicUuid(row.destination_id) ||
      !isValidPublicDisplayOrder(row.display_order) ||
      !isNonBlankEnglishTourismPackageText(row.destination_name) ||
      !isNonBlankEnglishTourismPackageText(row.destination_slug) ||
      !PUBLIC_TOURISM_PACKAGE_SLUG_PATTERN.test(row.destination_slug) ||
      seenRelationIds.has(row.id) ||
      seenDestinationIds.has(row.destination_id) ||
      seenDisplayOrders.has(row.display_order)
    ) {
      return null;
    }

    seenRelationIds.add(row.id);
    seenDestinationIds.add(row.destination_id);
    seenDisplayOrders.add(row.display_order);
    return {
      id: row.id,
      destinationId: row.destination_id,
      destinationName: row.destination_name.trim(),
      destinationSlug: row.destination_slug,
      displayOrder: row.display_order,
    };
  });

  if (itinerary.some((item) => item === null)) return null;
  return itinerary
    .filter(
      (item): item is PublicEnglishTourismPackageItineraryItem => item !== null,
    )
    .sort(
      (left, right) =>
        left.displayOrder - right.displayOrder ||
        left.id.localeCompare(right.id),
    );
}

export function classifyPublishedEnglishTourismPackageDetail(
  packages: readonly PublicEnglishTourismPackage[],
): PublicEnglishTourismPackageDetailResult {
  if (packages.length === 0) return { kind: "not-found" };
  if (packages.length > 1) return { kind: "error" };
  if (!packages[0].primaryImage || packages[0].itinerary.length === 0) {
    return { kind: "not-found" };
  }
  return { kind: "ready", tourismPackage: packages[0] };
}
