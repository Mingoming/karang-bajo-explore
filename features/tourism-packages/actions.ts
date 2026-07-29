"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  queryDestinationOptions,
  queryPackageRelations,
  queryTourismPackageById,
  type PackageRelationRecord,
} from "./data";
import {
  runCreateRelationConsistency,
  runUpdateConsistency,
} from "./consistency";
import {
  arePackageDestinationValuesEqual,
  isTourismPackageDuplicateConstraintError,
  isValidTourismPackageId,
  isValidTourismPackageSlug,
  normalizeTourismPackageSlug,
  validateTourismPackageFormData,
  type PackageDestinationInsertPayload,
  type PackageDestinationValue,
  type TourismPackageActionState,
  type TourismPackageFormValues,
  type TourismPackageInsertPayload,
  type TourismPackageUpdatePayload,
} from "./model";

const LIST_PATH = "/admin/paket-wisata";

function nextState(
  previous: TourismPackageActionState,
  state: Omit<TourismPackageActionState, "revision">,
): TourismPackageActionState {
  return { ...state, revision: previous.revision + 1 };
}

function failure(
  previous: TourismPackageActionState,
  values: TourismPackageFormValues,
  kind: TourismPackageActionState["kind"],
  message: string,
) {
  return nextState(previous, {
    kind,
    values,
    fieldErrors: {},
    formErrors: [],
    message,
  });
}

function mutationFailure(
  previous: TourismPackageActionState,
  values: TourismPackageFormValues,
  code: string,
  diagnostic: string,
) {
  if (isTourismPackageDuplicateConstraintError(code, diagnostic)) {
    return nextState(previous, {
      kind: "duplicate-error",
      values,
      fieldErrors: {
        name: "Nama atau slug paket sudah digunakan oleh paket aktif lain.",
      },
      formErrors: [],
      message: "Paket wisata belum tersimpan karena data duplikat.",
    });
  }
  if (code === "P0001" || code === "23514" || code === "23502") {
    return nextState(previous, {
      kind: "validation-error",
      values,
      fieldErrors: {},
      formErrors: [
        "Data belum memenuhi persyaratan penyimpanan atau publikasi.",
      ],
      message: "Periksa kembali data paket wisata.",
    });
  }
  return failure(
    previous,
    values,
    "database-error",
    "Paket wisata belum dapat disimpan. Silakan coba lagi.",
  );
}

async function insertRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packageId: string,
  destinations: PackageDestinationValue[],
  administratorId: string,
) {
  if (!destinations.length) return true;
  const payload: PackageDestinationInsertPayload[] = destinations.map(
    (item) => ({
      package_id: packageId,
      destination_id: item.destinationId,
      display_order: item.displayOrder,
      notes: item.notes || null,
      created_by: administratorId,
    }),
  );
  const { error } = await supabase.from("package_destinations").insert(payload);
  if (error)
    console.error("Penyimpanan susunan destinasi gagal.", { code: error.code });
  return !error;
}

async function synchronizeRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packageId: string,
  current: PackageRelationRecord[],
  desired: PackageDestinationValue[],
  administratorId: string,
) {
  const desiredIds = new Set(desired.map((item) => item.destinationId));
  const currentByDestination = new Map(
    current.map((item) => [item.destinationId, item]),
  );
  for (const item of desired) {
    const existing = currentByDestination.get(item.destinationId);
    if (existing) {
      const { error } = await supabase
        .from("package_destinations")
        .update({ display_order: item.displayOrder, notes: item.notes || null })
        .eq("id", existing.id)
        .eq("package_id", packageId);
      if (error) {
        console.error("Pembaruan susunan destinasi gagal.", {
          code: error.code,
        });
        return false;
      }
    } else if (
      !(await insertRelations(supabase, packageId, [item], administratorId))
    )
      return false;
  }
  const removed = current
    .filter((item) => !desiredIds.has(item.destinationId))
    .map((item) => item.id);
  if (removed.length) {
    const { error } = await supabase
      .from("package_destinations")
      .delete()
      .eq("package_id", packageId)
      .in("id", removed);
    if (error) {
      console.error("Penghapusan relasi destinasi gagal.", {
        code: error.code,
      });
      return false;
    }
  }
  return true;
}

async function restoreRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packageId: string,
  original: PackageRelationRecord[],
) {
  const currentResult = await queryPackageRelations(supabase, packageId);
  if (!currentResult.success) {
    console.error("Pemulihan susunan destinasi gagal.", {
      stage: "read-current",
    });
    return false;
  }

  const originalIds = new Set(original.map((item) => item.id));
  const extraIds = currentResult.relations
    .filter((item) => !originalIds.has(item.id))
    .map((item) => item.id);
  if (extraIds.length) {
    const { error } = await supabase
      .from("package_destinations")
      .delete()
      .eq("package_id", packageId)
      .in("id", extraIds);
    if (error) {
      console.error("Pemulihan susunan destinasi gagal.", {
        stage: "remove-added",
        code: error.code,
      });
      return false;
    }
  }

  const currentById = new Map(
    currentResult.relations.map((item) => [item.id, item]),
  );
  for (const item of original) {
    if (currentById.has(item.id)) {
      const { error } = await supabase
        .from("package_destinations")
        .update({
          destination_id: item.destinationId,
          display_order: item.displayOrder,
          notes: item.notes || null,
        })
        .eq("id", item.id)
        .eq("package_id", packageId);
      if (error) {
        console.error("Pemulihan susunan destinasi gagal.", {
          stage: "restore-existing",
          code: error.code,
        });
        return false;
      }
    } else {
      const { error } = await supabase.from("package_destinations").insert({
        id: item.id,
        package_id: packageId,
        destination_id: item.destinationId,
        display_order: item.displayOrder,
        notes: item.notes || null,
        created_at: item.createdAt,
        created_by: item.createdBy,
      });
      if (error) {
        console.error("Pemulihan susunan destinasi gagal.", {
          stage: "restore-removed",
          code: error.code,
        });
        return false;
      }
    }
  }

  const verification = await queryPackageRelations(supabase, packageId);
  const restored =
    verification.success &&
    verification.relations.length === original.length &&
    verification.relations.every((item, index) => {
      const expected = original[index];
      return (
        expected !== undefined &&
        item.id === expected.id &&
        item.destinationId === expected.destinationId &&
        item.displayOrder === expected.displayOrder &&
        item.notes === expected.notes &&
        item.createdAt === expected.createdAt &&
        item.createdBy === expected.createdBy
      );
    });
  console.info("Pemulihan susunan destinasi selesai.", {
    success: restored,
  });
  return restored;
}

async function compensateNewPackage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packageId: string,
  administratorId: string,
) {
  const { data: deleted, error: deleteError } = await supabase
    .from("tourism_packages")
    .delete()
    .eq("id", packageId)
    .eq("status", "draft")
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (!deleteError && deleted?.length === 1) {
    console.info("Kompensasi paket baru selesai.", { method: "delete" });
    return true;
  }
  console.error("Penghapusan kompensasi paket baru gagal.", {
    code: deleteError?.code ?? "row-not-deleted",
  });

  const { data: archived, error: archiveError } = await supabase
    .from("tourism_packages")
    .update({
      status: "archived",
      slug: `failed-create-${randomUUID()}`,
      updated_by: administratorId,
    })
    .eq("id", packageId)
    .eq("status", "draft")
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  const archivedSafely = !archiveError && archived?.length === 1;
  console.info("Fallback kompensasi paket baru selesai.", {
    success: archivedSafely,
    code: archiveError?.code,
  });
  return archivedSafely;
}

export async function createTourismPackage(
  previous: TourismPackageActionState,
  formData: FormData,
): Promise<TourismPackageActionState> {
  const administrator = await requireAdministrator();
  const supabase = await createClient();
  const options = await queryDestinationOptions(supabase);
  if (!options.success)
    return failure(
      previous,
      previous.values,
      "relation-error",
      "Pilihan destinasi belum dapat dimuat. Muat ulang halaman lalu coba lagi.",
    );
  const validation = validateTourismPackageFormData(formData, {
    mode: "create",
    hasThumbnail: false,
    destinationOptions: options.options,
  });
  if (!validation.success)
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: validation.fieldErrors,
      formErrors: validation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  const slug = normalizeTourismPackageSlug(validation.data.name);
  if (!isValidTourismPackageSlug(slug))
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: {
        name: "Nama paket tidak dapat menghasilkan slug yang valid.",
      },
      formErrors: [],
      message: "Periksa kembali nama paket.",
    });
  const payload: TourismPackageInsertPayload = {
    ...validation.data,
    slug,
    created_by: administrator.id,
    updated_by: administrator.id,
  };
  const { data, error } = await supabase
    .from("tourism_packages")
    .insert(payload)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  const id = data?.length === 1 ? data[0].id : null;
  if (error || !id) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembuatan paket wisata gagal.", { code });
    return mutationFailure(
      previous,
      validation.values,
      code,
      `${error?.message ?? ""} ${error?.details ?? ""}`,
    );
  }
  const consistency = await runCreateRelationConsistency(
    () =>
      insertRelations(supabase, id, validation.destinations, administrator.id),
    () => compensateNewPackage(supabase, id, administrator.id),
  );
  if (consistency !== "complete") {
    console.error("Pembuatan paket wisata dibatalkan.", {
      compensation: consistency,
    });
    return failure(
      previous,
      validation.values,
      "database-error",
      "Paket wisata belum dapat disimpan. Silakan coba lagi.",
    );
  }
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}/edit`);
  redirect(`${LIST_PATH}/${id}/edit?success=created`);
}

export async function updateTourismPackage(
  id: string,
  previous: TourismPackageActionState,
  formData: FormData,
): Promise<TourismPackageActionState> {
  const administrator = await requireAdministrator();
  if (!isValidTourismPackageId(id))
    return failure(
      previous,
      previous.values,
      "not-found",
      "Paket wisata tidak ditemukan. Data tidak disimpan.",
    );
  const supabase = await createClient();
  const [recordResult, relationsResult] = await Promise.all([
    queryTourismPackageById(supabase, id),
    queryPackageRelations(supabase, id),
  ]);
  if (!recordResult.success || !relationsResult.success)
    return failure(
      previous,
      previous.values,
      "database-error",
      "Paket wisata belum dapat dimuat. Silakan coba lagi.",
    );
  if (!recordResult.tourismPackage)
    return failure(
      previous,
      previous.values,
      "not-found",
      "Paket wisata tidak ditemukan. Data tidak disimpan.",
    );
  const options = await queryDestinationOptions(
    supabase,
    relationsResult.relations.map((item) => item.destinationId),
  );
  if (!options.success)
    return failure(
      previous,
      previous.values,
      "relation-error",
      "Pilihan destinasi belum dapat dimuat. Muat ulang halaman lalu coba lagi.",
    );
  const existing = recordResult.tourismPackage;
  const validation = validateTourismPackageFormData(formData, {
    mode: "update",
    currentStatus: existing.status,
    hasThumbnail: Boolean(existing.thumbnail_bucket && existing.thumbnail_path),
    destinationOptions: options.options,
    currentDestinations: relationsResult.relations,
  });
  if (!validation.success)
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: validation.fieldErrors,
      formErrors: validation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  if (!isValidTourismPackageSlug(existing.slug))
    return failure(
      previous,
      validation.values,
      "database-error",
      "Paket wisata belum dapat disimpan. Silakan coba lagi.",
    );
  const payload: TourismPackageUpdatePayload = {
    ...validation.data,
    updated_by: administrator.id,
  };
  const parentFailure: {
    current: { code: string; diagnostic: string } | null;
  } = { current: null };
  const relationChangeRequested =
    existing.status === "draft" &&
    !arePackageDestinationValuesEqual(
      validation.destinations,
      relationsResult.relations,
    );
  const consistency = await runUpdateConsistency(
    () =>
      relationChangeRequested
        ? synchronizeRelations(
            supabase,
            existing.id,
            relationsResult.relations,
            validation.destinations,
            administrator.id,
          )
        : Promise.resolve(true),
    () =>
      relationChangeRequested
        ? restoreRelations(supabase, existing.id, relationsResult.relations)
        : Promise.resolve(true),
    async () => {
      const { data, error } = await supabase
        .from("tourism_packages")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .overrideTypes<{ id: string }[], { merge: false }>();
      if (error || data?.length !== 1) {
        parentFailure.current = {
          code: error?.code ?? "unexpected-row-count",
          diagnostic: `${error?.message ?? ""} ${error?.details ?? ""}`,
        };
        console.error("Pembaruan parent paket wisata gagal.", {
          code: parentFailure.current.code,
        });
        return false;
      }
      return true;
    },
  );
  if (consistency !== "complete") {
    console.error("Pembaruan paket wisata dibatalkan.", {
      outcome: consistency,
    });
    if (parentFailure.current && consistency === "parent-failed-restored")
      return mutationFailure(
        previous,
        validation.values,
        parentFailure.current.code,
        parentFailure.current.diagnostic,
      );
    return failure(
      previous,
      validation.values,
      "database-error",
      "Paket wisata belum dapat disimpan. Silakan coba lagi.",
    );
  }
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${existing.id}/edit`);
  redirect(`${LIST_PATH}/${existing.id}/edit?success=updated`);
}
