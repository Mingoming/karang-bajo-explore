import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getAllowedTourismPackageStatuses,
  getTourismPackageMutationMode,
  isTourismPackageDuplicateConstraintError,
  isValidTourismPackageId,
  isValidTourismPackageSlug,
  normalizeTourismPackageSlug,
  tourismPackageDestinationsToRpcValue,
  validateTourismPackageInput,
} from "../features/tourism-packages/model.ts";

const DESTINATION_A = "d1000000-0000-4000-8000-000000000001";
const DESTINATION_B = "d1000000-0000-4000-8000-000000000002";
const options = [
  { id: DESTINATION_A, name: "Air Terjun", status: "published" },
  { id: DESTINATION_B, name: "Kampung Adat", status: "draft" },
];
function validInput(overrides = {}) {
  return {
    name: "Paket Jelajah Karang Bajo",
    package_type: "standard",
    duration_value: "2",
    duration_unit: "hari",
    description: "Informasi paket yang sudah diverifikasi",
    display_order: "0",
    status: "draft",
    destination_id: [DESTINATION_A],
    destination_order: ["0"],
    destination_note: ["Berangkat pagi"],
    ...overrides,
  };
}
function context(overrides = {}) {
  return {
    mode: "create",
    hasThumbnail: false,
    destinationOptions: options,
    ...overrides,
  };
}

test("package form normalizes a typed payload and ordered destinations", () => {
  const result = validateTourismPackageInput(
    validInput({
      name: "  Paket Jelajah  ",
      price: "0",
      price_note: " termasuk makan ",
      included_facilities: " Makan\n\n Pemandu ",
      souvenir: " kain ",
      summary: " ringkas ",
      is_featured: "on",
      destination_id: [DESTINATION_B, DESTINATION_A],
      destination_order: ["5", "2"],
      destination_note: [" kedua ", " pertama "],
    }),
    context(),
  );
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.name, "Paket Jelajah");
  assert.equal(result.data.price, 0);
  assert.deepEqual(result.data.included_facilities, ["Makan", "Pemandu"]);
  assert.equal(result.data.is_featured, true);
  assert.deepEqual(
    result.destinations.map(({ destinationId, displayOrder }) => ({
      destinationId,
      displayOrder,
    })),
    [
      { destinationId: DESTINATION_A, displayOrder: 0 },
      { destinationId: DESTINATION_B, displayOrder: 1 },
    ],
  );
});

test("required package fields reject missing and whitespace values", () => {
  const result = validateTourismPackageInput(
    validInput({ name: " ", description: "", duration_unit: " " }),
    context(),
  );
  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.fieldErrors.name ?? "", /wajib/);
  assert.match(result.fieldErrors.description ?? "", /wajib/);
  assert.match(result.fieldErrors.duration_unit ?? "", /wajib/);
});

test("nullable package values become null and facilities become an empty array", () => {
  const result = validateTourismPackageInput(
    validInput({
      price: "",
      price_note: " ",
      included_facilities: "\n",
      souvenir: "",
      summary: " ",
    }),
    context(),
  );
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.price, null);
  assert.equal(result.data.price_note, null);
  assert.deepEqual(result.data.included_facilities, []);
  assert.equal(result.data.souvenir, null);
  assert.equal(result.data.summary, null);
});

test("duration accepts positive integers and rejects zero, fractions, and malformed values", () => {
  for (const value of ["0", "-1", "1.5", "x"])
    assert.equal(
      validateTourismPackageInput(
        validInput({ duration_value: value }),
        context(),
      ).success,
      false,
    );
  assert.equal(
    validateTourismPackageInput(validInput({ duration_value: "3" }), context())
      .success,
    true,
  );
});

test("price accepts null, zero, and positive numeric values but rejects invalid values", () => {
  for (const value of ["", "0", "150000", "125000.5"])
    assert.equal(
      validateTourismPackageInput(validInput({ price: value }), context())
        .success,
      true,
    );
  for (const value of ["-1", "NaN", "Infinity", "gratis"])
    assert.equal(
      validateTourismPackageInput(validInput({ price: value }), context())
        .success,
      false,
    );
});

test("package type, lifecycle, and display order reject malformed values", () => {
  assert.equal(
    validateTourismPackageInput(
      validInput({ package_type: "luxury" }),
      context(),
    ).success,
    false,
  );
  assert.equal(
    validateTourismPackageInput(validInput({ status: "approved" }), context())
      .success,
    false,
  );
  assert.equal(
    validateTourismPackageInput(validInput({ display_order: "-1" }), context())
      .success,
    false,
  );
});

test("destination identifiers must be available UUIDs without duplicates", () => {
  for (const id of ["bad", "d1000000-0000-4000-8000-000000000099"])
    assert.equal(
      validateTourismPackageInput(
        validInput({ destination_id: [id] }),
        context(),
      ).success,
      false,
    );
  assert.equal(
    validateTourismPackageInput(
      validInput({
        destination_id: [DESTINATION_A, DESTINATION_A],
        destination_order: ["0", "1"],
        destination_note: ["", ""],
      }),
      context(),
    ).success,
    false,
  );
});

test("destination ordering rejects duplicate and malformed positions", () => {
  assert.equal(
    validateTourismPackageInput(
      validInput({
        destination_id: [DESTINATION_A, DESTINATION_B],
        destination_order: ["0", "0"],
        destination_note: ["", ""],
      }),
      context(),
    ).success,
    false,
  );
  assert.equal(
    validateTourismPackageInput(
      validInput({ destination_order: ["x"] }),
      context(),
    ).success,
    false,
  );
});

test("draft publication requires thumbnail, a destination, and published destinations", () => {
  const publishing = {
    mode: "update",
    currentStatus: "draft",
    hasThumbnail: true,
    destinationOptions: options,
    currentDestinations: [
      {
        destinationId: DESTINATION_A,
        displayOrder: 0,
        notes: "Berangkat pagi",
      },
    ],
  };
  assert.equal(
    validateTourismPackageInput(validInput({ status: "published" }), publishing)
      .success,
    true,
  );
  assert.equal(
    validateTourismPackageInput(validInput({ status: "published" }), {
      ...publishing,
      hasThumbnail: false,
    }).success,
    false,
  );
  assert.equal(
    validateTourismPackageInput(
      validInput({
        status: "published",
        destination_id: [],
        destination_order: [],
        destination_note: [],
      }),
      publishing,
    ).success,
    false,
  );
  assert.equal(
    validateTourismPackageInput(
      validInput({ status: "published", destination_id: [DESTINATION_B] }),
      publishing,
    ).success,
    false,
  );
});

test("placeholder package text prevents publication", () => {
  const result = validateTourismPackageInput(
    validInput({ status: "published", description: "TODO" }),
    {
      mode: "update",
      currentStatus: "draft",
      hasThumbnail: true,
      destinationOptions: options,
      currentDestinations: [
        {
          destinationId: DESTINATION_A,
          displayOrder: 0,
          notes: "Berangkat pagi",
        },
      ],
    },
  );
  assert.equal(result.success, false);
});

test("lifecycle options follow draft, published, archived rules", () => {
  assert.deepEqual(getAllowedTourismPackageStatuses(null), ["draft"]);
  assert.deepEqual(getAllowedTourismPackageStatuses("published"), [
    "published",
    "archived",
  ]);
  assert.deepEqual(getAllowedTourismPackageStatuses("archived"), [
    "archived",
    "draft",
  ]);
});

test("non-draft packages reject destination relationship edits", () => {
  const result = validateTourismPackageInput(
    validInput({ status: "published", destination_note: ["changed"] }),
    {
      mode: "update",
      currentStatus: "published",
      hasThumbnail: true,
      destinationOptions: options,
      currentDestinations: [
        {
          destinationId: DESTINATION_A,
          displayOrder: 0,
          notes: "Berangkat pagi",
        },
      ],
    },
  );
  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.fieldErrors.destinations ?? "", /draf/);
});

test("slug normalization is deterministic and malformed slugs are rejected", () => {
  assert.equal(
    normalizeTourismPackageSlug("Paket Budaya & Alam"),
    "paket-budaya-alam",
  );
  assert.equal(isValidTourismPackageSlug("paket-budaya-alam"), true);
  assert.equal(isValidTourismPackageSlug("Paket Buruk!"), false);
});

test("duplicate classification is limited to package name and slug constraints", () => {
  assert.equal(
    isTourismPackageDuplicateConstraintError(
      "23505",
      "tourism_packages_slug_key",
    ),
    true,
  );
  assert.equal(
    isTourismPackageDuplicateConstraintError(
      "23505",
      "tourism_packages_active_name_idx",
    ),
    true,
  );
  assert.equal(
    isTourismPackageDuplicateConstraintError(
      "23505",
      "package_destinations_package_id_destination_id_key",
    ),
    false,
  );
  assert.equal(
    isTourismPackageDuplicateConstraintError(
      "23514",
      "tourism_packages_slug_key",
    ),
    false,
  );
});

test("route IDs and create-versus-update mode are validated", () => {
  assert.equal(
    isValidTourismPackageId("d2000000-0000-4000-8000-000000000001"),
    true,
  );
  assert.equal(isValidTourismPackageId("bad"), false);
  assert.equal(getTourismPackageMutationMode(null), "create");
  assert.equal(
    getTourismPackageMutationMode({
      id: "d2000000-0000-4000-8000-000000000001",
    }),
    "update",
  );
});

test("unknown fields and unsupported product structures are rejected", () => {
  for (const field of [
    "participant_limit",
    "exclusions",
    "itinerary",
    "duration_per_stop",
  ]) {
    const result = validateTourismPackageInput(
      validInput({ [field]: "unexpected" }),
      context(),
    );
    assert.equal(result.success, false);
    if (!result.success)
      assert.match(result.formErrors.join(" "), /tidak dikenali/);
  }
});

test("RPC destination payload is deterministic and normalizes empty notes", () => {
  assert.deepEqual(
    tourismPackageDestinationsToRpcValue([
      { destinationId: DESTINATION_A, displayOrder: 0, notes: " pertama " },
      { destinationId: DESTINATION_B, displayOrder: 1, notes: " " },
    ]),
    [
      {
        destination_id: DESTINATION_A,
        display_order: 0,
        notes: "pertama",
      },
      {
        destination_id: DESTINATION_B,
        display_order: 1,
        notes: null,
      },
    ],
  );
});

test("Tourism Package actions use transactional RPCs without sequential table writes", async () => {
  const source = await readFile(
    new URL("../features/tourism-packages/actions.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /rpc\("tourism_package_create"/);
  assert.match(source, /rpc\("tourism_package_update"/);
  assert.doesNotMatch(
    source,
    /from\("tourism_packages"\)\s*\.(?:insert|update|delete)/s,
  );
  assert.doesNotMatch(
    source,
    /from\("package_destinations"\)\s*\.(?:insert|update|delete)/s,
  );
  assert.doesNotMatch(
    source,
    /compensat|restoreRelations|synchronizeRelations/,
  );
});

test("transactional RPC migration enforces authorization and least privilege", async () => {
  const source = await readFile(
    new URL(
      "../supabase/migrations/20260730044746_tourism_package_transactional_rpcs.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    source,
    /create or replace function public\.tourism_package_create/,
  );
  assert.match(
    source,
    /create or replace function public\.tourism_package_update/,
  );
  assert.equal((source.match(/security definer/g) ?? []).length, 2);
  assert.equal((source.match(/set search_path = ''/g) ?? []).length, 3);
  assert.match(source, /caller_id is null or not public\.is_admin\(\)/);
  assert.match(source, /for update/);
  assert.match(source, /for share/);
  assert.match(
    source,
    /revoke insert, update, delete on table public\.tourism_packages/,
  );
  assert.match(
    source,
    /revoke insert, update, delete on table public\.package_destinations/,
  );
  assert.doesNotMatch(source, /create or replace function public\.media_/);
});
