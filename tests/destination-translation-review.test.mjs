import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getDestinationTranslationLifecycleLabel,
  getDestinationTranslationLifecycleStatus,
} from "../features/destination-translation/model.ts";

const read = (path) => readFileSync(path, "utf8");

test("destination translation lifecycle presentation is database-state driven", () => {
  const cases = [
    [null, null, "blocked", "draft", "Draft"],
    ["draft", "pending", "blocked", "awaiting-review", "Awaiting review"],
    ["draft", "reviewed", "blocked", "reviewed", "Reviewed"],
    ["published", "reviewed", "eligible", "published", "Published"],
    ["published", "reviewed", "blocked", "stale", "Stale"],
    ["archived", "reviewed", "blocked", "archived", "Archived"],
  ];

  for (const [
    status,
    reviewState,
    publicEligibility,
    expected,
    label,
  ] of cases) {
    const lifecycleStatus = getDestinationTranslationLifecycleStatus(
      status,
      reviewState,
      publicEligibility,
    );

    assert.equal(lifecycleStatus, expected);
    assert.equal(
      getDestinationTranslationLifecycleLabel(lifecycleStatus),
      label,
    );
  }
});

test("the review form renders explicit lifecycle and stale-state presentation", () => {
  const formSource = read(
    "features/destination-translation/destination-translation-form.tsx",
  );
  const modelSource = read("features/destination-translation/model.ts");

  for (const label of [
    "Draft",
    "Awaiting review",
    "Reviewed",
    "Published",
    "Stale",
    "Archived",
  ]) {
    assert.match(modelSource, new RegExp(`"${label}"`));
  }

  assert.match(formSource, /getDestinationTranslationLifecycleStatus/);
  assert.match(formSource, /data-lifecycle-status=/);
  assert.match(formSource, /lifecycleStatus === "stale"/);
  for (const cause of ["source", "media", "thumbnail", "fingerprint"]) {
    assert.match(formSource, new RegExp(cause, "i"));
  }
  assert.match(formSource, /Database tetap menjadi satu-satunya/);
  assert.doesNotMatch(formSource, /crypto|createHash|fingerprint\s*\(/i);
});

test("review actions remain RPC-backed and expose the required intents", () => {
  const actionSource = read("features/destination-translation/actions.ts");
  const dataSource = read("features/destination-translation/data.ts");
  const formSource = read(
    "features/destination-translation/destination-translation-form.tsx",
  );

  assert.match(actionSource, /await requireAdministrator\(\)/);
  assert.doesNotMatch(
    actionSource,
    /formData\.get\(["'](?:actor|actor_id|created_by|updated_by)/i,
  );
  assert.doesNotMatch(
    actionSource,
    /\.from\(["']destination_translations["']\)/,
  );
  assert.doesNotMatch(dataSource, /\.from\(["']destination_translations["']\)/);

  for (const rpc of [
    "destination_translation_save_draft",
    "destination_translation_review",
    "destination_translation_reject",
    "destination_translation_publish",
    "destination_translation_archive",
    "destination_translation_restore",
  ]) {
    assert.match(actionSource, new RegExp(rpc));
  }

  for (const intent of [
    "save-draft",
    "review",
    "reject",
    "publish",
    "archive",
    "restore",
  ]) {
    assert.match(
      formSource,
      new RegExp(`name="intent"[\\s\\S]*?value="${intent}"`),
    );
  }

  assert.match(actionSource, /p_expected_edit_revision/);
  assert.match(
    actionSource,
    /revalidatePublicDomainPaths\("destination", \[sourceSlug\]\)/,
  );
});

test("source comparison has no Indonesian fallback and preserves the Indonesian editor", () => {
  const formSource = read(
    "features/destination-translation/destination-translation-form.tsx",
  );
  const pageSource = read("app/admin/destinasi/[id]/edit/page.tsx");

  assert.match(formSource, /Referensi Indonesia/);
  assert.match(formSource, /sourceFieldValue\(sourceReference, field\)/);
  assert.match(formSource, /state\.values\[field\]/);
  assert.doesNotMatch(formSource, /state\.values\[[^\]]+\]\s*\?\?/);
  assert.doesNotMatch(formSource, /sourceReference\.[a-z_]+\s*\?\?/);
  assert.match(formSource, /tidak pernah\s+digunakan sebagai nilai awal/);

  assert.match(pageSource, /<DestinationForm/);
  assert.match(pageSource, /<DestinationTranslationForm/);
});
