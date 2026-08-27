"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { revalidatePublicDomainPaths } from "@/features/public-content/revalidation";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryHomestayById } from "./data";
import {
  isHomestayDuplicateConstraintError,
  isValidHomestayId,
  isValidHomestaySlug,
  normalizeHomestaySlug,
  validateHomestayFormData,
  type HomestayActionState,
  type HomestayFormValues,
  type HomestayInsertPayload,
  type HomestayUpdatePayload,
} from "./model";

const HOMESTAY_LIST_PATH = "/admin/homestay";

function revalidateHomestayPaths(slugs: readonly string[]) {
  revalidatePublicDomainPaths("homestay", slugs);
}

function nextState(
  previousState: HomestayActionState,
  state: Omit<HomestayActionState, "revision">,
): HomestayActionState {
  return { ...state, revision: previousState.revision + 1 };
}

function databaseFailureState(
  previousState: HomestayActionState,
  values: HomestayFormValues,
): HomestayActionState {
  return nextState(previousState, {
    kind: "database-error",
    values,
    fieldErrors: {},
    formErrors: [],
    message: "Homestay belum dapat disimpan. Silakan coba lagi.",
  });
}

function mutationFailureState(
  previousState: HomestayActionState,
  values: HomestayFormValues,
  code: string,
  diagnosticText: string,
): HomestayActionState {
  if (isHomestayDuplicateConstraintError(code, diagnosticText)) {
    return nextState(previousState, {
      kind: "duplicate-error",
      values,
      fieldErrors: {
        name: "Nama atau slug homestay sudah digunakan oleh homestay aktif lain.",
      },
      formErrors: [],
      message: "Homestay belum tersimpan karena data duplikat.",
    });
  }

  if (code === "P0001") {
    return nextState(previousState, {
      kind: "validation-error",
      values,
      fieldErrors: {
        status: "Perubahan status publikasi tidak dapat dilakukan.",
      },
      formErrors: [],
      message: "Status homestay belum berubah.",
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
      message: "Periksa kembali data homestay sebelum menyimpan.",
    });
  }

  return databaseFailureState(previousState, values);
}

export async function createHomestay(
  previousState: HomestayActionState,
  formData: FormData,
): Promise<HomestayActionState> {
  const administrator = await requireAdministrator();
  const validation = validateHomestayFormData(formData, {
    mode: "create",
    hasThumbnail: false,
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

  const slug = normalizeHomestaySlug(validation.data.name);
  if (!isValidHomestaySlug(slug)) {
    return nextState(previousState, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: {
        name: "Nama homestay tidak dapat menghasilkan slug yang valid.",
      },
      formErrors: [],
      message: "Periksa kembali nama homestay.",
    });
  }

  const supabase = await createClient();
  const payload: HomestayInsertPayload = {
    ...validation.data,
    slug,
    created_by: administrator.id,
    updated_by: administrator.id,
  };
  const { data, error } = await supabase
    .from("homestays")
    .insert(payload)
    .select("id,slug")
    .overrideTypes<{ id: string; slug: string }[], { merge: false }>();

  const createdHomestay = data?.length === 1 ? data[0] : null;
  const homestayId = createdHomestay?.id ?? null;
  if (error || !createdHomestay) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembuatan homestay gagal.", { code });
    return mutationFailureState(
      previousState,
      validation.values,
      code,
      `${error?.message ?? ""} ${error?.details ?? ""}`,
    );
  }

  revalidatePath(HOMESTAY_LIST_PATH);
  revalidatePath(`${HOMESTAY_LIST_PATH}/${homestayId}/edit`);
  revalidateHomestayPaths([createdHomestay.slug]);
  redirect(`${HOMESTAY_LIST_PATH}/${homestayId}/edit?success=created`);
}

export async function updateHomestay(
  id: string,
  previousState: HomestayActionState,
  formData: FormData,
): Promise<HomestayActionState> {
  const administrator = await requireAdministrator();
  const initialValidation = validateHomestayFormData(formData, {
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

  if (!isValidHomestayId(id)) {
    return nextState(previousState, {
      kind: "not-found",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message: "Homestay tidak ditemukan. Muat ulang halaman daftar homestay.",
    });
  }

  const supabase = await createClient();
  const homestayResult = await queryHomestayById(supabase, id);

  if (!homestayResult.success) {
    return databaseFailureState(previousState, initialValidation.values);
  }

  if (!homestayResult.homestay) {
    return nextState(previousState, {
      kind: "not-found",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message: "Homestay tidak ditemukan. Data tidak disimpan.",
    });
  }

  const existingHomestay = homestayResult.homestay;
  const validation = validateHomestayFormData(formData, {
    mode: "update",
    currentStatus: existingHomestay.status,
    hasThumbnail: Boolean(
      existingHomestay.thumbnail_bucket && existingHomestay.thumbnail_path,
    ),
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

  if (!isValidHomestaySlug(existingHomestay.slug)) {
    console.error("Slug homestay tersimpan tidak memenuhi format aplikasi.");
    return databaseFailureState(previousState, validation.values);
  }

  const payload: HomestayUpdatePayload = {
    ...validation.data,
    updated_by: administrator.id,
  };
  const { data, error } = await supabase
    .from("homestays")
    .update(payload)
    .eq("id", existingHomestay.id)
    .select("id,slug")
    .overrideTypes<{ id: string; slug: string }[], { merge: false }>();

  if (error || data?.length !== 1) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembaruan homestay gagal.", { code });
    return mutationFailureState(
      previousState,
      validation.values,
      code,
      `${error?.message ?? ""} ${error?.details ?? ""}`,
    );
  }

  revalidatePath(HOMESTAY_LIST_PATH);
  revalidatePath(`${HOMESTAY_LIST_PATH}/${existingHomestay.id}/edit`);
  revalidateHomestayPaths([
    existingHomestay.slug,
    ...(data?.length === 1 ? [data[0].slug] : []),
  ]);
  redirect(`${HOMESTAY_LIST_PATH}/${existingHomestay.id}/edit?success=updated`);
}
