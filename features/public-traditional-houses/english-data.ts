import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import type { PublicMediaReference } from "@/features/public-media/model";
import { signPublishedMedia } from "@/features/public-media/server";
import { createClient } from "@/lib/supabase/server";

import {
  classifyPublishedEnglishTraditionalHouseDetail,
  mapPublishedEnglishTraditionalHouse,
  PUBLIC_TRADITIONAL_HOUSE_SLUG_PATTERN,
  type PublishedEnglishTraditionalHouseImageRow,
  type PublishedEnglishTraditionalHouseRow,
  type PublicEnglishTraditionalHouseDetailResult,
  type PublicEnglishTraditionalHouseListResult,
} from "./english-model";
import { isPublicUuid } from "../public-content/validation.ts";

export const PUBLISHED_ENGLISH_TRADITIONAL_HOUSES_VIEW =
  "published_english_traditional_houses";
export const PUBLISHED_ENGLISH_TRADITIONAL_HOUSE_IMAGES_VIEW =
  "published_english_traditional_house_images";

const PUBLIC_ENGLISH_TRADITIONAL_HOUSE_COLUMNS = [
  "id",
  "translation_id",
  "slug",
  "name",
  "summary",
  "description",
  "history",
  "cultural_significance",
  "location_name",
  "visitor_information",
  "latitude",
  "longitude",
  "google_maps_url",
  "thumbnail_bucket",
  "thumbnail_path",
  "is_featured",
  "display_order",
  "published_at",
  "translation_published_at",
].join(",");

const PUBLIC_ENGLISH_TRADITIONAL_HOUSE_IMAGE_COLUMNS = [
  "id",
  "traditional_house_id",
  "translation_id",
  "storage_bucket",
  "storage_path",
  "alt_text",
  "caption",
  "display_order",
  "is_primary",
].join(",");

async function queryEnglishTraditionalHouseImages(
  supabase: SupabaseClient,
  traditionalHouseIds: readonly string[],
) {
  if (traditionalHouseIds.length === 0) return [];

  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_TRADITIONAL_HOUSE_IMAGES_VIEW)
    .select(PUBLIC_ENGLISH_TRADITIONAL_HOUSE_IMAGE_COLUMNS)
    .in("traditional_house_id", [...traditionalHouseIds])
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<
      PublishedEnglishTraditionalHouseImageRow[],
      { merge: false }
    >();

  return error || !Array.isArray(data) ? null : data;
}

async function enrichEnglishTraditionalHouses(
  supabase: SupabaseClient,
  rows: PublishedEnglishTraditionalHouseRow[],
) {
  if (!Array.isArray(rows)) return null;
  const validRows = rows.filter(
    (row): row is PublishedEnglishTraditionalHouseRow =>
      typeof row === "object" && row !== null && typeof row.id === "string",
  );
  const imageRows = await queryEnglishTraditionalHouseImages(
    supabase,
    validRows.map((house) => house.id),
  );

  if (imageRows === null) return null;

  const references: PublicMediaReference[] = imageRows.flatMap((image) => {
    if (
      !image ||
      typeof image !== "object" ||
      !isPublicUuid(image.id) ||
      !isPublicUuid(image.traditional_house_id) ||
      !isPublicUuid(image.translation_id)
    ) {
      return [];
    }

    return [
      {
        id: image.id,
        entityType: "traditional-house" as const,
        parentId: image.traditional_house_id,
        bucket: image.storage_bucket as "tourism-media",
        storagePath: image.storage_path,
        caption: image.caption,
        altText: image.alt_text,
        displayOrder: image.display_order,
        isPrimary: image.is_primary,
      },
    ];
  });
  const signedImages = await signPublishedMedia(supabase, references);

  return validRows
    .map((row) =>
      mapPublishedEnglishTraditionalHouse(
        row,
        signedImages.filter((image) => image.parentId === row.id),
      ),
    )
    .filter(
      (house): house is NonNullable<typeof house> =>
        house !== null && house.primaryImage !== null,
    );
}

async function loadPublishedEnglishTraditionalHouses(
  limit?: number,
): Promise<PublicEnglishTraditionalHouseListResult> {
  const supabase = await createClient();
  let query = supabase
    .from(PUBLISHED_ENGLISH_TRADITIONAL_HOUSES_VIEW)
    .select(PUBLIC_ENGLISH_TRADITIONAL_HOUSE_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true });
  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query.overrideTypes<
    PublishedEnglishTraditionalHouseRow[],
    { merge: false }
  >();

  if (error) {
    console.error("English traditional house list failed to load.", {
      code: error.code,
    });
    return { kind: "error" };
  }

  const houses = await enrichEnglishTraditionalHouses(supabase, data);
  return houses === null ? { kind: "error" } : { kind: "ready", houses };
}

export const getPublishedEnglishTraditionalHouses = cache(
  loadPublishedEnglishTraditionalHouses,
);

async function loadPublishedEnglishTraditionalHouseBySlug(
  slug: string,
): Promise<PublicEnglishTraditionalHouseDetailResult> {
  if (!PUBLIC_TRADITIONAL_HOUSE_SLUG_PATTERN.test(slug)) {
    return { kind: "not-found" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_TRADITIONAL_HOUSES_VIEW)
    .select(PUBLIC_ENGLISH_TRADITIONAL_HOUSE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<
      PublishedEnglishTraditionalHouseRow | null,
      { merge: false }
    >();

  if (error) {
    console.error("English traditional house detail failed to load.", {
      code: error.code,
    });
    return { kind: "error" };
  }

  if (!data) return { kind: "not-found" };
  if (typeof data !== "object") return { kind: "error" };

  const houses = await enrichEnglishTraditionalHouses(supabase, [data]);
  if (houses === null) return { kind: "error" };
  return classifyPublishedEnglishTraditionalHouseDetail(houses);
}

export const getPublishedEnglishTraditionalHouseBySlug = cache(
  loadPublishedEnglishTraditionalHouseBySlug,
);

async function loadPublishedEnglishTraditionalHouseMetadata(slug: string) {
  const result = await loadPublishedEnglishTraditionalHouseBySlug(slug);
  if (result.kind !== "ready") return null;

  return {
    name: result.house.name,
    summary: result.house.summary || result.house.description,
  };
}

export const getPublishedEnglishTraditionalHouseMetadata = cache(
  loadPublishedEnglishTraditionalHouseMetadata,
);
