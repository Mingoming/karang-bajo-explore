"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import { queryOfficialContactById, queryPrimaryWhatsappSetting } from "./data";
import {
  isOfficialContactDuplicateError,
  isValidOfficialContactId,
  PRIMARY_WHATSAPP_KEY,
  validateContactFormData,
  validatePrimaryWhatsappInput,
  type ContactActionState,
  type ContactFormValues,
  type WhatsappSettingActionState,
} from "./model";

const CONTACT_LIST_PATH = "/admin/kontak";

function revalidateContactRoutes() {
  revalidatePath("/(public)", "layout");
  revalidatePath("/kontak");
  revalidatePath("/");
}

function nextContactState(
  previous: ContactActionState,
  state: Omit<ContactActionState, "revision">,
): ContactActionState {
  return { ...state, revision: previous.revision + 1 };
}

function contactDatabaseFailure(
  previous: ContactActionState,
  values: ContactFormValues,
) {
  return nextContactState(previous, {
    kind: "database-error",
    values,
    fieldErrors: {},
    formErrors: [],
    message: "Kontak resmi belum dapat disimpan. Silakan coba lagi.",
  });
}

function contactMutationFailure(
  previous: ContactActionState,
  values: ContactFormValues,
  code: string,
  diagnostic: string,
) {
  if (isOfficialContactDuplicateError(code, diagnostic)) {
    return nextContactState(previous, {
      kind: "duplicate-error",
      values,
      fieldErrors: {
        value: "Kanal kontak aktif dengan jenis dan nilai yang sama sudah ada.",
      },
      formErrors: [],
      message: "Kontak resmi belum tersimpan karena duplikat.",
    });
  }
  if (code === "P0001") {
    return nextContactState(previous, {
      kind: "validation-error",
      values,
      fieldErrors: { status: "Perubahan status publikasi tidak diizinkan." },
      formErrors: [],
      message: "Status kontak resmi belum berubah.",
    });
  }
  return contactDatabaseFailure(previous, values);
}

export async function savePrimaryWhatsapp(
  previous: WhatsappSettingActionState,
  formData: FormData,
): Promise<WhatsappSettingActionState> {
  const administrator = await requireAdministrator();
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  const validation = validatePrimaryWhatsappInput(input);
  if (!validation.success) {
    return {
      kind: "validation-error",
      value: validation.value,
      error: validation.error,
      message: "Periksa kembali nomor WhatsApp utama.",
      revision: previous.revision + 1,
    };
  }
  const supabase = await createClient();
  const current = await queryPrimaryWhatsappSetting(supabase);
  if (!current.success) {
    return {
      kind: "database-error",
      value: validation.value,
      error: null,
      message: "Pengaturan belum dapat disimpan. Silakan coba lagi.",
      revision: previous.revision + 1,
    };
  }
  if (current.setting && !current.setting.is_editable) {
    return {
      kind: "read-only",
      value: current.setting.value ?? "",
      error: null,
      message: "Pengaturan ini bersifat hanya-baca dan tidak dapat diubah.",
      revision: previous.revision + 1,
    };
  }
  const payload = {
    value: validation.data,
    value_type: "text" as const,
    label: "Nomor WhatsApp utama",
    description: "Kanal utama untuk pertanyaan pengunjung.",
    is_public: true,
    is_editable: true,
    updated_by: administrator.id,
  };
  const mutation = current.setting
    ? supabase
        .from("site_settings")
        .update(payload)
        .eq("id", current.setting.id)
    : supabase.from("site_settings").insert({
        ...payload,
        key: PRIMARY_WHATSAPP_KEY,
        created_by: administrator.id,
      });
  const { data, error } = await mutation
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error || data?.length !== 1) {
    console.error("Penyimpanan WhatsApp utama gagal.", {
      operation: current.setting ? "update" : "create",
      code: error?.code ?? "unexpected-row-count",
    });
    return {
      kind: "database-error",
      value: validation.value,
      error: null,
      message: "Pengaturan belum dapat disimpan. Silakan coba lagi.",
      revision: previous.revision + 1,
    };
  }
  revalidatePath("/admin/pengaturan");
  revalidateContactRoutes();
  return {
    kind: "success",
    value: validation.data ?? "",
    error: null,
    message: validation.data
      ? "Nomor WhatsApp utama berhasil disimpan."
      : "Nomor WhatsApp utama berhasil dikosongkan.",
    revision: previous.revision + 1,
  };
}

export async function createOfficialContact(
  previous: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const administrator = await requireAdministrator();
  const validation = validateContactFormData(formData, null);
  if (!validation.success) {
    return nextContactState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: validation.fieldErrors,
      formErrors: validation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }
  const { data, error } = await (
    await createClient()
  )
    .from("contacts")
    .insert({
      ...validation.data,
      created_by: administrator.id,
      updated_by: administrator.id,
    })
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  const id = data?.length === 1 ? data[0].id : null;
  if (error || !id) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembuatan kontak resmi gagal.", { code });
    return contactMutationFailure(
      previous,
      validation.values,
      code,
      `${error?.message ?? ""} ${error?.details ?? ""}`,
    );
  }
  revalidatePath(CONTACT_LIST_PATH);
  revalidateContactRoutes();
  redirect(`${CONTACT_LIST_PATH}/${id}/edit?success=created`);
}

export async function updateOfficialContact(
  id: string,
  previous: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const administrator = await requireAdministrator();
  const initial = validateContactFormData(formData, undefined);
  if (!initial.success) {
    return nextContactState(previous, {
      kind: "validation-error",
      values: initial.values,
      fieldErrors: initial.fieldErrors,
      formErrors: initial.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }
  if (!isValidOfficialContactId(id)) {
    return nextContactState(previous, {
      kind: "not-found",
      values: initial.values,
      fieldErrors: {},
      formErrors: [],
      message: "Kontak resmi tidak ditemukan.",
    });
  }
  const supabase = await createClient();
  const current = await queryOfficialContactById(supabase, id);
  if (!current.success) return contactDatabaseFailure(previous, initial.values);
  if (!current.contact) {
    return nextContactState(previous, {
      kind: "not-found",
      values: initial.values,
      fieldErrors: {},
      formErrors: [],
      message: "Kontak resmi tidak ditemukan.",
    });
  }
  const validation = validateContactFormData(formData, current.contact.status);
  if (!validation.success) {
    return nextContactState(previous, {
      kind: "validation-error",
      values: validation.values,
      fieldErrors: validation.fieldErrors,
      formErrors: validation.formErrors,
      message: "Periksa kembali data yang ditandai.",
    });
  }
  const { data, error } = await supabase
    .from("contacts")
    .update({ ...validation.data, updated_by: administrator.id })
    .eq("id", current.contact.id)
    .select("id")
    .overrideTypes<{ id: string }[], { merge: false }>();
  if (error || data?.length !== 1) {
    const code = error?.code ?? "unexpected-row-count";
    console.error("Pembaruan kontak resmi gagal.", { code });
    return contactMutationFailure(
      previous,
      validation.values,
      code,
      `${error?.message ?? ""} ${error?.details ?? ""}`,
    );
  }
  revalidatePath(CONTACT_LIST_PATH);
  revalidatePath(`${CONTACT_LIST_PATH}/${current.contact.id}/edit`);
  revalidateContactRoutes();
  redirect(`${CONTACT_LIST_PATH}/${current.contact.id}/edit?success=updated`);
}
