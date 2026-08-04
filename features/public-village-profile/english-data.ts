import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import {
  classifyPublishedEnglishVillageProfiles,
  type PublishedEnglishVillageProfileRow,
  type PublicEnglishVillageProfileResult,
} from "./english-model";

export const PUBLISHED_ENGLISH_VILLAGE_PROFILES_VIEW =
  "published_english_village_profiles";

const PUBLIC_ENGLISH_VILLAGE_PROFILE_COLUMNS = [
  "id",
  "name",
  "summary",
  "description",
  "history",
  "vision",
  "mission",
  "address",
  "latitude",
  "longitude",
  "google_maps_url",
  "published_at",
].join(",");

async function queryPublishedEnglishVillageProfile(): Promise<PublicEnglishVillageProfileResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(PUBLISHED_ENGLISH_VILLAGE_PROFILES_VIEW)
    .select(PUBLIC_ENGLISH_VILLAGE_PROFILE_COLUMNS)
    .limit(2)
    .overrideTypes<PublishedEnglishVillageProfileRow[], { merge: false }>();

  if (error) {
    console.error("English public Village Profile failed to load.", {
      code: error.code,
    });

    return { kind: "error" };
  }

  const result = classifyPublishedEnglishVillageProfiles(data);

  if (result.kind === "error") {
    console.error(
      "English public Village Profile singleton invariant was violated.",
    );
  }

  return result;
}

export const getPublishedEnglishVillageProfile = cache(
  queryPublishedEnglishVillageProfile,
);

export async function getPublishedEnglishVillageProfileMetadata() {
  const result = await getPublishedEnglishVillageProfile();

  if (result.kind !== "ready") return null;

  return {
    title: result.profile.name,
    description:
      result.profile.summary ?? result.profile.description.slice(0, 160),
  };
}
