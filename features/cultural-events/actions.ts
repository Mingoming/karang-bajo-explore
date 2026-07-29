"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryCulturalEventById } from "./data";
import {
  isCulturalEventDuplicateConstraintError,
  isValidCulturalEventId,
  isValidCulturalEventSlug,
  normalizeCulturalEventSlug,
  validateCulturalEventFormData,
  type CulturalEventActionState,
  type CulturalEventFormValues,
  type CulturalEventInsertPayload,
  type CulturalEventUpdatePayload,
} from "./model";

const LIST_PATH = "/admin/acara-budaya";

function nextState(
  previous: CulturalEventActionState,
  state: Omit<CulturalEventActionState, "revision">,
): CulturalEventActionState {
  return { ...state, revision: previous.revision + 1 };
}

function databaseFailure(
  previous: CulturalEventActionState,
  values: CulturalEventFormValues,
) {
  return nextState(previous, {
    kind: "database-error",
    values,
    fieldErrors: {},
    formErrors: [],
    message: "Acara budaya belum dapat disimpan. Silakan coba lagi.",
  });
}

function mutationFailure(
  previous: CulturalEventActionState,
  values: CulturalEventFormValues,
  code: string,
  diagnosticText: string,
) {
  if (isCulturalEventDuplicateConstraintError(code, diagnosticText)) {
    return nextState(previous, {
      kind: "duplicate-error",
      values,
      fieldErrors: {
        title:
          "Judul ini menghasilkan slug yang sudah digunakan oleh acara lain.",
      },
      formErrors: [],
      message: "Acara budaya belum tersimpan karena slug duplikat.",
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
      message: "Status acara budaya belum berubah.",
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
      message: "Periksa kembali data acara budaya sebelum menyimpan.",
    });
  }
  return databaseFailure(previous, values);
}

export async function createCulturalEvent(
  previous: CulturalEventActionState,
  formData: FormData,
): Promise<CulturalEventActionState> {
  const administrator = await requireAdministrator();
  const validation = validateCulturalEventFormData(formData, {
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

  const slug = normalizeCulturalEventSlug(validation.data.title);
  if (!isValidCulturalEventSlug(slug)) {
    return nextState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: {
        title: "Judul acara tidak dapat menghasilkan slug yang valid.",
      },
      formErrors: [],
      message: "Periksa kembali judul acara.",
    });
  }

  const payload: CulturalEventInsertPayload = {
    ...validation.data,
    slug,
    created_by: administrator.id,
    updated_by: administrator.id,
  };
  const { data, error } = await (
    await createClient()
  )
    .from("cultural_events")
    .insert(payload)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  const id = data?.length === 1 ? data[0].id : null;
  if (error || !id) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembuatan acara budaya gagal.", { code });
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

export async function updateCulturalEvent(
  id: string,
  previous: CulturalEventActionState,
  formData: FormData,
): Promise<CulturalEventActionState> {
  const administrator = await requireAdministrator();
  const initialValidation = validateCulturalEventFormData(formData, {
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
  if (!isValidCulturalEventId(id)) {
    return nextState(previous, {
      kind: "not-found",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message: "Acara budaya tidak ditemukan. Muat ulang halaman daftar.",
    });
  }

  const supabase = await createClient();
  const existingResult = await queryCulturalEventById(supabase, id);
  if (!existingResult.success) {
    return databaseFailure(previous, initialValidation.values);
  }
  if (!existingResult.event) {
    return nextState(previous, {
      kind: "not-found",
      values: initialValidation.values,
      fieldErrors: {},
      formErrors: [],
      message: "Acara budaya tidak ditemukan. Data tidak disimpan.",
    });
  }

  const existing = existingResult.event;
  const validation = validateCulturalEventFormData(formData, {
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
  if (!isValidCulturalEventSlug(existing.slug)) {
    console.error(
      "Slug acara budaya tersimpan tidak memenuhi format aplikasi.",
    );
    return databaseFailure(previous, validation.values);
  }

  const payload: CulturalEventUpdatePayload = {
    ...validation.data,
    updated_by: administrator.id,
  };
  const { data, error } = await supabase
    .from("cultural_events")
    .update(payload)
    .eq("id", existing.id)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error || data?.length !== 1) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembaruan acara budaya gagal.", { code });
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
