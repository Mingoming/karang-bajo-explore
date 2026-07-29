import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  isValidTraditionalHouseId,
  type TraditionalHouseListItem,
  type TraditionalHouseRecord,
  type TraditionalHouseStatus,
} from "./model";

const EDIT_COLUMNS = [
  "id",
  "name",
  "slug",
  "summary",
  "description",
  "history",
  "cultural_significance",
  "location_name",
  "latitude",
  "longitude",
  "google_maps_url",
  "visitor_information",
  "thumbnail_path",
  "thumbnail_bucket",
  "status",
  "published_at",
  "is_featured",
  "display_order",
  "created_at",
  "updated_at",
].join(",");

type ListRow = {
  id: string;
  name: string;
  status: TraditionalHouseStatus;
  location_name: string | null;
  is_featured: boolean;
  display_order: number;
  updated_at: string;
};

export type TraditionalHouseListResult =
  { success: true; houses: TraditionalHouseListItem[] } | { success: false };
export type TraditionalHouseRecordResult =
  { success: true; house: TraditionalHouseRecord | null } | { success: false };
export type TraditionalHouseEditorResult =
  | { kind: "ready"; house: TraditionalHouseRecord }
  | { kind: "invalid-id" | "not-found" | "read-error" };

export async function queryTraditionalHouseById(
  supabase: SupabaseClient,
  id: string,
): Promise<TraditionalHouseRecordResult> {
  if (!isValidTraditionalHouseId(id)) {
    return { success: true, house: null };
  }
  const { data, error } = await supabase
    .from("traditional_houses")
    .select(EDIT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<TraditionalHouseRecord | null, { merge: false }>();
  if (error) {
    console.error("Pembacaan rumah adat gagal.", { code: error.code });
    return { success: false };
  }
  return { success: true, house: data };
}

export async function queryAdministratorTraditionalHouses(
  supabase: SupabaseClient,
): Promise<TraditionalHouseListResult> {
  const { data, error } = await supabase
    .from("traditional_houses")
    .select("id,name,status,location_name,is_featured,display_order,updated_at")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<ListRow[], { merge: false }>();
  if (error) {
    console.error("Pembacaan daftar rumah adat gagal.", { code: error.code });
    return { success: false };
  }
  return {
    success: true,
    houses: data.map((house) => ({
      id: house.id,
      name: house.name,
      status: house.status,
      locationName: house.location_name,
      isFeatured: house.is_featured,
      displayOrder: house.display_order,
      updatedAt: house.updated_at,
    })),
  };
}

export async function getAdministratorTraditionalHouseList() {
  await requireAdministrator();
  return queryAdministratorTraditionalHouses(await createClient());
}

export async function getTraditionalHouseEditorData(
  id: string,
): Promise<TraditionalHouseEditorResult> {
  await requireAdministrator();
  if (!isValidTraditionalHouseId(id)) return { kind: "invalid-id" };
  const result = await queryTraditionalHouseById(await createClient(), id);
  if (!result.success) return { kind: "read-error" };
  if (!result.house) return { kind: "not-found" };
  return { kind: "ready", house: result.house };
}
