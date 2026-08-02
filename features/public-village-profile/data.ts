import { createClient } from "@/lib/supabase/server";

import { cache } from "react";

import {
  classifyPublishedVillageProfiles,
  type PublishedVillageProfileRow,
  type PublicVillageProfileResult,
} from "./model";

export const PUBLISHED_VILLAGE_PROFILES_VIEW = "published_village_profiles";

const PUBLIC_VILLAGE_PROFILE_COLUMNS = [
  "id",
  "name",
  "slug",
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

async function queryPublishedVillageProfile(): Promise<PublicVillageProfileResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(PUBLISHED_VILLAGE_PROFILES_VIEW)
    .select(PUBLIC_VILLAGE_PROFILE_COLUMNS)
    .limit(2)
    .overrideTypes<PublishedVillageProfileRow[], { merge: false }>();

  if (error) {
    console.error("Profil desa publik gagal dimuat.", {
      code: error.code,
    });
    return { kind: "error" };
  }

  const result = classifyPublishedVillageProfiles(data);
  if (result.kind === "error") {
    console.error("Invariant singleton profil desa publik dilanggar.");
  }
  return result;
}

export const getPublishedVillageProfile = cache(queryPublishedVillageProfile);

export async function getPublishedVillageProfileMetadata() {
  const result = await getPublishedVillageProfile();
  if (result.kind !== "ready") return null;

  return {
    title: result.profile.name,
    description:
      result.profile.summary ?? result.profile.description.slice(0, 160),
  };
}
