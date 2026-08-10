import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryMediaImages } from "../media/data";
import { queryTraditionalHouseById } from "../traditional-houses/data";
import {
  type TraditionalHouseImageTranslationRecord,
  type TraditionalHouseImageTranslationReviewEvent,
  type TraditionalHouseImageTranslationSource,
} from "./model";
import type { TraditionalHouseStatus } from "../traditional-houses/model";

export type TraditionalHouseImageTranslationAdminItem = {
  source: TraditionalHouseImageTranslationSource;
  sourceStatus: TraditionalHouseStatus;
  translation: TraditionalHouseImageTranslationRecord | null;
  history: TraditionalHouseImageTranslationReviewEvent[];
};

export type TraditionalHouseImageTranslationAdminReadResult =
  | {
      success: true;
      traditionalHouseId: string;
      slug: string;
      images: TraditionalHouseImageTranslationAdminItem[];
    }
  | { success: false; kind: "not-found" | "read-error" };

async function queryImageTranslationAdminItem(
  supabase: SupabaseClient,
  source: TraditionalHouseImageTranslationSource,
  sourceStatus: TraditionalHouseStatus,
): Promise<TraditionalHouseImageTranslationAdminItem | null> {
  const result = await supabase
    .rpc("traditional_house_image_translation_admin_read", {
      p_traditional_house_image_id: source.id,
    })
    .returns<TraditionalHouseImageTranslationRecord[]>();
  if (result.error) {
    console.error("Pembacaan terjemahan gambar rumah adat gagal.", {
      code: result.error.code,
    });
    return null;
  }
  const rows =
    (result.data as unknown as
      TraditionalHouseImageTranslationRecord[] | null) ?? [];
  if (
    rows.length > 1 ||
    rows.some(
      (row) =>
        row.locale !== "en" || row.traditional_house_image_id !== source.id,
    )
  ) {
    console.error(
      "Invariant singleton terjemahan gambar rumah adat dilanggar.",
    );
    return null;
  }
  const translation = rows[0] ?? null;
  let history: TraditionalHouseImageTranslationReviewEvent[] = [];
  if (translation) {
    const historyResult = await supabase
      .rpc("traditional_house_image_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<TraditionalHouseImageTranslationReviewEvent[]>();
    if (historyResult.error) {
      console.error("Riwayat review gambar rumah adat gagal.", {
        code: historyResult.error.code,
      });
      return null;
    }
    history = (
      (historyResult.data as unknown as
        TraditionalHouseImageTranslationReviewEvent[] | null) ?? []
    ).map((event) => ({
      id: event.id,
      event_type: event.event_type,
      previous_translation_status: event.previous_translation_status,
      new_translation_status: event.new_translation_status,
      previous_review_state: event.previous_review_state,
      new_review_state: event.new_review_state,
      occurred_at: event.occurred_at,
      reason: event.reason,
    }));
  }
  return { source, sourceStatus, translation, history };
}

export async function queryTraditionalHouseImageTranslationAdminData(
  supabase: SupabaseClient,
  traditionalHouseId: string,
): Promise<TraditionalHouseImageTranslationAdminReadResult> {
  const sourceResult = await queryTraditionalHouseById(
    supabase,
    traditionalHouseId,
  );
  if (!sourceResult.success) return { success: false, kind: "read-error" };
  if (!sourceResult.house) return { success: false, kind: "not-found" };
  const sourceHouse = sourceResult.house;

  const images = await queryMediaImages(
    supabase,
    "traditional-house",
    traditionalHouseId,
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
        sourceHouse.status,
      ),
    ),
  );
  if (items.some((item) => item === null))
    return { success: false, kind: "read-error" };

  return {
    success: true,
    traditionalHouseId,
    slug: sourceHouse.slug,
    images: items.filter(
      (item): item is TraditionalHouseImageTranslationAdminItem =>
        item !== null,
    ),
  };
}

export async function getTraditionalHouseImageTranslationAdminData(
  traditionalHouseId: string,
) {
  await requireAdministrator();
  return queryTraditionalHouseImageTranslationAdminData(
    await createClient(),
    traditionalHouseId,
  );
}
