import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  destinationImageTranslationToFormValues,
  emptyDestinationImageTranslationFormValues,
  getDestinationImageTranslationLifecycleLabel,
  getDestinationImageTranslationLifecycleStatus,
  validateDestinationImageTranslationInput,
} from "../features/destination-image-translation/model.ts";

const read = (path) => readFileSync(path, "utf8");

test("image translation validation requires English alt text and permits empty caption", () => {
  const missingAlt = validateDestinationImageTranslationInput({
    alt_text: "",
    caption: "Caption",
  });

  assert.equal(missingAlt.success, false);
  if (missingAlt.success) return;
  assert.match(missingAlt.fieldErrors.alt_text ?? "", /wajib diisi/);

  const valid = validateDestinationImageTranslationInput({
    alt_text: "English alt text",
    caption: "",
  });

  assert.equal(valid.success, true);
  if (!valid.success) return;
  assert.deepEqual(valid.data, {
    alt_text: "English alt text",
    caption: null,
  });
});

test("empty English image values never use Indonesian source values", () => {
  const empty = emptyDestinationImageTranslationFormValues();
  const projected = destinationImageTranslationToFormValues(null);

  assert.deepEqual(projected, empty);
  assert.equal(projected.alt_text, "");
  assert.equal(projected.caption, "");
});

test("image translation lifecycle presentation is database-state driven", () => {
  const cases = [
    [null, null, "blocked", "draft", "Draft"],
    ["draft", "pending", "blocked", "awaiting-review", "Awaiting review"],
    ["draft", "reviewed", "blocked", "reviewed", "Reviewed"],
    ["published", "reviewed", "eligible", "published", "Published"],
    ["published", "reviewed", "blocked", "stale", "Stale"],
    ["archived", "pending", "blocked", "archived", "Archived"],
  ];

  for (const [status, reviewState, eligibility, expected, label] of cases) {
    const lifecycleStatus = getDestinationImageTranslationLifecycleStatus(
      status,
      reviewState,
      eligibility,
    );

    assert.equal(lifecycleStatus, expected);
    assert.equal(
      getDestinationImageTranslationLifecycleLabel(lifecycleStatus),
      label,
    );
  }
});

test("image admin data uses RPCs and the database-owned public image view", () => {
  const dataSource = read("features/destination-image-translation/data.ts");

  assert.match(dataSource, /requireAdministrator\(\)/);
  assert.match(dataSource, /destination_image_translation_admin_read/);
  assert.match(dataSource, /destination_image_translation_review_history/);
  assert.match(dataSource, /published_english_destination_images/);
  assert.match(dataSource, /queryMediaImages/);
  assert.doesNotMatch(
    dataSource,
    /\.from\(["']destination_image_translations["']\)/,
  );
  assert.doesNotMatch(dataSource, /\.storage\.(upload|remove)/);
});

test("image translation actions preserve administrator and RPC boundaries", () => {
  const actionSource = read(
    "features/destination-image-translation/actions.ts",
  );

  assert.match(actionSource, /await requireAdministrator\(\)/);
  assert.match(actionSource, /p_expected_edit_revision/);
  assert.doesNotMatch(
    actionSource,
    /formData\.get\(["'](?:actor|actor_id|created_by|updated_by)/i,
  );
  assert.doesNotMatch(
    actionSource,
    /\.from\(["']destination_image_translations["']\)/,
  );
  assert.doesNotMatch(actionSource, /\.storage\.(upload|remove)/);

  for (const rpc of [
    "destination_image_translation_save_draft",
    "destination_image_translation_review",
    "destination_image_translation_reject",
    "destination_image_translation_publish",
    "destination_image_translation_republish",
    "destination_image_translation_archive",
    "destination_image_translation_unpublish",
    "destination_image_translation_restore",
  ]) {
    assert.match(actionSource, new RegExp(rpc));
  }

  assert.match(actionSource, /ENGLISH_DESTINATIONS_PATH/);
  assert.match(actionSource, /encodeURIComponent\(sourceSlug\)/);
});

test("image translation form separates source reference from English inputs", () => {
  const formSource = read(
    "features/destination-image-translation/destination-image-translation-form.tsx",
  );

  assert.match(formSource, /Referensi Indonesia/);
  assert.match(formSource, /sourceReference\.previewUrl/);
  assert.match(formSource, /state\.values\[field\]/);
  assert.match(formSource, /lifecycleStatus === "stale"/);
  for (const cause of ["media", "binary revision", "fingerprint"]) {
    assert.match(formSource, new RegExp(cause, "i"));
  }
  assert.match(formSource, /Database\s+tetap menjadi satu-satunya/);
  assert.doesNotMatch(formSource, /state\.values\[[^\]]+\]\s*\?\?/);
  assert.doesNotMatch(formSource, /sourceReference\.[a-zA-Z]+\s*\?\?/);

  for (const intent of [
    "save-draft",
    "review",
    "reject",
    "publish",
    "republish",
    "archive",
    "unpublish",
    "restore",
  ]) {
    assert.match(
      formSource,
      new RegExp(`name="intent"[\\s\\S]*?value="${intent}"`),
    );
  }
});

test("destination edit page preserves both destination workflows", () => {
  const pageSource = read("app/admin/destinasi/[id]/edit/page.tsx");

  assert.match(pageSource, /<DestinationForm/);
  assert.match(pageSource, /<DestinationTranslationForm/);
  assert.match(pageSource, /<DestinationImageTranslationForm/);
  assert.match(pageSource, /getDestinationImageTranslationAdminData/);
  assert.match(pageSource, /createDestinationImageTranslationActionState/);
});
