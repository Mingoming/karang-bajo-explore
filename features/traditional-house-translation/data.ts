import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  queryTraditionalHouseById,
  type TraditionalHouseRecordResult,
} from "../traditional-houses/data";
import {
  type TraditionalHouseTranslationRecord,
  type TraditionalHouseTranslationReviewEvent,
  type TraditionalHouseTranslationSource,
} from "./model";

export type TraditionalHouseTranslationAdminReadResult =
  | {
      success: true;
      source: TraditionalHouseTranslationSource;
      slug: string;
      translation: TraditionalHouseTranslationRecord | null;
      history: TraditionalHouseTranslationReviewEvent[];
    }
  | {
      success: false;
      kind: "not-found" | "read-error";
      source: null;
    };

function sourceFailureResult(
  sourceResult: TraditionalHouseRecordResult,
): TraditionalHouseTranslationAdminReadResult {
  if (!sourceResult.success)
    return { success: false, kind: "read-error", source: null };
  return sourceResult.house
    ? { success: false, kind: "read-error", source: null }
    : { success: false, kind: "not-found", source: null };
}

function toSource(
  source: NonNullable<
    Extract<TraditionalHouseRecordResult, { success: true }>["house"]
  >,
): TraditionalHouseTranslationSource {
  return {
    id: source.id,
    name: source.name,
    summary: source.summary,
    description: source.description,
    history: source.history,
    cultural_significance: source.cultural_significance,
    location_name: source.location_name,
    visitor_information: source.visitor_information,
    slug: source.slug,
    source_revision: source.source_revision,
    status: source.status,
    updated_at: source.updated_at,
  };
}

export async function queryTraditionalHouseTranslationAdminData(
  supabase: SupabaseClient,
  traditionalHouseId: string,
): Promise<TraditionalHouseTranslationAdminReadResult> {
  const [sourceResult, translationResult] = await Promise.all([
    queryTraditionalHouseById(supabase, traditionalHouseId),
    supabase
      .rpc("traditional_house_translation_admin_read", {
        p_traditional_house_id: traditionalHouseId,
      })
      .returns<TraditionalHouseTranslationRecord[]>(),
  ]);

  if (!sourceResult.success || !sourceResult.house) {
    return sourceFailureResult(sourceResult);
  }
  if (translationResult.error) {
    console.error("Pembacaan terjemahan rumah adat gagal.", {
      code: translationResult.error.code,
    });
    return { success: false, kind: "read-error", source: null };
  }

  const rows =
    (translationResult.data as unknown as
      TraditionalHouseTranslationRecord[] | null) ?? [];
  if (
    rows.length > 1 ||
    rows.some(
      (row) =>
        row.locale !== "en" || row.traditional_house_id !== traditionalHouseId,
    )
  ) {
    console.error("Invariant singleton terjemahan rumah adat dilanggar.");
    return { success: false, kind: "read-error", source: null };
  }

  const translation = rows[0] ?? null;
  let history: TraditionalHouseTranslationReviewEvent[] = [];
  if (translation) {
    const historyResult = await supabase
      .rpc("traditional_house_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<TraditionalHouseTranslationReviewEvent[]>();
    if (historyResult.error) {
      console.error("Riwayat review terjemahan rumah adat gagal.", {
        code: historyResult.error.code,
      });
      return { success: false, kind: "read-error", source: null };
    }
    history = (
      (historyResult.data as unknown as
        TraditionalHouseTranslationReviewEvent[] | null) ?? []
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

  return {
    success: true,
    source: toSource(sourceResult.house),
    slug: sourceResult.house.slug,
    translation,
    history,
  };
}

export async function getTraditionalHouseTranslationAdminData(
  traditionalHouseId: string,
) {
  await requireAdministrator();
  return queryTraditionalHouseTranslationAdminData(
    await createClient(),
    traditionalHouseId,
  );
}
