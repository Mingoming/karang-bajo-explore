import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { PRIMARY_WHATSAPP_KEY, type PublicWhatsappSettingRow } from "./model";
import {
  classifyEnglishPublicShellData,
  type EnglishPublicShellContactRow,
  type EnglishPublicShellDataResult,
} from "./public-shell-model";

export type { EnglishPublicShellDataResult } from "./public-shell-model";

export async function queryEnglishPublicShellData(
  supabase: SupabaseClient,
): Promise<EnglishPublicShellDataResult> {
  const [settingResult, contactsResult] = await Promise.all([
    supabase
      .from("public_site_settings")
      .select("key,value")
      .eq("key", PRIMARY_WHATSAPP_KEY)
      .maybeSingle()
      .overrideTypes<PublicWhatsappSettingRow | null, { merge: false }>(),
    supabase
      .from("published_contacts")
      .select("label,contact_type,value,display_order")
      .order("display_order")
      .order("label")
      .overrideTypes<EnglishPublicShellContactRow[], { merge: false }>(),
  ]);

  if (settingResult.error || contactsResult.error) {
    console.error("English public-shell contact data could not be loaded.", {
      settingCode: settingResult.error?.code,
      contactsCode: contactsResult.error?.code,
    });
    return { kind: "error" };
  }

  return classifyEnglishPublicShellData(
    settingResult.data,
    contactsResult.data,
  );
}

async function loadEnglishPublicShellData() {
  return queryEnglishPublicShellData(await createClient());
}

export const getEnglishPublicShellData = cache(loadEnglishPublicShellData);
