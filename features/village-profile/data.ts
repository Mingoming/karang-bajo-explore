import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import type { VillageProfileRecord } from "./model";

const VILLAGE_PROFILE_COLUMNS = [
  "id",
  "name",
  "slug",
  "summary",
  "description",
  "history",
  "vision",
  "mission",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "status",
  "published_at",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
].join(",");

export type VillageProfileReadResult =
  { success: true; profile: VillageProfileRecord | null } | { success: false };

export async function queryVillageProfile(
  supabase: SupabaseClient,
): Promise<VillageProfileReadResult> {
  const { data, error } = await supabase
    .from("village_profiles")
    .select(VILLAGE_PROFILE_COLUMNS)
    .limit(2)
    .overrideTypes<VillageProfileRecord[], { merge: false }>();

  if (error) {
    console.error("Pembacaan profil desa gagal.", { code: error.code });
    return { success: false };
  }

  if (data.length > 1) {
    console.error("Invariant singleton profil desa dilanggar.");
    return { success: false };
  }

  return { success: true, profile: data[0] ?? null };
}

export async function getAdministratorVillageProfile() {
  await requireAdministrator();
  const supabase = await createClient();
  return queryVillageProfile(supabase);
}
