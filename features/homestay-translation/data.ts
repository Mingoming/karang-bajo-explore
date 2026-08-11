import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  queryHomestayById,
  type HomestayRecordResult,
} from "../homestays/data";
import {
  type HomestayTranslationRecord,
  type HomestayTranslationReviewEvent,
  type HomestayTranslationSource,
} from "./model";

export type HomestayTranslationAdminReadResult =
  | {
      success: true;
      source: HomestayTranslationSource;
      slug: string;
      translation: HomestayTranslationRecord | null;
      history: HomestayTranslationReviewEvent[];
    }
  | {
      success: false;
      kind: "not-found" | "read-error";
      source: null;
    };

function sourceFailureResult(
  sourceResult: HomestayRecordResult,
): HomestayTranslationAdminReadResult {
  if (!sourceResult.success)
    return { success: false, kind: "read-error", source: null };
  return sourceResult.homestay
    ? { success: false, kind: "read-error", source: null }
    : { success: false, kind: "not-found", source: null };
}

function toSource(
  source: NonNullable<
    Extract<HomestayRecordResult, { success: true }>["homestay"]
  >,
): HomestayTranslationSource {
  return {
    id: source.id,
    name: source.name,
    description: source.description,
    address: source.address,
    price_note: source.price_note,
    facilities: source.facilities,
    slug: source.slug,
    source_revision: source.source_revision,
    status: source.status,
    updated_at: source.updated_at,
  };
}

export async function queryHomestayTranslationAdminData(
  supabase: SupabaseClient,
  homestayId: string,
): Promise<HomestayTranslationAdminReadResult> {
  const [sourceResult, translationResult] = await Promise.all([
    queryHomestayById(supabase, homestayId),
    supabase
      .rpc("homestay_translation_admin_read", {
        p_homestay_id: homestayId,
      })
      .returns<HomestayTranslationRecord[]>(),
  ]);

  if (!sourceResult.success || !sourceResult.homestay) {
    return sourceFailureResult(sourceResult);
  }
  if (translationResult.error) {
    console.error("Pembacaan terjemahan homestay gagal.", {
      code: translationResult.error.code,
    });
    return { success: false, kind: "read-error", source: null };
  }

  const rows =
    (translationResult.data as unknown as HomestayTranslationRecord[] | null) ??
    [];
  if (
    rows.length > 1 ||
    rows.some((row) => row.locale !== "en" || row.homestay_id !== homestayId)
  ) {
    console.error("Invariant singleton terjemahan homestay dilanggar.");
    return { success: false, kind: "read-error", source: null };
  }

  const translation = rows[0] ?? null;
  let history: HomestayTranslationReviewEvent[] = [];
  if (translation) {
    const historyResult = await supabase
      .rpc("homestay_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<HomestayTranslationReviewEvent[]>();
    if (historyResult.error) {
      console.error("Riwayat review terjemahan homestay gagal.", {
        code: historyResult.error.code,
      });
      return { success: false, kind: "read-error", source: null };
    }
    history = (
      (historyResult.data as unknown as
        HomestayTranslationReviewEvent[] | null) ?? []
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
    source: toSource(sourceResult.homestay),
    slug: sourceResult.homestay.slug,
    translation,
    history,
  };
}

export async function getHomestayTranslationAdminData(homestayId: string) {
  await requireAdministrator();
  return queryHomestayTranslationAdminData(await createClient(), homestayId);
}
