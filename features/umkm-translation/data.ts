import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryUmkmById, type UmkmRecordResult } from "../umkm/data";
import {
  type UmkmTranslationRecord,
  type UmkmTranslationReviewEvent,
  type UmkmTranslationSource,
} from "./model";

export type UmkmTranslationAdminReadResult =
  | {
      success: true;
      source: UmkmTranslationSource;
      slug: string;
      translation: UmkmTranslationRecord | null;
      history: UmkmTranslationReviewEvent[];
    }
  | {
      success: false;
      kind: "not-found" | "read-error";
      source: null;
    };

function sourceFailureResult(
  sourceResult: UmkmRecordResult,
): UmkmTranslationAdminReadResult {
  if (!sourceResult.success)
    return { success: false, kind: "read-error", source: null };
  return sourceResult.umkm
    ? { success: false, kind: "read-error", source: null }
    : { success: false, kind: "not-found", source: null };
}

function toSource(
  source: NonNullable<Extract<UmkmRecordResult, { success: true }>["umkm"]>,
): UmkmTranslationSource {
  return {
    id: source.id,
    business_name: source.business_name,
    category: source.category,
    description: source.description,
    address: source.address,
    slug: source.slug,
    source_revision: source.source_revision,
    status: source.status,
    updated_at: source.updated_at,
  };
}

export async function queryUmkmTranslationAdminData(
  supabase: SupabaseClient,
  umkmId: string,
): Promise<UmkmTranslationAdminReadResult> {
  const [sourceResult, translationResult] = await Promise.all([
    queryUmkmById(supabase, umkmId),
    supabase
      .rpc("umkm_translation_admin_read", {
        p_umkm_id: umkmId,
      })
      .returns<UmkmTranslationRecord[]>(),
  ]);

  if (!sourceResult.success || !sourceResult.umkm) {
    return sourceFailureResult(sourceResult);
  }
  if (translationResult.error) {
    console.error("Pembacaan terjemahan umkm gagal.", {
      code: translationResult.error.code,
    });
    return { success: false, kind: "read-error", source: null };
  }

  const rows =
    (translationResult.data as unknown as UmkmTranslationRecord[] | null) ?? [];
  if (
    rows.length > 1 ||
    rows.some((row) => row.locale !== "en" || row.umkm_id !== umkmId)
  ) {
    console.error("Invariant singleton terjemahan umkm dilanggar.");
    return { success: false, kind: "read-error", source: null };
  }

  const translation = rows[0] ?? null;
  let history: UmkmTranslationReviewEvent[] = [];
  if (translation) {
    const historyResult = await supabase
      .rpc("umkm_translation_review_history", {
        p_translation_id: translation.id,
      })
      .returns<UmkmTranslationReviewEvent[]>();
    if (historyResult.error) {
      console.error("Riwayat review terjemahan umkm gagal.", {
        code: historyResult.error.code,
      });
      return { success: false, kind: "read-error", source: null };
    }
    history = (
      (historyResult.data as unknown as UmkmTranslationReviewEvent[] | null) ??
      []
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
    source: toSource(sourceResult.umkm),
    slug: sourceResult.umkm.slug,
    translation,
    history,
  };
}

export async function getUmkmTranslationAdminData(umkmId: string) {
  await requireAdministrator();
  return queryUmkmTranslationAdminData(await createClient(), umkmId);
}
