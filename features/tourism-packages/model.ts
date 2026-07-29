export const TOURISM_PACKAGE_FORM_FIELDS = [
  "name",
  "package_type",
  "duration_value",
  "duration_unit",
  "price",
  "price_note",
  "included_facilities",
  "souvenir",
  "summary",
  "description",
  "is_featured",
  "display_order",
  "status",
  "destinations",
] as const;

export const TOURISM_PACKAGE_TYPES = ["budget", "standard", "premium"] as const;
export const TOURISM_PACKAGE_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export type TourismPackageFormField =
  (typeof TOURISM_PACKAGE_FORM_FIELDS)[number];
export type TourismPackageType = (typeof TOURISM_PACKAGE_TYPES)[number];
export type TourismPackageStatus = (typeof TOURISM_PACKAGE_STATUSES)[number];
export type TourismPackageMutationMode = "create" | "update";

export type PackageDestinationValue = {
  destinationId: string;
  displayOrder: number;
  notes: string;
};

export type DestinationOption = {
  id: string;
  name: string;
  status: TourismPackageStatus;
};

export type TourismPackageRecord = {
  id: string;
  name: string;
  slug: string;
  package_type: TourismPackageType;
  duration_value: number;
  duration_unit: string;
  price: number | null;
  price_note: string | null;
  included_facilities: string[];
  souvenir: string | null;
  summary: string | null;
  description: string;
  thumbnail_path: string | null;
  thumbnail_bucket: string | null;
  is_featured: boolean;
  display_order: number;
  status: TourismPackageStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TourismPackageListItem = Pick<
  TourismPackageRecord,
  | "id"
  | "name"
  | "package_type"
  | "duration_value"
  | "duration_unit"
  | "price"
  | "is_featured"
  | "display_order"
  | "status"
  | "updated_at"
>;

export type TourismPackageFormValues = {
  name: string;
  package_type: string;
  duration_value: string;
  duration_unit: string;
  price: string;
  price_note: string;
  included_facilities: string;
  souvenir: string;
  summary: string;
  description: string;
  is_featured: boolean;
  display_order: string;
  status: string;
  destinations: PackageDestinationValue[];
};

export type TourismPackageMutationValues = {
  name: string;
  package_type: TourismPackageType;
  duration_value: number;
  duration_unit: string;
  price: number | null;
  price_note: string | null;
  included_facilities: string[];
  souvenir: string | null;
  summary: string | null;
  description: string;
  is_featured: boolean;
  display_order: number;
  status: TourismPackageStatus;
};

export type TourismPackageInsertPayload = TourismPackageMutationValues & {
  slug: string;
  created_by: string;
  updated_by: string;
};
export type TourismPackageUpdatePayload = TourismPackageMutationValues & {
  updated_by: string;
};
export type PackageDestinationInsertPayload = {
  package_id: string;
  destination_id: string;
  display_order: number;
  notes: string | null;
  created_by: string;
};

export type TourismPackageFieldErrors = Partial<
  Record<TourismPackageFormField, string>
>;
export type TourismPackageActionState = {
  kind:
    | "idle"
    | "validation-error"
    | "duplicate-error"
    | "not-found"
    | "database-error"
    | "relation-error";
  values: TourismPackageFormValues;
  fieldErrors: TourismPackageFieldErrors;
  formErrors: string[];
  message: string | null;
  revision: number;
};

export type TourismPackageValidationContext = {
  mode: TourismPackageMutationMode;
  currentStatus?: TourismPackageStatus;
  hasThumbnail?: boolean;
  destinationOptions?: DestinationOption[];
  currentDestinations?: PackageDestinationValue[];
};

export type TourismPackageValidationResult =
  | {
      success: true;
      data: TourismPackageMutationValues;
      destinations: PackageDestinationValue[];
      values: TourismPackageFormValues;
    }
  | {
      success: false;
      values: TourismPackageFormValues;
      fieldErrors: TourismPackageFieldErrors;
      formErrors: string[];
    };

const EMPTY_VALUES: TourismPackageFormValues = {
  name: "",
  package_type: "standard",
  duration_value: "1",
  duration_unit: "hari",
  price: "",
  price_note: "",
  included_facilities: "",
  souvenir: "",
  summary: "",
  description: "",
  is_featured: false,
  display_order: "0",
  status: "draft",
  destinations: [],
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INTEGER_PATTERN = /^[+-]?\d+$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const PLACEHOLDER_PATTERN =
  /\b(?:lorem ipsum|tbd|todo|isi nanti|belum diisi)\b/i;
const DUPLICATE_CONSTRAINTS = [
  "tourism_packages_slug_key",
  "tourism_packages_active_name_idx",
] as const;

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isPackageType(value: string): value is TourismPackageType {
  return TOURISM_PACKAGE_TYPES.some((type) => type === value);
}

function isStatus(value: string): value is TourismPackageStatus {
  return TOURISM_PACKAGE_STATUSES.some((status) => status === value);
}

function parseInteger(
  value: string,
  minimum: number,
  label: string,
): { value: number } | { error: string } {
  if (!INTEGER_PATTERN.test(value.trim()))
    return { error: `${label} harus berupa bilangan bulat.` };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > 2_147_483_647)
    return { error: `${label} terlalu besar.` };
  if (parsed < minimum)
    return { error: `${label} harus bernilai minimal ${minimum}.` };
  return { value: parsed };
}

function parseDestinations(
  input: Record<string, unknown>,
  values: TourismPackageFormValues,
  errors: TourismPackageFieldErrors,
  context: TourismPackageValidationContext,
) {
  const ids =
    input.destination_id === undefined
      ? []
      : Array.isArray(input.destination_id)
        ? input.destination_id
        : [input.destination_id];
  const orders =
    input.destination_order === undefined
      ? []
      : Array.isArray(input.destination_order)
        ? input.destination_order
        : [input.destination_order];
  const notes =
    input.destination_note === undefined
      ? []
      : Array.isArray(input.destination_note)
        ? input.destination_note
        : [input.destination_note];
  if (ids.length !== orders.length || ids.length !== notes.length) {
    errors.destinations = "Susunan destinasi tidak lengkap atau rusak.";
    return [];
  }
  const allowed = new Map(
    (context.destinationOptions ?? []).map((option) => [option.id, option]),
  );
  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();
  const parsed: PackageDestinationValue[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    if (
      typeof ids[index] !== "string" ||
      typeof orders[index] !== "string" ||
      typeof notes[index] !== "string"
    ) {
      errors.destinations =
        "Susunan destinasi memiliki nilai yang tidak valid.";
      return [];
    }
    const destinationId = ids[index].trim();
    const orderResult = parseInteger(orders[index], 0, "Urutan destinasi");
    if (
      !isValidTourismPackageId(destinationId) ||
      !allowed.has(destinationId)
    ) {
      errors.destinations =
        "Salah satu destinasi tidak tersedia untuk dipilih.";
      return [];
    }
    if (seenIds.has(destinationId)) {
      errors.destinations =
        "Destinasi yang sama tidak boleh dipilih lebih dari sekali.";
      return [];
    }
    if (
      "error" in orderResult ||
      orderResult.value === undefined ||
      seenOrders.has(orderResult.value)
    ) {
      errors.destinations =
        "Setiap destinasi harus memiliki urutan yang valid dan berbeda.";
      return [];
    }
    seenIds.add(destinationId);
    seenOrders.add(orderResult.value);
    parsed.push({
      destinationId,
      displayOrder: orderResult.value,
      notes: notes[index].trim(),
    });
  }
  parsed.sort((left, right) => left.displayOrder - right.displayOrder);
  const normalized = parsed.map((item, index) => ({
    ...item,
    displayOrder: index,
  }));
  values.destinations = normalized;
  return normalized;
}

export function arePackageDestinationValuesEqual(
  left: PackageDestinationValue[],
  right: PackageDestinationValue[],
) {
  return (
    left.length === right.length &&
    left.every((item, index) => {
      const other = right[index];
      return (
        other &&
        item.destinationId === other.destinationId &&
        item.displayOrder === other.displayOrder &&
        item.notes === other.notes
      );
    })
  );
}

export function isValidTourismPackageId(value: string) {
  return UUID_PATTERN.test(value);
}

export function normalizeTourismPackageSlug(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidTourismPackageSlug(value: string) {
  return SLUG_PATTERN.test(value);
}

export function isTourismPackageDuplicateConstraintError(
  code: string,
  diagnosticText: string,
) {
  return (
    code === "23505" &&
    DUPLICATE_CONSTRAINTS.some((constraint) =>
      diagnosticText.includes(constraint),
    )
  );
}

export function getAllowedTourismPackageStatuses(
  current: TourismPackageStatus | null,
): readonly TourismPackageStatus[] {
  if (current === null) return ["draft"];
  if (current === "published") return ["published", "archived"];
  if (current === "archived") return ["archived", "draft"];
  return ["draft", "published", "archived"];
}

export function getTourismPackageStatusLabel(status: TourismPackageStatus) {
  return { draft: "Draf", published: "Diterbitkan", archived: "Diarsipkan" }[
    status
  ];
}

export function getTourismPackageTypeLabel(type: TourismPackageType) {
  return { budget: "Budget", standard: "Standard", premium: "Premium" }[type];
}

export function getTourismPackageMutationMode(
  record: Pick<TourismPackageRecord, "id"> | null,
): TourismPackageMutationMode {
  return record ? "update" : "create";
}

export function emptyTourismPackageFormValues(): TourismPackageFormValues {
  return { ...EMPTY_VALUES, destinations: [] };
}

export function tourismPackageToFormValues(
  record: TourismPackageRecord,
  destinations: PackageDestinationValue[],
): TourismPackageFormValues {
  return {
    name: record.name,
    package_type: record.package_type,
    duration_value: String(record.duration_value),
    duration_unit: record.duration_unit,
    price: record.price === null ? "" : String(record.price),
    price_note: record.price_note ?? "",
    included_facilities: record.included_facilities.join("\n"),
    souvenir: record.souvenir ?? "",
    summary: record.summary ?? "",
    description: record.description,
    is_featured: record.is_featured,
    display_order: String(record.display_order),
    status: record.status,
    destinations: destinations.map((item) => ({ ...item })),
  };
}

export function createTourismPackageInitialState(
  record: TourismPackageRecord | null,
  destinations: PackageDestinationValue[] = [],
): TourismPackageActionState {
  return {
    kind: "idle",
    values: record
      ? tourismPackageToFormValues(record, destinations)
      : emptyTourismPackageFormValues(),
    fieldErrors: {},
    formErrors: [],
    message: null,
    revision: 0,
  };
}

export function validateTourismPackageInput(
  input: Record<string, unknown>,
  context: TourismPackageValidationContext,
): TourismPackageValidationResult {
  const values = emptyTourismPackageFormValues();
  const fieldErrors: TourismPackageFieldErrors = {};
  const formErrors: string[] = [];
  const scalarFields = new Set<string>(
    TOURISM_PACKAGE_FORM_FIELDS.filter((field) => field !== "destinations"),
  );
  const relationFields = new Set([
    "destination_id",
    "destination_order",
    "destination_note",
  ]);

  for (const [field, raw] of Object.entries(input)) {
    if (field.startsWith("$ACTION_") || relationFields.has(field)) continue;
    if (!scalarFields.has(field as TourismPackageFormField)) {
      formErrors.push("Formulir memuat kolom yang tidak dikenali.");
      continue;
    }
    if (field === "is_featured") {
      if (raw !== "on" && raw !== true && raw !== false)
        fieldErrors.is_featured =
          "Paket unggulan memiliki nilai yang tidak valid.";
      else values.is_featured = raw === "on" || raw === true;
      continue;
    }
    if (typeof raw !== "string") {
      fieldErrors[field as TourismPackageFormField] =
        "Nilai formulir tidak valid.";
      continue;
    }
    switch (field) {
      case "name":
        values.name = raw;
        break;
      case "package_type":
        values.package_type = raw;
        break;
      case "duration_value":
        values.duration_value = raw;
        break;
      case "duration_unit":
        values.duration_unit = raw;
        break;
      case "price":
        values.price = raw;
        break;
      case "price_note":
        values.price_note = raw;
        break;
      case "included_facilities":
        values.included_facilities = raw;
        break;
      case "souvenir":
        values.souvenir = raw;
        break;
      case "summary":
        values.summary = raw;
        break;
      case "description":
        values.description = raw;
        break;
      case "display_order":
        values.display_order = raw;
        break;
      case "status":
        values.status = raw;
        break;
    }
  }

  const destinations = parseDestinations(input, values, fieldErrors, context);
  const name = values.name.trim();
  const description = values.description.trim();
  const durationUnit = values.duration_unit.trim();
  if (!name) fieldErrors.name = "Nama paket wajib diisi.";
  if (!description) fieldErrors.description = "Deskripsi paket wajib diisi.";
  if (!durationUnit) fieldErrors.duration_unit = "Satuan durasi wajib diisi.";

  const packageType = isPackageType(values.package_type.trim())
    ? (values.package_type.trim() as TourismPackageType)
    : null;
  if (!packageType) fieldErrors.package_type = "Jenis paket tidak valid.";
  const duration = parseInteger(values.duration_value, 1, "Durasi");
  if ("error" in duration) fieldErrors.duration_value = duration.error;
  const displayOrder = parseInteger(values.display_order, 0, "Urutan tampilan");
  if ("error" in displayOrder) fieldErrors.display_order = displayOrder.error;

  const priceRaw = values.price.trim();
  let price: number | null = null;
  if (priceRaw) {
    if (!DECIMAL_PATTERN.test(priceRaw) || !Number.isFinite(Number(priceRaw)))
      fieldErrors.price = "Harga harus berupa angka yang valid.";
    else if (Number(priceRaw) < 0)
      fieldErrors.price = "Harga tidak boleh bernilai negatif.";
    else price = Number(priceRaw);
  }

  const statusValue = values.status.trim();
  const status: TourismPackageStatus | null = isStatus(statusValue)
    ? statusValue
    : null;
  if (!status) fieldErrors.status = "Status publikasi tidak valid.";
  else {
    const allowed =
      context.mode === "create"
        ? getAllowedTourismPackageStatuses(null)
        : context.currentStatus === undefined
          ? null
          : getAllowedTourismPackageStatuses(context.currentStatus);
    if (allowed && !allowed.includes(status))
      fieldErrors.status = "Perubahan status publikasi tidak diizinkan.";
  }

  if (
    context.mode === "update" &&
    context.currentStatus !== "draft" &&
    context.currentDestinations &&
    !arePackageDestinationValuesEqual(destinations, context.currentDestinations)
  ) {
    fieldErrors.destinations =
      "Susunan destinasi hanya dapat diubah ketika paket berstatus draf.";
  }

  const includedFacilities = values.included_facilities
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (status === "published") {
    if (context.hasThumbnail === false)
      formErrors.push(
        "Paket belum dapat diterbitkan karena gambar utama belum tersedia.",
      );
    if (destinations.length === 0)
      fieldErrors.destinations =
        "Pilih minimal satu destinasi sebelum menerbitkan paket.";
    const options = new Map(
      (context.destinationOptions ?? []).map((option) => [option.id, option]),
    );
    if (
      destinations.some(
        (item) => options.get(item.destinationId)?.status !== "published",
      )
    ) {
      fieldErrors.destinations =
        "Semua destinasi dalam paket harus sudah diterbitkan sebelum paket dipublikasikan.";
    }
    const publicationTexts = [
      values.name,
      values.summary,
      values.description,
      values.price_note,
      values.souvenir,
      ...includedFacilities,
      ...destinations.map((item) => item.notes),
    ];
    if (publicationTexts.some((value) => PLACEHOLDER_PATTERN.test(value)))
      formErrors.push(
        "Paket masih memuat teks placeholder dan belum dapat diterbitkan.",
      );
  }

  if (
    Object.keys(fieldErrors).length ||
    formErrors.length ||
    !packageType ||
    !status ||
    !("value" in duration) ||
    !("value" in displayOrder)
  ) {
    return {
      success: false,
      values,
      fieldErrors,
      formErrors: [...new Set(formErrors)],
    };
  }
  return {
    success: true,
    values,
    destinations,
    data: {
      name,
      package_type: packageType,
      duration_value: duration.value,
      duration_unit: durationUnit,
      price,
      price_note: optionalText(values.price_note),
      included_facilities: includedFacilities,
      souvenir: optionalText(values.souvenir),
      summary: optionalText(values.summary),
      description,
      is_featured: values.is_featured,
      display_order: displayOrder.value,
      status,
    },
  };
}

export function validateTourismPackageFormData(
  formData: FormData,
  context: TourismPackageValidationContext,
) {
  const input: Record<string, unknown> = {};
  for (const field of new Set(formData.keys())) {
    const submitted = formData.getAll(field);
    input[field] = submitted.length === 1 ? submitted[0] : submitted;
  }
  return validateTourismPackageInput(input, context);
}
