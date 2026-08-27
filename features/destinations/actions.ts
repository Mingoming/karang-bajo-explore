"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { revalidatePublicDomainPaths } from "@/features/public-content/revalidation";
import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryDestinationById, queryDestinationCategories } from "./data";
import {
  isValidDestinationId,
  isValidDestinationSlug,
  isDestinationDuplicateConstraintError,
  normalizeDestinationSlug,
  validateDestinationFormData,
  type DestinationActionState,
  type DestinationFormValues,
  type DestinationInsertPayload,
  type DestinationUpdatePayload,
} from "./model";

const DESTINATION_LIST_PATH = "/admin/destinasi";

function revalidateEnglishDestinationPaths(
  ...trustedSlugs: readonly (string | null | undefined)[]
) {
  revalidatePublicDomainPaths("destination", trustedSlugs);
}

function nextState(
  previousState: DestinationActionState,
  state: Omit<DestinationActionState, "revision">,
): DestinationActionState {
  return { ...state, revision: previousState.revision + 1 };
}

function databaseFailureState(
  previousState: DestinationActionState,
  values: DestinationFormValues,
): DestinationActionState {
  return nextState(previousState, {
    kind: "database-error",
    values,
    fieldErrors: {},
    formErrors: [],
    message: "Destinasi belum dapat disimpan. Silakan coba lagi.",
  });
}

function mutationFailureState(
  previousState: DestinationActionState,
  values: DestinationFormValues,
  code: string,
  diagnosticText: string,
): DestinationActionState {
  if (isDestinationDuplicateConstraintError(code, diagnosticText)) {
    return nextState(previousState, {
      kind: "duplicate-error",
      values,
      fieldErrors: {
        name: "Nama atau slug destinasi sudah digunakan oleh destinasi aktif lain.",
      },
      formErrors: [],
      message: "Destinasi belum tersimpan karena data duplikat.",
    });
  }

  if (code === "23503") {
    return nextState(previousState, {
      kind: "category-error",
      values,
      fieldErrors: { category_id: "Kategori yang dipilih tidak tersedia." },
      formErrors: [],
      message: "Destinasi belum tersimpan. Pilih kategori yang tersedia.",
    });
  }

  if (code === "P0001") {
    return nextState(previousState, {
      kind: "validation-error",
      values,
      fieldErrors: {
        status: "Perubahan status publikasi tidak dapat dilakukan.",
      },
      formErrors: [
        "Periksa kembali alur status atau hubungan destinasi dengan konten lain.",
      ],
      message: "Status destinasi belum berubah.",
    });
  }

  if (code === "23514" || code === "23502") {
    return nextState(previousState, {
      kind: "validation-error",
      values,
      fieldErrors: {},
      formErrors: [
        "Data belum memenuhi persyaratan penyimpanan atau publikasi.",
      ],
      message: "Periksa kembali data destinasi sebelum menyimpan.",
    });
  }

  return databaseFailureState(previousState, values);
}

export async function createDestination(
  previousState: DestinationActionState,
  formData: FormData,
): Promise<DestinationActionState> {
  const administrator = await requireAdministrator();
  const initialValidation = validateDestinationFormData(formData, {
    mode: "create",
    hasThumbnail: false,
  });

  if (!initialValidation.success) {
    return nextState(previousState, {
      kind: "validation-error",
      values: initialValidation.values,
      fieldErrors: initialValidation.fieldErrors,
      formErrors: initialValidation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }

  const supabase = await createClient();
  const categoryResult = await queryDestinationCategories(supabase);

  if (!categoryResult.success || categoryResult.categories.length === 0) {
    return nextState(previousState, {
      kind: "category-error",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message:
        "Kategori destinasi belum dapat dimuat. Destinasi belum tersimpan.",
    });
  }

  const validation = validateDestinationFormData(formData, {
    mode: "create",
    hasThumbnail: false,
    allowedCategoryIds: categoryResult.categories.map(({ id }) => id),
  });

  if (!validation.success) {
    return nextState(previousState, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: validation.fieldErrors,
      formErrors: validation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }

  const slug = normalizeDestinationSlug(validation.data.name);
  if (!isValidDestinationSlug(slug)) {
    return nextState(previousState, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: {
        name: "Nama destinasi tidak dapat menghasilkan slug yang valid.",
      },
      formErrors: [],
      message: "Periksa kembali nama destinasi.",
    });
  }

  const payload: DestinationInsertPayload = {
    ...validation.data,
    slug,
    created_by: administrator.id,
    updated_by: administrator.id,
  };
  const { data, error } = await supabase
    .from("destinations")
    .insert(payload)
    .select("id,slug")
    .overrideTypes<{ id: string; slug: string }[], { merge: false }>();

  const createdDestination = data?.length === 1 ? data[0] : null;
  if (error || !createdDestination) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembuatan destinasi gagal.", { code });
    return mutationFailureState(
      previousState,
      validation.values,
      code,
      `${error?.message ?? ""} ${error?.details ?? ""}`,
    );
  }

  const destinationId = createdDestination.id;
  revalidatePath(DESTINATION_LIST_PATH);
  revalidatePath(`${DESTINATION_LIST_PATH}/${destinationId}/edit`);
  revalidateEnglishDestinationPaths(createdDestination.slug);
  redirect(`${DESTINATION_LIST_PATH}/${destinationId}/edit?success=created`);
}

export async function updateDestination(
  id: string,
  previousState: DestinationActionState,
  formData: FormData,
): Promise<DestinationActionState> {
  const administrator = await requireAdministrator();
  const initialValidation = validateDestinationFormData(formData, {
    mode: "update",
  });

  if (!initialValidation.success) {
    return nextState(previousState, {
      kind: "validation-error",
      values: initialValidation.values,
      fieldErrors: initialValidation.fieldErrors,
      formErrors: initialValidation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }

  if (!isValidDestinationId(id)) {
    return nextState(previousState, {
      kind: "not-found",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message:
        "Destinasi tidak ditemukan. Muat ulang halaman daftar destinasi.",
    });
  }

  const supabase = await createClient();
  const [destinationResult, categoryResult] = await Promise.all([
    queryDestinationById(supabase, id),
    queryDestinationCategories(supabase),
  ]);

  if (!destinationResult.success) {
    return databaseFailureState(previousState, initialValidation.values);
  }

  if (!destinationResult.destination) {
    return nextState(previousState, {
      kind: "not-found",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message: "Destinasi tidak ditemukan. Data tidak disimpan.",
    });
  }

  if (!categoryResult.success || categoryResult.categories.length === 0) {
    return nextState(previousState, {
      kind: "category-error",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message:
        "Kategori destinasi belum dapat dimuat. Perubahan belum disimpan.",
    });
  }

  const existingDestination = destinationResult.destination;
  const validation = validateDestinationFormData(formData, {
    mode: "update",
    currentStatus: existingDestination.status,
    hasThumbnail: Boolean(
      existingDestination.thumbnail_bucket &&
      existingDestination.thumbnail_path,
    ),
    allowedCategoryIds: categoryResult.categories.map(({ id }) => id),
  });

  if (!validation.success) {
    return nextState(previousState, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: validation.fieldErrors,
      formErrors: validation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }

  if (!isValidDestinationSlug(existingDestination.slug)) {
    console.error("Slug tersimpan tidak memenuhi format aplikasi.");
    return databaseFailureState(previousState, validation.values);
  }

  const payload: DestinationUpdatePayload = {
    ...validation.data,
    updated_by: administrator.id,
  };
  const { data, error } = await supabase
    .from("destinations")
    .update(payload)
    .eq("id", existingDestination.id)
    .select("id,slug")
    .overrideTypes<{ id: string; slug: string }[], { merge: false }>();

  const updatedDestination = data?.length === 1 ? data[0] : null;
  if (error || !updatedDestination) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembaruan destinasi gagal.", { code });
    return mutationFailureState(
      previousState,
      validation.values,
      code,
      `${error?.message ?? ""} ${error?.details ?? ""}`,
    );
  }

  revalidatePath(DESTINATION_LIST_PATH);
  revalidatePath(`${DESTINATION_LIST_PATH}/${existingDestination.id}/edit`);
  revalidateEnglishDestinationPaths(
    existingDestination.slug,
    updatedDestination.slug,
  );
  redirect(
    `${DESTINATION_LIST_PATH}/${existingDestination.id}/edit?success=updated`,
  );
}
