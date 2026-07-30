"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  queryDestinationOptions,
  queryPackageRelations,
  queryTourismPackageById,
} from "./data";
import {
  isTourismPackageDuplicateConstraintError,
  isValidTourismPackageId,
  isValidTourismPackageSlug,
  normalizeTourismPackageSlug,
  tourismPackageDestinationsToRpcValue,
  validateTourismPackageFormData,
  type TourismPackageActionState,
  type TourismPackageFormValues,
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
  if (code === "P0002")
    return failure(
      previous,
      values,
      "not-found",
      "Paket wisata tidak ditemukan. Data tidak disimpan.",
    );
  if (
    code === "P0001" ||
    code === "22023" ||
    code === "23502" ||
    code === "23503" ||
    code === "23505" ||
    code === "23514"
  ) {
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

export async function createTourismPackage(
  previous: TourismPackageActionState,
  formData: FormData,
): Promise<TourismPackageActionState> {
  await requireAdministrator();
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
  const { data, error } = await supabase.rpc("tourism_package_create", {
    p_name: validation.data.name,
    p_slug: slug,
    p_package_type: validation.data.package_type,
    p_duration_value: validation.data.duration_value,
    p_duration_unit: validation.data.duration_unit,
    p_price: validation.data.price,
    p_price_note: validation.data.price_note,
    p_included_facilities: validation.data.included_facilities,
    p_souvenir: validation.data.souvenir,
    p_summary: validation.data.summary,
    p_description: validation.data.description,
    p_is_featured: validation.data.is_featured,
    p_display_order: validation.data.display_order,
    p_status: validation.data.status,
    p_destinations: tourismPackageDestinationsToRpcValue(
      validation.destinations,
    ),
  });
  const id =
    typeof data === "string" && isValidTourismPackageId(data) ? data : null;
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
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}/edit`);
  redirect(`${LIST_PATH}/${id}/edit?success=created`);
}

export async function updateTourismPackage(
  id: string,
  previous: TourismPackageActionState,
  formData: FormData,
): Promise<TourismPackageActionState> {
  await requireAdministrator();
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
  const { data, error } = await supabase.rpc("tourism_package_update", {
    p_package_id: existing.id,
    p_name: validation.data.name,
    p_package_type: validation.data.package_type,
    p_duration_value: validation.data.duration_value,
    p_duration_unit: validation.data.duration_unit,
    p_price: validation.data.price,
    p_price_note: validation.data.price_note,
    p_included_facilities: validation.data.included_facilities,
    p_souvenir: validation.data.souvenir,
    p_summary: validation.data.summary,
    p_description: validation.data.description,
    p_is_featured: validation.data.is_featured,
    p_display_order: validation.data.display_order,
    p_status: validation.data.status,
    p_destinations: tourismPackageDestinationsToRpcValue(
      validation.destinations,
    ),
  });
  const updatedId =
    typeof data === "string" && isValidTourismPackageId(data) ? data : null;
  if (error || updatedId !== existing.id) {
    const code = error?.code ?? "unexpected-result";
    console.error("Pembaruan paket wisata gagal.", { code });
    return mutationFailure(
      previous,
      validation.values,
      code,
      `${error?.message ?? ""} ${error?.details ?? ""}`,
    );
  }
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${existing.id}/edit`);
  redirect(`${LIST_PATH}/${existing.id}/edit?success=updated`);
}
