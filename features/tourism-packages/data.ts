import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { isValidDestinationId } from "../destinations/model";
import {
  isValidTourismPackageId,
  isValidTourismPackageSlug,
  type DestinationOption,
  type PackageDestinationValue,
  type TourismPackageListItem,
  type TourismPackageRecord,
  type TourismPackageStatus,
  type TourismPackageType,
} from "./model";

const EDIT_COLUMNS =
  "id,name,slug,package_type,duration_value,duration_unit,price,price_note,included_facilities,souvenir,summary,description,thumbnail_path,thumbnail_bucket,is_featured,display_order,status,published_at,created_at,updated_at,aggregate_revision";

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
type PackageDestinationIdRow = { package_id: string };
type PackageSlugRow = { id: string; slug: string };
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

export async function queryTourismPackageSlugsByDestinationId(
  supabase: SupabaseClient,
  destinationId: string,
) {
  if (!isValidDestinationId(destinationId)) {
    return { success: true as const, slugs: [] as string[] };
  }

  const { data: relationRows, error: relationError } = await supabase
    .from("package_destinations")
    .select("package_id")
    .eq("destination_id", destinationId)
    .overrideTypes<PackageDestinationIdRow[], { merge: false }>();
  if (
    relationError ||
    !Array.isArray(relationRows) ||
    relationRows.some(
      (row) =>
        typeof row !== "object" ||
        row === null ||
        !isValidTourismPackageId(row.package_id),
    )
  ) {
    console.error("Pembacaan ketergantungan paket wisata gagal.", {
      code: relationError?.code ?? "invalid-row-shape",
    });
    return { success: false as const, slugs: [] as string[] };
  }

  const packageIds = [...new Set(relationRows.map((row) => row.package_id))];
  if (packageIds.length === 0) {
    return { success: true as const, slugs: [] as string[] };
  }

  const { data: packageRows, error: packageError } = await supabase
    .from("tourism_packages")
    .select("id,slug")
    .in("id", packageIds)
    .overrideTypes<PackageSlugRow[], { merge: false }>();
  const packageIdSet = new Set(packageIds);
  if (
    packageError ||
    !Array.isArray(packageRows) ||
    packageRows.some(
      (row) =>
        typeof row !== "object" ||
        row === null ||
        !isValidTourismPackageId(row.id) ||
        !packageIdSet.has(row.id) ||
        !isValidTourismPackageSlug(row.slug),
    )
  ) {
    console.error("Pembacaan slug paket wisata terkait gagal.", {
      code: packageError?.code ?? "invalid-row-shape",
    });
    return { success: false as const, slugs: [] as string[] };
  }

  const seenIds = new Set<string>();
  const slugs: string[] = [];
  for (const row of packageRows) {
    if (seenIds.has(row.id)) {
      console.error("Slug paket wisata terkait tidak valid.", {
        code: "invalid-package-row",
      });
      return { success: false as const, slugs: [] as string[] };
    }
    seenIds.add(row.id);
    slugs.push(row.slug);
  }
  if (seenIds.size !== packageIdSet.size) {
    console.error("Paket wisata terkait tidak ditemukan.", {
      code: "missing-package-row",
    });
    return { success: false as const, slugs: [] as string[] };
  }

  return { success: true as const, slugs: [...new Set(slugs)] };
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
