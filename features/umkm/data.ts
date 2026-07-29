import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  isValidUmkmId,
  type UmkmListItem,
  type UmkmRecord,
  type UmkmStatus,
} from "./model";

const UMKM_EDIT_COLUMNS = [
  "id",
  "business_name",
  "slug",
  "owner_name",
  "category",
  "description",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "contact_name",
  "contact_phone",
  "contact_whatsapp",
  "contact_consent_confirmed",
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
  business_name: string;
  category: string;
  status: UmkmStatus;
  address: string | null;
  display_order: number;
  updated_at: string;
};

export type UmkmListResult =
  { success: true; umkms: UmkmListItem[] } | { success: false };
export type UmkmRecordResult =
  { success: true; umkm: UmkmRecord | null } | { success: false };
export type UmkmEditorResult =
  | { kind: "ready"; umkm: UmkmRecord }
  | { kind: "invalid-id" | "not-found" | "read-error" };

export async function queryUmkmById(
  supabase: SupabaseClient,
  id: string,
): Promise<UmkmRecordResult> {
  if (!isValidUmkmId(id)) return { success: true, umkm: null };

  const { data, error } = await supabase
    .from("umkms")
    .select(UMKM_EDIT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<UmkmRecord | null, { merge: false }>();

  if (error) {
    console.error("Pembacaan UMKM gagal.", { code: error.code });
    return { success: false };
  }
  return { success: true, umkm: data };
}

export async function queryAdministratorUmkms(
  supabase: SupabaseClient,
): Promise<UmkmListResult> {
  const { data, error } = await supabase
    .from("umkms")
    .select("id,business_name,category,status,address,display_order,updated_at")
    .order("display_order", { ascending: true })
    .order("business_name", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<ListRow[], { merge: false }>();

  if (error) {
    console.error("Pembacaan daftar UMKM gagal.", { code: error.code });
    return { success: false };
  }

  return {
    success: true,
    umkms: data.map((umkm) => ({
      id: umkm.id,
      businessName: umkm.business_name,
      category: umkm.category,
      status: umkm.status,
      address: umkm.address,
      displayOrder: umkm.display_order,
      updatedAt: umkm.updated_at,
    })),
  };
}

export async function getAdministratorUmkmList() {
  await requireAdministrator();
  return queryAdministratorUmkms(await createClient());
}

export async function getUmkmEditorData(id: string): Promise<UmkmEditorResult> {
  await requireAdministrator();
  if (!isValidUmkmId(id)) return { kind: "invalid-id" };

  const result = await queryUmkmById(await createClient(), id);
  if (!result.success) return { kind: "read-error" };
  if (!result.umkm) return { kind: "not-found" };
  return { kind: "ready", umkm: result.umkm };
}
