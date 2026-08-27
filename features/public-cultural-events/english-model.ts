import {
  isUsableSignedPublicMedia,
  type SignedPublicMedia,
} from "../public-media/model.ts";
import {
  isOptionalPublicText,
  isPublicUuid,
  isValidPublicTimestamp,
  normalizeOptionalPublicHttpUrl,
  normalizeOptionalPublicText,
  parsePublicNumber,
} from "../public-content/validation.ts";

export type PublishedEnglishCulturalEventRow = {
  id: string;
  translation_id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string;
  event_type: string | null;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  date_note: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  google_maps_url: string | null;
  organizer: string | null;
  contact_phone: string | null;
  visitor_information: string | null;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  is_featured: boolean;
  published_at: string | null;
  translation_published_at: string | null;
};

export type PublishedEnglishCulturalEventImageRow = {
  id: string;
  cultural_event_id: string;
  translation_id: string;
  storage_bucket: string;
  storage_path: string;
  alt_text: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
};

export type PublicEnglishCulturalEvent = {
  id: string;
  translationId: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string;
  eventType: string | null;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  dateNote: string | null;
  locationName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  organizer: string | null;
  contactPhone: string | null;
  visitorInformation: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  translationPublishedAt: string | null;
  primaryImage: SignedPublicMedia | null;
  gallery: SignedPublicMedia[];
};

export type PublicEnglishCulturalEventListResult =
  { kind: "ready"; events: PublicEnglishCulturalEvent[] } | { kind: "error" };

export type PublicEnglishCulturalEventDetailResult =
  | { kind: "ready"; event: PublicEnglishCulturalEvent }
  | { kind: "not-found" | "error" };

export const PUBLIC_CULTURAL_EVENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ENGLISH_CULTURAL_EVENT_COPY = {
  list: {
    metadataTitle: "Cultural Events",
    metadataDescription:
      "Explore approved English information about cultural events in Karang Bajo Village.",
    eyebrow: "Culture and community",
    title: "Cultural Events",
    description:
      "Discover cultural event information that has been reviewed and published in English.",
    sectionEyebrow: "Published cultural events",
    sectionTitle: "Cultural Events",
    emptyTitle: "No English cultural events are available",
    emptyDescription:
      "Approved English cultural event information will appear here when it is published.",
    cardAction: "View cultural event details",
    scheduleUnavailable: "Schedule not confirmed",
  },
  detail: {
    metadataUnavailableTitle: "Cultural event not found",
    metadataUnavailableDescription:
      "The requested cultural event is not available in the approved English public information.",
    breadcrumb: "Cultural Events",
    aboutHeading: "About this event",
    scheduleHeading: "Schedule",
    startLabel: "Starts",
    endLabel: "Ends",
    dateNoteLabel: "Schedule note",
    locationHeading: "Location",
    addressLabel: "Address",
    coordinatesLabel: "Coordinates",
    googleMapsLabel: "Open Google Maps",
    visitorHeading: "Visitor information",
    organizerLabel: "Organizer",
    contactLabel: "Contact",
    galleryHeading: "Gallery",
    primaryImageLabel: "Primary image",
    questionsHeading: "Questions about this event",
    questionsDescription:
      "Use the village's official channel for general questions about visiting Karang Bajo.",
    scheduleUnavailable: "Schedule not confirmed",
  },
} as const;

export function mapPublishedEnglishCulturalEvent(
  row: PublishedEnglishCulturalEventRow,
  images: readonly SignedPublicMedia[],
): PublicEnglishCulturalEvent | null {
  if (
    typeof row !== "object" ||
    row === null ||
    !Array.isArray(images) ||
    !isPublicUuid(row.id) ||
    !isPublicUuid(row.translation_id) ||
    !isNonBlankEnglishCulturalEventText(row.title) ||
    !isNonBlankEnglishCulturalEventText(row.description) ||
    !isNonBlankEnglishCulturalEventText(row.slug) ||
    !PUBLIC_CULTURAL_EVENT_SLUG_PATTERN.test(row.slug) ||
    !isOptionalPublicText(row.summary) ||
    !isOptionalPublicText(row.event_type) ||
    !isOptionalPublicText(row.date_note) ||
    !isOptionalPublicText(row.location_name) ||
    !isOptionalPublicText(row.address) ||
    !isOptionalPublicText(row.organizer) ||
    !isOptionalPublicText(row.contact_phone) ||
    !isOptionalPublicText(row.visitor_information) ||
    !isOptionalPublicText(row.google_maps_url) ||
    typeof row.all_day !== "boolean" ||
    typeof row.is_featured !== "boolean" ||
    typeof row.start_at !== "string" ||
    !isValidPublicTimestamp(row.start_at) ||
    !isValidPublicTimestamp(row.end_at) ||
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
    title: row.title.trim(),
    summary: normalizeOptionalPublicText(row.summary),
    description: row.description.trim(),
    eventType: normalizeOptionalPublicText(row.event_type),
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    dateNote: normalizeOptionalPublicText(row.date_note),
    locationName: normalizeOptionalPublicText(row.location_name),
    address: normalizeOptionalPublicText(row.address),
    latitude: latitude.value,
    longitude: longitude.value,
    googleMapsUrl: normalizeOptionalPublicHttpUrl(row.google_maps_url),
    organizer: normalizeOptionalPublicText(row.organizer),
    contactPhone: normalizeOptionalPublicText(row.contact_phone),
    visitorInformation: normalizeOptionalPublicText(row.visitor_information),
    isFeatured: row.is_featured,
    publishedAt: row.published_at,
    translationPublishedAt: row.translation_published_at,
    primaryImage: gallery.find((image) => image.isPrimary) ?? null,
    gallery,
  };
}

export function isNonBlankEnglishCulturalEventText(
  value: unknown,
): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function classifyPublishedEnglishCulturalEventDetail(
  events: readonly PublicEnglishCulturalEvent[],
): PublicEnglishCulturalEventDetailResult {
  if (events.length === 0) return { kind: "not-found" };
  if (events.length > 1) return { kind: "error" };

  const event = events[0];
  if (!event.primaryImage) return { kind: "not-found" };

  return { kind: "ready", event };
}

export function formatEnglishCulturalEventSchedule(
  value: string | null,
  allDay: boolean,
) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    ...(allDay ? {} : { timeStyle: "short" as const }),
    timeZone: "Asia/Makassar",
  }).format(new Date(value));
}
