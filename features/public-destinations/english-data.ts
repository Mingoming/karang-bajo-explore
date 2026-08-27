import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import { signPublishedMedia } from "@/features/public-media/server";
import type { PublicMediaReference } from "@/features/public-media/model";
import { createClient } from "@/lib/supabase/server";

import {
  classifyPublishedEnglishDestinationDetail,
  mapPublishedEnglishDestination,
  type EnglishDestinationCategoryRow,
  type PublishedEnglishDestinationImageRow,
  type PublishedEnglishDestinationRow,
  type PublicEnglishDestinationDetailResult,
  type PublicEnglishDestinationListResult,
} from "./english-model";
import { isPublicUuid } from "../public-content/validation.ts";
import { PUBLIC_DESTINATION_SLUG_PATTERN } from "./model";

export const PUBLISHED_ENGLISH_DESTINATIONS_VIEW =
  "published_english_destinations";
export const PUBLISHED_ENGLISH_DESTINATION_IMAGES_VIEW =
  "published_english_destination_images";

const PUBLIC_ENGLISH_DESTINATION_COLUMNS = [
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
  "thumbnail_bucket",
  "thumbnail_path",
  "is_featured",
  "display_order",
  "source_published_at",
  "english_published_at",
].join(",");

const PUBLIC_ENGLISH_DESTINATION_IMAGE_COLUMNS = [
  "id",
  "destination_id",
  "storage_bucket",
  "storage_path",
  "caption",
  "alt_text",
  "display_order",
  "is_primary",
].join(",");

async function queryEnglishDestinationCategories(
  supabase: SupabaseClient,
): Promise<EnglishDestinationCategoryRow[] | null> {
  // Architectural exception: destination_categories is a fixed public
  // taxonomy (alam, budaya, religi), not translated narrative content.
  // Its public SELECT grant is intentional; no source or translation fields
  // are read here.
  const { data, error } = await supabase
    .from("destination_categories")
    .select("id,slug,display_order")
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<EnglishDestinationCategoryRow[], { merge: false }>();

  return error || !Array.isArray(data) ? null : data;
}

async function queryEnglishDestinationImages(
  supabase: SupabaseClient,
  destinationIds: readonly string[],
) {
  if (destinationIds.length === 0) return [];

  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_DESTINATION_IMAGES_VIEW)
    .select(PUBLIC_ENGLISH_DESTINATION_IMAGE_COLUMNS)
    .in("destination_id", [...destinationIds])
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<PublishedEnglishDestinationImageRow[], { merge: false }>();

  return error || !Array.isArray(data) ? null : data;
}

async function enrichEnglishDestinations(
  supabase: SupabaseClient,
  rows: PublishedEnglishDestinationRow[],
  categories: EnglishDestinationCategoryRow[],
) {
  if (!Array.isArray(rows)) return null;
  const validRows = rows.filter(
    (row): row is PublishedEnglishDestinationRow =>
      typeof row === "object" && row !== null && typeof row.id === "string",
  );
  const imageRows = await queryEnglishDestinationImages(
    supabase,
    validRows.map((destination) => destination.id),
  );

  if (imageRows === null) return null;

  const mediaReferences: PublicMediaReference[] = imageRows.flatMap((image) => {
    if (
      !image ||
      typeof image !== "object" ||
      !isPublicUuid(image.id) ||
      !isPublicUuid(image.destination_id)
    ) {
      return [];
    }
    return [
      {
        id: image.id,
        entityType: "destination" as const,
        parentId: image.destination_id,
        bucket: image.storage_bucket as "tourism-media",
        storagePath: image.storage_path,
        caption: image.caption,
        altText: image.alt_text,
        displayOrder: image.display_order,
        isPrimary: image.is_primary,
      },
    ];
  });
  const signedImages = await signPublishedMedia(supabase, mediaReferences);
  const categorySlugs = new Map(
    categories
      .filter((category) => category && typeof category === "object")
      .map((category) => [category.id, category.slug]),
  );

  return validRows
    .map((row) =>
      mapPublishedEnglishDestination(
        row,
        categorySlugs.get(row.category_id) ?? null,
        signedImages.filter((image) => image.parentId === row.id),
      ),
    )
    .filter(
      (destination): destination is NonNullable<typeof destination> =>
        destination !== null && destination.primaryImage !== null,
    );
}

async function loadPublishedEnglishDestinations(
  limit?: number,
): Promise<PublicEnglishDestinationListResult> {
  const supabase = await createClient();
  let destinationQuery = supabase
    .from(PUBLISHED_ENGLISH_DESTINATIONS_VIEW)
    .select(PUBLIC_ENGLISH_DESTINATION_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true });
  if (limit !== undefined) destinationQuery = destinationQuery.limit(limit);

  const [destinationResult, categories] = await Promise.all([
    destinationQuery.overrideTypes<
      PublishedEnglishDestinationRow[],
      { merge: false }
    >(),
    queryEnglishDestinationCategories(supabase),
  ]);

  if (destinationResult.error || categories === null) {
    console.error("English destination list failed to load.", {
      code: destinationResult.error?.code ?? "category-read-failed",
    });
    return { kind: "error" };
  }

  const destinations = await enrichEnglishDestinations(
    supabase,
    destinationResult.data,
    categories,
  );

  return destinations === null
    ? { kind: "error" }
    : { kind: "ready", destinations };
}

export const getPublishedEnglishDestinations = cache(
  loadPublishedEnglishDestinations,
);

async function loadPublishedEnglishDestinationBySlug(
  slug: string,
): Promise<PublicEnglishDestinationDetailResult> {
  if (!PUBLIC_DESTINATION_SLUG_PATTERN.test(slug)) {
    return { kind: "not-found" };
  }

  const supabase = await createClient();
  const [destinationResult, categories] = await Promise.all([
    supabase
      .from(PUBLISHED_ENGLISH_DESTINATIONS_VIEW)
      .select(PUBLIC_ENGLISH_DESTINATION_COLUMNS)
      .eq("slug", slug)
      .maybeSingle()
      .overrideTypes<PublishedEnglishDestinationRow | null, { merge: false }>(),
    queryEnglishDestinationCategories(supabase),
  ]);

  if (destinationResult.error || categories === null) {
    console.error("English destination detail failed to load.", {
      code: destinationResult.error?.code ?? "category-read-failed",
    });
    return { kind: "error" };
  }

  if (!destinationResult.data) return { kind: "not-found" };
  if (typeof destinationResult.data !== "object") return { kind: "error" };

  const destinations = await enrichEnglishDestinations(
    supabase,
    [destinationResult.data],
    categories,
  );

  if (destinations === null) return { kind: "error" };
  return classifyPublishedEnglishDestinationDetail(destinations);
}

export const getPublishedEnglishDestinationBySlug = cache(
  loadPublishedEnglishDestinationBySlug,
);

async function loadPublishedEnglishDestinationMetadata(slug: string) {
  const result = await loadPublishedEnglishDestinationBySlug(slug);
  if (result.kind !== "ready") return null;

  return {
    name: result.destination.name,
    summary: result.destination.summary,
  };
}

export const getPublishedEnglishDestinationMetadata = cache(
  loadPublishedEnglishDestinationMetadata,
);
