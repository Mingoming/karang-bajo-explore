import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { loadPublishedMedia } from "@/features/public-content/server";
import {
  attachPublicMedia,
  PUBLIC_SLUG_PATTERN,
  type PublicContentBase,
  type PublicDetailResult,
  type PublicListResult,
} from "@/features/public-content/model";
import {
  buildPublishedItinerary,
  formatPublicEventSchedule,
} from "@/features/public-domains/model";

export type PublicPackage = PublicContentBase & {
  packageType: string;
  durationValue: number;
  durationUnit: string;
  price: number | null;
  priceNote: string | null;
  facilities: string[];
  souvenir: string | null;
  description: string;
  itinerary: {
    id: string;
    name: string;
    slug: string;
    notes: string | null;
    displayOrder: number;
  }[];
};
export type PublicHomestay = PublicContentBase & {
  description: string;
  ownerName: string | null;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  pricePerNight: number | null;
  priceNote: string | null;
  facilities: string[];
};
export type PublicUmkm = PublicContentBase & {
  description: string;
  category: string;
  ownerName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
};
export type PublicTraditionalHouse = PublicContentBase & {
  description: string;
  history: string | null;
  culturalSignificance: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  visitorInformation: string | null;
};
export type PublicCulturalEvent = PublicContentBase & {
  description: string;
  eventType: string | null;
  startAt: string;
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
};

type DomainConfig = {
  entityType:
    | "tourism-package"
    | "homestay"
    | "umkm"
    | "traditional-house"
    | "cultural-event";
  view: string;
  imageView: string;
  foreignKey: string;
  columns: string;
  orderColumn?: string;
};

const CONFIGS = {
  packages: {
    entityType: "tourism-package",
    view: "published_tourism_packages",
    imageView: "published_package_images",
    foreignKey: "package_id",
    columns:
      "id,name,slug,package_type,duration_value,duration_unit,price,price_note,included_facilities,souvenir,summary,description,is_featured,display_order,published_at",
  },
  homestays: {
    entityType: "homestay",
    view: "published_homestays",
    imageView: "published_homestay_images",
    foreignKey: "homestay_id",
    columns:
      "id,name,slug,owner_name,phone,description,address,latitude,longitude,google_maps_url,price_per_night,price_note,facilities,is_featured,display_order,published_at",
  },
  umkms: {
    entityType: "umkm",
    view: "published_umkms",
    imageView: "published_umkm_images",
    foreignKey: "umkm_id",
    columns:
      "id,business_name,slug,owner_name,category,description,address,latitude,longitude,google_maps_url,contact_name,contact_phone,contact_whatsapp,is_featured,display_order,published_at",
  },
  houses: {
    entityType: "traditional-house",
    view: "published_traditional_houses",
    imageView: "published_traditional_house_images",
    foreignKey: "traditional_house_id",
    columns:
      "id,name,slug,summary,description,history,cultural_significance,location_name,latitude,longitude,google_maps_url,visitor_information,is_featured,display_order,published_at",
  },
  events: {
    entityType: "cultural-event",
    view: "published_cultural_events",
    imageView: "published_cultural_event_images",
    foreignKey: "cultural_event_id",
    columns:
      "id,title,slug,summary,description,event_type,start_at,end_at,all_day,date_note,location_name,address,latitude,longitude,google_maps_url,organizer,contact_phone,visitor_information,is_featured,published_at",
    orderColumn: "start_at",
  },
} as const satisfies Record<string, DomainConfig>;

type Row = Record<string, unknown> & { id: string; slug: string };

async function queryRows(
  supabase: SupabaseClient,
  config: DomainConfig,
  slug?: string,
  limit?: number,
) {
  let query = supabase.from(config.view).select(config.columns);
  if (slug) query = query.eq("slug", slug);
  let ordered = query
    .order(config.orderColumn ?? "display_order", { ascending: true })
    .order("id", { ascending: true });
  if (limit !== undefined) ordered = ordered.limit(limit);
  return ordered.overrideTypes<Row[], { merge: false }>();
}

async function loadDomain<T extends PublicContentBase>(
  config: DomainConfig,
  mapper: (row: Row) => Omit<T, "primaryImage" | "gallery">,
  slug?: string,
  limit?: number,
) {
  const supabase = await createClient();
  const result = await queryRows(supabase, config, slug, limit);
  if (result.error) return null;
  const media = await loadPublishedMedia(supabase, {
    entityType: config.entityType,
    view: config.imageView,
    parentForeignKey: config.foreignKey,
    parentIds: result.data.map((row) => row.id),
  });
  if (media === null) return null;
  return result.data.map((row) =>
    attachPublicMedia<T>(mapper(row), media.get(row.id) ?? []),
  );
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
function nullableText(value: unknown) {
  return typeof value === "string" ? value : null;
}
function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}
function nullableNumber(value: unknown) {
  return value === null ? null : numberValue(value);
}
function booleanValue(value: unknown) {
  return value === true;
}
function textArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapPackage(row: Row): Omit<PublicPackage, "primaryImage" | "gallery"> {
  return {
    id: row.id,
    slug: row.slug,
    title: text(row.name),
    summary: nullableText(row.summary) ?? text(row.description),
    eyebrow: `Paket ${text(row.package_type)}`,
    packageType: text(row.package_type),
    durationValue: numberValue(row.duration_value),
    durationUnit: text(row.duration_unit),
    price: nullableNumber(row.price),
    priceNote: nullableText(row.price_note),
    facilities: textArray(row.included_facilities),
    souvenir: nullableText(row.souvenir),
    description: text(row.description),
    itinerary: [],
    isFeatured: booleanValue(row.is_featured),
    displayOrder: numberValue(row.display_order),
    publishedAt: nullableText(row.published_at),
  };
}
function mapHomestay(
  row: Row,
): Omit<PublicHomestay, "primaryImage" | "gallery"> {
  return {
    id: row.id,
    slug: row.slug,
    title: text(row.name),
    summary: text(row.description),
    eyebrow: "Homestay",
    description: text(row.description),
    ownerName: nullableText(row.owner_name),
    phone: nullableText(row.phone),
    address: nullableText(row.address),
    latitude: nullableNumber(row.latitude),
    longitude: nullableNumber(row.longitude),
    googleMapsUrl: nullableText(row.google_maps_url),
    pricePerNight: nullableNumber(row.price_per_night),
    priceNote: nullableText(row.price_note),
    facilities: textArray(row.facilities),
    isFeatured: booleanValue(row.is_featured),
    displayOrder: numberValue(row.display_order),
    publishedAt: nullableText(row.published_at),
  };
}
function mapUmkm(row: Row): Omit<PublicUmkm, "primaryImage" | "gallery"> {
  return {
    id: row.id,
    slug: row.slug,
    title: text(row.business_name),
    summary: text(row.description),
    eyebrow: text(row.category),
    category: text(row.category),
    description: text(row.description),
    ownerName: nullableText(row.owner_name),
    address: nullableText(row.address),
    latitude: nullableNumber(row.latitude),
    longitude: nullableNumber(row.longitude),
    googleMapsUrl: nullableText(row.google_maps_url),
    contactName: nullableText(row.contact_name),
    contactPhone: nullableText(row.contact_phone),
    contactWhatsapp: nullableText(row.contact_whatsapp),
    isFeatured: booleanValue(row.is_featured),
    displayOrder: numberValue(row.display_order),
    publishedAt: nullableText(row.published_at),
  };
}
function mapHouse(
  row: Row,
): Omit<PublicTraditionalHouse, "primaryImage" | "gallery"> {
  return {
    id: row.id,
    slug: row.slug,
    title: text(row.name),
    summary: nullableText(row.summary) ?? text(row.description),
    eyebrow: "Rumah Adat",
    description: text(row.description),
    history: nullableText(row.history),
    culturalSignificance: nullableText(row.cultural_significance),
    locationName: nullableText(row.location_name),
    latitude: nullableNumber(row.latitude),
    longitude: nullableNumber(row.longitude),
    googleMapsUrl: nullableText(row.google_maps_url),
    visitorInformation: nullableText(row.visitor_information),
    isFeatured: booleanValue(row.is_featured),
    displayOrder: numberValue(row.display_order),
    publishedAt: nullableText(row.published_at),
  };
}
function mapEvent(
  row: Row,
): Omit<PublicCulturalEvent, "primaryImage" | "gallery"> {
  return {
    id: row.id,
    slug: row.slug,
    title: text(row.title),
    summary: nullableText(row.summary) ?? text(row.description),
    eyebrow: nullableText(row.event_type) ?? "Acara Budaya",
    description: text(row.description),
    eventType: nullableText(row.event_type),
    startAt: text(row.start_at),
    endAt: nullableText(row.end_at),
    allDay: booleanValue(row.all_day),
    dateNote: nullableText(row.date_note),
    locationName: nullableText(row.location_name),
    address: nullableText(row.address),
    latitude: nullableNumber(row.latitude),
    longitude: nullableNumber(row.longitude),
    googleMapsUrl: nullableText(row.google_maps_url),
    organizer: nullableText(row.organizer),
    contactPhone: nullableText(row.contact_phone),
    visitorInformation: nullableText(row.visitor_information),
    isFeatured: booleanValue(row.is_featured),
    displayOrder: 0,
    publishedAt: nullableText(row.published_at),
  };
}

async function list<T extends PublicContentBase>(
  config: DomainConfig,
  mapper: (row: Row) => Omit<T, "primaryImage" | "gallery">,
  limit?: number,
): Promise<PublicListResult<T>> {
  const items = await loadDomain(config, mapper, undefined, limit);
  return items ? { kind: "ready", items } : { kind: "error" };
}
async function detail<T extends PublicContentBase>(
  config: DomainConfig,
  mapper: (row: Row) => Omit<T, "primaryImage" | "gallery">,
  slug: string,
): Promise<PublicDetailResult<T>> {
  if (!PUBLIC_SLUG_PATTERN.test(slug)) return { kind: "not-found" };
  const items = await loadDomain(config, mapper, slug);
  if (items === null) return { kind: "error" };
  return items[0] ? { kind: "ready", item: items[0] } : { kind: "not-found" };
}

async function metadata(
  config: DomainConfig,
  titleColumn: string,
  summaryColumn: string,
  slug: string,
) {
  if (!PUBLIC_SLUG_PATTERN.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(config.view)
    .select(`${titleColumn},${summaryColumn}`)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<Record<string, unknown> | null, { merge: false }>();
  if (error || !data) return null;
  return {
    title: text(data[titleColumn]),
    description: text(data[summaryColumn]),
  };
}

export const getPublishedPackages = (limit?: number) =>
  list<PublicPackage>(CONFIGS.packages, mapPackage, limit);
export async function getPublishedPackage(
  slug: string,
): Promise<PublicDetailResult<PublicPackage>> {
  const result = await detail<PublicPackage>(
    CONFIGS.packages,
    mapPackage,
    slug,
  );
  if (result.kind !== "ready") return result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_package_destinations")
    .select("destination_id,display_order,notes")
    .eq("package_id", result.item.id)
    .order("display_order", { ascending: true })
    .overrideTypes<
      { destination_id: string; display_order: number; notes: string | null }[],
      { merge: false }
    >();
  if (error) return { kind: "error" };
  const ids = data.map((item) => item.destination_id);
  const destinations = ids.length
    ? await supabase
        .from("published_destinations")
        .select("id,name,slug")
        .in("id", ids)
        .overrideTypes<
          { id: string; name: string; slug: string }[],
          { merge: false }
        >()
    : { data: [], error: null };
  if (destinations.error) return { kind: "error" };
  return {
    kind: "ready",
    item: {
      ...result.item,
      itinerary: buildPublishedItinerary(data, destinations.data ?? []),
    },
  };
}
export const getPublishedPackageMetadata = (slug: string) =>
  metadata(CONFIGS.packages, "name", "summary", slug);
export const getPublishedHomestays = (limit?: number) =>
  list<PublicHomestay>(CONFIGS.homestays, mapHomestay, limit);
export const getPublishedHomestay = (slug: string) =>
  detail<PublicHomestay>(CONFIGS.homestays, mapHomestay, slug);
export const getPublishedHomestayMetadata = (slug: string) =>
  metadata(CONFIGS.homestays, "name", "description", slug);
export const getPublishedUmkms = (limit?: number) =>
  list<PublicUmkm>(CONFIGS.umkms, mapUmkm, limit);
export const getPublishedUmkm = (slug: string) =>
  detail<PublicUmkm>(CONFIGS.umkms, mapUmkm, slug);
export const getPublishedUmkmMetadata = (slug: string) =>
  metadata(CONFIGS.umkms, "business_name", "description", slug);
export const getPublishedTraditionalHouses = (limit?: number) =>
  list<PublicTraditionalHouse>(CONFIGS.houses, mapHouse, limit);
export const getPublishedTraditionalHouse = (slug: string) =>
  detail<PublicTraditionalHouse>(CONFIGS.houses, mapHouse, slug);
export const getPublishedTraditionalHouseMetadata = (slug: string) =>
  metadata(CONFIGS.houses, "name", "summary", slug);
export const getPublishedCulturalEvents = (limit?: number) =>
  list<PublicCulturalEvent>(CONFIGS.events, mapEvent, limit);
export const getPublishedCulturalEvent = (slug: string) =>
  detail<PublicCulturalEvent>(CONFIGS.events, mapEvent, slug);
export const getPublishedCulturalEventMetadata = (slug: string) =>
  metadata(CONFIGS.events, "title", "summary", slug);

export { formatPublicEventSchedule };
