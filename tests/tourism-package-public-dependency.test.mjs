import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const DESTINATION_ID = "10000000-0000-4000-8000-000000000001";
const PACKAGE_A_ID = "20000000-0000-4000-8000-000000000001";
const PACKAGE_B_ID = "30000000-0000-4000-8000-000000000001";

const validUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

async function loadPackageData() {
  const source = readFileSync("features/tourism-packages/data.ts", "utf8")
    .replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "")
    .replace(/^"use server";\s*/m, "");
  const stripped = stripTypeScriptTypes(source, { mode: "strip" });
  const key = `__tourismPackageDataDeps_${Math.random().toString(36).slice(2)}`;
  globalThis[key] = {
    isValidDestinationId: validUuid,
    isValidTourismPackageId: validUuid,
    isValidTourismPackageSlug: (value) =>
      typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
  };
  try {
    return await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { isValidDestinationId, isValidTourismPackageId,
  isValidTourismPackageSlug } = deps;
${stripped}`)}`
    );
  } finally {
    delete globalThis[key];
  }
}

function createResolverRuntime({
  relationRows = [],
  packageRows = [],
  relationError = null,
  packageError = null,
} = {}) {
  const runtime = {
    relationRows,
    packageRows,
    relationError,
    packageError,
    tables: [],
  };
  runtime.client = {
    from(table) {
      runtime.tables.push(table);
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        in() {
          return chain;
        },
        overrideTypes() {
          return Promise.resolve(
            table === "package_destinations"
              ? { data: runtime.relationRows, error: runtime.relationError }
              : { data: runtime.packageRows, error: runtime.packageError },
          );
        },
      };
      return chain;
    },
  };
  return runtime;
}

test("Destination dependency resolver reads authoritative source relations and slugs", async () => {
  const loader = await loadPackageData();
  const runtime = createResolverRuntime({
    relationRows: [{ package_id: PACKAGE_A_ID }, { package_id: PACKAGE_B_ID }],
    packageRows: [
      { id: PACKAGE_B_ID, slug: "second-package" },
      { id: PACKAGE_A_ID, slug: "first-package" },
    ],
  });
  assert.deepEqual(
    await loader.queryTourismPackageSlugsByDestinationId(
      runtime.client,
      DESTINATION_ID,
    ),
    { success: true, slugs: ["second-package", "first-package"] },
  );
  assert.deepEqual(runtime.tables, [
    "package_destinations",
    "tourism_packages",
  ]);
});

test("Destination dependency resolver fails closed for invalid or unavailable source rows", async () => {
  const loader = await loadPackageData();
  const invalidDestination = createResolverRuntime({
    relationRows: [{ package_id: PACKAGE_A_ID }],
    packageRows: [{ id: PACKAGE_A_ID, slug: "first-package" }],
  });
  assert.deepEqual(
    await loader.queryTourismPackageSlugsByDestinationId(
      invalidDestination.client,
      "not-a-uuid",
    ),
    { success: true, slugs: [] },
  );
  assert.deepEqual(invalidDestination.tables, []);

  for (const options of [
    { relationRows: [{ package_id: "not-a-uuid" }] },
    {
      relationRows: [{ package_id: PACKAGE_A_ID }],
      packageRows: [{ id: PACKAGE_A_ID, slug: "not a slug" }],
    },
    {
      relationRows: [{ package_id: PACKAGE_A_ID }],
      packageRows: [],
    },
    { relationError: { code: "relation-read-failed" } },
    {
      relationRows: [{ package_id: PACKAGE_A_ID }],
      packageError: { code: "package-read-failed" },
    },
  ]) {
    const runtime = createResolverRuntime(options);
    const result = await loader.queryTourismPackageSlugsByDestinationId(
      runtime.client,
      DESTINATION_ID,
    );
    assert.deepEqual(result, { success: false, slugs: [] });
  }
});

async function loadDependencyRevalidation() {
  const source = readFileSync(
    "features/tourism-packages/public-dependency.ts",
    "utf8",
  ).replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(source, { mode: "strip" });
  const key = `__tourismPackageDependencyDeps_${Math.random()
    .toString(36)
    .slice(2)}`;
  const runtime = { results: [], paths: [] };
  globalThis[key] = {
    queryTourismPackageSlugsByDestinationId: async () =>
      runtime.results.shift() ?? { success: true, slugs: [] },
    revalidateEnglishTourismPackagePaths: (slugs) => {
      runtime.paths.push([...slugs]);
      return true;
    },
  };
  try {
    const dependencyModule = await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { queryTourismPackageSlugsByDestinationId,
  revalidateEnglishTourismPackagePaths } = deps;
${stripped}`)}`
    );
    return { dependencyModule, runtime };
  } finally {
    delete globalThis[key];
  }
}

test("Dependency revalidation unions old/current slugs and stays safe after committed mutations", async () => {
  const { dependencyModule, runtime } = await loadDependencyRevalidation();
  runtime.results = [{ success: true, slugs: ["current-package"] }];
  await dependencyModule.revalidateRelatedTourismPackagePaths(
    {},
    DESTINATION_ID,
    ["old-package"],
  );
  assert.deepEqual(runtime.paths, [["old-package", "current-package"]]);

  runtime.results = [{ success: false, slugs: [] }];
  await dependencyModule.revalidateRelatedTourismPackagePaths(
    {},
    DESTINATION_ID,
    ["old-package"],
  );
  assert.deepEqual(runtime.paths[1], ["old-package"]);
});

async function loadPackageRevalidation() {
  const source = readFileSync(
    "features/public-content/revalidation.ts",
    "utf8",
  ).replace(/import\s+[\s\S]*?from\s+["'][^"']+["'];\s*/g, "");
  const stripped = stripTypeScriptTypes(source, { mode: "strip" });
  const key = `__tourismPackageRevalidationDeps_${Math.random()
    .toString(36)
    .slice(2)}`;
  const runtime = { paths: [], fail: false };
  globalThis[key] = {
    PUBLIC_BILINGUAL_DOMAIN_REVALIDATION: {},
    PUBLIC_ENGLISH_HOME_PATH: "/en",
    PUBLIC_ENGLISH_TOURISM_MAP_PATH: "/en/tourism-map",
    PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH: "/en/tourism-packages",
    getPublicEnglishTourismPackagePath: (slug) =>
      `/en/tourism-packages/${encodeURIComponent(slug)}`,
    PUBLIC_SLUG_PATTERN: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    revalidatePath: (path) => {
      runtime.paths.push(path);
      if (runtime.fail) throw new Error("revalidation failed");
    },
  };
  try {
    const dependencyModule = await import(
      `data:text/javascript;charset=utf-8,${encodeURIComponent(`
const deps = globalThis.${key};
const { PUBLIC_BILINGUAL_DOMAIN_REVALIDATION, PUBLIC_ENGLISH_HOME_PATH,
  PUBLIC_ENGLISH_TOURISM_MAP_PATH, PUBLIC_ENGLISH_TOURISM_PACKAGES_PATH,
  getPublicEnglishTourismPackagePath, PUBLIC_SLUG_PATTERN, revalidatePath } = deps;
${stripped}`)}`
    );
    return { dependencyModule, runtime };
  } finally {
    delete globalThis[key];
  }
}

test("English Tourism Package revalidation includes the homepage but never the tourism map", async () => {
  const { dependencyModule, runtime } = await loadPackageRevalidation();
  assert.equal(
    dependencyModule.revalidateEnglishTourismPackagePaths([
      "first-package",
      "first-package",
      "not a slug",
    ]),
    true,
  );
  assert.deepEqual(runtime.paths, [
    "/en/tourism-packages",
    "/en",
    "/en/tourism-packages/first-package",
  ]);
  assert.equal(runtime.paths.includes("/en"), true);
  assert.equal(runtime.paths.includes("/en/tourism-map"), false);
});
