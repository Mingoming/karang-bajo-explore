"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryTraditionalHouseById } from "./data";
import {
  isTraditionalHouseDuplicateConstraintError,
  isValidTraditionalHouseId,
  isValidTraditionalHouseSlug,
  normalizeTraditionalHouseSlug,
  validateTraditionalHouseFormData,
  type TraditionalHouseActionState,
  type TraditionalHouseFormValues,
  type TraditionalHouseInsertPayload,
  type TraditionalHouseUpdatePayload,
} from "./model";

const LIST_PATH = "/admin/rumah-adat";

function nextState(
  previous: TraditionalHouseActionState,
  state: Omit<TraditionalHouseActionState, "revision">,
): TraditionalHouseActionState {
  return { ...state, revision: previous.revision + 1 };
}

function databaseFailure(
  previous: TraditionalHouseActionState,
  values: TraditionalHouseFormValues,
) {
  return nextState(previous, {
    kind: "database-error",
    values,
    fieldErrors: {},
    formErrors: [],
    message: "Rumah adat belum dapat disimpan. Silakan coba lagi.",
  });
}

function mutationFailure(
  previous: TraditionalHouseActionState,
  values: TraditionalHouseFormValues,
  code: string,
  diagnosticText: string,
) {
  if (isTraditionalHouseDuplicateConstraintError(code, diagnosticText)) {
    return nextState(previous, {
      kind: "duplicate-error",
      values,
      fieldErrors: {
        name: "Nama atau slug rumah adat sudah digunakan oleh record aktif lain.",
      },
      formErrors: [],
      message: "Rumah adat belum tersimpan karena data duplikat.",
    });
  }
  if (code === "P0001") {
    return nextState(previous, {
      kind: "validation-error",
      values,
      fieldErrors: {
        status: "Perubahan status publikasi tidak dapat dilakukan.",
      },
      formErrors: [],
      message: "Status rumah adat belum berubah.",
    });
  }
  if (code === "23514" || code === "23502") {
    return nextState(previous, {
      kind: "validation-error",
      values,
      fieldErrors: {},
      formErrors: [
        "Data belum memenuhi persyaratan penyimpanan atau publikasi.",
      ],
      message: "Periksa kembali data rumah adat sebelum menyimpan.",
    });
  }
  return databaseFailure(previous, values);
}

export async function createTraditionalHouse(
  previous: TraditionalHouseActionState,
  formData: FormData,
): Promise<TraditionalHouseActionState> {
  const administrator = await requireAdministrator();
  const validation = validateTraditionalHouseFormData(formData, {
    mode: "create",
    hasThumbnail: false,
  });
  if (!validation.success) {
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: validation.fieldErrors,
      formErrors: validation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }
  const slug = normalizeTraditionalHouseSlug(validation.data.name);
  if (!isValidTraditionalHouseSlug(slug)) {
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: {
        name: "Nama rumah adat tidak dapat menghasilkan slug yang valid.",
      },
      formErrors: [],
      message: "Periksa kembali nama rumah adat.",
    });
  }

  const payload: TraditionalHouseInsertPayload = {
    ...validation.data,
    slug,
    created_by: administrator.id,
    updated_by: administrator.id,
  };
  const { data, error } = await (
    await createClient()
  )
    .from("traditional_houses")
    .insert(payload)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  const id = data?.length === 1 ? data[0].id : null;
  if (error || !id) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembuatan rumah adat gagal.", { code });
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

export async function updateTraditionalHouse(
  id: string,
  previous: TraditionalHouseActionState,
  formData: FormData,
): Promise<TraditionalHouseActionState> {
  const administrator = await requireAdministrator();
  const initialValidation = validateTraditionalHouseFormData(formData, {
    mode: "update",
  });
  if (!initialValidation.success) {
    return nextState(previous, {
      kind: "validation-error",
      values: initialValidation.values,
      fieldErrors: initialValidation.fieldErrors,
      formErrors: initialValidation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }
  if (!isValidTraditionalHouseId(id)) {
    return nextState(previous, {
      kind: "not-found",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message: "Rumah adat tidak ditemukan. Muat ulang halaman daftar.",
    });
  }

  const supabase = await createClient();
  const existingResult = await queryTraditionalHouseById(supabase, id);
  if (!existingResult.success) {
    return databaseFailure(previous, initialValidation.values);
  }
  if (!existingResult.house) {
    return nextState(previous, {
      kind: "not-found",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message: "Rumah adat tidak ditemukan. Data tidak disimpan.",
    });
  }

  const existing = existingResult.house;
  const validation = validateTraditionalHouseFormData(formData, {
    mode: "update",
    currentStatus: existing.status,
    hasThumbnail: Boolean(existing.thumbnail_bucket && existing.thumbnail_path),
  });
  if (!validation.success) {
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: validation.fieldErrors,
      formErrors: validation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }
  if (!isValidTraditionalHouseSlug(existing.slug)) {
    console.error("Slug rumah adat tersimpan tidak memenuhi format aplikasi.");
    return databaseFailure(previous, validation.values);
  }

  const payload: TraditionalHouseUpdatePayload = {
    ...validation.data,
    updated_by: administrator.id,
  };
  const { data, error } = await supabase
    .from("traditional_houses")
    .update(payload)
    .eq("id", existing.id)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error || data?.length !== 1) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembaruan rumah adat gagal.", { code });
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
