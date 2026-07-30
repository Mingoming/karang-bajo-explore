import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { signPublishedMedia } from "@/features/public-media/server";
import type { PublicMediaReference } from "@/features/public-media/model";

import {
  orderPublishedDestinationImages,
  PUBLIC_DESTINATION_SLUG_PATTERN,
  type PublishedDestinationImageRow,
  type PublishedDestinationRow,
  type PublicDestination,
  type PublicDestinationCategory,
} from "./model";

export const PUBLISHED_DESTINATIONS_VIEW = "published_destinations";
export const PUBLISHED_DESTINATION_IMAGES_VIEW = "published_destination_images";

const PUBLIC_DESTINATION_COLUMNS = [
  "id",
  "category_id",
  "name",
  "slug",
  "summary",
  "description",
  "history",
  "latitude",
  "longitude",
  "google_maps_url",
  "opening_hours",
  "entrance_fee",
  "price_note",
  "facilities",
  "contact_name",
  "contact_phone",
  "thumbnail_path",
  "thumbnail_bucket",
  "is_featured",
  "display_order",
  "published_at",
].join(",");

const PUBLIC_DESTINATION_IMAGE_COLUMNS = [
  "id",
  "destination_id",
  "storage_bucket",
  "storage_path",
  "caption",
  "alt_text",
  "display_order",
  "is_primary",
].join(",");

type PublicDestinationListResult =
  | {
      kind: "ready";
      destinations: PublicDestination[];
      categories: PublicDestinationCategory[];
    }
  | { kind: "error" };

export type PublicDestinationDetailResult =
  | { kind: "ready"; destination: PublicDestination }
  | { kind: "not-found" | "error" };

function mapPublicDestination(
  row: PublishedDestinationRow,
  categories: ReadonlyMap<string, string>,
  images: Awaited<ReturnType<typeof signPublishedMedia>>,
): PublicDestination {
  const gallery = [...images].sort(
    (left, right) =>
      left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
  );

  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: categories.get(row.category_id) ?? "Tanpa kategori",
    name: row.name.trim(),
    slug: row.slug,
    summary: row.summary.trim(),
    description: row.description.trim(),
    history: row.history?.trim() || null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    googleMapsUrl: row.google_maps_url?.trim() || null,
    openingHours: row.opening_hours?.trim() || null,
    entranceFee: row.entrance_fee === null ? null : Number(row.entrance_fee),
    priceNote: row.price_note?.trim() || null,
    facilities: (row.facilities ?? [])
      .map((facility) => facility.trim())
      .filter(Boolean),
    contactName: row.contact_name?.trim() || null,
    contactPhone: row.contact_phone?.trim() || null,
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    primaryImage:
      gallery.find((image) => image.isPrimary) ?? gallery[0] ?? null,
    gallery,
  };
}

async function queryCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("destination_categories")
    .select("id,name,slug,display_order")
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<PublicDestinationCategory[], { merge: false }>();

  return error ? null : data;
}

async function queryImages(
  supabase: SupabaseClient,
  destinationIds: readonly string[],
) {
  if (destinationIds.length === 0) return [];

  const { data, error } = await supabase
    .from(PUBLISHED_DESTINATION_IMAGES_VIEW)
    .select(PUBLIC_DESTINATION_IMAGE_COLUMNS)
    .in("destination_id", [...destinationIds])
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<PublishedDestinationImageRow[], { merge: false }>();

  return error ? null : orderPublishedDestinationImages(data);
}

async function enrichDestinations(
  supabase: SupabaseClient,
  rows: PublishedDestinationRow[],
  categories: PublicDestinationCategory[],
) {
  const imageRows = await queryImages(
    supabase,
    rows.map((destination) => destination.id),
  );

  if (imageRows === null) return null;

  const mediaReferences: PublicMediaReference[] = imageRows.map((image) => ({
    id: image.id,
    entityType: "destination",
    parentId: image.destination_id,
    bucket: image.storage_bucket as "tourism-media",
    storagePath: image.storage_path,
    caption: image.caption,
    altText: image.alt_text,
    displayOrder: image.display_order,
    isPrimary: image.is_primary,
  }));
  const signedImages = await signPublishedMedia(supabase, mediaReferences);
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return rows.map((row) =>
    mapPublicDestination(
      row,
      categoryNames,
      signedImages.filter((image) => image.parentId === row.id),
    ),
  );
}

export async function getPublishedDestinations(): Promise<PublicDestinationListResult> {
  const supabase = await createClient();
  const [destinationResult, categories] = await Promise.all([
    supabase
      .from(PUBLISHED_DESTINATIONS_VIEW)
      .select(PUBLIC_DESTINATION_COLUMNS)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .overrideTypes<PublishedDestinationRow[], { merge: false }>(),
    queryCategories(supabase),
  ]);

  if (destinationResult.error || categories === null) {
    console.error("Daftar destinasi publik gagal dimuat.", {
      code: destinationResult.error?.code ?? "category-read-failed",
    });
    return { kind: "error" };
  }

  const destinations = await enrichDestinations(
    supabase,
    destinationResult.data,
    categories,
  );

  return destinations === null
    ? { kind: "error" }
    : { kind: "ready", destinations, categories };
}

export async function getPublishedDestinationBySlug(
  slug: string,
): Promise<PublicDestinationDetailResult> {
  if (!PUBLIC_DESTINATION_SLUG_PATTERN.test(slug)) {
    return { kind: "not-found" };
  }

  const supabase = await createClient();
  const [destinationResult, categories] = await Promise.all([
    supabase
      .from(PUBLISHED_DESTINATIONS_VIEW)
      .select(PUBLIC_DESTINATION_COLUMNS)
      .eq("slug", slug)
      .maybeSingle()
      .overrideTypes<PublishedDestinationRow | null, { merge: false }>(),
    queryCategories(supabase),
  ]);

  if (destinationResult.error || categories === null) {
    console.error("Detail destinasi publik gagal dimuat.", {
      code: destinationResult.error?.code ?? "category-read-failed",
    });
    return { kind: "error" };
  }

  if (!destinationResult.data) return { kind: "not-found" };

  const destinations = await enrichDestinations(
    supabase,
    [destinationResult.data],
    categories,
  );

  return destinations?.[0]
    ? { kind: "ready", destination: destinations[0] }
    : { kind: "error" };
}

export async function getPublishedDestinationMetadata(slug: string) {
  if (!PUBLIC_DESTINATION_SLUG_PATTERN.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLISHED_DESTINATIONS_VIEW)
    .select("name,summary")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<
      { name: string; summary: string } | null,
      { merge: false }
    >();

  if (error) return null;
  return data;
}
