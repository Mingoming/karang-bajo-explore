import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  isValidTourismPackageId,
  type DestinationOption,
  type PackageDestinationValue,
  type TourismPackageListItem,
  type TourismPackageRecord,
  type TourismPackageStatus,
  type TourismPackageType,
} from "./model";

const EDIT_COLUMNS =
  "id,name,slug,package_type,duration_value,duration_unit,price,price_note,included_facilities,souvenir,summary,description,thumbnail_path,thumbnail_bucket,is_featured,display_order,status,published_at,created_at,updated_at";

type ListRow = TourismPackageListItem;
type RelationRow = {
  id: string;
  destination_id: string;
  display_order: number;
  notes: string | null;
  created_at: string;
  created_by: string;
};
type DestinationRow = {
  id: string;
  name: string;
  status: TourismPackageStatus;
};
export type PackageRelationRecord = PackageDestinationValue & {
  id: string;
  createdAt: string;
  createdBy: string;
};
export type TourismPackageEditorResult =
  | {
      kind: "ready";
      tourismPackage: TourismPackageRecord;
      destinations: PackageRelationRecord[];
      options: DestinationOption[];
    }
  | { kind: "invalid-id" | "not-found" | "read-error" };

export async function queryTourismPackageById(
  supabase: SupabaseClient,
  id: string,
) {
  if (!isValidTourismPackageId(id))
    return { success: true as const, tourismPackage: null };
  const { data, error } = await supabase
    .from("tourism_packages")
    .select(EDIT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<TourismPackageRecord | null, { merge: false }>();
  if (error) {
    console.error("Pembacaan paket wisata gagal.", { code: error.code });
    return { success: false as const };
  }
  return { success: true as const, tourismPackage: data };
}

export async function queryDestinationOptions(
  supabase: SupabaseClient,
  selectedIds: string[] = [],
) {
  const { data, error } = await supabase
    .from("destinations")
    .select("id,name,status")
    .order("display_order")
    .order("name")
    .overrideTypes<DestinationRow[], { merge: false }>();
  if (error) {
    console.error("Pembacaan pilihan destinasi gagal.", { code: error.code });
    return { success: false as const, options: [] as DestinationOption[] };
  }
  const selected = new Set(selectedIds);
  return {
    success: true as const,
    options: data.filter(
      (row) => row.status !== "archived" || selected.has(row.id),
    ),
  };
}

export async function queryPackageRelations(
  supabase: SupabaseClient,
  packageId: string,
) {
  const { data, error } = await supabase
    .from("package_destinations")
    .select("id,destination_id,display_order,notes,created_at,created_by")
    .eq("package_id", packageId)
    .order("display_order")
    .order("id")
    .overrideTypes<RelationRow[], { merge: false }>();
  if (error) {
    console.error("Pembacaan susunan destinasi gagal.", { code: error.code });
    return {
      success: false as const,
      relations: [] as PackageRelationRecord[],
    };
  }
  return {
    success: true as const,
    relations: data.map((row) => ({
      id: row.id,
      destinationId: row.destination_id,
      displayOrder: row.display_order,
      notes: row.notes ?? "",
      createdAt: row.created_at,
      createdBy: row.created_by,
    })),
  };
}

export async function getAdministratorTourismPackageList() {
  await requireAdministrator();
  const { data, error } = await (
    await createClient()
  )
    .from("tourism_packages")
    .select(
      "id,name,package_type,duration_value,duration_unit,price,is_featured,display_order,status,updated_at",
    )
    .order("display_order")
    .order("name")
    .order("id")
    .overrideTypes<ListRow[], { merge: false }>();
  if (error) {
    console.error("Pembacaan daftar paket wisata gagal.", { code: error.code });
    return {
      success: false as const,
      packages: [] as TourismPackageListItem[],
    };
  }
  return { success: true as const, packages: data };
}

export async function getTourismPackageCreateData() {
  await requireAdministrator();
  return queryDestinationOptions(await createClient());
}

export async function getTourismPackageEditorData(
  id: string,
): Promise<TourismPackageEditorResult> {
  await requireAdministrator();
  if (!isValidTourismPackageId(id)) return { kind: "invalid-id" };
  const supabase = await createClient();
  const record = await queryTourismPackageById(supabase, id);
  if (!record.success) return { kind: "read-error" };
  if (!record.tourismPackage) return { kind: "not-found" };
  const relations = await queryPackageRelations(supabase, id);
  if (!relations.success) return { kind: "read-error" };
  const options = await queryDestinationOptions(
    supabase,
    relations.relations.map((item) => item.destinationId),
  );
  if (!options.success) return { kind: "read-error" };
  return {
    kind: "ready",
    tourismPackage: record.tourismPackage,
    destinations: relations.relations,
    options: options.options,
  };
}

export type { TourismPackageType };
