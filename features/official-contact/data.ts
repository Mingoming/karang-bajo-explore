import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import { requireAdministrator } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

import {
  classifyPublicOfficialContacts,
  isValidOfficialContactId,
  PRIMARY_WHATSAPP_KEY,
  type OfficialContactRecord,
  type PublicOfficialContactResult,
  type PublicOfficialContactRow,
  type SiteSettingRecord,
} from "./model";

const CONTACT_COLUMNS =
  "id,label,contact_type,value,url,description,display_order,status,created_at,updated_at,created_by,updated_by";
const PUBLIC_CONTACT_COLUMNS =
  "id,label,contact_type,value,description,display_order";
const SETTING_COLUMNS =
  "id,key,value,value_type,label,description,is_public,is_editable,created_at,updated_at,created_by,updated_by";

export async function queryPrimaryWhatsappSetting(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("site_settings")
    .select(SETTING_COLUMNS)
    .eq("key", PRIMARY_WHATSAPP_KEY)
    .maybeSingle()
    .overrideTypes<SiteSettingRecord | null, { merge: false }>();
  if (error) {
    console.error("Pengaturan WhatsApp utama gagal dimuat.", {
      code: error.code,
    });
    return { success: false as const };
  }
  return { success: true as const, setting: data };
}

export async function queryOfficialContactById(
  supabase: SupabaseClient,
  id: string,
) {
  if (!isValidOfficialContactId(id))
    return { success: true as const, contact: null };
  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<OfficialContactRecord | null, { merge: false }>();
  if (error) {
    console.error("Kontak resmi gagal dimuat.", { code: error.code });
    return { success: false as const };
  }
  return { success: true as const, contact: data };
}

export async function getAdministratorOfficialContacts() {
  await requireAdministrator();
  const { data, error } = await (
    await createClient()
  )
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .order("display_order")
    .order("label")
    .order("id")
    .overrideTypes<OfficialContactRecord[], { merge: false }>();
  if (error) {
    console.error("Daftar kontak resmi gagal dimuat.", { code: error.code });
    return { success: false as const };
  }
  return { success: true as const, contacts: data };
}

export async function getAdministratorPrimaryWhatsapp() {
  await requireAdministrator();
  return queryPrimaryWhatsappSetting(await createClient());
}

export async function getOfficialContactEditor(id: string) {
  await requireAdministrator();
  if (!isValidOfficialContactId(id)) return { kind: "invalid-id" as const };
  const result = await queryOfficialContactById(await createClient(), id);
  if (!result.success) return { kind: "read-error" as const };
  if (!result.contact) return { kind: "not-found" as const };
  return { kind: "ready" as const, contact: result.contact };
}

async function queryPublicOfficialContacts(): Promise<PublicOfficialContactResult> {
  const supabase = await createClient();
  const [settingResult, contactsResult] = await Promise.all([
    supabase
      .from("public_site_settings")
      .select("key,value")
      .eq("key", PRIMARY_WHATSAPP_KEY)
      .maybeSingle()
      .overrideTypes<
        { key: string; value: string | null } | null,
        { merge: false }
      >(),
    supabase
      .from("published_contacts")
      .select(PUBLIC_CONTACT_COLUMNS)
      .order("display_order")
      .order("label")
      .order("id")
      .overrideTypes<PublicOfficialContactRow[], { merge: false }>(),
  ]);
  if (settingResult.error || contactsResult.error) {
    console.error("Kontak publik gagal dimuat.", {
      settingCode: settingResult.error?.code,
      contactsCode: contactsResult.error?.code,
    });
    return { kind: "error" };
  }
  const result = classifyPublicOfficialContacts(
    settingResult.data,
    contactsResult.data,
  );
  if (result.kind === "error") {
    console.error("Data kontak publik tidak memenuhi kontrak aplikasi.", {
      stage: "validation",
    });
  }
  return result;
}

export const getPublicOfficialContacts = cache(queryPublicOfficialContacts);
