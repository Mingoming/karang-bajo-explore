import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryMediaImages } from "../media/data";
import { queryCulturalEventById } from "../cultural-events/data";
import type { CulturalEventStatus } from "../cultural-events/model";
import {
  type CulturalEventImageTranslationRecord,
  type CulturalEventImageTranslationReviewEvent,
  type CulturalEventImageTranslationSource,
  type CulturalEventImageTranslationSourceContext,
} from "./model";

export type CulturalEventImageTranslationAdminItem = {
  source: CulturalEventImageTranslationSource;
  sourceStatus: CulturalEventStatus;
  translation: CulturalEventImageTranslationRecord | null;
  history: CulturalEventImageTranslationReviewEvent[];
};

export type CulturalEventImageTranslationAdminReadResult =
  | {
      success: true;
      culturalEventId: string;
      slug: string;
      sourceContext: CulturalEventImageTranslationSourceContext;
      images: CulturalEventImageTranslationAdminItem[];
    }
  | { success: false; kind: "not-found" | "read-error" };

async function queryImageTranslationAdminItem(
  supabase: SupabaseClient,
  source: CulturalEventImageTranslationSource,
  sourceStatus: CulturalEventStatus,
): Promise<CulturalEventImageTranslationAdminItem | null> {
  const result = await supabase
    .rpc("cultural_event_image_translation_admin_read", {
      p_cultural_event_image_id: source.id,
    })
    .returns<CulturalEventImageTranslationRecord[]>();
  if (result.error) {
    console.error("Pembacaan terjemahan gambar acara budaya gagal.", {
      code: result.error.code,
    });
    return null;
  }
  const rows =
    (result.data as unknown as CulturalEventImageTranslationRecord[] | null) ??
    [];
  if (
    rows.length > 1 ||
    rows.some(
      (row) => row.locale !== "en" || row.cultural_event_image_id !== source.id,
    )
  ) {
    console.error(
      "Invariant singleton terjemahan gambar acara budaya dilanggar.",
    );
    return null;
  }
  const translation = rows[0] ?? null;
  let history: CulturalEventImageTranslationReviewEvent[] = [];
  if (translation) {
    const historyResult = await supabase
      .rpc("cultural_event_image_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<CulturalEventImageTranslationReviewEvent[]>();
    if (historyResult.error) {
      console.error("Riwayat review gambar acara budaya gagal.", {
        code: historyResult.error.code,
      });
      return null;
    }
    history =
      (historyResult.data as unknown as
        CulturalEventImageTranslationReviewEvent[] | null) ?? [];
  }
  return { source, sourceStatus, translation, history };
}

export async function queryCulturalEventImageTranslationAdminData(
  supabase: SupabaseClient,
  culturalEventId: string,
): Promise<CulturalEventImageTranslationAdminReadResult> {
  const sourceResult = await queryCulturalEventById(supabase, culturalEventId);
  if (!sourceResult.success) return { success: false, kind: "read-error" };
  if (!sourceResult.event) return { success: false, kind: "not-found" };
  const event = sourceResult.event;

  const images = await queryMediaImages(
    supabase,
    "cultural-event",
    culturalEventId,
  );
  if (!images) return { success: false, kind: "read-error" };

  const items = await Promise.all(
    images.map((image) =>
      queryImageTranslationAdminItem(
        supabase,
        {
          id: image.id,
          parentId: image.parentId,
          altText: image.altText,
          caption: image.caption,
          displayOrder: image.displayOrder,
          isPrimary: image.isPrimary,
          previewUrl: image.previewUrl,
        },
        event.status,
      ),
    ),
  );
  if (items.some((item) => item === null)) {
    return { success: false, kind: "read-error" };
  }
  return {
    success: true,
    culturalEventId,
    slug: event.slug,
    sourceContext: {
      slug: event.slug,
      updatedAt: event.updated_at,
    },
    images: items.filter(
      (item): item is CulturalEventImageTranslationAdminItem => item !== null,
    ),
  };
}

export async function getCulturalEventImageTranslationAdminData(
  culturalEventId: string,
) {
  await requireAdministrator();
  return queryCulturalEventImageTranslationAdminData(
    await createClient(),
    culturalEventId,
  );
}
