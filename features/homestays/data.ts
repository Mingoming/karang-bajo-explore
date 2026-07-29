import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  isValidHomestayId,
  type HomestayListItem,
  type HomestayRecord,
  type HomestayStatus,
} from "./model";

const HOMESTAY_EDIT_COLUMNS = [
  "id",
  "name",
  "slug",
  "owner_name",
  "phone",
  "contact_consent_confirmed",
  "description",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "price_per_night",
  "price_note",
  "facilities",
  "thumbnail_path",
  "thumbnail_bucket",
  "status",
  "published_at",
  "is_featured",
  "display_order",
  "created_at",
  "updated_at",
].join(",");

type HomestayListDatabaseRow = {
  id: string;
  name: string;
  status: HomestayStatus;
  price_per_night: number | null;
  address: string | null;
  display_order: number;
  updated_at: string;
};

export type HomestayListResult =
  { success: true; homestays: HomestayListItem[] } | { success: false };

export type HomestayRecordResult =
  { success: true; homestay: HomestayRecord | null } | { success: false };

export type HomestayEditorResult =
  | { kind: "ready"; homestay: HomestayRecord }
  | { kind: "invalid-id" | "not-found" | "read-error" };

export async function queryHomestayById(
  supabase: SupabaseClient,
  id: string,
): Promise<HomestayRecordResult> {
  if (!isValidHomestayId(id)) {
    return { success: true, homestay: null };
  }

  const { data, error } = await supabase
    .from("homestays")
    .select(HOMESTAY_EDIT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<HomestayRecord | null, { merge: false }>();

  if (error) {
    console.error("Pembacaan homestay gagal.", { code: error.code });
    return { success: false };
  }

  return { success: true, homestay: data };
}

export async function queryAdministratorHomestays(
  supabase: SupabaseClient,
): Promise<HomestayListResult> {
  const { data, error } = await supabase
    .from("homestays")
    .select("id,name,status,price_per_night,address,display_order,updated_at")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<HomestayListDatabaseRow[], { merge: false }>();

  if (error) {
    console.error("Pembacaan daftar homestay gagal.", { code: error.code });
    return { success: false };
  }

  return {
    success: true,
    homestays: data.map((homestay) => ({
      id: homestay.id,
      name: homestay.name,
      status: homestay.status,
      pricePerNight: homestay.price_per_night,
      address: homestay.address,
      displayOrder: homestay.display_order,
      updatedAt: homestay.updated_at,
    })),
  };
}

export async function getAdministratorHomestayList() {
  await requireAdministrator();
  const supabase = await createClient();
  return queryAdministratorHomestays(supabase);
}

export async function getHomestayEditorData(
  id: string,
): Promise<HomestayEditorResult> {
  await requireAdministrator();

  if (!isValidHomestayId(id)) {
    return { kind: "invalid-id" };
  }

  const supabase = await createClient();
  const result = await queryHomestayById(supabase, id);

  if (!result.success) {
    return { kind: "read-error" };
  }

  if (!result.homestay) {
    return { kind: "not-found" };
  }

  return { kind: "ready", homestay: result.homestay };
}
