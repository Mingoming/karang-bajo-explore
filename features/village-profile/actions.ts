"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidateEnglishAggregatePaths } from "@/features/public-content/revalidation";

import { queryVillageProfile } from "./data";
import {
  createVillageProfileSlug,
  getVillageProfileMutationMode,
  validateVillageProfileFormData,
  type VillageProfileActionState,
  type VillageProfileInsertPayload,
  type VillageProfileUpdatePayload,
} from "./model";

const VILLAGE_PROFILE_ADMIN_PATH = "/admin/profil-desa";

export async function saveVillageProfile(
  previousState: VillageProfileActionState,
  formData: FormData,
): Promise<VillageProfileActionState> {
  const administrator = await requireAdministrator();
  const initialValidation = validateVillageProfileFormData(formData);

  if (!initialValidation.success) {
    return {
      kind: "validation-error",
      values: initialValidation.values,
      fieldErrors: initialValidation.fieldErrors,
      formErrors: initialValidation.formErrors,
      message: "Periksa kembali data yang ditandai.",
      revision: previousState.revision + 1,
    };
  }

  const supabase = await createClient();
  const currentProfile = await queryVillageProfile(supabase);

  if (!currentProfile.success) {
    return {
      kind: "database-error",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message: "Profil desa belum dapat disimpan. Silakan coba lagi.",
      revision: previousState.revision + 1,
    };
  }

  const existingProfile = currentProfile.profile;
  const validation = validateVillageProfileFormData(formData, {
    currentStatus: existingProfile?.status ?? null,
  });

  if (!validation.success) {
    return {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: validation.fieldErrors,
      formErrors: validation.formErrors,
      message: "Periksa kembali data yang ditandai.",
      revision: previousState.revision + 1,
    };
  }

  const mutationMode = getVillageProfileMutationMode(existingProfile);
  let mutationFailureCode: string | undefined;

  if (existingProfile === null) {
    const payload: VillageProfileInsertPayload = {
      ...validation.data,
      slug: createVillageProfileSlug(validation.data.name),
      created_by: administrator.id,
      updated_by: administrator.id,
    };
    const { data, error } = await supabase
      .from("village_profiles")
      .insert(payload)
      .select("id")
      .overrideTypes<{ id: string }[], { merge: false }>();
    mutationFailureCode =
      error?.code ?? (data?.length === 1 ? undefined : "unexpected-row-count");
  } else {
    const payload: VillageProfileUpdatePayload = {
      ...validation.data,
      updated_by: administrator.id,
    };
    const { data, error } = await supabase
      .from("village_profiles")
      .update(payload)
      .eq("id", existingProfile.id)
      .select("id")
      .overrideTypes<{ id: string }[], { merge: false }>();
    mutationFailureCode =
      error?.code ?? (data?.length === 1 ? undefined : "unexpected-row-count");
  }

  if (mutationFailureCode) {
    console.error("Penyimpanan profil desa gagal.", {
      operation: mutationMode,
      code: mutationFailureCode,
    });
    if (mutationFailureCode === "P0001") {
      return {
        kind: "validation-error",
        values: validation.values,
        fieldErrors: {
          status: "Perubahan status publikasi tidak diizinkan.",
        },
        formErrors: [],
        message: "Status profil desa belum berubah.",
        revision: previousState.revision + 1,
      };
    }
    return {
      kind: "database-error",
      values: validation.values,
      fieldErrors: {},
      formErrors: [],
      message: "Profil desa belum dapat disimpan. Silakan coba lagi.",
      revision: previousState.revision + 1,
    };
  }

  revalidatePath(VILLAGE_PROFILE_ADMIN_PATH);
  revalidatePath("/profil-desa");
  revalidatePath("/en/village-profile");
  revalidatePath("/");
  revalidateEnglishAggregatePaths(false);

  return {
    kind: "success",
    values: validation.values,
    fieldErrors: {},
    formErrors: [],
    message:
      mutationMode === "create"
        ? "Profil desa berhasil dibuat."
        : "Profil desa berhasil diperbarui.",
    revision: previousState.revision + 1,
  };
}
