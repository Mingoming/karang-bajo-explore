import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import type { PublicMediaReference } from "@/features/public-media/model";
import { signPublishedMedia } from "@/features/public-media/server";
import { createClient } from "@/lib/supabase/server";

import {
  classifyPublishedEnglishCulturalEventDetail,
  mapPublishedEnglishCulturalEvent,
  PUBLIC_CULTURAL_EVENT_SLUG_PATTERN,
  type PublishedEnglishCulturalEventImageRow,
  type PublishedEnglishCulturalEventRow,
  type PublicEnglishCulturalEvent,
  type PublicEnglishCulturalEventDetailResult,
  type PublicEnglishCulturalEventListResult,
} from "./english-model";
import { isPublicUuid } from "../public-content/validation.ts";

export const PUBLISHED_ENGLISH_CULTURAL_EVENTS_VIEW =
  "published_english_cultural_events";
export const PUBLISHED_ENGLISH_CULTURAL_EVENT_IMAGES_VIEW =
  "published_english_cultural_event_images";

const PUBLIC_ENGLISH_CULTURAL_EVENT_COLUMNS = [
  "id",
  "translation_id",
  "slug",
  "title",
  "summary",
  "description",
  "event_type",
  "start_at",
  "end_at",
  "all_day",
  "date_note",
  "location_name",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "organizer",
  "contact_phone",
  "visitor_information",
  "thumbnail_bucket",
  "thumbnail_path",
  "is_featured",
  "published_at",
  "translation_published_at",
].join(",");

const PUBLIC_ENGLISH_CULTURAL_EVENT_IMAGE_COLUMNS = [
  "id",
  "cultural_event_id",
  "translation_id",
  "storage_bucket",
  "storage_path",
  "alt_text",
  "caption",
  "display_order",
  "is_primary",
].join(",");

async function queryEnglishCulturalEventImages(
  supabase: SupabaseClient,
  culturalEventIds: readonly string[],
) {
  if (culturalEventIds.length === 0) return [];

  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_CULTURAL_EVENT_IMAGES_VIEW)
    .select(PUBLIC_ENGLISH_CULTURAL_EVENT_IMAGE_COLUMNS)
    .in("cultural_event_id", [...culturalEventIds])
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<PublishedEnglishCulturalEventImageRow[], { merge: false }>();

  return error || !Array.isArray(data) ? null : data;
}

async function enrichEnglishCulturalEvents(
  supabase: SupabaseClient,
  rows: PublishedEnglishCulturalEventRow[],
) {
  if (!Array.isArray(rows)) return null;
  const validRows = rows.filter(
    (row): row is PublishedEnglishCulturalEventRow =>
      typeof row === "object" && row !== null && typeof row.id === "string",
  );
  const imageRows = await queryEnglishCulturalEventImages(
    supabase,
    validRows.map((event) => event.id),
  );

  if (imageRows === null) return null;

  const references: PublicMediaReference[] = imageRows.flatMap((image) => {
    if (
      !image ||
      typeof image !== "object" ||
      !isPublicUuid(image.id) ||
      !isPublicUuid(image.cultural_event_id) ||
      !isPublicUuid(image.translation_id)
    ) {
      return [];
    }
    return [
      {
        id: image.id,
        entityType: "cultural-event" as const,
        parentId: image.cultural_event_id,
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
      mapPublishedEnglishCulturalEvent(
        row,
        signedImages.filter((image) => image.parentId === row.id),
      ),
    )
    .filter(
      (event): event is PublicEnglishCulturalEvent =>
        event !== null && event.primaryImage !== null,
    );
}

async function loadPublishedEnglishCulturalEvents(
  limit?: number,
): Promise<PublicEnglishCulturalEventListResult> {
  const supabase = await createClient();
  let query = supabase
    .from(PUBLISHED_ENGLISH_CULTURAL_EVENTS_VIEW)
    .select(PUBLIC_ENGLISH_CULTURAL_EVENT_COLUMNS)
    .order("start_at", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .order("id", { ascending: true });
  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query.overrideTypes<
    PublishedEnglishCulturalEventRow[],
    { merge: false }
  >();

  if (error) {
    console.error("English cultural event list failed to load.", {
      code: error.code,
    });
    return { kind: "error" };
  }

  const events = await enrichEnglishCulturalEvents(supabase, data);
  return events === null ? { kind: "error" } : { kind: "ready", events };
}

export const getPublishedEnglishCulturalEvents = cache(
  loadPublishedEnglishCulturalEvents,
);

async function loadPublishedEnglishCulturalEventBySlug(
  slug: string,
): Promise<PublicEnglishCulturalEventDetailResult> {
  if (!PUBLIC_CULTURAL_EVENT_SLUG_PATTERN.test(slug)) {
    return { kind: "not-found" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_CULTURAL_EVENTS_VIEW)
    .select(PUBLIC_ENGLISH_CULTURAL_EVENT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<PublishedEnglishCulturalEventRow | null, { merge: false }>();

  if (error) {
    console.error("English cultural event detail failed to load.", {
      code: error.code,
    });
    return { kind: "error" };
  }

  if (!data) return { kind: "not-found" };
  if (typeof data !== "object") return { kind: "error" };

  const events = await enrichEnglishCulturalEvents(supabase, [data]);
  if (events === null) return { kind: "error" };
  return classifyPublishedEnglishCulturalEventDetail(events);
}

export const getPublishedEnglishCulturalEventBySlug = cache(
  loadPublishedEnglishCulturalEventBySlug,
);

async function loadPublishedEnglishCulturalEventMetadata(slug: string) {
  const result = await loadPublishedEnglishCulturalEventBySlug(slug);
  if (result.kind !== "ready") return null;

  return {
    title: result.event.title,
    description: result.event.summary || result.event.description,
  };
}

export const getPublishedEnglishCulturalEventMetadata = cache(
  loadPublishedEnglishCulturalEventMetadata,
);
