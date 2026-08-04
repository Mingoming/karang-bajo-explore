import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  queryVillageProfile,
  type VillageProfileReadResult,
} from "../village-profile/data";
import type { VillageProfileRecord } from "../village-profile/model";
import type { EnglishVillageProfileTranslationRecord } from "./model";

const ENGLISH_TRANSLATION_COLUMNS = [
  "id",
  "village_profile_id",
  "locale",
  "name",
  "summary",
  "description",
  "history",
  "vision",
  "mission",
  "address",
  "status",
  "source_updated_at_at_publish",
  "published_at",
  "updated_at",
].join(",");

export type AdministratorEnglishVillageProfileTranslationReadResult =
  | {
      success: true;
      sourceAvailable: true;
      source: VillageProfileRecord | null;
      translation: EnglishVillageProfileTranslationRecord | null;
    }
  | {
      success: false;
      sourceAvailable: false;
      source: null;
    }
  | {
      success: false;
      sourceAvailable: true;
      source: VillageProfileRecord | null;
    };

function sourceFailureResult(
  sourceResult: VillageProfileReadResult,
): AdministratorEnglishVillageProfileTranslationReadResult {
  if (!sourceResult.success) {
    return {
      success: false,
      sourceAvailable: false,
      source: null,
    };
  }

  return {
    success: false,
    sourceAvailable: true,
    source: sourceResult.profile,
  };
}

export async function queryAdministratorEnglishVillageProfileTranslation(
  supabase: SupabaseClient,
): Promise<AdministratorEnglishVillageProfileTranslationReadResult> {
  const sourceResult = await queryVillageProfile(supabase);

  if (!sourceResult.success) {
    return sourceFailureResult(sourceResult);
  }

  const source = sourceResult.profile;

  if (!source) {
    return {
      success: true,
      sourceAvailable: true,
      source: null,
      translation: null,
    };
  }

  const { data, error } = await supabase
    .from("village_profile_translations")
    .select(ENGLISH_TRANSLATION_COLUMNS)
    .eq("village_profile_id", source.id)
    .eq("locale", "en")
    .limit(2)
    .overrideTypes<
      EnglishVillageProfileTranslationRecord[],
      { merge: false }
    >();

  if (error) {
    console.error("Pembacaan terjemahan profil desa gagal.", {
      code: error.code,
    });

    return sourceFailureResult(sourceResult);
  }

  if (data.length > 1) {
    console.error("Invariant singleton terjemahan profil desa dilanggar.");
    return sourceFailureResult(sourceResult);
  }

  return {
    success: true,
    sourceAvailable: true,
    source,
    translation: data[0] ?? null,
  };
}

export async function getAdministratorEnglishVillageProfileTranslation() {
  await requireAdministrator();
  const supabase = await createClient();

  return queryAdministratorEnglishVillageProfileTranslation(supabase);
}
