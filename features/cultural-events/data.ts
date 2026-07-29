import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  isValidCulturalEventId,
  type CulturalEventListItem,
  type CulturalEventRecord,
} from "./model";

const EDIT_COLUMNS = [
  "id",
  "title",
  "slug",
  "summary",
  "description",
  "event_type",
  "start_at",
  "end_at",
  "all_day",
  "date_note",
  "location_name",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "organizer",
  "contact_phone",
  "contact_consent_confirmed",
  "visitor_information",
  "thumbnail_path",
  "thumbnail_bucket",
  "status",
  "is_featured",
  "published_at",
  "created_at",
  "updated_at",
].join(",");

const LIST_COLUMNS = [
  "id",
  "title",
  "status",
  "start_at",
  "all_day",
  "date_note",
  "location_name",
  "is_featured",
  "updated_at",
].join(",");

export type CulturalEventListResult =
  { success: true; events: CulturalEventListItem[] } | { success: false };
export type CulturalEventRecordResult =
  { success: true; event: CulturalEventRecord | null } | { success: false };
export type CulturalEventEditorResult =
  | { kind: "ready"; event: CulturalEventRecord }
  | { kind: "invalid-id" | "not-found" | "read-error" };

export async function queryCulturalEventById(
  supabase: SupabaseClient,
  id: string,
): Promise<CulturalEventRecordResult> {
  if (!isValidCulturalEventId(id)) return { success: true, event: null };
  const { data, error } = await supabase
    .from("cultural_events")
    .select(EDIT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<CulturalEventRecord | null, { merge: false }>();
  if (error) {
    console.error("Pembacaan acara budaya gagal.", { code: error.code });
    return { success: false };
  }
  return { success: true, event: data };
}

export async function queryAdministratorCulturalEvents(
  supabase: SupabaseClient,
): Promise<CulturalEventListResult> {
  const { data, error } = await supabase
    .from("cultural_events")
    .select(LIST_COLUMNS)
    .order("start_at", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<CulturalEventListItem[], { merge: false }>();
  if (error) {
    console.error("Pembacaan daftar acara budaya gagal.", { code: error.code });
    return { success: false };
  }
  return { success: true, events: data };
}

export async function getAdministratorCulturalEventList() {
  await requireAdministrator();
  return queryAdministratorCulturalEvents(await createClient());
}

export async function getCulturalEventEditorData(
  id: string,
): Promise<CulturalEventEditorResult> {
  await requireAdministrator();
  if (!isValidCulturalEventId(id)) return { kind: "invalid-id" };
  const result = await queryCulturalEventById(await createClient(), id);
  if (!result.success) return { kind: "read-error" };
  if (!result.event) return { kind: "not-found" };
  return { kind: "ready", event: result.event };
}
