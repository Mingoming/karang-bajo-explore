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

  return error ? null : data;
}

async function enrichEnglishTraditionalHouses(
  supabase: SupabaseClient,
  rows: PublishedEnglishTraditionalHouseRow[],
) {
  const imageRows = await queryEnglishTraditionalHouseImages(
    supabase,
    rows.map((house) => house.id),
  );

  if (imageRows === null) return null;

  const references: PublicMediaReference[] = imageRows.map((image) => ({
    id: image.id,
    entityType: "traditional-house",
    parentId: image.traditional_house_id,
    bucket: image.storage_bucket as "tourism-media",
    storagePath: image.storage_path,
    caption: image.caption,
    altText: image.alt_text,
    displayOrder: image.display_order,
    isPrimary: image.is_primary,
  }));
  const signedImages = await signPublishedMedia(supabase, references);

  return rows
    .map((row) =>
      mapPublishedEnglishTraditionalHouse(
        row,
        signedImages.filter((image) => image.parentId === row.id),
      ),
    )
    .filter((house) => house.primaryImage !== null);
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

  const houses = await enrichEnglishTraditionalHouses(supabase, [data]);
  if (houses === null) return { kind: "error" };
  return classifyPublishedEnglishTraditionalHouseDetail(houses);
}

export const getPublishedEnglishTraditionalHouseBySlug = cache(
  loadPublishedEnglishTraditionalHouseBySlug,
);

async function loadPublishedEnglishTraditionalHouseMetadata(slug: string) {
  if (!PUBLIC_TRADITIONAL_HOUSE_SLUG_PATTERN.test(slug)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_TRADITIONAL_HOUSES_VIEW)
    .select("name,summary")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<
      { name: string; summary: string } | null,
      { merge: false }
    >();

  if (error || !data) return null;

  return {
    name: data.name.trim(),
    summary: data.summary.trim(),
  };
}

export const getPublishedEnglishTraditionalHouseMetadata = cache(
  loadPublishedEnglishTraditionalHouseMetadata,
);
