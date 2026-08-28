import { revalidatePath } from "next/cache";

import {
  PUBLIC_BILINGUAL_DOMAIN_REVALIDATION,
  PUBLIC_ENGLISH_HOME_PATH,
  PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH,
  PUBLIC_ENGLISH_TOURISM_MAP_PATH,
  getPublicEnglishTourismPackagePath,
  type PublicBilingualDomain,
} from "@/config/public-routes";
import { PUBLIC_SLUG_PATTERN } from "./model";

export function revalidateEnglishAggregatePaths(includeTourismMap: boolean) {
  revalidatePath(PUBLIC_ENGLISH_HOME_PATH);
  if (includeTourismMap) revalidatePath(PUBLIC_ENGLISH_TOURISM_MAP_PATH);
}

export function revalidatePublicDomainDetailPaths(
  domain: PublicBilingualDomain,
  trustedSlugs: readonly unknown[],
) {
  const config = PUBLIC_BILINGUAL_DOMAIN_REVALIDATION[domain];

  for (const slug of new Set(trustedSlugs)) {
    if (typeof slug !== "string" || !PUBLIC_SLUG_PATTERN.test(slug)) {
      continue;
    }
    revalidatePath(config.getPublicDetailPath(slug));
    revalidatePath(config.getEnglishDetailPath(slug));
  }
}

export function revalidatePublicDomainPaths(
  domain: PublicBilingualDomain,
  trustedSlugs: readonly unknown[],
) {
  const config = PUBLIC_BILINGUAL_DOMAIN_REVALIDATION[domain];
  revalidatePath(config.publicCollectionPath);
  revalidatePath(config.englishCollectionPath);
  revalidateEnglishAggregatePaths(config.includeEnglishTourismMap);
  revalidatePublicDomainDetailPaths(domain, trustedSlugs);
}

export function revalidateEnglishTourismPackagePaths(
  trustedSlugs: readonly unknown[],
) {
  let success = true;
  const paths: string[] = [
    PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH,
    PUBLIC_ENGLISH_HOME_PATH,
  ];

  for (const slug of new Set(trustedSlugs)) {
    if (typeof slug !== "string" || !PUBLIC_SLUG_PATTERN.test(slug)) {
      continue;
    }
    paths.push(getPublicEnglishTourismPackagePath(slug));
  }

  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      success = false;
      console.error("Revalidasi English Tourism Package gagal.", {
        code: "revalidation-failed",
      });
    }
  }

  return success;
}
