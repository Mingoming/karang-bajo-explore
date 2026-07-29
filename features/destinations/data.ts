import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  isValidDestinationId,
  type DestinationCategoryOption,
  type DestinationListItem,
  type DestinationRecord,
  type DestinationStatus,
} from "./model";

const DESTINATION_EDIT_COLUMNS = [
  "id",
  "category_id",
  "name",
  "slug",
  "summary",
  "description",
  "history",
  "latitude",
  "longitude",
  "google_maps_url",
  "opening_hours",
  "entrance_fee",
  "price_note",
  "facilities",
  "contact_name",
  "contact_phone",
  "contact_consent_confirmed",
  "thumbnail_path",
  "thumbnail_bucket",
  "is_featured",
  "display_order",
  "status",
  "published_at",
  "created_at",
  "updated_at",
].join(",");

type DestinationListDatabaseRow = {
  id: string;
  name: string;
  status: DestinationStatus;
  display_order: number;
  updated_at: string;
  destination_categories: { name: string } | null;
};

export type DestinationListResult =
  { success: true; destinations: DestinationListItem[] } | { success: false };

export type DestinationCategoriesResult =
  | { success: true; categories: DestinationCategoryOption[] }
  | { success: false };

export type DestinationRecordResult =
  { success: true; destination: DestinationRecord | null } | { success: false };

export type DestinationEditorResult =
  | {
      kind: "ready";
      destination: DestinationRecord;
      categories: DestinationCategoryOption[];
    }
  | { kind: "invalid-id" | "not-found" | "category-error" | "read-error" };

function escapeIlikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function queryDestinationCategories(
  supabase: SupabaseClient,
): Promise<DestinationCategoriesResult> {
  const { data, error } = await supabase
    .from("destination_categories")
    .select("id,name,slug,display_order")
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
    .overrideTypes<DestinationCategoryOption[], { merge: false }>();

  if (error) {
    console.error("Pembacaan kategori destinasi gagal.", { code: error.code });
    return { success: false };
  }

  return { success: true, categories: data };
}

export async function queryDestinationById(
  supabase: SupabaseClient,
  id: string,
): Promise<DestinationRecordResult> {
  if (!isValidDestinationId(id)) {
    return { success: true, destination: null };
  }

  const { data, error } = await supabase
    .from("destinations")
    .select(DESTINATION_EDIT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<DestinationRecord | null, { merge: false }>();

  if (error) {
    console.error("Pembacaan destinasi gagal.", { code: error.code });
    return { success: false };
  }

  return { success: true, destination: data };
}

export async function queryAdministratorDestinations(
  supabase: SupabaseClient,
  searchTerm: string,
): Promise<DestinationListResult> {
  let query = supabase
    .from("destinations")
    .select(
      "id,name,status,display_order,updated_at,destination_categories(name)",
    )
    .order("display_order", { ascending: true })
    .order("name", { ascending: true })
    .order("id", { ascending: true });

  if (searchTerm !== "") {
    query = query.ilike("name", `%${escapeIlikePattern(searchTerm)}%`);
  }

  const { data, error } = await query.overrideTypes<
    DestinationListDatabaseRow[],
    { merge: false }
  >();

  if (error) {
    console.error("Pembacaan daftar destinasi gagal.", { code: error.code });
    return { success: false };
  }

  return {
    success: true,
    destinations: data.map((destination) => ({
      id: destination.id,
      name: destination.name,
      status: destination.status,
      displayOrder: destination.display_order,
      updatedAt: destination.updated_at,
      categoryName:
        destination.destination_categories?.name ?? "Tidak tersedia",
    })),
  };
}

export async function getAdministratorDestinationList(searchTerm: string) {
  await requireAdministrator();
  const supabase = await createClient();
  return queryAdministratorDestinations(supabase, searchTerm.trim());
}

export async function getDestinationCreateData() {
  await requireAdministrator();
  const supabase = await createClient();
  return queryDestinationCategories(supabase);
}

export async function getDestinationEditorData(
  id: string,
): Promise<DestinationEditorResult> {
  await requireAdministrator();

  if (!isValidDestinationId(id)) {
    return { kind: "invalid-id" };
  }

  const supabase = await createClient();
  const [destinationResult, categoryResult] = await Promise.all([
    queryDestinationById(supabase, id),
    queryDestinationCategories(supabase),
  ]);

  if (!destinationResult.success) {
    return { kind: "read-error" };
  }

  if (!destinationResult.destination) {
    return { kind: "not-found" };
  }

  if (!categoryResult.success || categoryResult.categories.length === 0) {
    return { kind: "category-error" };
  }

  return {
    kind: "ready",
    destination: destinationResult.destination,
    categories: categoryResult.categories,
  };
}
