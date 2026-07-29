"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryUmkmById } from "./data";
import {
  isUmkmDuplicateConstraintError,
  isValidUmkmId,
  isValidUmkmSlug,
  normalizeUmkmSlug,
  validateUmkmFormData,
  type UmkmActionState,
  type UmkmFormValues,
  type UmkmInsertPayload,
  type UmkmUpdatePayload,
} from "./model";

const LIST_PATH = "/admin/umkm";

function nextState(
  previous: UmkmActionState,
  state: Omit<UmkmActionState, "revision">,
): UmkmActionState {
  return { ...state, revision: previous.revision + 1 };
}

function databaseFailure(previous: UmkmActionState, values: UmkmFormValues) {
  return nextState(previous, {
    kind: "database-error",
    values,
    fieldErrors: {},
    formErrors: [],
    message: "UMKM belum dapat disimpan. Silakan coba lagi.",
  });
}

function mutationFailure(
  previous: UmkmActionState,
  values: UmkmFormValues,
  code: string,
  diagnosticText: string,
) {
  if (isUmkmDuplicateConstraintError(code, diagnosticText)) {
    return nextState(previous, {
      kind: "duplicate-error",
      values,
      fieldErrors: {
        business_name:
          "Nama atau slug UMKM sudah digunakan oleh UMKM aktif lain.",
      },
      formErrors: [],
      message: "UMKM belum tersimpan karena data duplikat.",
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
      message: "Status UMKM belum berubah.",
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
      message: "Periksa kembali data UMKM sebelum menyimpan.",
    });
  }
  return databaseFailure(previous, values);
}

export async function createUmkm(
  previous: UmkmActionState,
  formData: FormData,
): Promise<UmkmActionState> {
  const administrator = await requireAdministrator();
  const validation = validateUmkmFormData(formData, {
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

  const slug = normalizeUmkmSlug(validation.data.business_name);
  if (!isValidUmkmSlug(slug)) {
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: {
        business_name: "Nama usaha tidak dapat menghasilkan slug yang valid.",
      },
      formErrors: [],
      message: "Periksa kembali nama usaha.",
    });
  }

  const payload: UmkmInsertPayload = {
    ...validation.data,
    slug,
    created_by: administrator.id,
    updated_by: administrator.id,
  };
  const { data, error } = await (
    await createClient()
  )
    .from("umkms")
    .insert(payload)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();

  const id = data?.length === 1 ? data[0].id : null;
  if (error || !id) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembuatan UMKM gagal.", { code });
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

export async function updateUmkm(
  id: string,
  previous: UmkmActionState,
  formData: FormData,
): Promise<UmkmActionState> {
  const administrator = await requireAdministrator();
  const initialValidation = validateUmkmFormData(formData, { mode: "update" });
  if (!initialValidation.success) {
    return nextState(previous, {
      kind: "validation-error",
      values: initialValidation.values,
      fieldErrors: initialValidation.fieldErrors,
      formErrors: initialValidation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }
  if (!isValidUmkmId(id)) {
    return nextState(previous, {
      kind: "not-found",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message: "UMKM tidak ditemukan. Muat ulang halaman daftar UMKM.",
    });
  }

  const supabase = await createClient();
  const existingResult = await queryUmkmById(supabase, id);
  if (!existingResult.success)
    return databaseFailure(previous, initialValidation.values);
  if (!existingResult.umkm) {
    return nextState(previous, {
      kind: "not-found",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message: "UMKM tidak ditemukan. Data tidak disimpan.",
    });
  }

  const existing = existingResult.umkm;
  const validation = validateUmkmFormData(formData, {
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
  if (!isValidUmkmSlug(existing.slug)) {
    console.error("Slug UMKM tersimpan tidak memenuhi format aplikasi.");
    return databaseFailure(previous, validation.values);
  }

  const payload: UmkmUpdatePayload = {
    ...validation.data,
    updated_by: administrator.id,
  };
  const { data, error } = await supabase
    .from("umkms")
    .update(payload)
    .eq("id", existing.id)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();

  if (error || data?.length !== 1) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembaruan UMKM gagal.", { code });
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
